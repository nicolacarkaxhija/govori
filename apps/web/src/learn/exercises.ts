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
