import { describe, expect, it, vi } from 'vitest';
import type { Entitlement } from '@glotty/entitlements';
import { ContentGate } from './content-gate.js';
import type { EntitlementStore } from './ports.js';

const storeWith = (held: Entitlement[]): EntitlementStore => ({
  grant: () => Promise.reject(new Error('not used')),
  listForUser: () => Promise.resolve(held),
});

describe('ContentGate', () => {
  it('serves free content without ever reading the ledger', async () => {
    const listForUser = vi.fn(() => Promise.resolve([]));
    const gate = new ContentGate({
      grant: () => Promise.reject(new Error('not used')),
      listForUser,
    });
    expect(await gate.decide('u1', {})).toEqual({
      allowed: true,
      reason: 'free',
    });
    // The permissive default never touches persistence for free content.
    expect(listForUser).not.toHaveBeenCalled();
  });

  it('locks premium content away from an anonymous viewer', async () => {
    const gate = new ContentGate(storeWith([]));
    expect(await gate.decide(null, { premiumSku: 'fol/en/a1' })).toEqual({
      allowed: false,
      reason: 'locked',
    });
  });

  it('locks premium content away from a viewer who lacks the SKU', async () => {
    const gate = new ContentGate(storeWith([]));
    expect(await gate.decide('u1', { premiumSku: 'fol/en/a1' })).toEqual({
      allowed: false,
      reason: 'locked',
    });
  });

  it('serves premium content to a holder of the SKU', async () => {
    const gate = new ContentGate(
      storeWith([
        {
          userId: 'u1',
          sku: 'fol/en/a1',
          grantedAt: '2026-07-19T00:00:00.000Z',
          source: 'founder',
        },
      ]),
    );
    expect(await gate.decide('u1', { premiumSku: 'fol/en/a1' })).toEqual({
      allowed: true,
      reason: 'entitled',
    });
  });
});
