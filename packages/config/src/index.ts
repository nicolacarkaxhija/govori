import type { z } from 'zod';

/** Boot-time configuration failure: the process must not start. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function deepMerge(base: PlainObject, override: PlainObject): PlainObject {
  const merged: PlainObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    merged[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value)
        : value;
  }
  return merged;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Builds the immutable deployment config from layered sources
 * (defaults → file → environment; later sources win, deep-merged).
 * Invalid configuration throws ConfigError at the composition root —
 * the process fails at boot, never at request time (ADR 0024).
 */
export function buildConfig<TSchema extends z.ZodType>(
  schema: TSchema,
  sources: readonly PlainObject[],
): Readonly<z.infer<TSchema>> {
  const merged = sources.reduce<PlainObject>(
    (accumulated, source) => deepMerge(accumulated, source),
    {},
  );
  const result = schema.safeParse(merged);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`invalid configuration — ${details}`);
  }
  return deepFreeze(result.data);
}

function camelize(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/_+(.)/gu, (_match, letter: string) => letter.toUpperCase());
}

/**
 * Reads prefixed environment variables into a nested partial config source:
 * `GLOTTY_SERVER__PORT=8080` → `{ server: { port: '8080' } }`; single
 * underscores camelize (`BRAND__SHORT_NAME` → `brand.shortName`). Values
 * stay strings; the schema's coercion is the single place types are decided.
 */
export function envSource(
  env: Readonly<Record<string, string | undefined>>,
  prefix: string,
): PlainObject {
  const source: PlainObject = {};
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith(prefix) || value === undefined) {
      continue;
    }
    const path = name.slice(prefix.length).split('__').map(camelize);
    let node = source;
    path.forEach((segment, index) => {
      if (index === path.length - 1) {
        node[segment] = value;
        return;
      }
      const existing = node[segment];
      const child = isPlainObject(existing) ? existing : {};
      node[segment] = child;
      node = child;
    });
  }
  return source;
}

export interface FlagDefinition {
  readonly requires?: readonly string[];
  readonly description?: string;
}

export type FlagDefinitions = Readonly<Record<string, FlagDefinition>>;

export interface ResolvedFlag {
  /** Stored state AND every transitive requirement effectively enabled. */
  readonly effective: boolean;
  /** Transitive requirements that are not effectively enabled, in dependency order. */
  readonly suppressedBy: readonly string[];
}

/**
 * The visibility ring a flag targets (ADR 0025): role-and-up may see it.
 * `admin` ⊂ `reviewer` ⊂ `all` — a `reviewer` flag is on for reviewers
 * and admins, an `admin` flag for admins alone.
 */
export type TargetRole = 'all' | 'reviewer' | 'admin';

/** Who is asking; anonymous and signed-in learners see only `all` flags. */
export type ViewerRole = 'anonymous' | 'learner' | 'reviewer' | 'admin';

/** One flag's stored runtime state: its switch and its visibility ring. */
export interface FlagState {
  readonly enabled: boolean;
  readonly targetRole: TargetRole;
}

/** How far a viewer reaches; anonymous and learner share the outer ring. */
const viewerRank: Record<ViewerRole, number> = {
  anonymous: 0,
  learner: 0,
  reviewer: 1,
  admin: 2,
};

/** How far in a flag's ring sits; deeper rings admit fewer viewers. */
const targetRank: Record<TargetRole, number> = {
  all: 0,
  reviewer: 1,
  admin: 2,
};

/** True when the viewer's ring reaches the flag's target ring. */
function ringSatisfied(target: TargetRole, viewer: ViewerRole): boolean {
  return viewerRank[viewer] >= targetRank[target];
}

/**
 * Validates a feature-flag dependency graph at definition time: unknown
 * requirements and cycles are boot failures, never runtime surprises
 * (ADR 0025).
 */
export function defineFlags<T extends FlagDefinitions>(definitions: T): T {
  for (const [key, definition] of Object.entries(definitions)) {
    for (const requirement of definition.requires ?? []) {
      if (!(requirement in definitions)) {
        throw new ConfigError(
          `flag "${key}" requires unknown flag "${requirement}"`,
        );
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) {
      return;
    }
    if (visiting.has(key)) {
      throw new ConfigError(`flag dependency cycle involving "${key}"`);
    }
    visiting.add(key);
    for (const requirement of definitions[key]?.requires ?? []) {
      visit(requirement);
    }
    visiting.delete(key);
    visited.add(key);
  };
  for (const key of Object.keys(definitions)) {
    visit(key);
  }
  return definitions;
}

/**
 * Combines stored flag states with the dependency graph, from one viewer's
 * vantage: a flag is effective only when its own switch is on, its target
 * ring admits the viewer, and every transitive requirement is itself
 * effective for that viewer. Suppressed flags report which requirements
 * hold them back (admin UI).
 */
export function resolveFlags<T extends FlagDefinitions>(
  definitions: T,
  state: Readonly<Record<string, FlagState>>,
  viewerRole: ViewerRole,
): Readonly<Record<keyof T & string, ResolvedFlag>> {
  for (const key of Object.keys(state)) {
    if (!(key in definitions)) {
      throw new ConfigError(`state for unknown flag "${key}"`);
    }
  }

  const effectiveMemo = new Map<string, boolean>();
  const isEffective = (key: string): boolean => {
    const memo = effectiveMemo.get(key);
    if (memo !== undefined) {
      return memo;
    }
    const stored = state[key];
    const enabled = stored?.enabled ?? false;
    const targetRole = stored?.targetRole ?? 'all';
    const requires = definitions[key]?.requires ?? [];
    const effective =
      enabled &&
      ringSatisfied(targetRole, viewerRole) &&
      requires.every(isEffective);
    effectiveMemo.set(key, effective);
    return effective;
  };

  const transitiveRequires = (key: string): string[] => {
    const collected: string[] = [];
    const walk = (current: string): void => {
      for (const requirement of definitions[current]?.requires ?? []) {
        if (!collected.includes(requirement)) {
          walk(requirement);
          collected.push(requirement);
        }
      }
    };
    walk(key);
    return collected;
  };

  const resolved: Record<string, ResolvedFlag> = {};
  for (const key of Object.keys(definitions)) {
    resolved[key] = {
      effective: isEffective(key),
      suppressedBy: transitiveRequires(key).filter(
        (requirement) => !isEffective(requirement),
      ),
    };
  }
  return deepFreeze(resolved as Record<keyof T & string, ResolvedFlag>);
}
