import type { Attestation } from '@glotty/content';

/** The minimum an item must expose to be stratified into the golden set. */
export interface SampleCandidate {
  id: string;
  kind: 'word' | 'phrase' | 'sentence';
  /** Cross-source tier (ADR 0051); absent on most of the live pool. */
  attestation?: Attestation | null;
}

/** FNV-1a over the id: a stable per-item order with no clock or randomness. */
function hash(id: string): number {
  let h = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    h ^= id.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The stratum an item belongs to: its kind crossed with its tier, with
 * untiered items forming their own stratum rather than joining any grade. */
function stratumKey(candidate: SampleCandidate): string {
  return `${candidate.kind}|${candidate.attestation ?? 'none'}`;
}

/**
 * Deterministic stratified selection of up to `target` item ids (ADR 0051).
 *
 * Strata are (kind × attestation-tier). Within a stratum items are ordered by
 * a stable hash of their id and taken lowest-first — so re-running over the
 * same pool picks the same set. Quotas are allocated across strata
 * proportionally with largest-remainder, so the sample's kind/tier mix mirrors
 * the pool's. Pure: no clock, no randomness, no I/O. The membership invariant
 * that a settled pick never leaves is the append-only golden_sample table's,
 * not this function's — the caller inserts, never deletes.
 */
export function selectGoldenSample(
  candidates: readonly SampleCandidate[],
  target: number,
): string[] {
  const total = candidates.length;
  const want = Math.min(Math.max(Math.trunc(target), 0), total);
  if (want === 0) {
    return [];
  }

  const strata = new Map<string, SampleCandidate[]>();
  for (const candidate of candidates) {
    const key = stratumKey(candidate);
    const bucket = strata.get(key) ?? [];
    bucket.push(candidate);
    strata.set(key, bucket);
  }

  // A stable stratum order (by key) makes remainder tie-breaks reproducible.
  const ordered = [...strata.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [, bucket] of ordered) {
    bucket.sort((a, b) => {
      const ha = hash(a.id);
      const hb = hash(b.id);
      if (ha !== hb) {
        return ha - hb;
      }
      return a.id < b.id ? -1 : 1;
    });
  }

  // Proportional quota per stratum; the remainder seats go to the largest
  // fractional parts, tie-broken by stratum order for determinism.
  const quotas = ordered.map(([key, bucket]) => {
    const exact = (want * bucket.length) / total;
    const base = Math.floor(exact);
    return { key, bucket, base, remainder: exact - base };
  });
  let seated = quotas.reduce((sum, quota) => sum + quota.base, 0);
  const byRemainder = [...quotas].sort((a, b) =>
    b.remainder !== a.remainder
      ? b.remainder - a.remainder
      : a.key < b.key
        ? -1
        : 1,
  );
  for (const quota of byRemainder) {
    if (seated >= want) {
      break;
    }
    if (quota.base < quota.bucket.length) {
      quota.base += 1;
      seated += 1;
    }
  }

  const picked: string[] = [];
  for (const quota of quotas) {
    for (let index = 0; index < quota.base; index += 1) {
      const candidate = quota.bucket[index];
      if (candidate !== undefined) {
        picked.push(candidate.id);
      }
    }
  }
  return picked;
}
