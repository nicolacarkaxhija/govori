import { and, asc, eq } from 'drizzle-orm';
import type { Item } from '@govori/content';
import type { Db } from '../db/client.js';
import { reviewQueue } from '../db/schema.js';
import type { ReviewDecision, ReviewQueue } from './ports.js';

/** Postgres adapter for the review queue (ADR 0038). */
export class DrizzleReviewQueue implements ReviewQueue {
  constructor(private readonly db: Db) {}

  async addPending(items: readonly Item[]): Promise<number> {
    if (items.length === 0) {
      return 0;
    }
    const inserted = await this.db
      .insert(reviewQueue)
      .values(items.map((item) => ({ id: item.id, item })))
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

  async findPending(id: string): Promise<Item | undefined> {
    const [row] = await this.db
      .select({ item: reviewQueue.item })
      .from(reviewQueue)
      .where(and(eq(reviewQueue.id, id), eq(reviewQueue.status, 'pending')));
    return row?.item;
  }

  async decide(
    id: string,
    decision: ReviewDecision,
    decidedBy: string,
  ): Promise<Item | undefined> {
    const [row] = await this.db
      .update(reviewQueue)
      .set({ status: decision, decidedBy, decidedAt: new Date() })
      .where(and(eq(reviewQueue.id, id), eq(reviewQueue.status, 'pending')))
      .returning({ item: reviewQueue.item });
    return row?.item;
  }
}
