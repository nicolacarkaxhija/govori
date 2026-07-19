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
  const queued: { item: Item; direction: string }[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    reviewQueue: {
      addPending: (items, direction) => {
        queued.push(...items.map((item) => ({ item, direction })));
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
    expect(queued[0]?.item.text).toBe('sněg');
    // The contribution queues for the resolved direction (ADR 0046).
    expect(queued[0]?.direction).toBe('isv');
    expect(queued[0]?.item.provenance).toEqual({
      origin: 'human',
      contributorId: expect.any(String) as unknown,
    });
    expect(queued[0]?.item.audit).toBeUndefined();
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
