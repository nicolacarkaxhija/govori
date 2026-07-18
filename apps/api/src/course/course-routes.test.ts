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

const LESSON_ID = '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f';

function testApp() {
  return buildApp(
    makeTestDeps({
      course: {
        overview: () =>
          Promise.resolve([
            {
              id: '8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e',
              title: 'Jedinica 1',
              lessons: [{ id: LESSON_ID, title: 'Lekcija 1', itemCount: 1 }],
            },
          ]),
        lessonItems: (lessonId) =>
          Promise.resolve(
            lessonId === LESSON_ID
              ? { title: 'Lekcija 1', items: [voda] }
              : undefined,
          ),
      },
    }),
  );
}

describe('GET /course', () => {
  it('serves the unit and lesson overview', async () => {
    const app = testApp();
    const response = await app.inject({ method: 'GET', url: '/course' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      units: { title: string; lessons: { itemCount: number }[] }[];
    }>();
    expect(body.units[0]?.title).toBe('Jedinica 1');
    expect(body.units[0]?.lessons[0]?.itemCount).toBe(1);
    await app.close();
  });
});

describe('GET /lessons/:id', () => {
  it('serves the ordered items of a lesson', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: `/lessons/${LESSON_ID}`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ title: string; items: Item[] }>();
    expect(body.title).toBe('Lekcija 1');
    expect(body.items[0]?.text).toBe('voda');
    await app.close();
  });

  it('404s on unknown lessons', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/lessons/00000000-0000-4000-8000-000000000000',
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('GET /lessons/:id dialogue', () => {
  it('serves the intro dialogue with its provenance', async () => {
    const app = buildApp(
      makeTestDeps({
        course: {
          overview: () => Promise.resolve([]),
          lessonItems: () =>
            Promise.resolve({
              title: 'Lekcija 1',
              items: [voda],
              dialogue: {
                turns: [
                  {
                    speaker: 'Ana',
                    text: 'Kto jesi ty?',
                    translation: 'Who are you?',
                  },
                ],
                provenance: {
                  origin: 'ai-draft',
                  model: 'calibration',
                  generatedAt: '2026-07-17T12:00:00.000Z',
                },
              },
            }),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: `/lessons/${LESSON_ID}`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      dialogue?: { turns: { speaker: string }[] };
    }>();
    expect(body.dialogue?.turns[0]?.speaker).toBe('Ana');
    await app.close();
  });
});
