import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { makeTestDeps } from '../test-support.js';

function appWithStates(states: Record<string, boolean>) {
  return buildApp(
    makeTestDeps({
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
      accounts: true,
      social: true,
      audio: false,
      recordAndCompare: true,
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
});
