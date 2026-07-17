import { describe, expect, it } from 'vitest';
import {
  ArtifactError,
  ContentArtifactSchema,
  ItemSchema,
  PartOfSpeechSchema,
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

describe('part of speech', () => {
  it('accepts an item tagged with a normalized part of speech', () => {
    const tagged = { ...validItem, pos: 'noun', posDetail: 'm.anim.' };
    const parsed = ItemSchema.safeParse(tagged);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.pos).toBe('noun');
    expect(parsed.data?.posDetail).toBe('m.anim.');
  });

  it('accepts every value of the part-of-speech inventory', () => {
    for (const pos of PartOfSpeechSchema.options) {
      expect(ItemSchema.safeParse({ ...validItem, pos }).success).toBe(true);
    }
    expect(PartOfSpeechSchema.options).toEqual([
      'noun',
      'verb',
      'adjective',
      'adverb',
      'pronoun',
      'numeral',
      'preposition',
      'conjunction',
      'interjection',
      'particle',
      'phrase',
      'affix',
    ]);
  });

  it('rejects values outside the inventory', () => {
    expect(ItemSchema.safeParse({ ...validItem, pos: 'gerund' }).success).toBe(
      false,
    );
  });

  it('rejects a blank raw source tag', () => {
    expect(
      ItemSchema.safeParse({ ...validItem, pos: 'noun', posDetail: '  ' })
        .success,
    ).toBe(false);
  });

  it('keeps both fields optional for untagged items', () => {
    const parsed = ItemSchema.safeParse(validItem);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.pos).toBeUndefined();
    expect(parsed.data?.posDetail).toBeUndefined();
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

describe('lesson dialogues (ADR 0039)', () => {
  const base = {
    schemaVersion: 1,
    createdAt: '2026-07-17T00:00:00Z',
    producer: { name: 'govori-content-forge', version: '0.2.0' },
    units: [
      {
        title: 'Jedinica 1',
        lessons: [
          {
            title: 'Lekcija 1',
            itemIds: ['3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f'],
            dialogue: {
              turns: [
                {
                  speaker: 'Ana',
                  text: 'Kto jesi ty?',
                  translation: 'Who are you?',
                },
                {
                  speaker: 'Tomaš',
                  text: 'Ja jesm Tomaš.',
                  translation: 'I am Tomaš.',
                },
              ],
              provenance: {
                origin: 'ai-draft',
                model: 'calibration',
                generatedAt: '2026-07-17T12:00:00Z',
              },
            },
          },
        ],
      },
    ],
  };

  it('accepts a lesson with a dialogue and keeps it optional', () => {
    const parsed = parseCurriculumArtifact(base);
    expect(parsed.units[0]?.lessons[0]?.dialogue?.turns).toHaveLength(2);
    const withoutDialogue = {
      ...base,
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
    expect(
      parseCurriculumArtifact(withoutDialogue).units[0]?.lessons[0]?.dialogue,
    ).toBeUndefined();
  });

  const withDialogue = (dialogue: unknown) => ({
    ...base,
    units: [
      {
        title: 'Jedinica 1',
        lessons: [
          {
            title: 'Lekcija 1',
            itemIds: ['3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f'],
            dialogue,
          },
        ],
      },
    ],
  });

  it('rejects non-canonical dialogue text, naming the path', () => {
    const broken = withDialogue({
      turns: [
        { speaker: 'Ana', text: 'Кто jesi ty?', translation: 'Who are you?' },
      ],
      provenance: {
        origin: 'ai-draft',
        model: 'calibration',
        generatedAt: '2026-07-17T12:00:00Z',
      },
    });
    expect(() => parseCurriculumArtifact(broken)).toThrow(
      /units\.0\.lessons\.0\.dialogue\.turns\.0\.text/,
    );
  });

  it('rejects an empty dialogue', () => {
    const broken = withDialogue({
      turns: [],
      provenance: {
        origin: 'ai-draft',
        model: 'calibration',
        generatedAt: '2026-07-17T12:00:00Z',
      },
    });
    expect(() => parseCurriculumArtifact(broken)).toThrow(ArtifactError);
  });
});
