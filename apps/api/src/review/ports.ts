import type { Item } from '@glotty/content';

export type ReviewDecision = 'approved' | 'rejected';

/** The human gate between AI drafts and published items (ADR 0038). */
export interface ReviewQueue {
  /** Queues drafts as pending; known ids are ignored. Returns inserts. */
  addPending(items: readonly Item[]): Promise<number>;
  listPending(limit: number): Promise<Item[]>;
  /** The pending entry's item; undefined when unknown or already decided. */
  findPending(id: string): Promise<Item | undefined>;
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
