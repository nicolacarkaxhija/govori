import { replay, selectDue, type Grade, type ReviewEvent } from '@glotty/srs';
import { instance } from '../instance';

const STORAGE_KEY = `${instance.id}.reviews.v1`;

/**
 * Local-first learning progress (ADR 0022/0030): an append-only review-event
 * log in localStorage; scheduling state is derived by replay, never stored.
 * On signup this exact log is pushed to POST /sync/reviews unchanged.
 */
export function loadEvents(): ReviewEvent[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    return JSON.parse(raw) as ReviewEvent[];
  } catch {
    return [];
  }
}

export function recordReview(
  itemId: string,
  grade: Grade,
  reviewedAt = new Date().toISOString(),
): void {
  const events = loadEvents();
  events.push({ id: crypto.randomUUID(), itemId, reviewedAt, grade });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/** Due items first (earliest due wins), then unseen items in pool order. */
export function nextItemId(
  pool: readonly string[],
  now = new Date().toISOString(),
): string | undefined {
  const state = replay(loadEvents());
  const due = selectDue(state, now).find((schedule) =>
    pool.includes(schedule.itemId),
  );
  if (due !== undefined) {
    return due.itemId;
  }
  return pool.find((id) => !state.has(id));
}

/**
 * Pull side of sync (ADR 0030): union server events into the local log by
 * event id — same set-union semantics the server applies on push. Returns
 * how many events were new to this device.
 */
export function mergeEvents(incoming: readonly ReviewEvent[]): number {
  const events = loadEvents();
  const known = new Set(events.map((event) => event.id));
  const fresh = incoming.filter((event) => !known.has(event.id));
  if (fresh.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...events, ...fresh]));
  }
  return fresh.length;
}

/**
 * The items that trip this learner up: ranked by how many times each
 * was graded 'again', worst first; ties keep first-lapsed order.
 */
export function weakestItemIds(limit = 10): string[] {
  const lapses = new Map<string, number>();
  for (const event of loadEvents()) {
    if (event.grade === 'again') {
      lapses.set(event.itemId, (lapses.get(event.itemId) ?? 0) + 1);
    }
  }
  return [...lapses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([itemId]) => itemId);
}

/**
 * Personal, private momentum (ADR 0032): consecutive UTC days with at
 * least one review, ending today or yesterday — so a streak is never
 * lost before the day is over.
 */
export function streakDays(now = new Date().toISOString()): number {
  const days = new Set(
    loadEvents().map((event) => event.reviewedAt.slice(0, 10)),
  );
  if (days.size === 0) {
    return 0;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(`${now.slice(0, 10)}T00:00:00.000Z`).getTime();
  let cursor = days.has(now.slice(0, 10)) ? today : today - dayMs;
  let streak = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= dayMs;
  }
  return streak;
}
