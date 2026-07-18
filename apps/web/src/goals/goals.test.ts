import { describe, expect, it } from 'vitest';
import type { ReviewEvent } from '@glotty/srs';
import { goalFraction, goalMet, weeklyGoals } from './goals';

function review(reviewedAt: string): ReviewEvent {
  return {
    id: crypto.randomUUID(),
    itemId: 'aaaaaaaa-0000-4000-8000-000000000001',
    reviewedAt,
    grade: 'good',
  };
}

// The week of 2026-07-18 (a Saturday) opens Monday 2026-07-13.
const NOW = '2026-07-18T12:00:00.000Z';

describe('weeklyGoals', () => {
  it('returns reviews, journal, and active-day goals', () => {
    const goals = weeklyGoals([], [], NOW);
    expect(goals.map((goal) => goal.label)).toEqual([
      'goalReviews',
      'goalJournal',
      'goalActiveDays',
    ]);
    expect(goals.every((goal) => goal.current === 0)).toBe(true);
  });

  it('counts only reviews from the current week', () => {
    const events = [
      review('2026-07-13T09:00:00.000Z'),
      review('2026-07-18T09:00:00.000Z'),
      review('2026-07-12T09:00:00.000Z'), // previous week, excluded
    ];
    const goals = weeklyGoals(events, [], NOW);
    expect(goals[0]?.current).toBe(2);
  });

  it('counts journal entries and distinct active days this week', () => {
    const events = [review('2026-07-15T09:00:00.000Z')];
    const journal = ['2026-07-15', '2026-07-16', '2026-07-01'];
    const goals = weeklyGoals(events, journal, NOW);
    // journal entries this week: 07-15, 07-16
    expect(goals[1]?.current).toBe(2);
    // active days: 07-15 (review+journal), 07-16 → 2 distinct
    expect(goals[2]?.current).toBe(2);
  });
});

describe('goalFraction and goalMet', () => {
  it('clamps the fraction to one', () => {
    expect(
      goalFraction({ label: 'goalReviews', current: 40, target: 20 }),
    ).toBe(1);
    expect(goalFraction({ label: 'goalReviews', current: 5, target: 20 })).toBe(
      0.25,
    );
  });

  it('guards a zero target', () => {
    expect(goalFraction({ label: 'goalReviews', current: 0, target: 0 })).toBe(
      1,
    );
  });

  it('reports whether the goal is met', () => {
    expect(goalMet({ label: 'goalJournal', current: 2, target: 2 })).toBe(true);
    expect(goalMet({ label: 'goalJournal', current: 1, target: 2 })).toBe(
      false,
    );
  });
});
