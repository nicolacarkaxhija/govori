import {
  gate,
  resolve,
  type GateDecision,
  type Gateable,
} from '@glotty/entitlements';
import type { EntitlementStore } from './ports.js';

/**
 * Wires the pure content gate (ADR 0047/0050) to stored entitlements.
 *
 * Permissive by default: content with no premiumSku is free, so the ledger is
 * never even read for it — which is every item today. Only content that
 * declares a SKU consults the viewer's entitlements, and an anonymous viewer
 * holds nothing.
 */
export class ContentGate {
  constructor(private readonly store: EntitlementStore) {}

  async decide(
    userId: string | null,
    content: Gateable,
  ): Promise<GateDecision> {
    if (content.premiumSku === undefined || content.premiumSku === null) {
      return gate(content, () => false);
    }
    const held = userId === null ? [] : await this.store.listForUser(userId);
    return gate(content, (sku) => resolve(held, userId ?? '', sku));
  }
}
