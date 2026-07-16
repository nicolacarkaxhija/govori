import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { DrizzleItemRepository } from './drizzle-item-repository.js';
import { DrizzleFlagStore } from '../flags/drizzle-flag-store.js';
import { importArtifact } from './import-artifact.js';

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
