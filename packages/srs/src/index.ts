export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewEvent {
  /**
   * Globally unique identity (UUID in practice); the sync layer unions
   * event sets by this id. Two events with the same id are the same event —
   * replay behavior for colliding ids with differing payloads is unspecified.
   */
  id: string;
  itemId: string;
  /** ISO 8601 UTC timestamp. */
  reviewedAt: string;
  grade: Grade;
}

export interface ItemSchedule {
  itemId: string;
  repetitions: number;
  lapses: number;
  ease: number;
  intervalDays: number;
  lastReviewedAt: string;
  due: string;
}

const INITIAL_EASE = 2.5;
const MINIMUM_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** SM-2 quality values for the four grades (ADR 0036). */
const QUALITY: Readonly<Record<Grade, number>> = {
  again: 2,
  hard: 3,
  good: 4,
  easy: 5,
};

function nextEase(ease: number, quality: number): number {
  const shortfall = 5 - quality;
  const adjusted = ease + (0.1 - shortfall * (0.08 + shortfall * 0.02));
  return Math.max(MINIMUM_EASE, adjusted);
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

/**
 * Pure SM-2 transition: folds one review event into an item's schedule.
 * This function is the swap point for future scheduling algorithms.
 */
export function applyReview(
  previous: ItemSchedule | undefined,
  event: ReviewEvent,
): ItemSchedule {
  const base = previous ?? {
    itemId: event.itemId,
    repetitions: 0,
    lapses: 0,
    ease: INITIAL_EASE,
    // Never read: the interval ladder shields the first two repetitions.
    intervalDays: 0,
  };

  if (event.grade === 'again') {
    return {
      itemId: event.itemId,
      repetitions: 0,
      lapses: base.lapses + 1,
      ease: base.ease,
      intervalDays: 1,
      lastReviewedAt: event.reviewedAt,
      due: addDays(event.reviewedAt, 1),
    };
  }

  const newEase = nextEase(base.ease, QUALITY[event.grade]);
  const newRepetitions = base.repetitions + 1;
  let intervalDays: number;
  if (newRepetitions === 1) {
    intervalDays = 1;
  } else if (newRepetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(base.intervalDays * newEase);
  }

  return {
    itemId: event.itemId,
    repetitions: newRepetitions,
    lapses: base.lapses,
    ease: newEase,
    intervalDays,
    lastReviewedAt: event.reviewedAt,
    due: addDays(event.reviewedAt, intervalDays),
  };
}

export type SrsState = ReadonlyMap<string, ItemSchedule>;

/**
 * Derives the full scheduling state from an event log. Deterministic for any
 * input order (events sort by timestamp, ties broken by id) and idempotent
 * under duplicated ids, so state can always be rebuilt from a set-union of
 * device logs (ADR 0030).
 */
export function replay(events: readonly ReviewEvent[]): SrsState {
  const seen = new Set<string>();
  const unique = events.filter((event) => {
    if (seen.has(event.id)) {
      return false;
    }
    seen.add(event.id);
    return true;
  });
  const ordered = unique.toSorted(
    (a, b) =>
      a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id),
  );
  const state = new Map<string, ItemSchedule>();
  for (const event of ordered) {
    state.set(event.itemId, applyReview(state.get(event.itemId), event));
  }
  return state;
}

/** Items due at `now` (ISO 8601 UTC), earliest first. */
export function selectDue(state: SrsState, now: string): ItemSchedule[] {
  return [...state.values()]
    .filter((schedule) => schedule.due <= now)
    .toSorted((a, b) => a.due.localeCompare(b.due));
}
