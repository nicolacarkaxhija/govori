import { beforeEach, describe, expect, it } from 'vitest';
import { loadEvents, nextItemId, recordReview } from './progress';

// Local-first progress (ADR 0022/0030): an append-only event log in
// localStorage, scheduling state derived by replay on read.

const FIRST = 'aaaaaaaa-0000-4000-8000-000000000001';
const SECOND = 'aaaaaaaa-0000-4000-8000-000000000002';
const ITEMS = [FIRST, SECOND];

describe('local progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty and picks the first unseen item', () => {
    expect(loadEvents()).toEqual([]);
    expect(nextItemId(ITEMS, '2026-07-16T10:00:00.000Z')).toBe(FIRST);
  });

  it('records reviews and prefers due items over unseen ones', () => {
    recordReview(FIRST, 'again', '2026-07-16T10:00:00.000Z');
    expect(loadEvents()).toHaveLength(1);
    // ITEMS[0] is due tomorrow; right now the unseen item comes first.
    expect(nextItemId(ITEMS, '2026-07-16T10:05:00.000Z')).toBe(SECOND);
    // After a day, the lapsed item is due and takes priority.
    recordReview(SECOND, 'good', '2026-07-16T10:06:00.000Z');
    expect(nextItemId(ITEMS, '2026-07-17T12:00:00.000Z')).toBe(FIRST);
  });

  it('returns undefined when nothing is due and nothing is unseen', () => {
    recordReview(FIRST, 'good', '2026-07-16T10:00:00.000Z');
    recordReview(SECOND, 'good', '2026-07-16T10:01:00.000Z');
    expect(nextItemId(ITEMS, '2026-07-16T11:00:00.000Z')).toBeUndefined();
  });

  it('survives corrupted storage by starting fresh', () => {
    localStorage.setItem('govori.reviews.v1', '{not json');
    expect(loadEvents()).toEqual([]);
  });
});
