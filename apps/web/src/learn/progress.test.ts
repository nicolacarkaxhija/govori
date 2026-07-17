import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadEvents,
  mergeEvents,
  nextItemId,
  recordReview,
  streakDays,
} from './progress';

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

describe('mergeEvents', () => {
  it('unions by event id and reports how many were new', () => {
    recordReview(FIRST, 'good', '2026-07-16T10:00:00.000Z');
    const local = loadEvents();
    const remote = [
      ...local,
      {
        id: 'dddddddd-0000-4000-8000-000000000001',
        itemId: SECOND,
        reviewedAt: '2026-07-15T09:00:00.000Z',
        grade: 'again' as const,
      },
    ];
    expect(mergeEvents(remote)).toBe(1);
    expect(loadEvents()).toHaveLength(2);
    // Merging the same set again adds nothing.
    expect(mergeEvents(remote)).toBe(0);
    expect(loadEvents()).toHaveLength(2);
  });

  it('feeds merged history into scheduling', () => {
    mergeEvents([
      {
        id: 'dddddddd-0000-4000-8000-000000000002',
        itemId: FIRST,
        reviewedAt: '2026-07-16T10:00:00.000Z',
        grade: 'good',
      },
    ]);
    // FIRST was reviewed on another device; the unseen item comes first.
    expect(nextItemId(ITEMS, '2026-07-16T11:00:00.000Z')).toBe(SECOND);
  });
});

describe('streakDays', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('counts consecutive days of review ending today or yesterday', () => {
    recordReview(FIRST, 'good', '2026-07-15T21:00:00.000Z');
    recordReview(FIRST, 'good', '2026-07-16T08:00:00.000Z');
    recordReview(SECOND, 'good', '2026-07-17T09:00:00.000Z');
    expect(streakDays('2026-07-17T12:00:00.000Z')).toBe(3);
    // Nothing today yet, but yesterday counts: streak survives the morning.
    expect(streakDays('2026-07-18T07:00:00.000Z')).toBe(3);
    // A full missed day breaks it.
    expect(streakDays('2026-07-19T07:00:00.000Z')).toBe(0);
  });

  it('is zero with no history and one after a single fresh day', () => {
    expect(streakDays('2026-07-17T12:00:00.000Z')).toBe(0);
    recordReview(FIRST, 'good', '2026-07-17T09:00:00.000Z');
    expect(streakDays('2026-07-17T12:00:00.000Z')).toBe(1);
  });

  it('counts a day once no matter how many reviews it had', () => {
    recordReview(FIRST, 'good', '2026-07-17T09:00:00.000Z');
    recordReview(SECOND, 'again', '2026-07-17T10:00:00.000Z');
    expect(streakDays('2026-07-17T12:00:00.000Z')).toBe(1);
  });
});
