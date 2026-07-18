// These suites pin the deprecated forge-facing wrappers until the forge
// binds its own pack through makeContentSchemas.
/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, expect, it } from 'vitest';
import {
  ArtifactError,
  ContentArtifactSchema,
  ItemSchema,
  PartOfSpeechSchema,
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
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
  it('accepts every item kind and rejects outsiders', () => {
    for (const kind of ['word', 'phrase', 'sentence']) {
      expect(ItemSchema.safeParse({ ...validItem, kind }).success).toBe(true);
    }
    expect(ItemSchema.safeParse({ ...validItem, kind: 'letter' }).success).toBe(
      false,
    );
  });

  it('keeps translations intact and rejects blank or mistagged ones', () => {
    const parsed = ItemSchema.safeParse(validItem);
    expect(parsed.data?.translations).toEqual([{ lang: 'en', text: 'court' }]);
    for (const translation of [
      { lang: 'en', text: ' ' },
      { lang: 'Xen', text: 'court' },
      { lang: 'enX', text: 'court' },
    ]) {
      expect(
        ItemSchema.safeParse({ ...validItem, translations: [translation] })
          .success,
      ).toBe(false);
    }
    expect(
      ItemSchema.safeParse({
        ...validItem,
        translations: [{ lang: 'en-US', text: 'court' }],
      }).success,
    ).toBe(true);
  });

  it('names the BCP 47 expectation when a language tag is bad', () => {
    const result = ItemSchema.safeParse({
      ...validItem,
      translations: [{ lang: 'Xen', text: 'court' }],
    });
    expect(
      result.error?.issues.some((issue) =>
        issue.message.includes('BCP 47 language code'),
      ),
    ).toBe(true);
  });

  it('keeps notes intact, rejects blanks, and defaults to none', () => {
    const parsed = ItemSchema.safeParse(validItem);
    expect(parsed.data?.notes).toEqual([
      { sourceLang: 'pl', text: 'false friend: not "sud" as vessel' },
    ]);
    expect(
      ItemSchema.safeParse({
        ...validItem,
        notes: [{ sourceLang: 'pl', text: ' ' }],
      }).success,
    ).toBe(false);
    const { notes, ...noteless } = validItem;
    expect(notes).toHaveLength(1);
    expect(ItemSchema.safeParse(noteless).data?.notes).toEqual([]);
  });

  it('accepts human provenance with an opaque contributor id', () => {
    const parsed = ItemSchema.safeParse({
      ...validItem,
      provenance: { origin: 'human', contributorId: 'user-123' },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.provenance.origin).toBe('human');
  });

  it('accepts an ai draft citing its fact pack', () => {
    expect(
      ItemSchema.safeParse({
        ...validItem,
        provenance: {
          origin: 'ai-draft',
          model: 'x-large',
          generatedAt: '2026-07-16T00:00:00Z',
          factPack: 'fact-pack-v1',
        },
      }).success,
    ).toBe(true);
  });

  it('accepts a flagged audit that cites its reference', () => {
    const parsed = ItemSchema.safeParse({
      ...validItem,
      audit: {
        status: 'flagged',
        maxOverlap: 0.91,
        reference: 'unlicensed-source',
        auditedAt: '2026-07-16T00:00:00Z',
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.audit?.status).toBe('flagged');
  });

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

  it('keeps the producer stamp intact', () => {
    const artifact = parseContentArtifact({
      schemaVersion: 1,
      createdAt: '2026-07-16T00:00:00Z',
      producer: { name: 'govori-content-forge', version: '0.1.0' },
      items: [validItem],
    });
    expect(artifact.producer).toEqual({
      name: 'govori-content-forge',
      version: '0.1.0',
    });
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
    expect(() => parseContentArtifact(broken)).toThrow(
      /expected canonical text/,
    );
  });

  it('is a named error joining every issue with semicolons', () => {
    const twiceBroken = {
      schemaVersion: 1,
      createdAt: '2026-07-16T00:00:00Z',
      producer: { name: 'govori-content-forge', version: '0.1.0' },
      items: [{ ...validItem, text: 'суд', translations: [] }],
    };
    try {
      parseContentArtifact(twiceBroken);
      expect.unreachable('the artifact must not parse');
    } catch (error) {
      if (!(error instanceof ArtifactError)) {
        throw error;
      }
      expect(error.name).toBe('ArtifactError');
      expect(error.message).toContain('; ');
    }
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

  it('accepts a structured curriculum and keeps its shape', () => {
    const parsed = parseCurriculumArtifact(curriculum);
    expect(parsed.units).toHaveLength(1);
    expect(parsed.units[0]?.title).toBe('Jedinica 1');
    expect(parsed.units[0]?.lessons[0]?.title).toBe('Lekcija 1');
    expect(parsed.units[0]?.lessons[0]?.itemIds).toEqual([
      '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
    ]);
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
      /invalid curriculum artifact — units\.0\.lessons\.0\.itemIds/,
    );
  });
});

describe('parseMorphologyArtifact', () => {
  const artifact = {
    schemaVersion: 1,
    createdAt: '2026-07-17T00:00:00Z',
    producer: { name: 'govori-content-forge', version: '0.3.0' },
    entries: [
      {
        itemId: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
        pos: 'verb',
        forms: [
          { tag: 'past.m', text: 'byl' },
          { tag: 'past.f', text: 'byla' },
        ],
      },
    ],
  };

  it('returns typed data for a valid artifact', () => {
    const parsed = parseMorphologyArtifact(artifact);
    expect(parsed.entries[0]?.forms).toHaveLength(2);
    expect(parsed.entries[0]?.pos).toBe('verb');
  });

  it('rejects artifacts from a different schema version', () => {
    expect(() =>
      parseMorphologyArtifact({ ...artifact, schemaVersion: 2 }),
    ).toThrow(ArtifactError);
  });

  it('rejects artifacts without entries', () => {
    expect(() => parseMorphologyArtifact({ ...artifact, entries: [] })).toThrow(
      /entries/,
    );
  });

  const withEntry = (entry: object) => ({
    ...artifact,
    entries: [{ ...(artifact.entries[0] ?? {}), ...entry }],
  });

  it('rejects entries with fewer than two forms, naming the path', () => {
    const broken = withEntry({ forms: [{ tag: 'past.m', text: 'byl' }] });
    expect(() => parseMorphologyArtifact(broken)).toThrow(ArtifactError);
    expect(() => parseMorphologyArtifact(broken)).toThrow(/entries\.0\.forms/);
  });

  it('rejects non-canonical form text, naming the path', () => {
    const broken = withEntry({
      forms: [
        { tag: 'past.m', text: 'был' },
        { tag: 'past.f', text: 'byla' },
      ],
    });
    expect(() => parseMorphologyArtifact(broken)).toThrow(
      /entries\.0\.forms\.0\.text/,
    );
  });

  it('rejects blank form tags', () => {
    expect(() =>
      parseMorphologyArtifact(
        withEntry({
          forms: [
            { tag: ' ', text: 'byl' },
            { tag: 'past.f', text: 'byla' },
          ],
        }),
      ),
    ).toThrow(ArtifactError);
  });

  it('rejects parts of speech outside the inventory', () => {
    expect(() => parseMorphologyArtifact(withEntry({ pos: 'gerund' }))).toThrow(
      /entries\.0\.pos/,
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
