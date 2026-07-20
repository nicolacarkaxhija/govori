import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { Item } from '@glotty/content';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { DrizzleItemRepository } from '../content/drizzle-item-repository.js';
import { DrizzleGoldenSet } from './drizzle-golden.js';

let container: StartedPostgreSqlContainer;
let db: Db;

const [aId, bId, cId, dId] = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
];

function word(id: string, text: string): Item {
  return {
    id,
    kind: 'word',
    text,
    translations: [{ lang: 'en', text: `${text}-en` }],
    notes: [],
    provenance: { origin: 'human', contributorId: 'seed' },
  };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  db = createDb(container.getConnectionUri());
  await runMigrations(db);
  const repository = new DrizzleItemRepository(db);
  await repository.upsertMany(
    [
      word(aId, 'alfa'),
      word(bId, 'beta'),
      word(cId, 'gama'),
      word(dId, 'delta'),
    ],
    'goldset',
  );
}, 120_000);

afterAll(async () => {
  await container.stop();
});

describe('DrizzleGoldenSet sample', () => {
  it('reads the direction pool as stratification candidates', async () => {
    const store = new DrizzleGoldenSet(db);
    const candidates = await store.sampleCandidates('goldset');
    expect([...candidates.map((c) => c.id)].sort()).toEqual(
      [aId, bId, cId, dId].sort(),
    );
    expect(candidates.every((c) => c.kind === 'word')).toBe(true);
    expect(candidates.every((c) => c.attestation === null)).toBe(true);
    // A pool nobody seeded is simply empty.
    expect(await store.sampleCandidates('elsewhere')).toEqual([]);
  });

  it('appends ids once and stays idempotent as the sample grows', async () => {
    const store = new DrizzleGoldenSet(db);
    expect(await store.sampleItemIds('goldset')).toEqual([]);
    expect(await store.addToSample('goldset', [aId, bId, cId])).toBe(3);
    // Re-adding overlapping ids inserts only the genuinely new one.
    expect(await store.addToSample('goldset', [bId, cId, dId])).toBe(1);
    expect([...(await store.sampleItemIds('goldset'))].sort()).toEqual(
      [aId, bId, cId, dId].sort(),
    );
    // Nothing to add is a no-op, not an error.
    expect(await store.addToSample('goldset', [])).toBe(0);
    // A different direction has its own, empty, sample.
    expect(await store.sampleItemIds('elsewhere')).toEqual([]);
  });
});

describe('DrizzleGoldenSet audits', () => {
  it('queues unaudited items, upserts one audit per reviewer, and scores', async () => {
    const store = new DrizzleGoldenSet(db);
    // No audits yet: no published score.
    expect(await store.quality('goldset')).toBeNull();

    // rev-1 sees the whole sample, no prior audits on any of it.
    const initial = await store.queueFor('goldset', 'rev-1', 10);
    expect(initial).toHaveLength(4);
    expect(initial.every((entry) => entry.priorAudit === null)).toBe(true);

    // rev-2 audits alfa; re-auditing it replaces the row, never doubles it.
    await store.saveAudit({
      itemId: aId,
      direction: 'goldset',
      reviewerId: 'rev-2',
      accuracy: 5,
      naturalness: 5,
      fit: 5,
      comment: 'first pass',
    });
    await store.saveAudit({
      itemId: aId,
      direction: 'goldset',
      reviewerId: 'rev-2',
      accuracy: 2,
      naturalness: 2,
      fit: 2,
      comment: 'reconsidered',
    });

    // rev-2 no longer sees alfa in their queue; rev-1 still does, now with the
    // peer's prior audit attached as context.
    const forRev2 = await store.queueFor('goldset', 'rev-2', 10);
    expect(forRev2.map((entry) => entry.itemId)).not.toContain(aId);
    expect(forRev2).toHaveLength(3);
    const forRev1 = await store.queueFor('goldset', 'rev-1', 10);
    const alfa = forRev1.find((entry) => entry.itemId === aId);
    expect(alfa?.priorAudit).toMatchObject({
      accuracy: 2,
      naturalness: 2,
      fit: 2,
      comment: 'reconsidered',
    });
    expect(typeof alfa?.priorAudit?.auditedAt).toBe('string');

    // rev-1 audits beta (4/4/4). Score is the mean of both audits' axes:
    // alfa mean 2, beta mean 4 → overall 3 of 5 → 50 of 100; two items.
    await store.saveAudit({
      itemId: bId,
      direction: 'goldset',
      reviewerId: 'rev-1',
      accuracy: 4,
      naturalness: 4,
      fit: 4,
      comment: null,
    });
    expect(await store.quality('goldset')).toEqual({
      score: 50,
      auditedItems: 2,
    });
    // The score is scoped to the direction.
    expect(await store.quality('elsewhere')).toBeNull();
    // An empty queue (limit 0) short-circuits cleanly.
    expect(await store.queueFor('goldset', 'rev-1', 0)).toEqual([]);
  });
});
