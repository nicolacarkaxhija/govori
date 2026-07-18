import { eq } from 'drizzle-orm';
import type { FlagState, TargetRole } from '@glotty/config';
import type { Db } from '../db/client.js';
import { flagAudit, flagStates } from '../db/schema.js';

/**
 * Postgres adapter for runtime flag states, with an append-only audit trail
 * of every change (ADR 0025). Graph and ring semantics live in @glotty/config.
 */
export class DrizzleFlagStore {
  constructor(private readonly db: Db) {}

  async setFlag(
    key: string,
    enabled: boolean,
    changedBy: string,
    targetRole?: TargetRole,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // An omitted ring keeps the flag where it was — a plain on/off flip
      // never silently widens or narrows visibility.
      const [existing] = await tx
        .select({ targetRole: flagStates.targetRole })
        .from(flagStates)
        .where(eq(flagStates.key, key));
      const ring = targetRole ?? existing?.targetRole ?? 'all';
      await tx
        .insert(flagStates)
        .values({ key, enabled, targetRole: ring, updatedBy: changedBy })
        .onConflictDoUpdate({
          target: flagStates.key,
          set: {
            enabled,
            targetRole: ring,
            updatedBy: changedBy,
            updatedAt: new Date(),
          },
        });
      await tx
        .insert(flagAudit)
        .values({ key, enabled, targetRole: ring, changedBy });
    });
  }

  async getStates(): Promise<Record<string, FlagState>> {
    const rows = await this.db.select().from(flagStates);
    return Object.fromEntries(
      rows.map((row) => [
        row.key,
        { enabled: row.enabled, targetRole: row.targetRole },
      ]),
    );
  }

  async getAudit(key: string) {
    return this.db
      .select()
      .from(flagAudit)
      .where(eq(flagAudit.key, key))
      .orderBy(flagAudit.changedAt);
  }
}
