import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { flagAudit, flagStates } from '../db/schema.js';

/**
 * Postgres adapter for runtime flag states, with an append-only audit trail
 * of every change (ADR 0025). Graph semantics live in @govori/config.
 */
export class DrizzleFlagStore {
  constructor(private readonly db: Db) {}

  async setFlag(
    key: string,
    enabled: boolean,
    changedBy: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(flagStates)
        .values({ key, enabled, updatedBy: changedBy })
        .onConflictDoUpdate({
          target: flagStates.key,
          set: { enabled, updatedBy: changedBy, updatedAt: new Date() },
        });
      await tx.insert(flagAudit).values({ key, enabled, changedBy });
    });
  }

  async getStates(): Promise<Record<string, boolean>> {
    const rows = await this.db.select().from(flagStates);
    return Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
  }

  async getAudit(key: string) {
    return this.db
      .select()
      .from(flagAudit)
      .where(eq(flagAudit.key, key))
      .orderBy(flagAudit.changedAt);
  }
}
