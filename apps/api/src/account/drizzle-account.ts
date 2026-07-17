import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { reviewEvents, user } from '../db/schema.js';
import type { AccountRights, ExportBundle } from './ports.js';

export class DrizzleAccount implements AccountRights {
  constructor(private readonly db: Db) {}

  async exportData(userId: string): Promise<ExportBundle | undefined> {
    const [row] = await this.db.select().from(user).where(eq(user.id, userId));
    if (row === undefined) {
      return undefined;
    }
    const reviews = await this.db
      .select()
      .from(reviewEvents)
      .where(eq(reviewEvents.userId, userId))
      .orderBy(asc(reviewEvents.reviewedAt), asc(reviewEvents.id));
    return {
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        createdAt: row.createdAt.toISOString(),
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        itemId: review.itemId,
        reviewedAt: review.reviewedAt.toISOString(),
        grade: review.grade,
      })),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.db.delete(user).where(eq(user.id, userId));
  }
}
