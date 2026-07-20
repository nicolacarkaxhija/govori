import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { type Item } from '@glotty/content';
import { testSchemas } from '../test-support.js';
import { createDb, type Db } from '../db/client.js';

const {
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
} = testSchemas;
import { backfillDirections, runMigrations } from '../db/migrate.js';
import { items as itemsTable } from '../db/schema.js';
import { DrizzleItemRepository } from './drizzle-item-repository.js';
import { DrizzleFlagStore } from '../flags/drizzle-flag-store.js';
import { importArtifact } from './import-artifact.js';
import { DrizzleStats } from '../stats/drizzle-stats.js';
import { DrizzleCourse } from '../course/drizzle-course.js';
import { DrizzleReviewQueue } from '../review/drizzle-review-queue.js';
import { DrizzleVoteStore } from '../review/drizzle-vote-store.js';
import { DrizzleRecordingStore } from '../audio/drizzle-recording-store.js';
import { DrizzleAccount } from '../account/drizzle-account.js';
import { DrizzleMorphologyRepository } from '../morphology/drizzle-morphology-repository.js';
import { importMorphologyArtifact } from '../morphology/import-morphology.js';
import { DrizzleExport } from '../export/drizzle-export.js';
import { DrizzleEntitlements } from '../entitlements/drizzle-entitlements.js';

let container: StartedPostgreSqlContainer;
let db: Db;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  db = createDb(container.getConnectionUri());
  await runMigrations(db);
}, 120_000);

afterAll(async () => {
  await container.stop();
});

const artifact = {
  schemaVersion: 1,
  createdAt: '2026-07-16T00:00:00Z',
  producer: { name: 'govori-content-forge', version: '0.1.0' },
  items: [
    {
      id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
      kind: 'word',
      text: 'voda',
      frequency: 9.9,
      pos: 'noun',
      posDetail: 'f.',
      translations: [{ lang: 'en', text: 'water' }],
      notes: [],
      provenance: {
        origin: 'import',
        source: 'medzuslovjansky/slovnik',
        license: 'MIT',
        attribution: 'Interslavic community dictionary',
      },
      audit: { status: 'exempt-import', auditedAt: '2026-07-16T00:00:00Z' },
    },
    {
      // Human contributions carry no originality audit (ADR 0035).
      id: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
      kind: 'phrase',
      text: 'dobry denj',
      pos: 'phrase',
      translations: [{ lang: 'en', text: 'good day' }],
      notes: [],
      provenance: {
        origin: 'human',
        contributorId: '7c6d5e4f-3a2b-4c1d-9e8f-7a6b5c4d3e2f',
      },
    },
    {
      id: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      kind: 'sentence',
      text: 'Voda je čista.',
      translations: [
        { lang: 'en', text: 'The water is clean.' },
        { lang: 'pl', text: 'Woda jest czysta.' },
      ],
      notes: [{ sourceLang: 'pl', text: 'čista ≈ czysta' }],
      provenance: {
        origin: 'ai-draft',
        model: 'calibration',
        generatedAt: '2026-07-16T00:00:00Z',
      },
      audit: {
        status: 'clean',
        maxOverlap: 0.05,
        auditedAt: '2026-07-16T00:00:00Z',
      },
    },
  ],
};

describe('DrizzleItemRepository through importArtifact', () => {
  it('imports an artifact into Postgres', async () => {
    const repository = new DrizzleItemRepository(db);
    const result = await importArtifact(
      artifact,
      repository,
      parseContentArtifact,
      'isv',
    );
    expect(result.imported).toBe(3);
    expect(await repository.count()).toBe(3);
  });

  it('reimports idempotently, updating in place', async () => {
    const repository = new DrizzleItemRepository(db);
    const updated = {
      ...artifact,
      items: artifact.items.map((item, index) =>
        index === 0
          ? { ...item, translations: [{ lang: 'en', text: 'water (n.)' }] }
          : item,
      ),
    };
    await importArtifact(updated, repository, parseContentArtifact, 'isv');
    expect(await repository.count()).toBe(3);
  });
});

describe('backfillDirections', () => {
  it('stamps direction-less rows once and leaves stamped rows alone', async () => {
    const repository = new DrizzleItemRepository(db);
    // A pre-direction row, exactly as a deployment migrated from 0011
    // would hold it: the column exists, but nothing has filled it.
    const strayId = 'cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';
    await db.insert(itemsTable).values({
      id: strayId,
      kind: 'word',
      text: 'sněg',
      provenance: {
        origin: 'human',
        contributorId: 'u-legacy',
      },
    });
    // Invalid until backfilled: adapters treat NULL rows as absent.
    expect(await repository.findById(strayId)).toBeUndefined();
    await backfillDirections(db, 'legacy');
    const found = await repository.findById(strayId);
    expect(found?.direction).toBe('legacy');
    // A second run with another id must not restamp settled rows —
    // neither the stray nor the rows imported directly into 'isv'.
    await backfillDirections(db, 'other');
    expect((await repository.findById(strayId))?.direction).toBe('legacy');
    expect(
      (await repository.findById(artifact.items[0]?.id ?? ''))?.direction,
    ).toBe('isv');
    // Pools stay isolated: the stray never surfaces in the isv pool.
    const listed = await repository.list('isv', 10, 0);
    expect(listed.map((item) => item.id)).not.toContain(strayId);
  });
});

describe('DrizzleItemRepository reads', () => {
  it('finds an item by id with its direction, translations and notes', async () => {
    const repository = new DrizzleItemRepository(db);
    const found = await repository.findById(
      '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
    );
    expect(found?.direction).toBe('isv');
    expect(found?.item.kind).toBe('sentence');
    expect(found?.item.translations).toHaveLength(2);
    expect(found?.item.notes).toEqual([
      { sourceLang: 'pl', text: 'čista ≈ czysta' },
    ]);
    expect(found?.item.audit?.status).toBe('clean');
  });

  it('returns undefined for unknown ids', async () => {
    const repository = new DrizzleItemRepository(db);
    expect(
      await repository.findById('00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();
  });

  it('answers unknown lookups defensively', async () => {
    const repository = new DrizzleItemRepository(db);
    expect(await repository.findByIds([])).toEqual([]);
    const course = new DrizzleCourse(db, repository);
    expect(
      await course.lessonItems('00000000-0000-4000-8000-00000000dead', 'isv'),
    ).toBeUndefined();
  });

  it('lists by frequency first, deterministically paginated', async () => {
    const repository = new DrizzleItemRepository(db);
    const first = await repository.list('isv', 2, 0);
    const rest = await repository.list('isv', 2, 2);
    expect(first).toHaveLength(2);
    expect(rest).toHaveLength(1);
    expect(first[0]?.text).toBe('voda');
    expect(first[0]?.frequency).toBeCloseTo(9.9, 5);
    expect(first[0]?.pos).toBe('noun');
    expect(first[0]?.posDetail).toBe('f.');
    // Items without a part of speech omit the fields entirely.
    expect(Object.keys(rest[0] ?? {})).not.toContain('pos');
    const all = [...first, ...rest].map((item) => item.id);
    expect(new Set(all).size).toBe(3);
  });

  it('round-trips attestation, difficulty, and per-sense translations', async () => {
    const repository = new DrizzleItemRepository(db);
    const wordId = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
    const sentenceId = '2b3c4d5e-6f7a-4b2c-8d3e-4f5a6b7c8d9e';
    await repository.upsertMany(
      [
        {
          id: wordId,
          kind: 'word',
          text: 'gjuha',
          attestation: 'gold',
          translations: [
            { lang: 'en', text: 'language', senseGroup: 0 },
            { lang: 'en', text: 'tongue', senseGroup: 1 },
          ],
          notes: [],
          provenance: {
            origin: 'import',
            source: 'medzuslovjansky/slovnik',
            license: 'MIT',
            attribution: 'Interslavic community dictionary',
          },
        },
        {
          id: sentenceId,
          kind: 'sentence',
          text: 'Kjo është një provë.',
          difficulty: 0.42,
          translations: [{ lang: 'en', text: 'This is a test.' }],
          notes: [],
          provenance: {
            origin: 'ai-draft',
            model: 'calibration',
            generatedAt: '2026-07-16T00:00:00Z',
          },
        },
      ],
      // A throwaway direction, so this fixture never perturbs the 'isv'
      // counts other tests in this file depend on.
      'quality-fixture',
    );
    const [word, sentence] = await repository.findByIds([wordId, sentenceId]);
    expect(word?.attestation).toBe('gold');
    expect(word?.translations).toEqual([
      { lang: 'en', text: 'language', senseGroup: 0 },
      { lang: 'en', text: 'tongue', senseGroup: 1 },
    ]);
    expect(sentence?.difficulty).toBeCloseTo(0.42, 5);
    // A translation without a sense group omits the field entirely.
    expect(sentence?.translations[0]).toEqual({
      lang: 'en',
      text: 'This is a test.',
    });
  });
});

describe('DrizzleItemRepository sentence search', () => {
  it('finds sentences containing a lesson word, whole-word and any case', async () => {
    const repository = new DrizzleItemRepository(db);
    const sentences = await repository.findSentencesContaining(
      'isv',
      ['voda'],
      20,
    );
    expect(sentences.map((item) => item.text)).toEqual(['Voda je čista.']);
    expect(sentences[0]?.kind).toBe('sentence');
  });

  it('searches only inside the asked direction', async () => {
    const repository = new DrizzleItemRepository(db);
    expect(
      await repository.findSentencesContaining('other', ['voda'], 20),
    ).toEqual([]);
  });

  it('ignores partial-word matches and survives regex metacharacters', async () => {
    const repository = new DrizzleItemRepository(db);
    // "vod" must not match inside "Voda"; "č." must not act as a regex.
    expect(
      await repository.findSentencesContaining('isv', ['vod'], 20),
    ).toEqual([]);
    expect(await repository.findSentencesContaining('isv', ['č.'], 20)).toEqual(
      [],
    );
    expect(await repository.findSentencesContaining('isv', [], 20)).toEqual([]);
  });
});

describe('DrizzleReviewQueue', () => {
  it('queues once, lists pending, and decides exactly once', async () => {
    const queue = new DrizzleReviewQueue(db);
    const draft: Item = {
      id: '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d',
      kind: 'sentence',
      text: 'Hlěb jest dobry.',
      translations: [{ lang: 'en', text: 'The bread is good.' }],
      notes: [],
      provenance: {
        origin: 'ai-draft',
        model: 'calibration',
        generatedAt: '2026-07-17T12:00:00.000Z',
      },
      audit: {
        status: 'clean',
        maxOverlap: 0,
        auditedAt: '2026-07-17T13:00:00.000Z',
      },
    };
    expect(await queue.addPending([draft], 'isv')).toBe(1);
    expect(await queue.addPending([draft], 'isv')).toBe(0);
    const pending = await queue.listPending(10);
    expect(pending.map((item) => item.id)).toContain(draft.id);
    const decided = await queue.decide(draft.id, 'approved', 'user:test');
    expect(decided?.item.text).toBe('Hlěb jest dobry.');
    expect(decided?.direction).toBe('isv');
    expect(await queue.decide(draft.id, 'approved', 'user:test')).toBe(
      undefined,
    );
    const after = await queue.listPending(10);
    expect(after.map((item) => item.id)).not.toContain(draft.id);
  });
});

describe('DrizzleVoteStore', () => {
  it('upserts one vote per voter and tallies with the caller vote', async () => {
    const queue = new DrizzleReviewQueue(db);
    const votes = new DrizzleVoteStore(db);
    const draft: Item = {
      id: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
      kind: 'word',
      text: 'sněg',
      translations: [{ lang: 'en', text: 'snow' }],
      notes: [],
      provenance: {
        origin: 'ai-draft',
        model: 'calibration',
        generatedAt: '2026-07-17T12:00:00.000Z',
      },
      audit: {
        status: 'clean',
        maxOverlap: 0,
        auditedAt: '2026-07-17T13:00:00.000Z',
      },
    };
    await queue.addPending([draft], 'isv');
    expect((await queue.findPending(draft.id))?.item.text).toBe('sněg');

    expect(await votes.castVote(draft.id, 'voter-a', true)).toEqual({
      upvotes: 1,
      downvotes: 0,
    });
    expect(await votes.castVote(draft.id, 'voter-b', false)).toEqual({
      upvotes: 1,
      downvotes: 1,
    });
    // A change of heart replaces the earlier ballot, never doubles it.
    expect(await votes.castVote(draft.id, 'voter-b', true)).toEqual({
      upvotes: 2,
      downvotes: 0,
    });

    const tallies = await votes.talliesFor([draft.id], 'voter-a');
    expect(tallies.get(draft.id)).toEqual({
      upvotes: 2,
      downvotes: 0,
      myVote: true,
    });
    const stranger = await votes.talliesFor([draft.id], 'voter-zzz');
    expect(stranger.get(draft.id)?.myVote).toBeNull();
    expect((await votes.talliesFor([], 'voter-a')).size).toBe(0);

    await queue.decide(draft.id, 'approved', 'community:vote');
    expect(await queue.findPending(draft.id)).toBeUndefined();
  });
});

describe('DrizzleCourse', () => {
  it('replaces the curriculum and serves ordered lesson items', async () => {
    const repository = new DrizzleItemRepository(db);
    const course = new DrizzleCourse(db, repository);
    const curriculum = {
      schemaVersion: 1 as const,
      createdAt: '2026-07-17T00:00:00Z',
      producer: { name: 'test', version: '0.0.1' },
      units: [
        {
          title: 'Jedinica 1',
          lessons: [
            {
              title: 'Lekcija 1',
              itemIds: [
                '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
                '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
              ],
            },
          ],
        },
      ],
    };
    await course.replaceCurriculum(curriculum, 'isv');
    await course.replaceCurriculum(curriculum, 'isv');
    const overview = await course.overview('isv');
    expect(overview).toHaveLength(1);
    expect(overview[0]?.lessons[0]?.itemCount).toBe(2);
    const lessonId = overview[0]?.lessons[0]?.id ?? '';
    const lesson = await course.lessonItems(lessonId, 'isv');
    expect(lesson?.title).toBe('Lekcija 1');
    expect(lesson?.items.map((item) => item.text)).toEqual([
      'Voda je čista.',
      'voda',
    ]);
    // Another direction sees neither the units nor the lesson.
    expect(await course.overview('other')).toEqual([]);
    expect(await course.lessonItems(lessonId, 'other')).toBeUndefined();
  });
});

describe('DrizzleStats', () => {
  it('counts public aggregates inside one direction', async () => {
    const stats = new DrizzleStats(db);
    const counts = await stats.counts('isv');
    expect(counts.items).toBe(3);
    expect(counts.translations).toBeGreaterThanOrEqual(4);
    expect(counts.reviews).toBe(0);
    expect(counts.learners).toBe(0);
    // The stray legacy pool never leaks into another direction's stats.
    const other = await stats.counts('other');
    expect(other.items).toBe(0);
    expect(other.translations).toBe(0);
  });
});

describe('DrizzleFlagStore', () => {
  it('stores states and appends to the audit trail', async () => {
    const store = new DrizzleFlagStore(db);
    await store.setFlag('audio', false, 'admin:setup');
    await store.setFlag('audio', true, 'admin:launch');
    expect(await store.getStates()).toEqual({
      audio: { enabled: true, targetRole: 'all' },
    });
    const audit = await store.getAudit('audio');
    expect(audit.map((row) => row.enabled)).toEqual([false, true]);
    expect(audit.map((row) => row.changedBy)).toEqual([
      'admin:setup',
      'admin:launch',
    ]);
  });

  it('sets a ring and keeps it across a plain on/off flip', async () => {
    const store = new DrizzleFlagStore(db);
    await store.setFlag('social', true, 'admin:ring', 'reviewer');
    // A later flip without a ring must not widen visibility back to all.
    await store.setFlag('social', false, 'admin:flip');
    expect(await store.getStates()).toMatchObject({
      social: { enabled: false, targetRole: 'reviewer' },
    });
    const audit = await store.getAudit('social');
    expect(audit.map((row) => row.targetRole)).toEqual([
      'reviewer',
      'reviewer',
    ]);
  });
});

describe('DrizzleRecordingStore', () => {
  const itemId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
  const clip = (
    overrides: Partial<Parameters<DrizzleRecordingStore['add']>[0]> = {},
  ): Parameters<DrizzleRecordingStore['add']>[0] => ({
    id: 'aa0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
    itemId,
    direction: 'isv',
    contributorId: 'u-accent-a',
    speakerPseudonym: 'spk_a',
    accentTag: 'south',
    mime: 'audio/webm',
    bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff]),
    deviceMeta: { mime: 'audio/webm', durationMs: 130_000 },
    consentVersion: 'v1',
    consentApp: true,
    consentDataset: false,
    consentTraining: false,
    ...overrides,
  });

  it('stores dataset-grade metadata and serves bytes back', async () => {
    const store = new DrizzleRecordingStore(db);
    await store.add(clip());
    const record = await store.findById(clip().id);
    expect(record?.status).toBe('pending');
    expect(record?.direction).toBe('isv');
    expect(record?.contributorId).toBe('u-accent-a');
    expect(record?.deletedAt).toBeNull();
    const served = await store.get(clip().id);
    expect(served?.mime).toBe('audio/webm');
    expect([...(served?.bytes ?? [])]).toEqual([
      0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff,
    ]);
    expect(await store.get('00000000-0000-4000-8000-00000000beef')).toBe(
      undefined,
    );
    expect(await store.findById('00000000-0000-4000-8000-00000000beef')).toBe(
      undefined,
    );
  });

  it('lists only verified, non-tombstoned clips per item', async () => {
    const store = new DrizzleRecordingStore(db);
    // A fresh item so the pool is clean for this assertion.
    const otherItem = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
    await store.add(
      clip({ id: 'cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d', itemId: otherItem }),
    );
    // Pending: not yet public.
    expect(
      (await store.listForItem(otherItem)).some(
        (row) => row.id === 'cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
      ),
    ).toBe(false);
    // Three up-votes verify it.
    for (const voter of ['v1', 'v2', 'v3']) {
      await store.castVote('cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d', voter, true);
    }
    const credit = await store.verify('cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d');
    expect(credit).toMatchObject({
      secondsValidated: 130,
      premiumDaysGranted: 7,
    });
    expect(typeof credit?.grantedAt).toBe('string');
    const listed = await store.listForItem(otherItem);
    expect(
      listed.some((row) => row.id === 'cc0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d'),
    ).toBe(true);
    expect(
      await store.listForItem('00000000-0000-4000-8000-00000000dead'),
    ).toEqual([]);
  });

  it('verifies once, tallies votes, and never double-credits', async () => {
    const store = new DrizzleRecordingStore(db);
    const id = 'dd0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';
    await store.add(clip({ id, contributorId: 'u-credit' }));
    expect(await store.castVote(id, 'a', true)).toEqual({
      upvotes: 1,
      downvotes: 0,
    });
    // A change of heart replaces the ballot, never doubles it.
    expect(await store.castVote(id, 'a', false)).toEqual({
      upvotes: 0,
      downvotes: 1,
    });
    expect(await store.castVote(id, 'a', true)).toEqual({
      upvotes: 1,
      downvotes: 0,
    });
    const first = await store.verify(id);
    expect(first?.premiumDaysGranted).toBe(7);
    // A second verify is a no-op: the row is no longer pending.
    expect(await store.verify(id)).toBeUndefined();
    // A second clip from the same contributor accrues onto the ledger.
    const second = 'ee0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';
    await store.add(clip({ id: second, contributorId: 'u-credit' }));
    const grew = await store.verify(second);
    expect(grew).toMatchObject({
      secondsValidated: 260,
      premiumDaysGranted: 14,
    });
    const mine = await store.mine('u-credit');
    expect(mine.credit).toMatchObject({
      secondsValidated: 260,
      premiumDaysGranted: 14,
    });
    expect(mine.recordings.map((row) => row.id)).toContain(id);
    expect(mine.recordings[0]?.consentApp).toBe(true);
  });
});

describe('dataset manifests honour the deletion tombstone', () => {
  const itemId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
  const withdrawnId = 'ff0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';

  it('drops a withdrawn clip from future builds but keeps shipped ones', async () => {
    const store = new DrizzleRecordingStore(db);
    // A verified, dataset-consented clip is eligible for the corpus.
    await store.add({
      id: withdrawnId,
      itemId,
      direction: 'isv',
      contributorId: 'u-withdraw',
      speakerPseudonym: 'spk_w',
      accentTag: null,
      mime: 'audio/webm',
      bytes: new Uint8Array([0x01, 0x02, 0x03]),
      deviceMeta: { mime: 'audio/webm', durationMs: 130_000 },
      consentVersion: 'v1',
      consentApp: true,
      consentDataset: true,
      consentTraining: false,
    });
    for (const voter of ['a', 'b', 'c']) {
      await store.castVote(withdrawnId, voter, true);
    }
    await store.verify(withdrawnId);

    // The build that ships includes it.
    const shipped = await store.buildDatasetManifest('ds-v1');
    expect(shipped.recordingIds).toContain(withdrawnId);

    // The contributor erases their account: the clip is tombstoned, its
    // audio dropped, its attribution gone — but the row remains.
    await new DrizzleAccount(db).deleteAccount('u-withdraw');
    const record = await store.findById(withdrawnId);
    expect(record?.deletedAt).not.toBeNull();
    expect(await store.get(withdrawnId)).toBeUndefined();
    expect((await store.mine('u-withdraw')).recordings).toEqual([]);

    // A later build no longer carries the withdrawn clip...
    const rebuilt = await store.buildDatasetManifest('ds-v2');
    expect(rebuilt.recordingIds).not.toContain(withdrawnId);
    // ...but the version it already shipped in stays non-recallable.
    expect(await store.getManifest('ds-v1')).toContain(withdrawnId);
    expect(await store.getManifest('unshipped')).toBeUndefined();
  });
});

describe('DrizzleEntitlements', () => {
  it('grants, lists oldest-first, and re-grants idempotently', async () => {
    const store = new DrizzleEntitlements(db);
    const first = await store.grant({
      userId: 'u-buyer',
      sku: 'fol/en/a1',
      source: 'founder',
    });
    expect(first).toMatchObject({
      userId: 'u-buyer',
      sku: 'fol/en/a1',
      source: 'founder',
    });
    expect(typeof first.grantedAt).toBe('string');
    await store.grant({
      userId: 'u-buyer',
      sku: 'fol/en/a2',
      source: 'purchase',
    });
    const held = await store.listForUser('u-buyer');
    expect(held.map((entitlement) => entitlement.sku)).toEqual([
      'fol/en/a1',
      'fol/en/a2',
    ]);
    // A second grant of the same SKU refreshes it in place, never duplicates.
    await store.grant({
      userId: 'u-buyer',
      sku: 'fol/en/a1',
      source: 'purchase',
    });
    const regranted = await store.listForUser('u-buyer');
    expect(regranted).toHaveLength(2);
    expect(
      regranted.find((entitlement) => entitlement.sku === 'fol/en/a1')?.source,
    ).toBe('purchase');
    expect(await store.listForUser('u-nobody')).toEqual([]);
  });
});

describe('DrizzleMorphologyRepository through importMorphologyArtifact', () => {
  const vodaId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
  const morphology = {
    schemaVersion: 1,
    createdAt: '2026-07-18T00:00:00Z',
    producer: { name: 'govori-content-forge', version: '0.2.0' },
    entries: [
      {
        itemId: vodaId,
        pos: 'noun',
        forms: [
          { tag: 'sg.nom', text: 'voda' },
          { tag: 'sg.gen', text: 'vody' },
          { tag: 'pl.nom', text: 'vody' },
        ],
      },
    ],
  };

  it('imports a paradigm and serves its forms', async () => {
    const repository = new DrizzleMorphologyRepository(db);
    const result = await importMorphologyArtifact(
      morphology,
      repository,
      parseMorphologyArtifact,
    );
    expect(result).toEqual({
      entries: 1,
      forms: 3,
      producer: 'govori-content-forge@0.2.0',
    });
    expect(await repository.formsFor(vodaId)).toEqual([
      { tag: 'pl.nom', text: 'vody' },
      { tag: 'sg.gen', text: 'vody' },
      { tag: 'sg.nom', text: 'voda' },
    ]);
  });

  it('reimports idempotently, replacing each paradigm wholesale', async () => {
    const repository = new DrizzleMorphologyRepository(db);
    const trimmed = {
      ...morphology,
      entries: [
        {
          itemId: vodaId,
          pos: 'noun',
          forms: [
            { tag: 'sg.nom', text: 'voda' },
            { tag: 'sg.dat', text: 'vodě' },
          ],
        },
      ],
    };
    await importMorphologyArtifact(
      trimmed,
      repository,
      parseMorphologyArtifact,
    );
    await importMorphologyArtifact(
      trimmed,
      repository,
      parseMorphologyArtifact,
    );
    expect(await repository.formsFor(vodaId)).toEqual([
      { tag: 'sg.dat', text: 'vodě' },
      { tag: 'sg.nom', text: 'voda' },
    ]);
  });

  it('answers unknown items with an empty paradigm', async () => {
    const repository = new DrizzleMorphologyRepository(db);
    expect(
      await repository.formsFor('00000000-0000-4000-8000-00000000dead'),
    ).toEqual([]);
    await repository.replaceForItems([]);
  });
});

describe('DrizzleExport', () => {
  const vodaId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
  const phraseId = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d';
  const sentenceId = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

  it('exports every item of the direction so our importer accepts it back', async () => {
    const exporter = new DrizzleExport(db);
    const exported = await exporter.allItems('isv');
    expect(exported.map((item) => item.text)).toEqual([
      'voda',
      'dobry denj',
      'Voda je čista.',
    ]);
    expect(exported[0]?.pos).toBe('noun');
    expect(exported[0]?.posDetail).toBe('f.');
    expect(exported[2]?.translations).toHaveLength(2);
    expect(exported[2]?.notes).toEqual([
      { sourceLang: 'pl', text: 'čista ≈ czysta' },
    ]);
    const roundTrip = parseContentArtifact({
      schemaVersion: 1,
      createdAt: '2026-07-18T00:00:00Z',
      producer: { name: 'glotty-api', version: '1' },
      items: exported,
    });
    expect(roundTrip.items).toHaveLength(3);
  });

  it('exports the live course as a curriculum artifact, dialogue included', async () => {
    const repository = new DrizzleItemRepository(db);
    const course = new DrizzleCourse(db, repository);
    await course.replaceCurriculum(
      {
        schemaVersion: 1,
        createdAt: '2026-07-18T00:00:00Z',
        producer: { name: 'test', version: '0.0.1' },
        units: [
          {
            title: 'Jedinica 1',
            lessons: [
              {
                title: 'Lekcija 1',
                itemIds: [sentenceId, vodaId],
                dialogue: {
                  turns: [
                    {
                      speaker: 'Mila',
                      text: 'Dobry denj!',
                      translation: 'Good day!',
                    },
                  ],
                  provenance: {
                    origin: 'human',
                    contributorId: 'u-author',
                  },
                },
              },
              { title: 'Lekcija 2', itemIds: [phraseId] },
            ],
          },
        ],
      },
      'isv',
    );
    const exporter = new DrizzleExport(db);
    const units = await exporter.curriculumUnits('isv');
    expect(await exporter.curriculumUnits('other')).toEqual([]);
    const roundTrip = parseCurriculumArtifact({
      schemaVersion: 1,
      createdAt: '2026-07-18T00:00:00Z',
      producer: { name: 'glotty-api', version: '1' },
      units,
    });
    expect(roundTrip.units).toHaveLength(1);
    expect(roundTrip.units[0]?.lessons.map((lesson) => lesson.title)).toEqual([
      'Lekcija 1',
      'Lekcija 2',
    ]);
    expect(roundTrip.units[0]?.lessons[0]?.itemIds).toEqual([
      sentenceId,
      vodaId,
    ]);
    expect(roundTrip.units[0]?.lessons[0]?.dialogue?.turns[0]?.speaker).toBe(
      'Mila',
    );
    expect(roundTrip.units[0]?.lessons[1]?.dialogue).toBeUndefined();
  });

  it('exports only drillable paradigms as a morphology artifact', async () => {
    const morphologyRepository = new DrizzleMorphologyRepository(db);
    // A formful item without a part of speech and a one-form paradigm
    // cannot appear in a valid artifact; the exporter must skip both.
    await morphologyRepository.replaceForItems([
      {
        itemId: phraseId,
        pos: 'phrase',
        forms: [{ tag: 'only', text: 'dobry denj' }],
      },
      {
        itemId: sentenceId,
        pos: 'phrase',
        forms: [
          { tag: 'a', text: 'Voda je čista.' },
          { tag: 'b', text: 'Vody sųt čisty.' },
        ],
      },
    ]);
    const exporter = new DrizzleExport(db);
    const entries = await exporter.morphologyEntries('isv');
    expect(await exporter.morphologyEntries('other')).toEqual([]);
    const roundTrip = parseMorphologyArtifact({
      schemaVersion: 1,
      createdAt: '2026-07-18T00:00:00Z',
      producer: { name: 'glotty-api', version: '1' },
      entries,
    });
    // Only voda both carries a pos and keeps a two-form paradigm.
    expect(roundTrip.entries.map((entry) => entry.itemId)).toEqual([vodaId]);
    expect(roundTrip.entries[0]?.pos).toBe('noun');
    expect(roundTrip.entries[0]?.forms).toEqual([
      { tag: 'sg.dat', text: 'vodě' },
      { tag: 'sg.nom', text: 'voda' },
    ]);
  });
});
