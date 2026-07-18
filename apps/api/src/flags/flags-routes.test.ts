import { describe, expect, it } from 'vitest';
import type { FlagState, TargetRole } from '@glotty/config';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';

const on = (targetRole: TargetRole = 'all'): FlagState => ({
  enabled: true,
  targetRole,
});
const off = (targetRole: TargetRole = 'all'): FlagState => ({
  enabled: false,
  targetRole,
});

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

interface Options {
  session?: string | null;
  role?: 'learner' | 'reviewer' | 'admin';
}

function appWithStates(
  states: Record<string, FlagState>,
  { session = null, role = 'learner' }: Options = {},
) {
  return buildApp(
    makeTestDeps({
      auth: sessionAs(session),
      userRoles: { getRole: () => Promise.resolve(role) },
      flagStates: {
        getStates: () => Promise.resolve(states),
        setFlag: () => Promise.resolve(),
      },
    }),
  );
}

describe('GET /flags', () => {
  it('serves effective flags, honoring the dependency graph', async () => {
    const app = appWithStates({
      accounts: on(),
      social: on(),
      audio: off(),
      recordAndCompare: on(),
    });
    const response = await app.inject({ method: 'GET', url: '/flags' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      flags: {
        accounts: true,
        social: true,
        leaderboards: false,
        audio: false,
        recordAndCompare: false,
      },
    });
    await app.close();
  });

  it('treats unstored flags as disabled', async () => {
    const app = appWithStates({});
    const response = await app.inject({ method: 'GET', url: '/flags' });
    expect(response.json()).toEqual({
      flags: {
        accounts: false,
        social: false,
        leaderboards: false,
        audio: false,
        recordAndCompare: false,
      },
    });
    await app.close();
  });

  it('hides a reviewer-ring flag from an anonymous visitor', async () => {
    const app = appWithStates({ audio: on('reviewer') });
    const response = await app.inject({ method: 'GET', url: '/flags' });
    expect(
      response.json<{ flags: Record<string, boolean> }>().flags.audio,
    ).toBe(false);
    await app.close();
  });

  it('reveals a reviewer-ring flag to a reviewer session', async () => {
    const app = appWithStates(
      { audio: on('reviewer') },
      { session: 'r1', role: 'reviewer' },
    );
    const response = await app.inject({ method: 'GET', url: '/flags' });
    expect(
      response.json<{ flags: Record<string, boolean> }>().flags.audio,
    ).toBe(true);
    await app.close();
  });

  it('keeps an admin-ring flag from a mere learner session', async () => {
    const app = appWithStates(
      { audio: on('admin') },
      { session: 'l1', role: 'learner' },
    );
    const response = await app.inject({ method: 'GET', url: '/flags' });
    expect(
      response.json<{ flags: Record<string, boolean> }>().flags.audio,
    ).toBe(false);
    await app.close();
  });
});
