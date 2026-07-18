import { describe, expect, it } from 'vitest';
import { ArtifactError, makeContentSchemas } from './index.js';

// A deliberately non-Interslavic validator: canonical means "no letter q".
const schemas = makeContentSchemas((text) => !text.includes('q'));

const item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'shqip',
  translations: [{ lang: 'en', text: 'Albanian' }],
  provenance: {
    origin: 'import',
    source: 'somewhere',
    license: 'MIT',
    attribution: 'someone',
  },
};

const artifact = {
  schemaVersion: 1,
  createdAt: '2026-07-18T00:00:00Z',
  producer: { name: 'fol-forge', version: '0.1.0' },
  items: [item],
};

describe('makeContentSchemas', () => {
  it('judges canonical text through the injected validator only', () => {
    expect(schemas.ItemSchema.safeParse(item).success).toBe(false);
    expect(
      schemas.ItemSchema.safeParse({ ...item, text: 'gjuha' }).success,
    ).toBe(true);
  });

  it('keeps the ArtifactError path-joining behavior', () => {
    expect(() => schemas.parseContentArtifact(artifact)).toThrow(ArtifactError);
    expect(() => schemas.parseContentArtifact(artifact)).toThrow(
      /invalid content artifact — items\.0\.text/,
    );
  });

  it('binds the curriculum dialogue text to the same validator', () => {
    const curriculum = {
      schemaVersion: 1,
      createdAt: '2026-07-18T00:00:00Z',
      producer: { name: 'fol-forge', version: '0.1.0' },
      units: [
        {
          title: 'Unit',
          lessons: [
            {
              title: 'Lesson',
              itemIds: ['3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f'],
              dialogue: {
                turns: [{ speaker: 'A', text: 'shqip', translation: 'x' }],
                provenance: {
                  origin: 'ai-draft',
                  model: 'calibration',
                  generatedAt: '2026-07-18T00:00:00Z',
                },
              },
            },
          ],
        },
      ],
    };
    expect(() => schemas.parseCurriculumArtifact(curriculum)).toThrow(
      /units\.0\.lessons\.0\.dialogue\.turns\.0\.text/,
    );
  });

  it('binds morphology form text to the same validator', () => {
    const morphology = {
      schemaVersion: 1,
      createdAt: '2026-07-18T00:00:00Z',
      producer: { name: 'fol-forge', version: '0.1.0' },
      entries: [
        {
          itemId: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
          pos: 'verb',
          forms: [
            { tag: 'sg', text: 'gjuha' },
            { tag: 'pl', text: 'q' },
          ],
        },
      ],
    };
    expect(() => schemas.parseMorphologyArtifact(morphology)).toThrow(
      /invalid morphology artifact — entries\.0\.forms\.1\.text/,
    );
  });
});
