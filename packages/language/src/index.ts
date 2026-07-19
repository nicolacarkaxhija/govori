/**
 * One writing system a language pack can render its canonical text into.
 * `render` is pure and total: any canonical text in, rendered text out.
 */
export interface ScriptVariant {
  readonly id: string;
  readonly label: string;
  readonly render: (text: string) => string;
}

/**
 * The seam between the language-agnostic engine and one language
 * (ADR 0029): everything language-specific the engine needs, and nothing
 * else. Content is stored in the pack's canonical form only; scripts are
 * derived through `scripts[n].render` (ADR 0003 generalized).
 */
export interface LanguagePack {
  /** Stable pack id, e.g. `isv`; instances reference packs by this id. */
  readonly id: string;
  /** BCP 47 tag of the language being taught; drives `lang` markup. */
  readonly bcp47: string;
  /**
   * Human-readable name of the canonical orthography, e.g. "canonical
   * etymological Latin". The pack owns its terminology — engine code
   * composes messages around this name but never invents one.
   */
  readonly orthographyName: string;
  /** True when `text` is valid canonical orthography for this language. */
  readonly validateCanonical: (text: string) => boolean;
  /**
   * Folds any accepted way of writing an answer into one comparable
   * form — typed-answer checking never punishes the keyboard.
   */
  readonly normalize: (text: string) => string;
  /** Loose stem: enough of a headword to recognize its inflected forms. */
  readonly stem: (word: string) => string;
  /** Writing systems, in display order; the first one is the default. */
  readonly scripts: readonly ScriptVariant[];
}

/**
 * One learning direction an instance hosts (ADR 0046): the pack it
 * teaches plus the per-direction tuning that used to sit on the
 * instance. A single product may host several — e.g. Albanian beside
 * English-for-Albanian-speakers — each with its own content pool.
 */
export interface Direction {
  /** Stable direction id, e.g. `isv`; content rows are scoped by it. */
  readonly id: string;
  /** The language pack this direction teaches, by pack id. */
  readonly packId: string;
  /** The direction's label in its own language, shown untranslated. */
  readonly label: string;
  /** Translation language shown when an item lacks the learner's own. */
  readonly fallbackTranslationLang: string;
  /**
   * Net community votes (upvotes − downvotes) at which a pending draft
   * publishes without a reviewer (ADR 0040). A tuning knob each
   * direction owns: a larger, busier community can demand a higher bar
   * than a fledgling one.
   */
  readonly communityPublishNetVotes: number;
}

/**
 * One deployable product over the engine (ADR 0029): learning
 * directions plus everything brand- and audience-specific. Instances
 * are config — the engine never falls back to one; builds without an
 * instance fail.
 */
export interface InstanceConfig {
  /** Stable instance id, e.g. `govori`; selects deployment artifacts. */
  readonly id: string;
  readonly brand: {
    readonly shortName: string;
    readonly fullName: string;
    /** One-sentence store/SEO description; the instance owns its copy. */
    readonly description: string;
  };
  /**
   * The learning directions this instance hosts, in display order
   * (ADR 0046). At least one; each id unique within the instance.
   */
  readonly directions: readonly Direction[];
  /** UI languages offered, in display order; the first anchors fallback. */
  readonly uiLanguages: readonly string[];
  /** Learner languages (L1) offered in the picker, in display order. */
  readonly learnLanguages: readonly {
    /** BCP 47 language code as served in item translations. */
    readonly code: string;
    /** The language's own name, shown untranslated in the picker. */
    readonly name: string;
  }[];
  /** UI message catalogs, keyed by uiLanguage then message key. */
  readonly catalogs: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** What a composition root enumerates: its instances and their packs. */
export interface InstanceRegistry {
  readonly instances: Readonly<Record<string, InstanceConfig>>;
  readonly packs: Readonly<Record<string, LanguagePack>>;
}

/** One direction paired with the pack it teaches through. */
export interface ResolvedDirection {
  readonly direction: Direction;
  readonly pack: LanguagePack;
}

export interface ResolvedInstance {
  readonly instance: InstanceConfig;
  /** Every hosted direction with its pack, in the declared order. */
  readonly directions: readonly ResolvedDirection[];
}

/**
 * Fail-fast instance resolution (ADR 0029): the engine has no default
 * product. An unset or unknown id aborts with the configuring variable's
 * name so the operator knows exactly what to set. Every declared
 * direction must name a known pack, exactly once.
 */
export function resolveInstance(
  registry: InstanceRegistry,
  id: string | undefined,
  envVarName: string,
): ResolvedInstance {
  const known = Object.keys(registry.instances).join(', ');
  if (id === undefined || id === '') {
    throw new Error(`${envVarName} is not set; known instances: ${known}`);
  }
  const instance = registry.instances[id];
  if (instance === undefined) {
    throw new Error(`unknown instance '${id}'; known instances: ${known}`);
  }
  if (instance.directions.length === 0) {
    throw new Error(`instance '${id}' declares no directions`);
  }
  const seen = new Set<string>();
  const directions = instance.directions.map((direction): ResolvedDirection => {
    if (seen.has(direction.id)) {
      throw new Error(
        `instance '${id}' declares duplicate direction '${direction.id}'`,
      );
    }
    seen.add(direction.id);
    const pack = registry.packs[direction.packId];
    if (pack === undefined) {
      throw new Error(
        `direction '${direction.id}' of instance '${id}' names unknown pack '${direction.packId}'`,
      );
    }
    return { direction, pack };
  });
  return { instance, directions };
}

/**
 * Resolves one of an instance's directions (ADR 0046). An omitted id is
 * legal only for a single-direction instance, where the answer is the
 * total function of its config — never a default: with two or more
 * directions an omitted or unknown id always throws, naming the known
 * ids so the caller can correct itself.
 */
export function resolveDirection(
  resolved: ResolvedInstance,
  id: string | undefined,
): ResolvedDirection {
  const known = resolved.directions
    .map((entry) => entry.direction.id)
    .join(', ');
  if (id === undefined || id === '') {
    const [sole, second] = resolved.directions;
    if (sole !== undefined && second === undefined) {
      return sole;
    }
    throw new Error(`direction is required; known directions: ${known}`);
  }
  const found = resolved.directions.find((entry) => entry.direction.id === id);
  if (found === undefined) {
    throw new Error(`unknown direction '${id}'; known directions: ${known}`);
  }
  return found;
}

/** Renders `text` in the given script, or unchanged when the id is unknown. */
export function renderIn(
  pack: LanguagePack,
  scriptId: string,
  text: string,
): string {
  const script = pack.scripts.find((entry) => entry.id === scriptId);
  return script === undefined ? text : script.render(text);
}

/** True when the pack offers a script choice worth a toggle. */
export function hasScriptChoice(pack: LanguagePack): boolean {
  return pack.scripts.length > 1;
}

/**
 * The script following `currentId` in display order, wrapping around;
 * an unknown id restarts at the first script. Undefined only when the
 * pack has no scripts at all.
 */
export function nextScript(
  pack: LanguagePack,
  currentId: string,
): ScriptVariant | undefined {
  const index = pack.scripts.findIndex((entry) => entry.id === currentId);
  // An empty scripts array makes the modulus NaN, indexing to undefined.
  return pack.scripts[(index + 1) % pack.scripts.length];
}
