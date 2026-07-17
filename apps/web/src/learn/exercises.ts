import { normalize } from '@govori/transliteration';
import type { LearnItem } from '../api/client';

function primaryTranslation(item: LearnItem): string {
  return item.translations[0]?.text ?? '';
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
  const correct = primaryTranslation(target);
  const distractors = pool
    .filter((item) => item.id !== target.id)
    .map(primaryTranslation)
    .filter((text) => text !== '' && text !== correct);
  const unique = [...new Set(distractors)];
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
