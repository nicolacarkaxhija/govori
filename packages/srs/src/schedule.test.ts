import { describe, expect, it } from 'vitest';
import { applyReview, type ItemSchedule, type ReviewEvent } from './index.js';

// Expected values are hand-computed from the published SM-2 algorithm
// (quality mapping again=2 hard=3 good=4 easy=5; EF' = EF + (0.1 - (5-q) *
// (0.08 + (5-q) * 0.02)) floored at 1.3; intervals 1d, 6d, then previous *
// EF; failure resets repetitions without changing EF). See ADR 0036.

function review(
  grade: ReviewEvent['grade'],
  reviewedAt: string,
  id = 'e1',
): ReviewEvent {
  return { id, itemId: 'slovo-1', reviewedAt, grade };
}

describe('applyReview', () => {
  it('schedules a new item reviewed as good for the next day', () => {
    const schedule = applyReview(
      undefined,
      review('good', '2026-01-01T00:00:00.000Z'),
    );
    expect(schedule).toEqual<ItemSchedule>({
      itemId: 'slovo-1',
      repetitions: 1,
      lapses: 0,
      ease: 2.5,
      intervalDays: 1,
      lastReviewedAt: '2026-01-01T00:00:00.000Z',
      due: '2026-01-02T00:00:00.000Z',
    });
  });

  it('follows the SM-2 interval ladder 1d, 6d, then interval x ease', () => {
    const first = applyReview(
      undefined,
      review('good', '2026-01-01T00:00:00.000Z'),
    );
    const second = applyReview(
      first,
      review('good', '2026-01-02T00:00:00.000Z'),
    );
    const third = applyReview(
      second,
      review('good', '2026-01-08T00:00:00.000Z'),
    );
    expect(second.intervalDays).toBe(6);
    expect(second.due).toBe('2026-01-08T00:00:00.000Z');
    expect(third.intervalDays).toBe(15);
    expect(third.due).toBe('2026-01-23T00:00:00.000Z');
    expect(third.ease).toBe(2.5);
    expect(third.repetitions).toBe(3);
  });

  it('lowers ease on hard and raises it on easy', () => {
    const first = applyReview(
      undefined,
      review('hard', '2026-01-01T00:00:00.000Z'),
    );
    expect(first.ease).toBeCloseTo(2.36, 10);
    const second = applyReview(
      first,
      review('easy', '2026-01-02T00:00:00.000Z'),
    );
    expect(second.ease).toBeCloseTo(2.46, 10);
  });

  it('resets repetitions on again without changing ease, counting a lapse', () => {
    const first = applyReview(
      undefined,
      review('good', '2026-01-01T00:00:00.000Z'),
    );
    const lapsed = applyReview(
      first,
      review('again', '2026-01-02T00:00:00.000Z'),
    );
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBe(2.5);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.due).toBe('2026-01-03T00:00:00.000Z');
    const relearned = applyReview(
      lapsed,
      review('good', '2026-01-03T00:00:00.000Z'),
    );
    expect(relearned.repetitions).toBe(1);
    expect(relearned.intervalDays).toBe(1);
  });

  it('never lets ease fall below 1.3', () => {
    let schedule = applyReview(
      undefined,
      review('hard', '2026-01-01T00:00:00.000Z'),
    );
    for (let i = 0; i < 12; i += 1) {
      schedule = applyReview(
        schedule,
        review(
          'hard',
          `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        ),
      );
    }
    expect(schedule.ease).toBe(1.3);
  });
});
