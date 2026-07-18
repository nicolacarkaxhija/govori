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
 * One deployable product over the engine (ADR 0029): a language pack
 * plus everything brand- and audience-specific. Instances are config —
 * the engine never falls back to one; builds without an instance fail.
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
  /** The language pack this instance teaches, by pack id. */
  readonly packId: string;
  /** UI languages offered, in display order; the first anchors fallback. */
  readonly uiLanguages: readonly string[];
  /** Translation language shown when an item lacks the learner's own. */
  readonly fallbackTranslationLang: string;
  /**
   * Net community votes (upvotes − downvotes) at which a pending draft
   * publishes without a reviewer (ADR 0040). A tuning knob each product
   * owns: a larger, busier community can demand a higher bar than a
   * fledgling one.
   */
  readonly communityPublishNetVotes: number;
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

export interface ResolvedInstance {
  readonly instance: InstanceConfig;
  readonly pack: LanguagePack;
}

/**
 * Fail-fast instance resolution (ADR 0029): the engine has no default
 * product. An unset or unknown id aborts with the configuring variable's
 * name so the operator knows exactly what to set.
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
  const pack = registry.packs[instance.packId];
  if (pack === undefined) {
    throw new Error(`instance '${id}' names unknown pack '${instance.packId}'`);
  }
  return { instance, pack };
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
