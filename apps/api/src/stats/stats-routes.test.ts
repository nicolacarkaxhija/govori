import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';

describe('GET /stats', () => {
  it('serves public aggregate counters with no score before any audit', async () => {
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
      qualityScore: null,
      qualityAuditedItems: 0,
    });
    await app.close();
  });

  it('publishes the golden-set quality score once audits exist (ADR 0051)', async () => {
    const app = buildApp(
      makeTestDeps({
        stats: {
          counts: () =>
            Promise.resolve({
              items: 200,
              translations: 400,
              reviews: 0,
              learners: 1,
            }),
        },
        golden: {
          sampleCandidates: () => Promise.resolve([]),
          sampleItemIds: () => Promise.resolve([]),
          addToSample: () => Promise.resolve(0),
          queueFor: () => Promise.resolve([]),
          saveAudit: () => Promise.resolve(),
          quality: () => Promise.resolve({ score: 78, auditedItems: 34 }),
        },
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/stats' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      qualityScore: 78,
      qualityAuditedItems: 34,
    });
    await app.close();
  });
});
