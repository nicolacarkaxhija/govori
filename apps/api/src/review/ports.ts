import type { Item } from '@govori/content';

export type ReviewDecision = 'approved' | 'rejected';

/** The human gate between AI drafts and published items (ADR 0038). */
export interface ReviewQueue {
  /** Queues drafts as pending; known ids are ignored. Returns inserts. */
  addPending(items: readonly Item[]): Promise<number>;
  listPending(limit: number): Promise<Item[]>;
  /**
   * Records a decision on a pending entry and returns its item;
   * undefined when the entry is unknown or already decided.
   */
  decide(
    id: string,
    decision: ReviewDecision,
    decidedBy: string,
  ): Promise<Item | undefined>;
}
