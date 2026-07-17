import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { reviewVotes } from '../db/schema.js';
import type { PendingVotes, VoteStore, VoteTally } from './ports.js';

/** Postgres adapter for community review votes (ADR 0040). */
export class DrizzleVoteStore implements VoteStore {
  constructor(private readonly db: Db) {}

  async castVote(
    reviewId: string,
    voterId: string,
    up: boolean,
  ): Promise<VoteTally> {
    await this.db
      .insert(reviewVotes)
      .values({ reviewId, voterId, up })
      .onConflictDoUpdate({
        target: [reviewVotes.reviewId, reviewVotes.voterId],
        set: { up },
      });
    const rows = await this.db
      .select({ up: reviewVotes.up })
      .from(reviewVotes)
      .where(eq(reviewVotes.reviewId, reviewId));
    return {
      upvotes: rows.filter((row) => row.up).length,
      downvotes: rows.filter((row) => !row.up).length,
    };
  }

  async talliesFor(
    reviewIds: readonly string[],
    voterId: string,
  ): Promise<Map<string, PendingVotes>> {
    const tallies = new Map<string, PendingVotes>();
    if (reviewIds.length === 0) {
      return tallies;
    }
    const rows = await this.db
      .select({
        reviewId: reviewVotes.reviewId,
        voterId: reviewVotes.voterId,
        up: reviewVotes.up,
      })
      .from(reviewVotes)
      .where(inArray(reviewVotes.reviewId, [...reviewIds]));
    for (const row of rows) {
      const tally = tallies.get(row.reviewId) ?? {
        upvotes: 0,
        downvotes: 0,
        myVote: null,
      };
      if (row.up) {
        tally.upvotes += 1;
      } else {
        tally.downvotes += 1;
      }
      if (row.voterId === voterId) {
        tally.myVote = row.up;
      }
      tallies.set(row.reviewId, tally);
    }
    return tallies;
  }
}
