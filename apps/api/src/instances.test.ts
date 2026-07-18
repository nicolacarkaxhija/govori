import { describe, expect, it } from 'vitest';
import { resolveApiInstance } from './instances.js';

// The registry gate: every shippable instance resolves to its pack, and
// a process without an explicit instance never boots (ADR 0029/0041).
describe('resolveApiInstance', () => {
  it('boots govori over the isv pack', () => {
    const { instance, pack } = resolveApiInstance('govori');
    expect(instance.id).toBe('govori');
    expect(pack.id).toBe('isv');
  });

  it('boots fol over the sq pack', () => {
    const { instance, pack } = resolveApiInstance('fol');
    expect(instance.id).toBe('fol');
    expect(instance.brand.shortName).toBe('Fol');
    expect(pack.id).toBe('sq');
  });

  it('refuses to boot without an instance, naming both known ids', () => {
    expect(() => resolveApiInstance(undefined)).toThrow(
      /govori.*fol|fol.*govori/,
    );
  });
});
