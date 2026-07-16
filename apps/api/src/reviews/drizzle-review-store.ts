import { and, asc, eq, gt } from 'drizzle-orm';
import type { ReviewEvent } from '@govori/srs';
import type { Db } from '../db/client.js';
import { reviewEvents } from '../db/schema.js';
import type { ReviewEventStore } from './ports.js';

export class DrizzleReviewStore implements ReviewEventStore {
  constructor(private readonly db: Db) {}

  async addAll(
    userId: string,
    events: readonly ReviewEvent[],
  ): Promise<number> {
    if (events.length === 0) {
      return 0;
    }
    const inserted = await this.db
      .insert(reviewEvents)
      .values(
        events.map((event) => ({
          id: event.id,
          userId,
          itemId: event.itemId,
          reviewedAt: new Date(event.reviewedAt),
          grade: event.grade,
        })),
      )
      .onConflictDoNothing({ target: reviewEvents.id })
      .returning({ id: reviewEvents.id });
    return inserted.length;
  }

  async listSince(userId: string, since?: string): Promise<ReviewEvent[]> {
    const rows = await this.db
      .select()
      .from(reviewEvents)
      .where(
        since === undefined
          ? eq(reviewEvents.userId, userId)
          : and(
              eq(reviewEvents.userId, userId),
              gt(reviewEvents.reviewedAt, new Date(since)),
            ),
      )
      .orderBy(asc(reviewEvents.reviewedAt), asc(reviewEvents.id));
    return rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      reviewedAt: row.reviewedAt.toISOString(),
      grade: row.grade,
    }));
  }
}
