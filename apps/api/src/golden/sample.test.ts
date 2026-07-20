import { describe, expect, it } from 'vitest';
import { selectGoldenSample, type SampleCandidate } from './sample.js';

function word(
  id: string,
  attestation?: SampleCandidate['attestation'],
): SampleCandidate {
  return { id, kind: 'word', ...(attestation ? { attestation } : {}) };
}

describe('selectGoldenSample', () => {
  it('returns nothing for an empty pool or a non-positive target', () => {
    expect(selectGoldenSample([], 10)).toEqual([]);
    expect(selectGoldenSample([word('a')], 0)).toEqual([]);
    expect(selectGoldenSample([word('a')], -5)).toEqual([]);
  });

  it('takes the whole pool when the target meets or exceeds its size', () => {
    const pool = [word('a'), word('b'), word('c')];
    const picked = selectGoldenSample(pool, 3);
    expect([...picked].sort()).toEqual(['a', 'b', 'c']);
    // Over-asking never repeats or invents ids.
    expect([...selectGoldenSample(pool, 99)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic: the same pool and target pick the same ids', () => {
    const pool = Array.from({ length: 50 }, (_, index) =>
      word(`id-${String(index)}`),
    );
    const first = selectGoldenSample(pool, 12);
    const second = selectGoldenSample([...pool].reverse(), 12);
    expect(first).toHaveLength(12);
    // Order-independent input yields the same membership.
    expect([...first].sort()).toEqual([...second].sort());
  });

  it('grows monotonically: a settled pick survives a larger target', () => {
    const pool = Array.from({ length: 40 }, (_, index) =>
      word(`w-${String(index)}`),
    );
    const small = new Set(selectGoldenSample(pool, 8));
    const large = new Set(selectGoldenSample(pool, 20));
    for (const id of small) {
      expect(large.has(id)).toBe(true);
    }
  });

  it('stratifies across kind and attestation proportionally', () => {
    const candidates: SampleCandidate[] = [
      ...Array.from({ length: 60 }, (_, i) => ({
        id: `word-gold-${String(i)}`,
        kind: 'word' as const,
        attestation: 'gold' as const,
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `phrase-${String(i)}`,
        kind: 'phrase' as const,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `sentence-${String(i)}`,
        kind: 'sentence' as const,
      })),
    ];
    const picked = selectGoldenSample(candidates, 20);
    expect(picked).toHaveLength(20);
    const byPrefix = (prefix: string) =>
      picked.filter((id) => id.startsWith(prefix)).length;
    // 60/30/10 of 100 → 12/6/2 of 20.
    expect(byPrefix('word-gold')).toBe(12);
    expect(byPrefix('phrase')).toBe(6);
    expect(byPrefix('sentence')).toBe(2);
  });

  it('hands out remainder seats to the largest fractional parts', () => {
    const candidates: SampleCandidate[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `word-${String(i)}`,
        kind: 'word' as const,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `phrase-${String(i)}`,
        kind: 'phrase' as const,
      })),
    ];
    // 7/3 of 10, target 5 → 3.5/1.5; the one remainder seat breaks the tie by
    // stratum key ('phrase' before 'word'), so phrase rounds up.
    const picked = selectGoldenSample(candidates, 5);
    expect(picked).toHaveLength(5);
    expect(picked.filter((id) => id.startsWith('word')).length).toBe(3);
    expect(picked.filter((id) => id.startsWith('phrase')).length).toBe(2);
  });

  it('keeps untiered items in their own stratum, separate from graded ones', () => {
    const candidates: SampleCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        word(`bronze-${String(i)}`, 'bronze'),
      ),
      ...Array.from({ length: 10 }, (_, i) => word(`untiered-${String(i)}`)),
    ];
    const picked = selectGoldenSample(candidates, 10);
    expect(picked.filter((id) => id.startsWith('bronze')).length).toBe(5);
    expect(picked.filter((id) => id.startsWith('untiered')).length).toBe(5);
  });
});
