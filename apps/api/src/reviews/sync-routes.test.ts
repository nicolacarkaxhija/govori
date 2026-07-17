import { describe, expect, it } from 'vitest';
import type { ReviewEvent } from '@govori/srs';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type { ReviewEventStore } from './ports.js';

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

class FakeReviewStore implements ReviewEventStore {
  events = new Map<string, ReviewEvent & { userId: string }>();

  addAll(userId: string, incoming: readonly ReviewEvent[]): Promise<number> {
    let stored = 0;
    for (const event of incoming) {
      if (!this.events.has(event.id)) {
        this.events.set(event.id, { ...event, userId });
        stored += 1;
      }
    }
    return Promise.resolve(stored);
  }

  listSince(userId: string, since?: string): Promise<ReviewEvent[]> {
    return Promise.resolve(
      [...this.events.values()]
        .filter(
          (event) =>
            event.userId === userId &&
            (since === undefined || event.reviewedAt > since),
        )
        .map((stored) => ({
          id: stored.id,
          itemId: stored.itemId,
          reviewedAt: stored.reviewedAt,
          grade: stored.grade,
        })),
    );
  }
}

function testApp(session: string | null) {
  const store = new FakeReviewStore();
  const deps = makeTestDeps({ auth: sessionAs(session), reviews: store });
  return { app: buildApp(deps), store };
}

const events: ReviewEvent[] = [
  {
    id: '4c3b2a1d-0e9f-4a8b-9c7d-6e5f4a3b2c1d',
    itemId: '11111111-1111-4111-8111-111111111111',
    reviewedAt: '2026-07-16T08:00:00.000Z',
    grade: 'good',
  },
  {
    id: '5d4c3b2a-1f0e-4b9a-8d7c-5e4f3a2b1c0d',
    itemId: '11111111-1111-4111-8111-111111111111',
    reviewedAt: '2026-07-16T09:00:00.000Z',
    grade: 'again',
  },
];

describe('POST /sync/reviews', () => {
  it('requires a session', async () => {
    const { app } = testApp(null);
    const response = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      payload: { events },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('stores events set-union style, ignoring duplicates', async () => {
    const { app } = testApp('u1');
    const first = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      payload: { events },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ received: 2, stored: 2 });
    const second = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      payload: { events: [...events, events[0]] },
    });
    expect(second.json()).toEqual({ received: 3, stored: 0 });
    await app.close();
  });

  it('rejects malformed grades via schema validation', async () => {
    const { app } = testApp('u1');
    const response = await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      payload: {
        events: [{ ...events[0], grade: 'perfect' }],
      },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe('GET /sync/reviews', () => {
  it('returns the caller events, optionally since a timestamp', async () => {
    const { app } = testApp('u1');
    await app.inject({
      method: 'POST',
      url: '/sync/reviews',
      payload: { events },
    });
    const all = await app.inject({ method: 'GET', url: '/sync/reviews' });
    expect(all.json<{ events: ReviewEvent[] }>().events).toHaveLength(2);
    const since = await app.inject({
      method: 'GET',
      url: '/sync/reviews?since=2026-07-16T08%3A30%3A00.000Z',
    });
    expect(since.json<{ events: ReviewEvent[] }>().events).toHaveLength(1);
    await app.close();
  });
});
