import { describe, expect, it } from 'vitest';
import type { Item } from '@govori/content';
import { buildApp } from './../app.js';
import { loadConfig } from './../config.js';
import type { ItemQueries } from './ports.js';

import type { Auth } from '../auth/auth.js';

const noAuth = {
  handler: () => Promise.resolve(new Response(null, { status: 404 })),
  api: { getSession: () => Promise.resolve(null) },
} as unknown as Auth;

const voda: Item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'vȯlnų',
  translations: [{ lang: 'en', text: 'wool (acc.)' }],
  notes: [],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
  audit: { status: 'exempt-import', auditedAt: '2026-07-16T00:00:00.000Z' },
};

class FakeItemQueries implements ItemQueries {
  findById(id: string): Promise<Item | undefined> {
    return Promise.resolve(id === voda.id ? voda : undefined);
  }

  list(limit: number, offset: number): Promise<Item[]> {
    return Promise.resolve(offset > 0 ? [] : [voda].slice(0, limit));
  }
}

const learnerRoles = {
  getRole: () => Promise.resolve('learner' as const),
};

const noReviews = {
  addAll: () => Promise.resolve(0),
  listSince: () => Promise.resolve([]),
};

const noFlags = {
  getStates: () => Promise.resolve({}),
  setFlag: () => Promise.resolve(),
};

function testApp() {
  return buildApp({
    config: loadConfig({}),
    items: new FakeItemQueries(),
    flagStates: noFlags,
    auth: noAuth,
    userRoles: learnerRoles,
    reviews: noReviews,
  });
}

describe('GET /items/:id', () => {
  it('returns the item with derived script renderings', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: `/items/${voda.id}`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      item: Item;
      renderings: { latin: string; cyrillic: string };
    }>();
    expect(body.item.text).toBe('vȯlnų');
    expect(body.renderings).toEqual({ latin: 'volnu', cyrillic: 'волну' });
    await app.close();
  });

  it('404s on unknown items', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/items/9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('400s on malformed ids via schema validation', async () => {
    const app = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/items/not-a-uuid',
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe('GET /items', () => {
  it('lists items with pagination', async () => {
    const app = testApp();
    const first = await app.inject({ method: 'GET', url: '/items?limit=10' });
    expect(first.statusCode).toBe(200);
    expect(first.json<{ items: Item[] }>().items).toHaveLength(1);
    const second = await app.inject({
      method: 'GET',
      url: '/items?limit=10&offset=10',
    });
    expect(second.json<{ items: Item[] }>().items).toHaveLength(0);
    await app.close();
  });
});

describe('OpenAPI document', () => {
  it('serves the generated spec with the item routes', async () => {
    const app = testApp();
    const response = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(response.statusCode).toBe(200);
    const spec = response.json<{
      paths: Record<string, unknown>;
      info: { title: string };
    }>();
    expect(Object.keys(spec.paths)).toContain('/items/{id}');
    expect(spec.info.title).toContain('Govori');
    await app.close();
  });
});
