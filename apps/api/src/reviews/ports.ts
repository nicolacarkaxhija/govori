import type { ReviewEvent } from '@govori/srs';

/** Per-user review-event log; event ids make set-union sync trivial (ADR 0030). */
export interface ReviewEventStore {
  /** Returns how many events were newly stored (duplicates ignored). */
  addAll(userId: string, events: readonly ReviewEvent[]): Promise<number>;
  listSince(userId: string, since?: string): Promise<ReviewEvent[]>;
}
