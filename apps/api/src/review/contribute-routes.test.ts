import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
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

function testApp(session: string | null = 'u1') {
  const queued: Item[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    reviewQueue: {
      addPending: (items) => {
        queued.push(...items);
        return Promise.resolve(items.length);
      },
      listPending: () => Promise.resolve([]),
      findPending: () => Promise.resolve(undefined),
      decide: () => Promise.resolve(undefined),
    },
  });
  return { app: buildApp(deps), queued };
}

const payload = {
  kind: 'word',
  text: 'sněg',
  translations: [{ lang: 'en', text: 'snow' }],
};

describe('POST /contribute', () => {
  it('requires a session', async () => {
    const { app } = testApp(null);
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload,
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('queues a canonical item with human provenance', async () => {
    const { app, queued } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload,
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'pending-review' });
    expect(queued).toHaveLength(1);
    expect(queued[0]?.text).toBe('sněg');
    expect(queued[0]?.provenance).toEqual({
      origin: 'human',
      contributorId: expect.any(String) as unknown,
    });
    expect(queued[0]?.audit).toBeUndefined();
    await app.close();
  });

  it('rejects non-canonical text, naming the orthography the pack owns', async () => {
    const { app, queued } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload: { ...payload, text: 'снег' },
    });
    expect(response.statusCode).toBe(400);
    // The wording comes from the pack, never from engine code (ADR 0029).
    expect(response.json<{ message: string }>().message).toBe(
      'the text must be written in canonical etymological Latin',
    );
    expect(queued).toHaveLength(0);
    await app.close();
  });
});
