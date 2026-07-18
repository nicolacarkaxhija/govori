import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';
import type { WordForm } from './ports.js';

const vodaId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';

const paradigm: WordForm[] = [
  { tag: 'sg.nom', text: 'voda' },
  { tag: 'sg.gen', text: 'vody' },
];

function testApp() {
  return buildApp(
    makeTestDeps({
      morphology: {
        formsFor: (itemId) =>
          Promise.resolve(itemId === vodaId ? paradigm : []),
      },
    }),
  );
}

describe('GET /items/:id/forms', () => {
  it('serves the paradigm for an item', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: `/items/${vodaId}/forms`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      forms: [
        { tag: 'sg.nom', text: 'voda' },
        { tag: 'sg.gen', text: 'vody' },
      ],
    });
    await app.close();
  });

  it('answers unknown or formless items with an empty list, not 404', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/items/00000000-0000-4000-8000-00000000dead/forms',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ forms: [] });
    await app.close();
  });

  it('400s on malformed ids via schema validation', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/items/not-a-uuid/forms',
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('appears in the generated OpenAPI document', async () => {
    const app = testApp();
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });
    const spec = response.json<{ paths: Record<string, unknown> }>();
    expect(Object.keys(spec.paths)).toContain('/items/{id}/forms');
    await app.close();
  });
});
