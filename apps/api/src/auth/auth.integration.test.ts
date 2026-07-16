import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { createAuth } from './auth.js';
import type { ItemQueries } from '../content/ports.js';

let container: StartedPostgreSqlContainer;
let db: Db;

const noItems: ItemQueries = {
  findById: () => Promise.resolve(undefined),
  list: () => Promise.resolve([]),
};

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  db = createDb(container.getConnectionUri());
  await runMigrations(db);
}, 120_000);

afterAll(async () => {
  await container.stop();
});

function realApp() {
  const config = loadConfig({});
  return buildApp({
    config,
    items: noItems,
    flagStates: {
      getStates: () => Promise.resolve({}),
      setFlag: () => Promise.resolve(),
    },
    auth: createAuth(db, {
      secret: config.auth.secret,
      baseUrl: config.server.baseUrl,
    }),
    userRoles: { getRole: () => Promise.resolve('learner' as const) },
  });
}

describe('auth end to end', () => {
  it('signs up, keeps a session, and serves /me', async () => {
    const app = realApp();
    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        email: 'ovca@example.com',
        password: 'vlna-i-konji-2026',
        name: 'Ovca',
      },
    });
    expect(signup.statusCode).toBe(200);
    const cookies = signup.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = (Array.isArray(cookies) ? cookies : [cookies])
      .map((cookie) => String(cookie).split(';')[0])
      .join('; ');

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: cookieHeader },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      user: { id: expect.any(String) as unknown, email: 'ovca@example.com' },
    });

    const anonymous = await app.inject({ method: 'GET', url: '/me' });
    expect(anonymous.statusCode).toBe(401);
    await app.close();
  });

  it('rejects a second signup with the same email', async () => {
    const app = realApp();
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      payload: {
        email: 'ovca@example.com',
        password: 'druga-lozinka-2026',
        name: 'Druga Ovca',
      },
    });
    expect(duplicate.statusCode).toBeGreaterThanOrEqual(400);
    await app.close();
  });
});
