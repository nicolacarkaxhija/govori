import type { ReviewEvent } from '@glotty/srs';
import type { MessageKey } from '../i18n';

/**
 * One weekly goal, framed as a task count — never hours (ADR 0006 spirit:
 * momentum, not pressure). `current` is progress toward `target`.
 */
export interface Goal {
  label: MessageKey;
  current: number;
  target: number;
}

const DAY_MS = 86_400_000;

/** Midnight UTC of the Monday that opens the week containing `now`. */
function weekStartUtc(now: string): number {
  const midnight = new Date(`${now.slice(0, 10)}T00:00:00.000Z`).getTime();
  const dayOfWeek = new Date(midnight).getUTCDay();
  const sinceMonday = (dayOfWeek + 6) % 7;
  return midnight - sinceMonday * DAY_MS;
}

/**
 * Two-to-three weekly goals derived purely from the review-event log and
 * the journal's activity days (ADR 0045): reviews answered, journal
 * entries written, and distinct active days this week.
 */
export function weeklyGoals(
  events: readonly ReviewEvent[],
  journalDays: readonly string[],
  now = new Date().toISOString(),
): Goal[] {
  const start = weekStartUtc(now);
  const inWeek = (day: string): boolean =>
    new Date(`${day}T00:00:00.000Z`).getTime() >= start;

  const reviewsThisWeek = events.filter(
    (event) => new Date(event.reviewedAt).getTime() >= start,
  );
  const reviewDays = reviewsThisWeek.map((event) =>
    event.reviewedAt.slice(0, 10),
  );
  const journalThisWeek = journalDays.filter(inWeek);
  const activeDays = new Set([...reviewDays, ...journalThisWeek]);

  return [
    { label: 'goalReviews', current: reviewsThisWeek.length, target: 20 },
    { label: 'goalJournal', current: journalThisWeek.length, target: 2 },
    { label: 'goalActiveDays', current: activeDays.size, target: 5 },
  ];
}

/** A goal's completion as a 0–1 fraction, clamped for the progress bar. */
export function goalFraction(goal: Goal): number {
  if (goal.target <= 0) {
    return 1;
  }
  return Math.min(1, goal.current / goal.target);
}

/** Whether the goal is met this week. */
export function goalMet(goal: Goal): boolean {
  return goal.current >= goal.target;
}
