import { beforeEach, describe, expect, it } from 'vitest';
import {
  JOURNAL_PROMPTS,
  entryFor,
  journalDays,
  loadEntries,
  promptForDay,
  saveEntry,
} from './journal';

describe('journal storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    expect(loadEntries()).toEqual([]);
    expect(entryFor('2026-07-18')).toBeUndefined();
    expect(journalDays()).toEqual([]);
  });

  it('saves and reads back an entry for a day', () => {
    saveEntry({
      date: '2026-07-18',
      text: 'Dnes pisal ja.',
      prompt: 'journalPrompt1',
    });
    expect(entryFor('2026-07-18')?.text).toBe('Dnes pisal ja.');
    expect(journalDays()).toEqual(['2026-07-18']);
  });

  it('replaces an earlier entry for the same day rather than stacking', () => {
    saveEntry({ date: '2026-07-18', text: 'first', prompt: 'journalPrompt1' });
    saveEntry({
      date: '2026-07-18',
      text: 'revised',
      prompt: 'journalPrompt1',
    });
    expect(loadEntries()).toHaveLength(1);
    expect(entryFor('2026-07-18')?.text).toBe('revised');
  });

  it('recovers from corrupt storage', () => {
    localStorage.setItem('govori.journal.v1', '{not json');
    expect(loadEntries()).toEqual([]);
  });
});

describe('promptForDay', () => {
  it('is stable within a day and one of the known prompts', () => {
    const prompt = promptForDay('2026-07-18T09:00:00.000Z');
    expect(promptForDay('2026-07-18T20:00:00.000Z')).toBe(prompt);
    expect(JOURNAL_PROMPTS).toContain(prompt);
  });

  it('rotates across the cycle length', () => {
    const seen = new Set<string>();
    for (let day = 0; day < JOURNAL_PROMPTS.length; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString();
      seen.add(promptForDay(date));
    }
    expect(seen.size).toBe(JOURNAL_PROMPTS.length);
  });
});
