import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';

const voda: Item = {
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
};

const sentence: Item = {
  id: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  kind: 'sentence',
  text: 'Ja pijų vodų.',
  translations: [{ lang: 'en', text: 'I drink water.' }],
  notes: [],
  provenance: {
    origin: 'import',
    source: 'tatoeba',
    license: 'CC BY 2.0 FR',
    attribution: 'Tatoeba sentence #1 by rul',
  },
};

const LESSON_ID = '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f';

function testApp(words: string[] = []) {
  return buildApp(
    makeTestDeps({
      course: {
        overview: () => Promise.resolve([]),
        lessonItems: (lessonId) =>
          Promise.resolve(
            lessonId === LESSON_ID
              ? { title: 'Lekcija 1', items: [voda] }
              : undefined,
          ),
      },
      items: {
        findById: () => Promise.resolve(undefined),
        findByIds: () => Promise.resolve([]),
        list: () => Promise.resolve([]),
        findSentencesContaining: (requested) => {
          words.push(...requested);
          return Promise.resolve([sentence]);
        },
      },
    }),
  );
}

describe('GET /lessons/:id/sentences', () => {
  it('returns sentences matching the lesson words', async () => {
    const words: string[] = [];
    const app = testApp(words);
    const response = await app.inject({
      method: 'GET',
      url: `/lessons/${LESSON_ID}/sentences`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ sentences: Item[] }>();
    expect(body.sentences).toHaveLength(1);
    expect(body.sentences[0]?.text).toBe('Ja pijų vodų.');
    expect(words).toEqual(['voda']);
  });

  it('404s for an unknown lesson', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/lessons/5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d/sentences',
    });
    expect(response.statusCode).toBe(404);
  });
});
