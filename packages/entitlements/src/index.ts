/**
 * Entitlements: per-SKU lifetime unlocks and the content gate (ADR 0047/0050).
 *
 * Pure domain, no I/O. The api owns persistence and the admin grant path;
 * payments are deliberately out of scope until the day charging arrives.
 */

/** How an entitlement was acquired (ADR 0047): a purchase, a founder perk, or
 * earned through contribution (ADR 0048). No payment rails exist yet — grants
 * come only from the admin/founder path. */
export type EntitlementSource = 'purchase' | 'founder' | 'contribution';

/**
 * A user's lifetime unlock of one SKU (ADR 0047). Entitlements are per-CEFR-
 * level lifetime unlocks with no subscriptions, so an entitlement never
 * expires — holding is timeless.
 */
export interface Entitlement {
  userId: string;
  /** The unlocked SKU, e.g. `fol/en/a1`. */
  sku: string;
  /** ISO 8601 instant the unlock was granted. */
  grantedAt: string;
  source: EntitlementSource;
}

/**
 * Whether a user holds a SKU, over a set of entitlements. A lifetime unlock
 * never expires, so this is pure set membership — no clock, no state.
 */
export function resolve(
  entitlements: readonly Entitlement[],
  userId: string,
  sku: string,
): boolean {
  return entitlements.some(
    (entitlement) => entitlement.userId === userId && entitlement.sku === sku,
  );
}

/**
 * Content the serving gate inspects. `premiumSku` is the enforcement boundary
 * (ADR 0047): content that carries one is premium; content without one is
 * free forever — and nothing sets it yet, so the gate stays inert.
 */
export interface Gateable {
  premiumSku?: string | null;
}

export type GateReason = 'free' | 'entitled' | 'locked';

export interface GateDecision {
  allowed: boolean;
  reason: GateReason;
}

/**
 * The content gate (ADR 0047/0050): permissive by default.
 *
 * Content with no `premiumSku` is free — the core-course-free guarantee, and
 * the state of every item today. Content that declares a SKU is served only
 * to a holder; `holds` answers SKU membership, wired to {@link resolve} over
 * the viewer's entitlements.
 */
export function gate(
  content: Gateable,
  holds: (sku: string) => boolean,
): GateDecision {
  const sku = content.premiumSku;
  if (sku === undefined || sku === null) {
    return { allowed: true, reason: 'free' };
  }
  return holds(sku)
    ? { allowed: true, reason: 'entitled' }
    : { allowed: false, reason: 'locked' };
}
