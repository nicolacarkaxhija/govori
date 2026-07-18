import { instance } from '../instance';
import type { MessageKey } from '../i18n';

/** One saved journal entry, keyed by its UTC day. */
export interface JournalEntry {
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  text: string;
  /** The prompt that seeded the entry, for later re-display. */
  prompt: MessageKey;
}

/**
 * A small rotating set of daily prompts (ADR 0045). Catalog keys, so the
 * copy stays instance-neutral and translatable; the engine never writes
 * a prompt.
 */
export const JOURNAL_PROMPTS: readonly MessageKey[] = [
  'journalPrompt1',
  'journalPrompt2',
  'journalPrompt3',
  'journalPrompt4',
  'journalPrompt5',
];

const STORAGE_KEY = `${instance.id}.journal.v1`;

/** The UTC day string for an ISO timestamp. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Today's prompt, rotating by UTC day so it changes daily but is stable
 * within a day. Falls back to the first prompt if the list is somehow
 * empty (it never is).
 */
export function promptForDay(now = new Date().toISOString()): MessageKey {
  const epochDay = Math.floor(
    new Date(`${dayOf(now)}T00:00:00.000Z`).getTime() / 86_400_000,
  );
  const index =
    ((epochDay % JOURNAL_PROMPTS.length) + JOURNAL_PROMPTS.length) %
    JOURNAL_PROMPTS.length;
  return JOURNAL_PROMPTS[index] ?? 'journalPrompt1';
}

export function loadEntries(): JournalEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    return JSON.parse(raw) as JournalEntry[];
  } catch {
    return [];
  }
}

/** The entry saved for a given UTC day, if any. */
export function entryFor(date: string): JournalEntry | undefined {
  return loadEntries().find((entry) => entry.date === date);
}

/**
 * Saves the day's entry, replacing any earlier one for the same day so a
 * learner can revise without stacking duplicates.
 */
export function saveEntry(entry: JournalEntry): void {
  const kept = loadEntries().filter((existing) => existing.date !== entry.date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...kept, entry]));
}

/** The set of UTC days that carry a journal entry — an activity signal. */
export function journalDays(): string[] {
  return loadEntries().map((entry) => entry.date);
}
