import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { Item } from '@govori/content';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { DrizzleItemRepository } from './drizzle-item-repository.js';
import { DrizzleFlagStore } from '../flags/drizzle-flag-store.js';
import { importArtifact } from './import-artifact.js';
import { DrizzleStats } from '../stats/drizzle-stats.js';
import { DrizzleCourse } from '../course/drizzle-course.js';
import { DrizzleReviewQueue } from '../review/drizzle-review-queue.js';
import { DrizzleRecordingStore } from '../audio/drizzle-recording-store.js';

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
    const result = await importArtifact(artifact, repository);
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
    await importArtifact(updated, repository);
    expect(await repository.count()).toBe(3);
  });
});

describe('DrizzleItemRepository reads', () => {
  it('finds an item by id with translations and notes', async () => {
    const repository = new DrizzleItemRepository(db);
    const item = await repository.findById(
      '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
    );
    expect(item?.kind).toBe('sentence');
    expect(item?.translations).toHaveLength(2);
    expect(item?.notes).toEqual([{ sourceLang: 'pl', text: 'čista ≈ czysta' }]);
    expect(item?.audit?.status).toBe('clean');
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
      await course.lessonItems('00000000-0000-4000-8000-00000000dead'),
    ).toBeUndefined();
  });

  it('lists by frequency first, deterministically paginated', async () => {
    const repository = new DrizzleItemRepository(db);
    const first = await repository.list(2, 0);
    const rest = await repository.list(2, 2);
    expect(first).toHaveLength(2);
    expect(rest).toHaveLength(1);
    expect(first[0]?.text).toBe('voda');
    expect(first[0]?.frequency).toBeCloseTo(9.9, 5);
    const all = [...first, ...rest].map((item) => item.id);
    expect(new Set(all).size).toBe(3);
  });
});

describe('DrizzleItemRepository sentence search', () => {
  it('finds sentences containing a lesson word, whole-word and any case', async () => {
    const repository = new DrizzleItemRepository(db);
    const sentences = await repository.findSentencesContaining(['voda'], 20);
    expect(sentences.map((item) => item.text)).toEqual(['Voda je čista.']);
    expect(sentences[0]?.kind).toBe('sentence');
  });

  it('ignores partial-word matches and survives regex metacharacters', async () => {
    const repository = new DrizzleItemRepository(db);
    // "vod" must not match inside "Voda"; "č." must not act as a regex.
    expect(await repository.findSentencesContaining(['vod'], 20)).toEqual([]);
    expect(await repository.findSentencesContaining(['č.'], 20)).toEqual([]);
    expect(await repository.findSentencesContaining([], 20)).toEqual([]);
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
    expect(await queue.addPending([draft])).toBe(1);
    expect(await queue.addPending([draft])).toBe(0);
    const pending = await queue.listPending(10);
    expect(pending.map((item) => item.id)).toContain(draft.id);
    const decided = await queue.decide(draft.id, 'approved', 'user:test');
    expect(decided?.text).toBe('Hlěb jest dobry.');
    expect(await queue.decide(draft.id, 'approved', 'user:test')).toBe(
      undefined,
    );
    const after = await queue.listPending(10);
    expect(after.map((item) => item.id)).not.toContain(draft.id);
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
    await course.replaceCurriculum(curriculum);
    await course.replaceCurriculum(curriculum);
    const overview = await course.overview();
    expect(overview).toHaveLength(1);
    expect(overview[0]?.lessons[0]?.itemCount).toBe(2);
    const lessonId = overview[0]?.lessons[0]?.id ?? '';
    const lesson = await course.lessonItems(lessonId);
    expect(lesson?.title).toBe('Lekcija 1');
    expect(lesson?.items.map((item) => item.text)).toEqual([
      'Voda je čista.',
      'voda',
    ]);
  });
});

describe('DrizzleStats', () => {
  it('counts public aggregates from the live tables', async () => {
    const stats = new DrizzleStats(db);
    const counts = await stats.counts();
    expect(counts.items).toBe(3);
    expect(counts.translations).toBeGreaterThanOrEqual(4);
    expect(counts.reviews).toBe(0);
    expect(counts.learners).toBe(0);
  });
});

describe('DrizzleFlagStore', () => {
  it('stores states and appends to the audit trail', async () => {
    const store = new DrizzleFlagStore(db);
    await store.setFlag('audio', false, 'admin:setup');
    await store.setFlag('audio', true, 'admin:launch');
    expect(await store.getStates()).toEqual({ audio: true });
    const audit = await store.getAudit('audio');
    expect(audit.map((row) => row.enabled)).toEqual([false, true]);
    expect(audit.map((row) => row.changedBy)).toEqual([
      'admin:setup',
      'admin:launch',
    ]);
  });
});

describe('DrizzleRecordingStore', () => {
  it('roundtrips audio bytes and lists per item in insertion order', async () => {
    const store = new DrizzleRecordingStore(db);
    const itemId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';
    const first = {
      id: 'aa0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
      itemId,
      contributorId: 'u-accent-a',
      mime: 'audio/webm',
      bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff]),
    };
    await store.add(first);
    await store.add({
      ...first,
      id: 'bb0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
      contributorId: 'u-accent-b',
      mime: 'audio/ogg',
    });
    const listed = await store.listForItem(itemId);
    expect(listed.map((row) => row.mime)).toEqual(['audio/webm', 'audio/ogg']);
    expect(listed.map((row) => row.contributorId)).toEqual([
      'u-accent-a',
      'u-accent-b',
    ]);
    const served = await store.get(first.id);
    expect(served?.mime).toBe('audio/webm');
    expect([...(served?.bytes ?? [])]).toEqual([
      0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff,
    ]);
    expect(await store.get('00000000-0000-4000-8000-00000000beef')).toBe(
      undefined,
    );
    expect(
      await store.listForItem('00000000-0000-4000-8000-00000000dead'),
    ).toEqual([]);
  });
});
