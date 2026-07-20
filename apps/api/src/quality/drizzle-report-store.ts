import { and, eq, isNotNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { itemReports } from '../db/schema.js';
import type { NewReport, ReportStore } from './ports.js';
import { REPORT_FLAG_THRESHOLD } from './thresholds.js';

/**
 * Postgres adapter for learner quality reports (ADR 0051). The third open
 * report on an item stamps flagged_at exactly once; a transaction keeps that
 * decision consistent under concurrent reports, and a prior flag makes further
 * reports no-ops on the flag.
 */
export class DrizzleReportStore implements ReportStore {
  constructor(private readonly db: Db) {}

  async add(report: NewReport): Promise<{ flagged: boolean }> {
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(itemReports)
        .values({
          itemId: report.itemId,
          direction: report.direction,
          reporterId: report.reporterId,
          reason: report.reason,
          comment: report.comment,
        })
        .returning({ id: itemReports.id });
      // Once any report for the item carries a flag, the item stays flagged;
      // later reports never re-stamp it.
      const priorFlag = await tx
        .select({ id: itemReports.id })
        .from(itemReports)
        .where(
          and(
            eq(itemReports.itemId, report.itemId),
            isNotNull(itemReports.flaggedAt),
          ),
        )
        .limit(1);
      if (priorFlag.length > 0) {
        return { flagged: true };
      }
      const openRows = await tx
        .select({ id: itemReports.id })
        .from(itemReports)
        .where(
          and(
            eq(itemReports.itemId, report.itemId),
            eq(itemReports.status, 'open'),
          ),
        );
      if (openRows.length < REPORT_FLAG_THRESHOLD || inserted === undefined) {
        return { flagged: false };
      }
      // This report is the one that tips the item over: stamp it.
      await tx
        .update(itemReports)
        .set({ flaggedAt: new Date() })
        .where(eq(itemReports.id, inserted.id));
      return { flagged: true };
    });
  }
}
