import type { Db } from '../db/client.js';
import { items, reviewEvents, translations, user } from '../db/schema.js';
import type { StatsQueries } from './ports.js';

export class DrizzleStats implements StatsQueries {
  constructor(private readonly db: Db) {}

  async counts() {
    const [itemCount, translationCount, reviewCount, learnerCount] =
      await Promise.all([
        this.db.$count(items),
        this.db.$count(translations),
        this.db.$count(reviewEvents),
        this.db.$count(user),
      ]);
    return {
      items: itemCount,
      translations: translationCount,
      reviews: reviewCount,
      learners: learnerCount,
    };
  }
}
