import type { Entitlement, EntitlementSource } from '@glotty/entitlements';

/** Persistence port for lifetime entitlements (ADR 0047/0050). */
export interface EntitlementStore {
  /**
   * Grants a user a SKU, stamping the grant instant server-side. Idempotent
   * per (user, sku): re-granting refreshes the source and time rather than
   * duplicating. Returns the stored entitlement.
   */
  grant(input: {
    userId: string;
    sku: string;
    source: EntitlementSource;
  }): Promise<Entitlement>;
  /** A user's held entitlements, oldest grant first. */
  listForUser(userId: string): Promise<Entitlement[]>;
}
