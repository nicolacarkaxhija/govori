import type { Item } from '@glotty/content';
import type { DirectedItem } from '../content/ports.js';

export type ReviewDecision = 'approved' | 'rejected';

/** The human gate between AI drafts and published items (ADR 0038).
 * Every draft is queued for one direction (ADR 0046), so approval
 * knows which pool it publishes into. */
export interface ReviewQueue {
  /** Queues drafts as pending; known ids are ignored. Returns inserts. */
  addPending(items: readonly Item[], direction: string): Promise<number>;
  listPending(limit: number): Promise<Item[]>;
  /** The pending entry; undefined when unknown or already decided. */
  findPending(id: string): Promise<DirectedItem | undefined>;
  /**
   * Records a decision on a pending entry and returns it with its
   * direction; undefined when the entry is unknown or already decided.
   */
  decide(
    id: string,
    decision: ReviewDecision,
    decidedBy: string,
  ): Promise<DirectedItem | undefined>;
}

export interface VoteTally {
  upvotes: number;
  downvotes: number;
}

export interface PendingVotes extends VoteTally {
  /** The caller's own vote; null when they have not voted. */
  myVote: boolean | null;
}

/** Community ballot box over pending drafts (ADR 0040). */
export interface VoteStore {
  /** Upserts one vote per voter per entry and returns the fresh tally. */
  castVote(reviewId: string, voterId: string, up: boolean): Promise<VoteTally>;
  /** Tallies per review id, including the caller's own vote. */
  talliesFor(
    reviewIds: readonly string[],
    voterId: string,
  ): Promise<Map<string, PendingVotes>>;
}
