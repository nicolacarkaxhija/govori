import { describe, expect, it } from 'vitest';
import { gate } from './index.js';

const never = (): boolean => false;
const always = (): boolean => true;

describe('gate', () => {
  it('serves content with no premium SKU freely, never asking the holder', () => {
    expect(gate({}, never)).toEqual({ allowed: true, reason: 'free' });
  });

  it('treats an explicit null SKU as free', () => {
    expect(gate({ premiumSku: null }, never)).toEqual({
      allowed: true,
      reason: 'free',
    });
  });

  it('serves premium content to a holder', () => {
    expect(gate({ premiumSku: 'fol/en/a1' }, always)).toEqual({
      allowed: true,
      reason: 'entitled',
    });
  });

  it('locks premium content away from a non-holder', () => {
    expect(gate({ premiumSku: 'fol/en/a1' }, never)).toEqual({
      allowed: false,
      reason: 'locked',
    });
  });

  it('asks holds only with the content SKU', () => {
    const asked: string[] = [];
    gate({ premiumSku: 'fol/en/b2' }, (sku) => {
      asked.push(sku);
      return true;
    });
    expect(asked).toEqual(['fol/en/b2']);
  });
});
