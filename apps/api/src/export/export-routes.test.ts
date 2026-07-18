import { describe, expect, it } from 'vitest';
import {
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
  type Item,
} from '@glotty/content';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';
import type { ExportQueries, ExportUnit } from './ports.js';
import type { MorphologyEntry } from '../morphology/ports.js';

const voda: Item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'voda',
  translations: [{ lang: 'en', text: 'water' }],
  pos: 'noun',
  posDetail: 'f.',
  notes: [{ sourceLang: 'pl', text: 'voda ≈ woda' }],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
  audit: { status: 'exempt-import', auditedAt: '2026-07-16T00:00:00.000Z' },
};

const unit: ExportUnit = {
  title: 'Jedinica 1',
  lessons: [{ title: 'Lekcija 1', itemIds: [voda.id] }],
};

const paradigm: MorphologyEntry = {
  itemId: voda.id,
  pos: 'noun',
  forms: [
    { tag: 'sg.nom', text: 'voda' },
    { tag: 'sg.gen', text: 'vody' },
  ],
};

function testApp(overrides: Partial<ExportQueries> = {}) {
  const openData: ExportQueries = {
    allItems: () => Promise.resolve([voda]),
    curriculumUnits: () => Promise.resolve([unit]),
    morphologyEntries: () => Promise.resolve([paradigm]),
    ...overrides,
  };
  return buildApp(makeTestDeps({ openData }));
}

describe('GET /export/content', () => {
  it('publishes the item pool under CC BY-SA with attribution', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/export/content',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      license: string;
      attribution: string;
      artifact: unknown;
    }>();
    expect(body.license).toBe('CC-BY-SA-4.0');
    expect(body.attribution).toBe('Govori — Interslavic Learning App');
    // Round-trip guarantee: what we export, our own importer accepts.
    const artifact = parseContentArtifact(body.artifact);
    expect(artifact.producer).toEqual({ name: 'govori-api', version: '1' });
    expect(artifact.items).toEqual([voda]);
    await app.close();
  });

  it('404s while the item pool is empty', async () => {
    const app = testApp({ allItems: () => Promise.resolve([]) });
    const response = await app.inject({
      method: 'GET',
      url: '/export/content',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'no content to export yet' });
    await app.close();
  });
});

describe('GET /export/curriculum', () => {
  it('publishes the course structure as a curriculum artifact', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/export/curriculum',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      license: string;
      attribution: string;
      artifact: unknown;
    }>();
    expect(body.license).toBe('CC-BY-SA-4.0');
    const artifact = parseCurriculumArtifact(body.artifact);
    expect(artifact.units).toEqual([unit]);
    await app.close();
  });

  it('404s while no curriculum is loaded', async () => {
    const app = testApp({ curriculumUnits: () => Promise.resolve([]) });
    const response = await app.inject({
      method: 'GET',
      url: '/export/curriculum',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'no curriculum to export yet' });
    await app.close();
  });
});

describe('GET /export/morphology', () => {
  it('publishes the inflected forms as a morphology artifact', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/export/morphology',
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      license: string;
      attribution: string;
      artifact: unknown;
    }>();
    expect(body.license).toBe('CC-BY-SA-4.0');
    const artifact = parseMorphologyArtifact(body.artifact);
    expect(artifact.entries).toEqual([paradigm]);
    await app.close();
  });

  it('404s while no forms are stored', async () => {
    const app = testApp({ morphologyEntries: () => Promise.resolve([]) });
    const response = await app.inject({
      method: 'GET',
      url: '/export/morphology',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: 'no morphology to export yet' });
    await app.close();
  });
});
