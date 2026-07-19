import { count, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { items, reviewEvents, translations, user } from '../db/schema.js';
import type { StatsQueries } from './ports.js';

export class DrizzleStats implements StatsQueries {
  constructor(private readonly db: Db) {}

  async counts(direction: string) {
    // Content counters follow the direction's pool (ADR 0046); reviews
    // ride their item's direction; learners span the whole instance.
    const [itemRows, translationRows, reviewRows, learnerCount] =
      await Promise.all([
        this.db
          .select({ value: count() })
          .from(items)
          .where(eq(items.direction, direction)),
        this.db
          .select({ value: count() })
          .from(translations)
          .innerJoin(items, eq(translations.itemId, items.id))
          .where(eq(items.direction, direction)),
        this.db
          .select({ value: count() })
          .from(reviewEvents)
          .innerJoin(items, eq(reviewEvents.itemId, items.id))
          .where(eq(items.direction, direction)),
        this.db.$count(user),
      ]);
    return {
      items: itemRows[0]?.value ?? 0,
      translations: translationRows[0]?.value ?? 0,
      reviews: reviewRows[0]?.value ?? 0,
      learners: learnerCount,
    };
  }
}
