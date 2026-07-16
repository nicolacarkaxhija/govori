import { replay, selectDue, type Grade, type ReviewEvent } from '@govori/srs';

const STORAGE_KEY = 'govori.reviews.v1';

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
