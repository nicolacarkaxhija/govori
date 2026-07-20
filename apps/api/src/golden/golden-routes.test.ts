import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type {
  GoldenAuditInput,
  GoldenQueueEntry,
  GoldenSetStore,
} from './ports.js';
import type { SampleCandidate } from './sample.js';

const alfa: Item = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'word',
  text: 'alfa',
  translations: [{ lang: 'en', text: 'alpha' }],
  notes: [],
  provenance: { origin: 'human', contributorId: 'seed' },
};
const beta: Item = {
  id: '22222222-2222-4222-8222-222222222222',
  kind: 'word',
  text: 'beta',
  translations: [{ lang: 'en', text: 'beta' }],
  notes: [],
  provenance: { origin: 'human', contributorId: 'seed' },
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
  sample?: string[];
  candidates?: SampleCandidate[];
  queue?: GoldenQueueEntry[];
}

function testApp({
  userRole = 'reviewer',
  session = 'rev-1',
  sample = [alfa.id],
  candidates = [],
  queue = [{ itemId: alfa.id, priorAudit: null }],
}: Setup = {}) {
  const saved: GoldenAuditInput[] = [];
  const added: { direction: string; itemIds: readonly string[] }[] = [];
  const golden: GoldenSetStore = {
    sampleCandidates: () => Promise.resolve(candidates),
    sampleItemIds: () => Promise.resolve(sample),
    addToSample: (direction, itemIds) => {
      added.push({ direction, itemIds });
      return Promise.resolve(itemIds.length);
    },
    queueFor: () => Promise.resolve(queue),
    saveAudit: (input) => {
      saved.push(input);
      return Promise.resolve();
    },
    quality: () => Promise.resolve(null),
  };
  const deps = makeTestDeps({
    auth: sessionAs(session),
    userRoles: { getRole: () => Promise.resolve(userRole) },
    items: {
      findById: (id) =>
        Promise.resolve(
          id === alfa.id ? { item: alfa, direction: 'isv' } : undefined,
        ),
      findByIds: (ids) =>
        Promise.resolve([alfa, beta].filter((item) => ids.includes(item.id))),
      list: () => Promise.resolve([]),
      findSentencesContaining: () => Promise.resolve([]),
    },
    golden,
  });
  return { app: buildApp(deps), saved, added };
}

describe('GET /admin/golden', () => {
  it('rejects anonymous and non-reviewer callers', async () => {
    const anonymous = testApp({ session: null });
    expect(
      (await anonymous.app.inject({ method: 'GET', url: '/admin/golden' }))
        .statusCode,
    ).toBe(401);
    await anonymous.app.close();

    const learner = testApp({ userRole: 'learner' });
    expect(
      (await learner.app.inject({ method: 'GET', url: '/admin/golden' }))
        .statusCode,
    ).toBe(403);
    await learner.app.close();
  });

  it('hydrates the queue with items and any prior audit', async () => {
    const { app } = testApp({
      queue: [
        {
          itemId: alfa.id,
          priorAudit: {
            accuracy: 4,
            naturalness: 3,
            fit: 5,
            comment: 'peer note',
            auditedAt: '2026-07-20T00:00:00.000Z',
          },
        },
      ],
    });
    const response = await app.inject({ method: 'GET', url: '/admin/golden' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      queue: { item: Item; priorAudit: { accuracy: number } | null }[];
    }>();
    expect(body.queue).toHaveLength(1);
    expect(body.queue[0]?.item.text).toBe('alfa');
    expect(body.queue[0]?.priorAudit?.accuracy).toBe(4);
    await app.close();
  });

  it('serves reviewers a queue with no prior audit', async () => {
    const { app } = testApp();
    const response = await app.inject({ method: 'GET', url: '/admin/golden' });
    expect(response.statusCode).toBe(200);
    expect(
      response.json<{ queue: { priorAudit: unknown }[] }>().queue[0]
        ?.priorAudit,
    ).toBeNull();
    await app.close();
  });
});

describe('POST /admin/golden/:itemId/audit', () => {
  it('rejects anonymous and non-reviewer callers', async () => {
    const anonymous = testApp({ session: null });
    expect(
      (
        await anonymous.app.inject({
          method: 'POST',
          url: `/admin/golden/${alfa.id}/audit`,
          payload: { accuracy: 5, naturalness: 5, fit: 5 },
        })
      ).statusCode,
    ).toBe(401);
    await anonymous.app.close();

    const learner = testApp({ userRole: 'learner' });
    expect(
      (
        await learner.app.inject({
          method: 'POST',
          url: `/admin/golden/${alfa.id}/audit`,
          payload: { accuracy: 5, naturalness: 5, fit: 5 },
        })
      ).statusCode,
    ).toBe(403);
    await learner.app.close();
  });

  it('upserts a valid audit for a sampled item', async () => {
    const { app, saved } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/admin/golden/${alfa.id}/audit`,
      payload: { accuracy: 5, naturalness: 4, fit: 3, comment: 'solid' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ audited: true });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      itemId: alfa.id,
      direction: 'isv',
      reviewerId: 'rev-1',
      accuracy: 5,
      naturalness: 4,
      fit: 3,
      comment: 'solid',
    });
    await app.close();
  });

  it('rejects scores outside 1-5', async () => {
    const { app, saved } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/admin/golden/${alfa.id}/audit`,
      payload: { accuracy: 6, naturalness: 4, fit: 3 },
    });
    expect(response.statusCode).toBe(400);
    expect(saved).toHaveLength(0);
    await app.close();
  });

  it('404s an unknown item', async () => {
    const { app } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/admin/golden/${beta.id}/audit`,
      payload: { accuracy: 5, naturalness: 5, fit: 5 },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('404s a real item that is not in the golden set', async () => {
    const { app } = testApp({ sample: [] });
    const response = await app.inject({
      method: 'POST',
      url: `/admin/golden/${alfa.id}/audit`,
      payload: { accuracy: 5, naturalness: 5, fit: 5 },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('POST /admin/golden/sample', () => {
  it('is admin-only', async () => {
    const anonymous = testApp({ session: null });
    expect(
      (
        await anonymous.app.inject({
          method: 'POST',
          url: '/admin/golden/sample',
          payload: {},
        })
      ).statusCode,
    ).toBe(401);
    await anonymous.app.close();

    const reviewer = testApp({ userRole: 'reviewer' });
    expect(
      (
        await reviewer.app.inject({
          method: 'POST',
          url: '/admin/golden/sample',
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    await reviewer.app.close();
  });

  it('stratified-samples the pool and skips already-sampled ids', async () => {
    const candidates: SampleCandidate[] = [
      { id: alfa.id, kind: 'word', attestation: 'gold' },
      { id: beta.id, kind: 'word' },
    ];
    const { app, added } = testApp({
      userRole: 'admin',
      session: 'admin-1',
      sample: [alfa.id],
      candidates,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/admin/golden/sample',
      payload: {},
    });
    expect(response.statusCode).toBe(200);
    // alfa is already sampled, so only beta is offered to the store.
    expect(added).toHaveLength(1);
    expect(added[0]?.itemIds).toEqual([beta.id]);
    expect(response.json()).toEqual({ added: 1, sampleSize: 2 });
    await app.close();
  });
});
