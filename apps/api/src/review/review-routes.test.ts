import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
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
  userRole?: 'learner' | 'reviewer' | 'admin';
  session?: string | null;
}

function testApp({ userRole = 'admin', session = 'u1' }: Setup = {}) {
  const pending = new Map<string, Item>([[draft.id, draft]]);
  const decisions: { id: string; decision: string; decidedBy: string }[] = [];
  const published: { item: Item; direction: string }[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    userRoles: { getRole: () => Promise.resolve(userRole) },
    reviewQueue: {
      addPending: () => Promise.resolve(0),
      listPending: () => Promise.resolve([...pending.values()]),
      findPending: (id) => {
        const item = pending.get(id);
        return Promise.resolve(
          item === undefined ? undefined : { item, direction: 'isv' },
        );
      },
      decide: (id, decision, decidedBy) => {
        const item = pending.get(id);
        if (item === undefined) {
          return Promise.resolve(undefined);
        }
        pending.delete(id);
        decisions.push({ id, decision, decidedBy });
        return Promise.resolve({ item, direction: 'isv' });
      },
    },
    itemWriter: {
      upsertMany: (items, direction) => {
        published.push(...items.map((item) => ({ item, direction })));
        return Promise.resolve();
      },
    },
  });
  return { app: buildApp(deps), decisions, published };
}

describe('GET /admin/review', () => {
  it('rejects anonymous and non-admin callers', async () => {
    const anonymous = testApp({ session: null });
    expect(
      (await anonymous.app.inject({ method: 'GET', url: '/admin/review' }))
        .statusCode,
    ).toBe(401);
    await anonymous.app.close();

    const learner = testApp({ userRole: 'learner' });
    expect(
      (await learner.app.inject({ method: 'GET', url: '/admin/review' }))
        .statusCode,
    ).toBe(403);
    await learner.app.close();
  });

  it('lists pending drafts for admins', async () => {
    const { app } = testApp();
    const response = await app.inject({ method: 'GET', url: '/admin/review' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ pending: Item[] }>();
    expect(body.pending).toHaveLength(1);
    expect(body.pending[0]?.text).toBe('Ja pijų vodų.');
    await app.close();
  });

  it('lists pending drafts for reviewers (ADR 0008)', async () => {
    const { app } = testApp({ userRole: 'reviewer' });
    const response = await app.inject({ method: 'GET', url: '/admin/review' });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ pending: Item[] }>().pending).toHaveLength(1);
    await app.close();
  });
});

describe('POST /admin/review/:id', () => {
  it('approve publishes the item and records the reviewer', async () => {
    const { app, decisions, published } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'approve' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ decided: 'approved' });
    expect(published.map((entry) => entry.item.id)).toEqual([draft.id]);
    // The draft publishes into the direction it was queued for.
    expect(published[0]?.direction).toBe('isv');
    expect(decisions[0]).toEqual({
      id: draft.id,
      decision: 'approved',
      decidedBy: 'user:u1',
    });
    await app.close();
  });

  it('a single reviewer approval publishes (ADR 0008)', async () => {
    const { app, decisions, published } = testApp({ userRole: 'reviewer' });
    const response = await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'approve' },
    });
    expect(response.statusCode).toBe(200);
    expect(published.map((entry) => entry.item.id)).toEqual([draft.id]);
    expect(decisions[0]?.decidedBy).toBe('user:u1');
    await app.close();
  });

  it('keeps decisions closed to learners', async () => {
    const { app, published } = testApp({ userRole: 'learner' });
    const response = await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'approve' },
    });
    expect(response.statusCode).toBe(403);
    expect(published).toHaveLength(0);
    await app.close();
  });

  it('reject keeps the item unpublished', async () => {
    const { app, published } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'reject' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ decided: 'rejected' });
    expect(published).toHaveLength(0);
    await app.close();
  });

  it('404s on unknown or already-decided entries', async () => {
    const { app } = testApp();
    await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'approve' },
    });
    const again = await app.inject({
      method: 'POST',
      url: `/admin/review/${draft.id}`,
      payload: { decision: 'approve' },
    });
    expect(again.statusCode).toBe(404);
    await app.close();
  });
});
