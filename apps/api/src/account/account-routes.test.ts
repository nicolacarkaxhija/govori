import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';
import type { Auth } from '../auth/auth.js';

function sessionAs(userId: string | null): Auth {
  return {
    handler: () => Promise.resolve(new Response(null, { status: 404 })),
    api: {
      getSession: () =>
        Promise.resolve(
          userId === null
            ? null
            : { user: { id: userId, email: `${userId}@example.com` } },
        ),
    },
  } as unknown as Auth;
}

const bundle = {
  user: {
    id: 'u1',
    email: 'u1@example.com',
    name: 'Ovca',
    role: 'learner',
    createdAt: '2026-07-17T00:00:00.000Z',
  },
  reviews: [
    {
      id: '4c3b2a1d-0e9f-4a8b-9c7d-6e5f4a3b2c1d',
      itemId: '11111111-1111-4111-8111-111111111111',
      reviewedAt: '2026-07-17T08:00:00.000Z',
      grade: 'good' as const,
    },
  ],
};

describe('GET /me/export', () => {
  it('requires a session', async () => {
    const app = buildApp(makeTestDeps({ auth: sessionAs(null) }));
    const response = await app.inject({ method: 'GET', url: '/me/export' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns everything the server holds about the caller', async () => {
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs('u1'),
        account: {
          exportData: () => Promise.resolve(bundle),
          deleteAccount: () => Promise.resolve(),
        },
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/me/export' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(bundle);
    await app.close();
  });
});

describe('DELETE /me', () => {
  it('erases the account and reports no content', async () => {
    const deleteAccount = vi.fn(() => Promise.resolve());
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs('u1'),
        account: {
          exportData: () => Promise.resolve(bundle),
          deleteAccount,
        },
      }),
    );
    const response = await app.inject({ method: 'DELETE', url: '/me' });
    expect(response.statusCode).toBe(204);
    expect(deleteAccount).toHaveBeenCalledWith('u1');
    await app.close();
  });

  it('requires a session', async () => {
    const app = buildApp(makeTestDeps({ auth: sessionAs(null) }));
    const response = await app.inject({ method: 'DELETE', url: '/me' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
