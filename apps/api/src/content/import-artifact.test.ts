import { describe, expect, it } from 'vitest';
import { ArtifactError, type Item } from '@glotty/content';
import { testSchemas } from '../test-support.js';
import { importArtifact } from './import-artifact.js';
import type { ItemRepository } from './ports.js';

const item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'voda',
  translations: [{ lang: 'en', text: 'water' }],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
  audit: { status: 'exempt-import', auditedAt: '2026-07-16T00:00:00Z' },
};

const artifact = {
  schemaVersion: 1,
  createdAt: '2026-07-16T00:00:00Z',
  producer: { name: 'govori-content-forge', version: '0.1.0' },
  items: [item],
};

class FakeRepository implements ItemRepository {
  stored: Item[] = [];

  upsertMany(items: readonly Item[]): Promise<void> {
    this.stored.push(...items);
    return Promise.resolve();
  }

  count(): Promise<number> {
    return Promise.resolve(this.stored.length);
  }
}

describe('importArtifact', () => {
  it('validates then upserts, reporting the producer', async () => {
    const repository = new FakeRepository();
    const result = await importArtifact(
      artifact,
      repository,
      testSchemas.parseContentArtifact,
    );
    expect(result).toEqual({
      imported: 1,
      producer: 'govori-content-forge@0.1.0',
    });
    expect(repository.stored[0]?.text).toBe('voda');
  });

  it('rejects invalid artifacts before anything is written', async () => {
    const repository = new FakeRepository();
    await expect(
      importArtifact(
        { ...artifact, schemaVersion: 2 },
        repository,
        testSchemas.parseContentArtifact,
      ),
    ).rejects.toThrow(ArtifactError);
    expect(await repository.count()).toBe(0);
  });
});
