import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { itemReports, items, reviewEvents } from '../db/schema.js';
import type { ItemQueries } from '../content/ports.js';
import type {
  QualityFlag,
  QualityQueries,
  QualityThresholds,
  ReasonCount,
} from './ports.js';

/**
 * Postgres adapter for the reviewer escalation view (ADR 0051). It aggregates
 * two signals already in the database — the synced review-event log and the
 * reports table — and never tracks a learner itself.
 */
export class DrizzleQualityQueries implements QualityQueries {
  constructor(
    private readonly db: Db,
    private readonly itemQueries: ItemQueries,
  ) {}

  async flags(
    direction: string,
    thresholds: QualityThresholds,
  ): Promise<QualityFlag[]> {
    // (a) Items learners lapse on far more than a healthy item warrants.
    const failing = await this.db
      .select({
        itemId: reviewEvents.itemId,
        againCount:
          sql<number>`count(*) filter (where ${reviewEvents.grade} = 'again')`.mapWith(
            Number,
          ),
        totalGraded: sql<number>`count(*)`.mapWith(Number),
      })
      .from(reviewEvents)
      .innerJoin(items, eq(reviewEvents.itemId, items.id))
      .where(eq(items.direction, direction))
      .groupBy(reviewEvents.itemId)
      .having(
        sql`count(*) >= ${thresholds.minGraded} and count(*) filter (where ${reviewEvents.grade} = 'again') > ${thresholds.failureRate}::double precision * count(*)`,
      );

    // (b) Items enough learners reported by hand.
    const reported = await this.db
      .select({
        itemId: itemReports.itemId,
        openReports: sql<number>`count(*)`.mapWith(Number),
      })
      .from(itemReports)
      .where(
        and(
          eq(itemReports.direction, direction),
          eq(itemReports.status, 'open'),
        ),
      )
      .groupBy(itemReports.itemId)
      .having(sql`count(*) >= ${thresholds.minReports}`);

    const reportedIds = new Set(reported.map((row) => row.itemId));
    // Reason breakdowns only matter for items that cleared the report bar.
    const reasonRows =
      reportedIds.size === 0
        ? []
        : await this.db
            .select({
              itemId: itemReports.itemId,
              reason: itemReports.reason,
              count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(itemReports)
            .where(
              and(
                eq(itemReports.direction, direction),
                eq(itemReports.status, 'open'),
              ),
            )
            .groupBy(itemReports.itemId, itemReports.reason);

    const failingById = new Map(failing.map((row) => [row.itemId, row]));
    const reportedById = new Map(reported.map((row) => [row.itemId, row]));
    const reasonsById = new Map<string, ReasonCount[]>();
    for (const row of reasonRows) {
      if (!reportedIds.has(row.itemId)) {
        continue;
      }
      const bucket = reasonsById.get(row.itemId) ?? [];
      bucket.push({ reason: row.reason, count: row.count });
      reasonsById.set(row.itemId, bucket);
    }

    const flaggedIds = [
      ...new Set([...failingById.keys(), ...reportedById.keys()]),
    ];
    const found = await this.itemQueries.findByIds(flaggedIds);

    const flags = found.map((item) => {
      const fail = failingById.get(item.id);
      const againCount = fail?.againCount ?? 0;
      const totalGraded = fail?.totalGraded ?? 0;
      const reasons = (reasonsById.get(item.id) ?? []).sort(
        (a, b) => b.count - a.count || a.reason.localeCompare(b.reason),
      );
      return {
        item,
        againCount,
        totalGraded,
        failureRate: totalGraded === 0 ? 0 : againCount / totalGraded,
        openReports: reportedById.get(item.id)?.openReports ?? 0,
        reasons,
      };
    });

    // Most severe first: hand reports weigh heaviest, then lapse rate, then
    // how much evidence backs the rate.
    return flags.sort(
      (a, b) =>
        b.openReports - a.openReports ||
        b.failureRate - a.failureRate ||
        b.totalGraded - a.totalGraded,
    );
  }
}
