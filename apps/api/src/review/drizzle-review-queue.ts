import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { Item } from '@glotty/content';
import type { Db } from '../db/client.js';
import { reviewQueue } from '../db/schema.js';
import type { DirectedItem } from '../content/ports.js';
import type { ReviewDecision, ReviewQueue } from './ports.js';

/** Postgres adapter for the review queue (ADR 0038). Drafts carry the
 * direction they publish into (ADR 0046); rows whose direction is
 * still NULL (pre-backfill) are treated as absent. */
export class DrizzleReviewQueue implements ReviewQueue {
  constructor(private readonly db: Db) {}

  async addPending(items: readonly Item[], direction: string): Promise<number> {
    if (items.length === 0) {
      return 0;
    }
    const inserted = await this.db
      .insert(reviewQueue)
      .values(items.map((item) => ({ id: item.id, direction, item })))
      .onConflictDoNothing()
      .returning({ id: reviewQueue.id });
    return inserted.length;
  }

  async listPending(limit: number): Promise<Item[]> {
    const rows = await this.db
      .select({ item: reviewQueue.item })
      .from(reviewQueue)
      .where(eq(reviewQueue.status, 'pending'))
      .orderBy(asc(reviewQueue.createdAt), asc(reviewQueue.id))
      .limit(limit);
    return rows.map((row) => row.item);
  }

  async findPending(id: string): Promise<DirectedItem | undefined> {
    const [row] = await this.db
      .select({ item: reviewQueue.item, direction: reviewQueue.direction })
      .from(reviewQueue)
      .where(
        and(
          eq(reviewQueue.id, id),
          eq(reviewQueue.status, 'pending'),
          isNotNull(reviewQueue.direction),
        ),
      );
    if (row === undefined) {
      return undefined;
    }
    const { item, direction } = row;
    return direction === null ? undefined : { item, direction };
  }

  async decide(
    id: string,
    decision: ReviewDecision,
    decidedBy: string,
  ): Promise<DirectedItem | undefined> {
    const [row] = await this.db
      .update(reviewQueue)
      .set({ status: decision, decidedBy, decidedAt: new Date() })
      .where(
        and(
          eq(reviewQueue.id, id),
          eq(reviewQueue.status, 'pending'),
          isNotNull(reviewQueue.direction),
        ),
      )
      .returning({ item: reviewQueue.item, direction: reviewQueue.direction });
    if (row === undefined) {
      return undefined;
    }
    const { item, direction } = row;
    return direction === null ? undefined : { item, direction };
  }
}
