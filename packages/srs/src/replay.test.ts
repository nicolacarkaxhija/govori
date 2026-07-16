import { describe, expect, it } from 'vitest';
import { replay, selectDue, type ReviewEvent } from './index.js';

const events: readonly ReviewEvent[] = [
  {
    id: 'a1',
    itemId: 'dom',
    reviewedAt: '2026-01-01T08:00:00.000Z',
    grade: 'good',
  },
  {
    id: 'a2',
    itemId: 'dom',
    reviewedAt: '2026-01-02T08:00:00.000Z',
    grade: 'good',
  },
  {
    id: 'b1',
    itemId: 'voda',
    reviewedAt: '2026-01-03T08:00:00.000Z',
    grade: 'again',
  },
];

describe('replay', () => {
  it('derives one schedule per item from the event log', () => {
    const state = replay(events);
    expect(state.size).toBe(2);
    expect(state.get('dom')?.repetitions).toBe(2);
    expect(state.get('dom')?.due).toBe('2026-01-08T08:00:00.000Z');
    expect(state.get('voda')?.lapses).toBe(1);
  });

  it('is independent of event order', () => {
    const shuffled = [events[2], events[1], events[0]] as ReviewEvent[];
    expect(replay(shuffled)).toEqual(replay(events));
  });

  it('ignores duplicate event ids, so set-union sync is idempotent', () => {
    expect(replay([...events, ...events])).toEqual(replay(events));
  });

  it('breaks timestamp ties deterministically by event id', () => {
    const tied: readonly ReviewEvent[] = [
      {
        id: 'z2',
        itemId: 'dom',
        reviewedAt: '2026-01-01T08:00:00.000Z',
        grade: 'again',
      },
      {
        id: 'z1',
        itemId: 'dom',
        reviewedAt: '2026-01-01T08:00:00.000Z',
        grade: 'good',
      },
    ];
    // z1 sorts before z2, so the lapse from z2 lands last.
    expect(replay(tied).get('dom')?.lapses).toBe(1);
    expect(replay(tied).get('dom')?.repetitions).toBe(0);
  });
});

describe('selectDue', () => {
  it('returns only items due at the given time, earliest first', () => {
    const state = replay(events);
    // dom is due 2026-01-08, voda 2026-01-04.
    const due = selectDue(state, '2026-01-08T08:00:00.000Z');
    expect(due.map((schedule) => schedule.itemId)).toEqual(['voda', 'dom']);
    const dueEarlier = selectDue(state, '2026-01-05T00:00:00.000Z');
    expect(dueEarlier.map((schedule) => schedule.itemId)).toEqual(['voda']);
  });
});
