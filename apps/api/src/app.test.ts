import { describe, expect, it } from 'vitest';
import { buildApp, toWebRequest } from './app.js';
import { loadConfig } from './config.js';
import type { ItemQueries } from './content/ports.js';

import type { Auth } from './auth/auth.js';

const noAuth = {
  handler: () => Promise.resolve(new Response(null, { status: 404 })),
  api: { getSession: () => Promise.resolve(null) },
} as unknown as Auth;

const noItems: ItemQueries = {
  findById: () => Promise.resolve(undefined),
  list: () => Promise.resolve([]),
};

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

describe('buildApp', () => {
  it('responds 401 on /me without a session, tolerating repeated headers', async () => {
    const app = buildApp({
      config: loadConfig({}),
      items: noItems,
      flagStates: noFlags,
      auth: noAuth,
      userRoles: learnerRoles,
      reviews: noReviews,
      stats: {
        counts: () =>
          Promise.resolve({
            items: 0,
            translations: 0,
            reviews: 0,
            learners: 0,
          }),
      },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('serves a health check', async () => {
    const app = buildApp({
      config: loadConfig({}),
      items: noItems,
      flagStates: noFlags,
      auth: noAuth,
      userRoles: learnerRoles,
      reviews: noReviews,
      stats: {
        counts: () =>
          Promise.resolve({
            items: 0,
            translations: 0,
            reviews: 0,
            learners: 0,
          }),
      },
    });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('exposes the instance brand for the client shell', async () => {
    const app = buildApp({
      config: loadConfig({ GOVORI_BRAND__SHORT_NAME: 'Hajde' }),
      items: noItems,
      flagStates: noFlags,
      auth: noAuth,
      userRoles: learnerRoles,
      reviews: noReviews,
      stats: {
        counts: () =>
          Promise.resolve({
            items: 0,
            translations: 0,
            reviews: 0,
            learners: 0,
          }),
      },
    });
    const response = await app.inject({ method: 'GET', url: '/meta' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      brand: {
        shortName: 'Hajde',
        fullName: 'Govori — Interslavic Learning App',
      },
    });
    await app.close();
  });
});

describe('toWebRequest', () => {
  const config = loadConfig({});

  it('appends every value of repeated headers', () => {
    const request = toWebRequest(config, {
      method: 'GET',
      url: '/me',
      headers: { 'set-cookie': ['a=1', 'b=2'], accept: 'application/json' },
    });
    expect(request.headers.get('set-cookie')).toBe('a=1, b=2');
    expect(request.headers.get('accept')).toBe('application/json');
  });

  it('serializes bodies for non-GET requests only', async () => {
    const post = toWebRequest(config, {
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: {},
      body: { email: 'e@example.com' },
    });
    expect(await post.text()).toBe('{"email":"e@example.com"}');
    const get = toWebRequest(config, {
      method: 'GET',
      url: '/me',
      headers: { 'x-skip': undefined },
    });
    expect(get.body).toBeNull();
  });
});

describe('cors', () => {
  it('allows configured web origins to call the api', async () => {
    const app = buildApp({
      config: loadConfig({
        GOVORI_SERVER__CORS_ORIGINS: 'http://localhost:53200',
      }),
      items: noItems,
      flagStates: noFlags,
      auth: noAuth,
      userRoles: learnerRoles,
      reviews: noReviews,
      stats: {
        counts: () =>
          Promise.resolve({
            items: 0,
            translations: 0,
            reviews: 0,
            learners: 0,
          }),
      },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/items',
      headers: { origin: 'http://localhost:53200' },
    });
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:53200',
    );
    await app.close();
  });
});
