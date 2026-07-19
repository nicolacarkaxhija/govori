import { asc, eq } from 'drizzle-orm';
import type { Entitlement, EntitlementSource } from '@glotty/entitlements';
import type { Db } from '../db/client.js';
import { entitlements } from '../db/schema.js';
import type { EntitlementStore } from './ports.js';

/** Postgres adapter for lifetime entitlements (ADR 0047/0050). */
export class DrizzleEntitlements implements EntitlementStore {
  constructor(private readonly db: Db) {}

  async grant(input: {
    userId: string;
    sku: string;
    source: EntitlementSource;
  }): Promise<Entitlement> {
    const grantedAt = new Date();
    await this.db
      .insert(entitlements)
      .values({ ...input, grantedAt })
      .onConflictDoUpdate({
        target: [entitlements.userId, entitlements.sku],
        set: { source: input.source, grantedAt },
      });
    return { ...input, grantedAt: grantedAt.toISOString() };
  }

  async listForUser(userId: string): Promise<Entitlement[]> {
    const rows = await this.db
      .select()
      .from(entitlements)
      .where(eq(entitlements.userId, userId))
      .orderBy(asc(entitlements.grantedAt), asc(entitlements.sku));
    return rows.map((row) => ({
      userId: row.userId,
      sku: row.sku,
      source: row.source,
      grantedAt: row.grantedAt.toISOString(),
    }));
  }
}
