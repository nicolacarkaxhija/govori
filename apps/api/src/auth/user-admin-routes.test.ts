import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { Auth } from './auth.js';
import type { UserSummary } from './ports.js';
import { makeTestDeps } from '../test-support.js';

const learner: UserSummary = {
  id: 'u2',
  email: 'ovca@example.com',
  name: 'Ovca',
  role: 'learner',
  createdAt: '2026-07-17T10:00:00.000Z',
};

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

function testApp(userRole: 'learner' | 'admin' = 'admin') {
  const changes: { id: string; role: string }[] = [];
  const deps = makeTestDeps({
    auth: sessionAs('u1'),
    userRoles: { getRole: () => Promise.resolve(userRole) },
    userDirectory: {
      listUsers: () => Promise.resolve([learner]),
      setRole: (id, role) => {
        if (id !== learner.id) {
          return Promise.resolve(false);
        }
        changes.push({ id, role });
        return Promise.resolve(true);
      },
    },
  });
  return { app: buildApp(deps), changes };
}

describe('GET /admin/users', () => {
  it('rejects non-admins and serves the directory to admins', async () => {
    const forbidden = testApp('learner');
    expect(
      (await forbidden.app.inject({ method: 'GET', url: '/admin/users' }))
        .statusCode,
    ).toBe(403);
    await forbidden.app.close();

    const { app } = testApp();
    const response = await app.inject({ method: 'GET', url: '/admin/users' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ users: [learner] });
    await app.close();
  });
});

describe('PUT /admin/users/:id/role', () => {
  it('changes a role and refuses self-demotion', async () => {
    const { app, changes } = testApp();
    const promoted = await app.inject({
      method: 'PUT',
      url: `/admin/users/${learner.id}/role`,
      payload: { role: 'admin' },
    });
    expect(promoted.statusCode).toBe(200);
    expect(changes).toEqual([{ id: learner.id, role: 'admin' }]);

    const self = await app.inject({
      method: 'PUT',
      url: '/admin/users/u1/role',
      payload: { role: 'learner' },
    });
    expect(self.statusCode).toBe(409);

    const missing = await app.inject({
      method: 'PUT',
      url: '/admin/users/ghost/role',
      payload: { role: 'admin' },
    });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });
});
