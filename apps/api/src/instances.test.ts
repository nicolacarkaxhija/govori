import { describe, expect, it } from 'vitest';
import { resolveApiInstance } from './instances.js';

// The registry gate: every shippable instance resolves each declared
// direction to its pack, and a process without an explicit instance
// never boots (ADR 0029/0041/0046).
describe('resolveApiInstance', () => {
  it('boots govori over its single isv direction', () => {
    const { instance, directions } = resolveApiInstance('govori');
    expect(instance.id).toBe('govori');
    expect(directions.map((entry) => entry.direction.id)).toEqual(['isv']);
    expect(directions.map((entry) => entry.pack.id)).toEqual(['isv']);
  });

  it('boots fol two-way: albanian, then english for albanian speakers', () => {
    const { instance, directions } = resolveApiInstance('fol');
    expect(instance.id).toBe('fol');
    expect(instance.brand.shortName).toBe('Fol');
    expect(directions.map((entry) => entry.direction.id)).toEqual(['sq', 'en']);
    expect(directions.map((entry) => entry.pack.id)).toEqual(['sq', 'en']);
  });

  it('refuses to boot without an instance, naming both known ids', () => {
    expect(() => resolveApiInstance(undefined)).toThrow(
      /govori.*fol|fol.*govori/,
    );
  });
});
