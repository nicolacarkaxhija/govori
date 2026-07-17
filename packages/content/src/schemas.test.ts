import { describe, expect, it } from 'vitest';
import {
  ArtifactError,
  ContentArtifactSchema,
  ItemSchema,
  parseContentArtifact,
  parseCurriculumArtifact,
} from './index.js';

const validItem = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'sųd',
  translations: [{ lang: 'en', text: 'court' }],
  notes: [{ sourceLang: 'pl', text: 'false friend: not "sud" as vessel' }],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
  audit: { status: 'exempt-import', auditedAt: '2026-07-16T00:00:00Z' },
};

describe('ItemSchema', () => {
  it('accepts a fully specified imported item', () => {
    expect(ItemSchema.safeParse(validItem).success).toBe(true);
    expect(ItemSchema.safeParse({ ...validItem, frequency: 9.2 }).success).toBe(
      true,
    );
    expect(ItemSchema.safeParse({ ...validItem, frequency: -1 }).success).toBe(
      false,
    );
  });

  it('rejects non-canonical item text', () => {
    const cyrillic = { ...validItem, text: 'суд' };
    expect(ItemSchema.safeParse(cyrillic).success).toBe(false);
    const foreign = { ...validItem, text: 'quick' };
    expect(ItemSchema.safeParse(foreign).success).toBe(false);
  });

  it('requires at least one translation', () => {
    expect(
      ItemSchema.safeParse({ ...validItem, translations: [] }).success,
    ).toBe(false);
  });

  it('requires ai-draft provenance to name model and generation time', () => {
    const draft = {
      ...validItem,
      provenance: { origin: 'ai-draft', model: 'x-large' },
    };
    expect(ItemSchema.safeParse(draft).success).toBe(false);
    const complete = {
      ...validItem,
      provenance: {
        origin: 'ai-draft',
        model: 'x-large',
        generatedAt: '2026-07-16T00:00:00Z',
      },
      audit: {
        status: 'clean',
        maxOverlap: 0.12,
        auditedAt: '2026-07-16T00:00:00Z',
      },
    };
    expect(ItemSchema.safeParse(complete).success).toBe(true);
  });

  it('rejects unknown provenance origins', () => {
    expect(
      ItemSchema.safeParse({
        ...validItem,
        provenance: { origin: 'scraped' },
      }).success,
    ).toBe(false);
  });

  it('requires flagged audits to cite the overlapping reference', () => {
    expect(
      ItemSchema.safeParse({
        ...validItem,
        audit: {
          status: 'flagged',
          maxOverlap: 0.91,
          auditedAt: '2026-07-16T00:00:00Z',
        },
      }).success,
    ).toBe(false);
  });
});

describe('ContentArtifactSchema', () => {
  const artifact = {
    schemaVersion: 1,
    createdAt: '2026-07-16T00:00:00Z',
    producer: { name: 'govori-content-forge', version: '0.1.0' },
    items: [validItem],
  };

  it('accepts a versioned artifact with items', () => {
    expect(ContentArtifactSchema.safeParse(artifact).success).toBe(true);
  });

  it('rejects artifacts from a different schema version', () => {
    expect(
      ContentArtifactSchema.safeParse({ ...artifact, schemaVersion: 2 })
        .success,
    ).toBe(false);
  });

  it('rejects empty artifacts', () => {
    expect(
      ContentArtifactSchema.safeParse({ ...artifact, items: [] }).success,
    ).toBe(false);
  });
});

describe('parseContentArtifact', () => {
  it('returns typed data for a valid artifact', () => {
    const artifact = parseContentArtifact({
      schemaVersion: 1,
      createdAt: '2026-07-16T00:00:00Z',
      producer: { name: 'govori-content-forge', version: '0.1.0' },
      items: [validItem],
    });
    expect(artifact.items[0]?.text).toBe('sųd');
  });

  it('throws ArtifactError naming the offending path', () => {
    const broken = {
      schemaVersion: 1,
      createdAt: '2026-07-16T00:00:00Z',
      producer: { name: 'govori-content-forge', version: '0.1.0' },
      items: [{ ...validItem, text: 'суд' }],
    };
    expect(() => parseContentArtifact(broken)).toThrow(ArtifactError);
    expect(() => parseContentArtifact(broken)).toThrow(/items\.0\.text/);
  });
});

describe('parseCurriculumArtifact', () => {
  const curriculum = {
    schemaVersion: 1,
    createdAt: '2026-07-17T00:00:00Z',
    producer: { name: 'govori-content-forge', version: '0.1.0' },
    units: [
      {
        title: 'Jedinica 1',
        lessons: [
          {
            title: 'Lekcija 1',
            itemIds: ['3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f'],
          },
        ],
      },
    ],
  };

  it('accepts a structured curriculum', () => {
    expect(parseCurriculumArtifact(curriculum).units).toHaveLength(1);
  });

  it('rejects lessons without items, naming the path', () => {
    const broken = {
      ...curriculum,
      units: [
        { title: 'Jedinica 1', lessons: [{ title: 'Lekcija 1', itemIds: [] }] },
      ],
    };
    expect(() => parseCurriculumArtifact(broken)).toThrow(ArtifactError);
    expect(() => parseCurriculumArtifact(broken)).toThrow(
      /units\.0\.lessons\.0\.itemIds/,
    );
  });
});
