import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { makeTestDeps } from '../test-support.js';
import { createDb, type Db } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { createAuth } from './auth.js';
import { DrizzleReviewStore } from '../reviews/drizzle-review-store.js';
import { DrizzleUserRoles } from './drizzle-user-roles.js';
import { DrizzleFlagStore } from '../flags/drizzle-flag-store.js';
import { sql } from 'drizzle-orm';

let container: StartedPostgreSqlContainer;
let db: Db;

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
  return buildApp(
    makeTestDeps({
      config,
      auth: createAuth(db, {
        secret: config.auth.secret,
        baseUrl: config.server.baseUrl,
      }),
      userRoles: new DrizzleUserRoles(db),
      reviews: new DrizzleReviewStore(db),
      flagStates: new DrizzleFlagStore(db),
    }),
  );
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

  it('syncs review events set-union style for the signed-in user', async () => {
    const app = realApp();
    const signin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'ovca@example.com', password: 'vlna-i-konji-2026' },
    });
    expect(signin.statusCode).toBe(200);
    const cookies = signin.headers['set-cookie'];
    const cookieHeader = (Array.isArray(cookies) ? cookies : [cookies])
      .map((cookie) => String(cookie).split(';')[0])
      .join('; ');
    const events = [
      {
        id: '6e5d4c3b-2a1f-4c0e-9b8a-7d6e5f4a3b2c',
        itemId: '11111111-1111-4111-8111-111111111111',
        reviewedAt: '2026-07-16T10:00:00.000Z',
        grade: 'good',
      },
      {
        id: '7f6e5d4c-3b2a-4d1f-8c9b-6e5d4c3b2a1f',
        itemId: '11111111-1111-4111-8111-111111111111',
        reviewedAt: '2026-07-16T11:00:00.000Z',
        grade: 'easy',
      },
    ];
    const first = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      headers: { cookie: cookieHeader },
      payload: { events },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ received: 2, stored: 2 });
    const again = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      headers: { cookie: cookieHeader },
      payload: { events },
    });
    expect(again.json()).toEqual({ received: 2, stored: 0 });
    const since = await app.inject({
      method: 'GET',
      url: '/sync/reviews?since=2026-07-16T10%3A30%3A00.000Z',
      headers: { cookie: cookieHeader },
    });
    expect(since.statusCode).toBe(200);
    const returned = since.json<{ events: { id: string }[] }>().events;
    expect(returned).toHaveLength(1);
    expect(returned[0]?.id).toBe('7f6e5d4c-3b2a-4d1f-8c9b-6e5d4c3b2a1f');
    await app.close();
  });

  it('gates admin flag flips on the stored role', async () => {
    const app = realApp();
    const signin = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'ovca@example.com', password: 'vlna-i-konji-2026' },
    });
    const cookies = signin.headers['set-cookie'];
    const cookieHeader = (Array.isArray(cookies) ? cookies : [cookies])
      .map((cookie) => String(cookie).split(';')[0])
      .join('; ');

    const asLearner = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      headers: { cookie: cookieHeader },
      payload: { enabled: true },
    });
    expect(asLearner.statusCode).toBe(403);

    await db.execute(
      sql`UPDATE "user" SET role = 'admin' WHERE email = 'ovca@example.com'`,
    );
    const asAdmin = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      headers: { cookie: cookieHeader },
      payload: { enabled: true },
    });
    expect(asAdmin.statusCode).toBe(200);
    expect(asAdmin.json<{ flags: Record<string, boolean> }>().flags.audio).toBe(
      true,
    );

    const everything = await app.inject({
      method: 'GET',
      url: '/sync/reviews',
      headers: { cookie: cookieHeader },
    });
    expect(
      everything.json<{ events: unknown[] }>().events.length,
    ).toBeGreaterThanOrEqual(2);
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
