import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';

describe('GET /stats', () => {
  it('serves public aggregate counters', async () => {
    const app = buildApp(
      makeTestDeps({
        stats: {
          counts: () =>
            Promise.resolve({
              items: 19004,
              translations: 71436,
              reviews: 12,
              learners: 3,
            }),
        },
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/stats' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: 19004,
      translations: 71436,
      reviews: 12,
      learners: 3,
    });
    await app.close();
  });
});
