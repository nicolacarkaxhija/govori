import {
  renderIn,
  type LanguagePack,
  type ResolvedDirection,
} from '@glotty/language';
import { resolveInstance } from './instances';

/**
 * The single entry point handing the running app its instance and its
 * directions (ADR 0029/0046): resolved once from VITE_INSTANCE, failing
 * fast when the build was not told which product it is.
 */
const resolved = resolveInstance(import.meta.env.VITE_INSTANCE);

export const instance = resolved.instance;

/** Every hosted direction with its pack, in declared order (ADR 0046). */
export const directions = resolved.directions;

const STORAGE_KEY = `${instance.id}.direction`;

function directionById(id: string | null): ResolvedDirection | undefined {
  return id === null
    ? undefined
    : directions.find((entry) => entry.direction.id === id);
}

// The declared roster is non-empty (resolveInstance guarantees it); its
// first entry is the product's primary direction — instance config in
// declared display order, never an engine default (ADR 0046).
const [primary] = directions;
if (primary === undefined) {
  throw new Error(`instance '${instance.id}' declares no directions`);
}

let active: ResolvedDirection =
  directionById(localStorage.getItem(STORAGE_KEY)) ?? primary;

/** The direction the learner is currently working in (ADR 0046). */
export function activeDirection(): ResolvedDirection {
  return active;
}

/** The active direction's language pack (ADR 0029/0046). */
export function activePack(): LanguagePack {
  return active.pack;
}

/** The active direction's translation fallback (ADR 0046). */
export function fallbackLang(): string {
  return active.direction.fallbackTranslationLang;
}

/**
 * Switches the working direction, persisted per instance. Unknown ids
 * are ignored: there is nothing sensible to fall back to, and the
 * switcher only ever offers declared ids (ADR 0046).
 */
export function setActiveDirection(id: string): void {
  const next = directionById(id);
  if (next !== undefined) {
    active = next;
    localStorage.setItem(STORAGE_KEY, id);
  }
}

/** Renders canonical text in one of the active pack's scripts (ADR 0003). */
export function renderText(text: string, scriptId: string): string {
  return renderIn(activePack(), scriptId, text);
}
