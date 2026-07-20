import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type { QualityFlag, QualityThresholds } from './ports.js';
import { qualityThresholds } from './thresholds.js';

const item: Item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'voda',
  translations: [{ lang: 'en', text: 'water' }],
  notes: [],
  provenance: {
    origin: 'import',
    source: 'medzuslovjansky/slovnik',
    license: 'MIT',
    attribution: 'Interslavic community dictionary',
  },
};

const flag: QualityFlag = {
  item,
  againCount: 8,
  totalGraded: 12,
  failureRate: 8 / 12,
  openReports: 3,
  reasons: [
    { reason: 'wrong_translation', count: 2 },
    { reason: 'other', count: 1 },
  ],
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

function testApp(role: 'learner' | 'reviewer' | 'admin', session = 'u1') {
  const calls: { direction: string; thresholds: QualityThresholds }[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    userRoles: { getRole: () => Promise.resolve(role) },
    quality: {
      flags: (direction, thresholds) => {
        calls.push({ direction, thresholds });
        return Promise.resolve([flag]);
      },
    },
  });
  return { app: buildApp(deps), calls };
}

describe('GET /admin/quality-flags', () => {
  it('requires a session', async () => {
    const deps = makeTestDeps({ auth: sessionAs(null) });
    const app = buildApp(deps);
    const response = await app.inject({
      method: 'GET',
      url: '/admin/quality-flags',
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('forbids a plain learner', async () => {
    const { app } = testApp('learner');
    const response = await app.inject({
      method: 'GET',
      url: '/admin/quality-flags',
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('serves the escalation list to a reviewer, charter bars applied', async () => {
    const { app, calls } = testApp('reviewer');
    const response = await app.inject({
      method: 'GET',
      url: '/admin/quality-flags',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ flags: [flag] });
    expect(calls).toEqual([
      { direction: 'isv', thresholds: qualityThresholds },
    ]);
    await app.close();
  });

  it('serves an admin too', async () => {
    const { app } = testApp('admin');
    const response = await app.inject({
      method: 'GET',
      url: '/admin/quality-flags',
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('400s an unknown direction', async () => {
    const { app } = testApp('reviewer');
    const response = await app.inject({
      method: 'GET',
      url: '/admin/quality-flags?direction=nope',
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
