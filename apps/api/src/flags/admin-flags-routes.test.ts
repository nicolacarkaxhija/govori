import { describe, expect, it } from 'vitest';
import type { TargetRole } from '@glotty/config';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';

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

interface Setup {
  userRole?: 'learner' | 'admin';
  session?: string | null;
}

interface Write {
  key: string;
  enabled: boolean;
  changedBy: string;
  targetRole: TargetRole | undefined;
}

function testApp({ userRole = 'learner', session = 'u1' }: Setup = {}) {
  const written: Write[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    flagStates: {
      getStates: () =>
        Promise.resolve(
          Object.fromEntries(
            written.map((w) => [
              w.key,
              { enabled: w.enabled, targetRole: w.targetRole ?? 'all' },
            ]),
          ),
        ),
      setFlag: (key, enabled, changedBy, targetRole) => {
        written.push({ key, enabled, changedBy, targetRole });
        return Promise.resolve();
      },
    },
    userRoles: { getRole: () => Promise.resolve(userRole) },
  });
  return { app: buildApp(deps), written };
}

describe('PUT /admin/flags/:key', () => {
  it('rejects anonymous callers', async () => {
    const { app } = testApp({ session: null });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('rejects non-admin users', async () => {
    const { app, written } = testApp({ userRole: 'learner' });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(403);
    expect(written).toHaveLength(0);
    await app.close();
  });

  it('rejects unknown flag keys', async () => {
    const { app } = testApp({ userRole: 'admin' });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/ghost',
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('lets admins flip a flag, recording who did it', async () => {
    const { app, written } = testApp({ userRole: 'admin' });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(200);
    expect(written).toEqual([
      {
        key: 'audio',
        enabled: true,
        changedBy: 'user:u1',
        targetRole: undefined,
      },
    ]);
    expect(response.json()).toEqual({
      flags: {
        accounts: false,
        social: false,
        leaderboards: false,
        audio: true,
        recordAndCompare: false,
      },
    });
    await app.close();
  });

  it('carries an explicit ring through to the store', async () => {
    const { app, written } = testApp({ userRole: 'admin' });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      payload: { enabled: true, targetRole: 'reviewer' },
    });
    expect(response.statusCode).toBe(200);
    expect(written).toEqual([
      {
        key: 'audio',
        enabled: true,
        changedBy: 'user:u1',
        targetRole: 'reviewer',
      },
    ]);
    // The admin flipping it always sees the flag they just set.
    expect(
      response.json<{ flags: Record<string, boolean> }>().flags.audio,
    ).toBe(true);
    await app.close();
  });

  it('rejects an unknown ring value', async () => {
    const { app, written } = testApp({ userRole: 'admin' });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/flags/audio',
      payload: { enabled: true, targetRole: 'superuser' },
    });
    expect(response.statusCode).toBe(400);
    expect(written).toHaveLength(0);
    await app.close();
  });
});
