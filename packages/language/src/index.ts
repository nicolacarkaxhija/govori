/**
 * One writing system a language pack can render its canonical text into.
 * `render` is pure and total: any canonical text in, rendered text out.
 */
export interface ScriptVariant {
  readonly id: string;
  readonly label: string;
  render(text: string): string;
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
  /** True when `text` is valid canonical orthography for this language. */
  validateCanonical(text: string): boolean;
  /**
   * Folds any accepted way of writing an answer into one comparable
   * form — typed-answer checking never punishes the keyboard.
   */
  normalize(text: string): string;
  /** Loose stem: enough of a headword to recognize its inflected forms. */
  stem(word: string): string;
  /** Writing systems, in display order; the first one is the default. */
  readonly scripts: readonly ScriptVariant[];
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
