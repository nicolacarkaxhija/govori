import { describe, expect, it } from 'vitest';
import { type Entitlement, resolve } from './index.js';

const entitlement = (over: Partial<Entitlement> = {}): Entitlement => ({
  userId: 'u1',
  sku: 'fol/en/a1',
  grantedAt: '2026-07-19T00:00:00.000Z',
  source: 'founder',
  ...over,
});

describe('resolve', () => {
  it('holds when the same user has the same SKU', () => {
    expect(resolve([entitlement()], 'u1', 'fol/en/a1')).toBe(true);
  });

  it('does not hold for another user with the SKU', () => {
    expect(resolve([entitlement()], 'u2', 'fol/en/a1')).toBe(false);
  });

  it('does not hold for the user without that SKU', () => {
    expect(resolve([entitlement()], 'u1', 'fol/en/a2')).toBe(false);
  });

  it('does not hold over an empty set', () => {
    expect(resolve([], 'u1', 'fol/en/a1')).toBe(false);
  });

  it('finds the SKU among several grants', () => {
    const held = [
      entitlement({ sku: 'fol/en/a1' }),
      entitlement({ sku: 'fol/en/a2', source: 'purchase' }),
    ];
    expect(resolve(held, 'u1', 'fol/en/a2')).toBe(true);
  });
});
