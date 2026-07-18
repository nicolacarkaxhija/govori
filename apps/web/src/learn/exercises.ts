import type { LanguagePack } from '@glotty/language';
import type { LearnItem } from '../api/client';

/** The language judgment calls exercises delegate to the pack. */
export type ExercisePack = Pick<
  LanguagePack,
  'normalize' | 'stem' | 'validateCanonical'
>;

/**
 * The translation an item shows a learner whose language is `lang`
 * (ADR 0003 spirit: never punish a language gap): exact match wins,
 * then the instance's fallback language, then whatever the item leads
 * with. The fallback is instance config — the engine prefers no language.
 */
export function translationFor(
  item: LearnItem,
  lang: string,
  fallbackLang: string,
): string {
  const exact = item.translations.find((entry) => entry.lang === lang);
  if (exact !== undefined) {
    return exact.text;
  }
  const fallback = item.translations.find(
    (entry) => entry.lang === fallbackLang,
  );
  return fallback?.text ?? item.translations[0]?.text ?? '';
}

/** Unique distractors around the correct answer, shuffled deterministically. */
function pickOptions(
  correct: string,
  candidates: readonly string[],
  count: number,
  random: () => number,
): string[] {
  const unique = [
    ...new Set(candidates.filter((text) => text !== '' && text !== correct)),
  ];
  const picked: string[] = [];
  while (picked.length < count - 1 && unique.length > 0) {
    const index = Math.floor(random() * unique.length);
    picked.push(...unique.splice(index, 1));
  }
  const choices = [...picked, correct];
  // Deterministic shuffle from the same random source.
  return choices
    .map((choice) => ({ choice, key: random() }))
    .sort((a, b) => a.key - b.key || a.choice.localeCompare(b.choice))
    .map((entry) => entry.choice);
}

/**
 * Multiple-choice options: the target's translation plus unique distractors
 * drawn from the rest of the pool — algorithmic, zero model cost (ADR 0035).
 */
export function buildChoices(
  target: LearnItem,
  pool: readonly LearnItem[],
  count: number,
  lang: string,
  fallbackLang: string,
  random: () => number = Math.random,
): string[] {
  return pickOptions(
    translationFor(target, lang, fallbackLang),
    pool
      .filter((item) => item.id !== target.id)
      .map((item) => translationFor(item, lang, fallbackLang)),
    count,
    random,
  );
}

/**
 * Reverse direction (production): the target's word among same-language
 * distractors, prompted by its translation.
 */
export function buildReverseChoices(
  target: LearnItem,
  pool: readonly LearnItem[],
  count: number,
  random: () => number = Math.random,
): string[] {
  return pickOptions(
    target.text,
    pool.filter((item) => item.id !== target.id).map((item) => item.text),
    count,
    random,
  );
}

/** Tolerant typed answers: never punish the keyboard (ADR 0003). */
export function checkTyped(
  normalize: ExercisePack['normalize'],
  expected: string,
  given: string,
): boolean {
  const normalized = normalize(given);
  return normalized.length > 0 && normalized === normalize(expected);
}

export interface MatchingPair {
  itemId: string;
  /** The item's canonical text in the language being learned. */
  target: string;
  translation: string;
}

/** Picks distinct items for a matching board; deterministic under `random`. */
export function buildMatching(
  pool: readonly LearnItem[],
  count: number,
  lang: string,
  fallbackLang: string,
  random: () => number = Math.random,
): MatchingPair[] {
  const usable = pool.filter(
    (item) => translationFor(item, lang, fallbackLang) !== '',
  );
  const picked: LearnItem[] = [];
  const remaining = [...usable];
  while (picked.length < count && remaining.length > 0) {
    const index = Math.floor(random() * remaining.length);
    picked.push(...remaining.splice(index, 1));
  }
  return picked.map((item) => ({
    itemId: item.id,
    target: item.text,
    translation: translationFor(item, lang, fallbackLang),
  }));
}

export interface Cloze {
  /** The pool word the blank exercises — review events credit it. */
  itemId: string;
  before: string;
  answer: string;
  after: string;
  translation: string;
}

/**
 * Blanks one pool-word occurrence in a sentence; the learner types it
 * back. Returns null when the sentence shares no word with the pool.
 * Stemming and normalization are the pack's judgment calls (ADR 0029).
 */
export function buildCloze(
  pack: ExercisePack,
  sentence: LearnItem,
  pool: readonly LearnItem[],
  lang: string,
  fallbackLang: string,
  random: () => number = Math.random,
): Cloze | null {
  const stems = pool.map((item) => ({ item, stem: pack.stem(item.text) }));
  const matches: {
    start: number;
    end: number;
    token: string;
    itemId: string;
  }[] = [];
  for (const hit of sentence.text.matchAll(/[\p{L}́]+/gu)) {
    const folded = pack.normalize(hit[0]);
    const matched = stems.find(({ stem }) => folded.startsWith(stem));
    if (matched !== undefined) {
      matches.push({
        start: hit.index,
        end: hit.index + hit[0].length,
        token: hit[0],
        itemId: matched.item.id,
      });
    }
  }
  const picked = matches[Math.floor(random() * matches.length)];
  if (picked === undefined) {
    return null;
  }
  return {
    itemId: picked.itemId,
    before: sentence.text.slice(0, picked.start),
    answer: picked.token,
    after: sentence.text.slice(picked.end),
    translation: translationFor(sentence, lang, fallbackLang),
  };
}

export interface Assembly {
  /** The sentence item credited by the review event. */
  itemId: string;
  /** Word tokens in scrambled order, ready for a tap bank. */
  tokens: string[];
  /** The same tokens in the sentence's true order. */
  answer: string[];
  translation: string;
}

/**
 * A scrambled ordering of 0..length-1: Fisher–Yates with the first pair
 * nudged apart if shuffling lands on the sorted order, so reordering
 * exercises never start solved. Sizes below two return the identity.
 */
export function scrambleOrder(
  length: number,
  random: () => number = Math.random,
): number[] {
  const order = Array.from({ length }, (unused, index) => index);
  const swap = (a: number, b: number) => {
    const left = order[a];
    const right = order[b];
    if (left !== undefined && right !== undefined) {
      order[a] = right;
      order[b] = left;
    }
  };
  for (let i = length - 1; i > 0; i -= 1) {
    swap(i, Math.floor(random() * (i + 1)));
  }
  if (length >= 2 && order.every((value, index) => value === index)) {
    swap(0, 1);
  }
  return order;
}

/**
 * Sentence assembly (ADR 0005): reorder shuffled words. Null when the
 * sentence is too short for reordering to mean anything.
 */
export function buildAssembly(
  sentence: LearnItem,
  lang: string,
  fallbackLang: string,
  random: () => number = Math.random,
): Assembly | null {
  const answer = sentence.text.split(/\s+/).filter((token) => token !== '');
  if (answer.length < 3) {
    return null;
  }
  const tokens = scrambleOrder(answer.length, random).flatMap((index) => {
    const token = answer[index];
    return token === undefined ? [] : [token];
  });
  return {
    itemId: sentence.id,
    tokens,
    answer,
    translation: translationFor(sentence, lang, fallbackLang),
  };
}

/** One pool word a production round asks the learner to use. */
export interface ProductionWord {
  itemId: string;
  /** The word's canonical text, for stem matching and display. */
  text: string;
  translation: string;
}

export interface Production {
  /** The 2–3 due pool words the learner must weave into a sentence. */
  words: ProductionWord[];
}

/**
 * A free-production round (ADR 0045): pick 2–3 due pool words the learner
 * must use in a sentence of their own. Deterministic under `random`; null
 * when the pool cannot spare at least two usable words.
 */
export function buildProduction(
  pool: readonly LearnItem[],
  lang: string,
  fallbackLang: string,
  random: () => number = Math.random,
): Production | null {
  const usable = pool.filter((item) => item.text !== '');
  if (usable.length < 2) {
    return null;
  }
  const target = usable.length >= 3 ? 3 : 2;
  const remaining = [...usable];
  const picked: LearnItem[] = [];
  while (picked.length < target && remaining.length > 0) {
    const index = Math.floor(random() * remaining.length);
    picked.push(...remaining.splice(index, 1));
  }
  return {
    words: picked.map((item) => ({
      itemId: item.id,
      text: item.text,
      translation: translationFor(item, lang, fallbackLang),
    })),
  };
}

/**
 * A production answer passes when the whole sentence is canonical and
 * every prompted word appears, matched by the same loose stem/containment
 * the cloze round uses (ADR 0045). Empty input never passes.
 */
export function checkProduction(
  pack: ExercisePack,
  text: string,
  words: readonly ProductionWord[],
): boolean {
  if (!pack.validateCanonical(text.trim())) {
    return false;
  }
  const tokens = [...text.matchAll(/[\p{L}́]+/gu)].map((hit) =>
    pack.normalize(hit[0]),
  );
  return words.every((word) => {
    const stem = pack.stem(word.text);
    return tokens.some((token) => token.startsWith(stem));
  });
}

export type ExerciseMode =
  | 'choices'
  | 'typed'
  | 'matching'
  | 'cloze'
  | 'assembly'
  | 'listening'
  | 'reverseChoices'
  | 'reverseTyped'
  | 'script'
  | 'morphology'
  | 'production';

export interface RoundContext {
  poolSize: number;
  hasCloze: boolean;
  hasAssembly: boolean;
  audioOn: boolean;
  /** Sentence-based rounds already played; alternates cloze/assembly. */
  sentenceRounds: number;
  /** Script drills already played; one per lesson is plenty (ADR 0003). */
  scriptRounds: number;
  /** How many scripts the pack writes; below two there is no drill. */
  scriptCount: number;
  /** Morphology drills already played; one per session. */
  morphologyRounds: number;
  /** Free-production rounds already played; one per session (ADR 0045). */
  productionRounds: number;
  /** Whether the pool can seed a production round (2+ usable words). */
  hasProduction: boolean;
}

/**
 * One place decides how exercise types rotate (ADR 0005): recognition,
 * production, matching, a sentence round, one script drill, then the
 * reverse direction, with listening joining once community audio is
 * live (ADR 0004).
 */
export function planNextMode(
  current: ExerciseMode,
  context: RoundContext,
): ExerciseMode {
  if (current === 'choices') {
    return 'typed';
  }
  if (current === 'typed' && context.poolSize >= 4) {
    return 'matching';
  }
  if (current === 'typed' || current === 'matching') {
    const preferAssembly = context.sentenceRounds % 2 === 1;
    if (context.hasAssembly && (preferAssembly || !context.hasCloze)) {
      return 'assembly';
    }
    if (context.hasCloze) {
      return 'cloze';
    }
  }
  if (current === 'reverseChoices') {
    return 'reverseTyped';
  }
  if (current === 'reverseTyped') {
    if (context.morphologyRounds === 0) {
      return 'morphology';
    }
    return context.productionRounds === 0 && context.hasProduction
      ? 'production'
      : 'choices';
  }
  if (current === 'morphology') {
    return context.productionRounds === 0 && context.hasProduction
      ? 'production'
      : 'choices';
  }
  if (current === 'production') {
    return 'choices';
  }
  if (
    (current === 'cloze' || current === 'assembly') &&
    context.scriptRounds === 0 &&
    context.scriptCount > 1
  ) {
    return 'script';
  }
  if (current !== 'listening' && context.audioOn) {
    return 'listening';
  }
  return 'reverseChoices';
}
