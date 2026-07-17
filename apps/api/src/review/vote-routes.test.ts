import { describe, expect, it } from 'vitest';
import type { Item } from '@govori/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import type { PendingVotes } from './ports.js';
import { makeTestDeps } from '../test-support.js';

const draft: Item = {
  id: '7f6e5d4c-3b2a-4190-8f7e-6d5c4b3a2918',
  kind: 'sentence',
  text: 'Ja pijų vodų.',
  translations: [{ lang: 'en', text: 'I drink water.' }],
  notes: [],
  provenance: {
    origin: 'ai-draft',
    model: 'claude-opus-4-8 (claude-code subagent)',
    generatedAt: '2026-07-17T12:00:00.000Z',
  },
  audit: {
    status: 'clean',
    maxOverlap: 0,
    auditedAt: '2026-07-17T13:00:00.000Z',
  },
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

interface Setup {
  session?: string | null;
  /** Someone else decides the entry between the vote and the publish. */
  raceLost?: boolean;
}

function testApp({ session = 'u1', raceLost = false }: Setup = {}) {
  const pending = new Map<string, Item>([[draft.id, draft]]);
  const ballots = new Map<string, boolean>();
  const decisions: { id: string; decision: string; decidedBy: string }[] = [];
  const published: Item[] = [];
  const seenLimits: number[] = [];

  const tally = (reviewId: string) => {
    let upvotes = 0;
    let downvotes = 0;
    for (const [key, up] of ballots) {
      if (key.startsWith(`${reviewId}:`)) {
        if (up) {
          upvotes += 1;
        } else {
          downvotes += 1;
        }
      }
    }
    return { upvotes, downvotes };
  };

  const deps = makeTestDeps({
    auth: sessionAs(session),
    reviewQueue: {
      addPending: () => Promise.resolve(0),
      listPending: (limit) => {
        seenLimits.push(limit);
        return Promise.resolve([...pending.values()]);
      },
      findPending: (id) => Promise.resolve(pending.get(id)),
      decide: (id, decision, decidedBy) => {
        const item = pending.get(id);
        if (raceLost || item === undefined) {
          return Promise.resolve(undefined);
        }
        pending.delete(id);
        decisions.push({ id, decision, decidedBy });
        return Promise.resolve(item);
      },
    },
    votes: {
      castVote: (reviewId, voterId, up) => {
        ballots.set(`${reviewId}:${voterId}`, up);
        return Promise.resolve(tally(reviewId));
      },
      talliesFor: (reviewIds, voterId) => {
        const tallies = new Map<string, PendingVotes>();
        for (const id of reviewIds) {
          tallies.set(id, {
            ...tally(id),
            myVote: ballots.get(`${id}:${voterId}`) ?? null,
          });
        }
        return Promise.resolve(tallies);
      },
    },
    itemWriter: {
      upsertMany: (items) => {
        published.push(...items);
        return Promise.resolve();
      },
    },
  });
  return { app: buildApp(deps), ballots, decisions, published, seenLimits };
}

describe('POST /review/:id/vote', () => {
  it('requires a session', async () => {
    const { app } = testApp({ session: null });
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('404s on unknown or already-decided entries', async () => {
    const { app } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/review/00000000-0000-4000-8000-00000000dead/vote',
      payload: { up: true },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('rejects a vote that is not a boolean', async () => {
    const { app, ballots } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: 'yes' },
    });
    expect(response.statusCode).toBe(400);
    expect(ballots.size).toBe(0);
    await app.close();
  });

  it('records the vote and returns the tally', async () => {
    const { app, published } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ upvotes: 1, downvotes: 0 });
    expect(published).toHaveLength(0);
    await app.close();
  });

  it('lets a voter change their vote', async () => {
    const { app } = testApp();
    await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: true },
    });
    const changed = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: false },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toEqual({ upvotes: 0, downvotes: 1 });
    await app.close();
  });

  it('publishes like an approval at net three upvotes (ADR 0040)', async () => {
    const { app, ballots, decisions, published } = testApp();
    ballots.set(`${draft.id}:u2`, true);
    ballots.set(`${draft.id}:u3`, true);
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ upvotes: 3, downvotes: 0 });
    expect(decisions).toEqual([
      { id: draft.id, decision: 'approved', decidedBy: 'community:vote' },
    ]);
    expect(published.map((item) => item.id)).toEqual([draft.id]);
    await app.close();
  });

  it('holds publication back while downvotes offset the ups', async () => {
    const { app, ballots, published } = testApp();
    ballots.set(`${draft.id}:u2`, true);
    ballots.set(`${draft.id}:u3`, true);
    ballots.set(`${draft.id}:u4`, true);
    ballots.set(`${draft.id}:u5`, false);
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: false },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ upvotes: 3, downvotes: 2 });
    expect(published).toHaveLength(0);
    await app.close();
  });

  it('tolerates losing the publish race to another decision', async () => {
    const { app, ballots, published } = testApp({ raceLost: true });
    ballots.set(`${draft.id}:u2`, true);
    ballots.set(`${draft.id}:u3`, true);
    const response = await app.inject({
      method: 'POST',
      url: `/review/${draft.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(published).toHaveLength(0);
    await app.close();
  });
});

describe('GET /review/pending', () => {
  it('requires a session', async () => {
    const { app } = testApp({ session: null });
    const response = await app.inject({
      method: 'GET',
      url: '/review/pending',
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("serves pending drafts with tallies and the caller's vote", async () => {
    const { app, ballots, seenLimits } = testApp();
    ballots.set(`${draft.id}:u1`, true);
    ballots.set(`${draft.id}:u2`, false);
    const response = await app.inject({
      method: 'GET',
      url: '/review/pending',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      pending: [{ item: draft, upvotes: 1, downvotes: 1, myVote: true }],
    });
    expect(seenLimits).toEqual([50]);
    await app.close();
  });

  it('defaults tallies to zero for unvoted drafts', async () => {
    // The inert vote-store stub answers with an empty map; the route
    // must still shape every entry.
    const pendingOnly = makeTestDeps({
      auth: sessionAs('u1'),
      reviewQueue: {
        addPending: () => Promise.resolve(0),
        listPending: () => Promise.resolve([draft]),
        findPending: () => Promise.resolve(undefined),
        decide: () => Promise.resolve(undefined),
      },
    });
    const app = buildApp(pendingOnly);
    const response = await app.inject({
      method: 'GET',
      url: '/review/pending',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      pending: [{ item: draft, upvotes: 0, downvotes: 0, myVote: null }],
    });
    await app.close();
  });

  it('caps the page size at one hundred', async () => {
    const { app } = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/review/pending?limit=101',
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
