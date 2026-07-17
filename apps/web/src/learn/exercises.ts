import { normalize } from '@govori/transliteration';
import type { LearnItem } from '../api/client';

function primaryTranslation(item: LearnItem): string {
  return item.translations[0]?.text ?? '';
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
  random: () => number = Math.random,
): string[] {
  return pickOptions(
    primaryTranslation(target),
    pool.filter((item) => item.id !== target.id).map(primaryTranslation),
    count,
    random,
  );
}

/**
 * Reverse direction (production): the target's Interslavic word among
 * Interslavic distractors, prompted by its translation.
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
export function checkTyped(expected: string, given: string): boolean {
  const normalized = normalize(given);
  return normalized.length > 0 && normalized === normalize(expected);
}

export interface MatchingPair {
  itemId: string;
  isv: string;
  translation: string;
}

/** Picks distinct items for a matching board; deterministic under `random`. */
export function buildMatching(
  pool: readonly LearnItem[],
  count: number,
  random: () => number = Math.random,
): MatchingPair[] {
  const usable = pool.filter((item) => primaryTranslation(item) !== '');
  const picked: LearnItem[] = [];
  const remaining = [...usable];
  while (picked.length < count && remaining.length > 0) {
    const index = Math.floor(random() * remaining.length);
    picked.push(...remaining.splice(index, 1));
  }
  return picked.map((item) => ({
    itemId: item.id,
    isv: item.text,
    translation: primaryTranslation(item),
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

/** Loose stem: enough of a headword to recognize its inflected forms. */
function stemOf(word: string): string {
  const folded = normalize(word);
  return folded.slice(0, Math.max(3, folded.length - 2));
}

/**
 * Blanks one pool-word occurrence in a sentence; the learner types it
 * back. Returns null when the sentence shares no word with the pool.
 */
export function buildCloze(
  sentence: LearnItem,
  pool: readonly LearnItem[],
  random: () => number = Math.random,
): Cloze | null {
  const stems = pool.map((item) => ({ item, stem: stemOf(item.text) }));
  const matches: {
    start: number;
    end: number;
    token: string;
    itemId: string;
  }[] = [];
  for (const hit of sentence.text.matchAll(/[\p{L}́]+/gu)) {
    const folded = normalize(hit[0]);
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
    translation: sentence.translations[0]?.text ?? '',
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
 * Sentence assembly (ADR 0005): reorder shuffled words. Null when the
 * sentence is too short for reordering to mean anything.
 */
export function buildAssembly(
  sentence: LearnItem,
  random: () => number = Math.random,
): Assembly | null {
  const answer = sentence.text.split(/\s+/).filter((token) => token !== '');
  if (answer.length < 3) {
    return null;
  }
  const tokens = [...answer];
  // Fisher–Yates; nudge the first pair apart if shuffling lands on the
  // original order, so the exercise never starts solved.
  const swap = (a: number, b: number) => {
    const left = tokens[a];
    const right = tokens[b];
    if (left !== undefined && right !== undefined) {
      tokens[a] = right;
      tokens[b] = left;
    }
  };
  for (let i = tokens.length - 1; i > 0; i -= 1) {
    swap(i, Math.floor(random() * (i + 1)));
  }
  if (tokens.every((token, index) => token === answer[index])) {
    swap(0, 1);
  }
  return {
    itemId: sentence.id,
    tokens,
    answer,
    translation: sentence.translations[0]?.text ?? '',
  };
}

export type ExerciseMode =
  | 'choices'
  | 'typed'
  | 'matching'
  | 'cloze'
  | 'assembly'
  | 'listening'
  | 'reverseChoices'
  | 'reverseTyped';

export interface RoundContext {
  poolSize: number;
  hasCloze: boolean;
  hasAssembly: boolean;
  audioOn: boolean;
  /** Sentence-based rounds already played; alternates cloze/assembly. */
  sentenceRounds: number;
}

/**
 * One place decides how exercise types rotate (ADR 0005): recognition,
 * production, matching, a sentence round, then the reverse direction,
 * with listening joining once community audio is live (ADR 0004).
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
    return 'choices';
  }
  if (current !== 'listening' && context.audioOn) {
    return 'listening';
  }
  return 'reverseChoices';
}
