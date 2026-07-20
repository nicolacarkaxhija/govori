import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { goldenAudits, goldenSample, items } from '../db/schema.js';
import type {
  GoldenAuditInput,
  GoldenQuality,
  GoldenQueueEntry,
  GoldenSetStore,
} from './ports.js';
import type { SampleCandidate } from './sample.js';

/** Postgres adapter for the golden set (ADR 0051). The sample is
 * insert-only; audits upsert one row per (item, reviewer); the quality
 * score is computed here, never stored. */
export class DrizzleGoldenSet implements GoldenSetStore {
  constructor(private readonly db: Db) {}

  async sampleCandidates(direction: string): Promise<SampleCandidate[]> {
    const rows = await this.db
      .select({
        id: items.id,
        kind: items.kind,
        attestation: items.attestation,
      })
      .from(items)
      .where(eq(items.direction, direction));
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      attestation: row.attestation,
    }));
  }

  async sampleItemIds(direction: string): Promise<string[]> {
    const rows = await this.db
      .select({ itemId: goldenSample.itemId })
      .from(goldenSample)
      .where(eq(goldenSample.direction, direction));
    return rows.map((row) => row.itemId);
  }

  async addToSample(
    direction: string,
    itemIds: readonly string[],
  ): Promise<number> {
    if (itemIds.length === 0) {
      return 0;
    }
    const inserted = await this.db
      .insert(goldenSample)
      .values(itemIds.map((itemId) => ({ direction, itemId })))
      .onConflictDoNothing()
      .returning({ itemId: goldenSample.itemId });
    return inserted.length;
  }

  async queueFor(
    direction: string,
    reviewerId: string,
    limit: number,
  ): Promise<GoldenQueueEntry[]> {
    // Golden-sample items this reviewer has not audited yet, oldest first.
    const pending = await this.db
      .select({ itemId: goldenSample.itemId })
      .from(goldenSample)
      .leftJoin(
        goldenAudits,
        and(
          eq(goldenAudits.itemId, goldenSample.itemId),
          eq(goldenAudits.reviewerId, reviewerId),
        ),
      )
      .where(
        and(eq(goldenSample.direction, direction), isNull(goldenAudits.itemId)),
      )
      .orderBy(asc(goldenSample.addedAt), asc(goldenSample.itemId))
      .limit(limit);
    const itemIds = pending.map((row) => row.itemId);
    if (itemIds.length === 0) {
      return [];
    }
    // The most recent prior audit on each of those items, by anyone.
    const priors = await this.db
      .select({
        itemId: goldenAudits.itemId,
        accuracy: goldenAudits.accuracy,
        naturalness: goldenAudits.naturalness,
        fit: goldenAudits.fit,
        comment: goldenAudits.comment,
        auditedAt: goldenAudits.auditedAt,
      })
      .from(goldenAudits)
      .where(inArray(goldenAudits.itemId, itemIds))
      .orderBy(desc(goldenAudits.auditedAt));
    const latest = new Map<string, GoldenQueueEntry['priorAudit']>();
    for (const prior of priors) {
      if (!latest.has(prior.itemId)) {
        latest.set(prior.itemId, {
          accuracy: prior.accuracy,
          naturalness: prior.naturalness,
          fit: prior.fit,
          comment: prior.comment,
          auditedAt: prior.auditedAt.toISOString(),
        });
      }
    }
    return itemIds.map((itemId) => ({
      itemId,
      priorAudit: latest.get(itemId) ?? null,
    }));
  }

  async saveAudit(input: GoldenAuditInput): Promise<void> {
    await this.db
      .insert(goldenAudits)
      .values({
        itemId: input.itemId,
        direction: input.direction,
        reviewerId: input.reviewerId,
        accuracy: input.accuracy,
        naturalness: input.naturalness,
        fit: input.fit,
        comment: input.comment,
      })
      .onConflictDoUpdate({
        target: [goldenAudits.itemId, goldenAudits.reviewerId],
        set: {
          accuracy: input.accuracy,
          naturalness: input.naturalness,
          fit: input.fit,
          comment: input.comment,
          auditedAt: new Date(),
        },
      });
  }

  async quality(direction: string): Promise<GoldenQuality | null> {
    const [row] = await this.db
      .select({
        // Mean of the three axes across every audit row (1-5). Postgres
        // returns a numeric avg as a string, so parse it below.
        mean: sql<
          string | null
        >`avg((${goldenAudits.accuracy} + ${goldenAudits.naturalness} + ${goldenAudits.fit})::numeric / 3)`,
        auditedItems: sql<number>`count(distinct ${goldenAudits.itemId})::int`,
      })
      .from(goldenAudits)
      .where(eq(goldenAudits.direction, direction));
    const mean = row?.mean ?? null;
    if (mean === null) {
      return null;
    }
    // Rescale a 1-5 mean onto 0-100; round to an honest whole number.
    const score = Math.round(((Number(mean) - 1) / 4) * 100);
    return { score, auditedItems: row?.auditedItems ?? 0 };
  }
}
