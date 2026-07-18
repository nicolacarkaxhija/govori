import { describe, expect, it } from 'vitest';
import { ArtifactError } from '@glotty/content';
import { importMorphologyArtifact } from './import-morphology.js';
import type { MorphologyEntry, MorphologyRepository } from './ports.js';

const artifact = {
  schemaVersion: 1,
  createdAt: '2026-07-18T00:00:00Z',
  producer: { name: 'govori-content-forge', version: '0.2.0' },
  entries: [
    {
      itemId: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
      pos: 'noun',
      forms: [
        { tag: 'sg.nom', text: 'voda' },
        { tag: 'sg.gen', text: 'vody' },
        { tag: 'pl.nom', text: 'vody' },
      ],
    },
    {
      itemId: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      pos: 'verb',
      forms: [
        { tag: 'inf', text: 'govoriti' },
        { tag: 'pres.1sg', text: 'govorju' },
      ],
    },
  ],
};

class FakeRepository implements MorphologyRepository {
  stored: MorphologyEntry[] = [];

  replaceForItems(entries: readonly MorphologyEntry[]): Promise<void> {
    this.stored.push(...entries);
    return Promise.resolve();
  }
}

describe('importMorphologyArtifact', () => {
  it('validates then replaces, reporting producer and counts', async () => {
    const repository = new FakeRepository();
    const result = await importMorphologyArtifact(artifact, repository);
    expect(result).toEqual({
      entries: 2,
      forms: 5,
      producer: 'govori-content-forge@0.2.0',
    });
    expect(repository.stored.map((entry) => entry.pos)).toEqual([
      'noun',
      'verb',
    ]);
  });

  it('rejects invalid artifacts before anything is written', async () => {
    const repository = new FakeRepository();
    await expect(
      importMorphologyArtifact({ ...artifact, schemaVersion: 2 }, repository),
    ).rejects.toThrow(ArtifactError);
    expect(repository.stored).toHaveLength(0);
  });

  it('rejects one-form paradigms at the seam (ADR 0037)', async () => {
    const repository = new FakeRepository();
    const truncated = {
      ...artifact,
      entries: [
        {
          itemId: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
          pos: 'noun',
          forms: [{ tag: 'sg.nom', text: 'voda' }],
        },
      ],
    };
    await expect(
      importMorphologyArtifact(truncated, repository),
    ).rejects.toThrow(ArtifactError);
    expect(repository.stored).toHaveLength(0);
  });
});
