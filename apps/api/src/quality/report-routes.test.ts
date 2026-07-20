import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type { NewReport } from './ports.js';

const itemId = '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f';

const item: Item = {
  id: itemId,
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
  known?: boolean;
  flagged?: boolean;
}

function testApp({
  session = null,
  known = true,
  flagged = false,
}: Setup = {}) {
  const recorded: NewReport[] = [];
  const deps = makeTestDeps({
    auth: sessionAs(session),
    items: {
      findById: (id) =>
        Promise.resolve(
          known && id === itemId ? { item, direction: 'isv' } : undefined,
        ),
      findByIds: () => Promise.resolve([]),
      list: () => Promise.resolve([]),
      findSentencesContaining: () => Promise.resolve([]),
    },
    reports: {
      add: (report) => {
        recorded.push(report);
        return Promise.resolve({ flagged });
      },
    },
  });
  return { app: buildApp(deps), recorded };
}

describe('POST /items/:id/report', () => {
  it('404s an unknown item', async () => {
    const { app, recorded } = testApp({ known: false });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'wrong_translation' },
    });
    expect(response.statusCode).toBe(404);
    expect(recorded).toHaveLength(0);
    await app.close();
  });

  it('accepts an anonymous report without a session', async () => {
    const { app, recorded } = testApp({ session: null });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'not_natural' },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'accepted', flagged: false });
    expect(recorded).toEqual([
      {
        itemId,
        direction: 'isv',
        reporterId: null,
        reason: 'not_natural',
        comment: null,
      },
    ]);
    await app.close();
  });

  it('tags a report with the signed-in reporter and keeps the comment', async () => {
    const { app, recorded } = testApp({ session: 'u1' });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'other', comment: '  looks off  ' },
    });
    expect(response.statusCode).toBe(202);
    expect(recorded[0]).toEqual({
      itemId,
      direction: 'isv',
      reporterId: 'u1',
      reason: 'other',
      comment: 'looks off',
    });
    await app.close();
  });

  it('surfaces the auto-flag when the store reports it', async () => {
    const { app } = testApp({ flagged: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'wrong_audio' },
    });
    expect(response.json()).toEqual({ status: 'accepted', flagged: true });
    await app.close();
  });

  it('rejects an unknown reason', async () => {
    const { app, recorded } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'too_hard' },
    });
    expect(response.statusCode).toBe(400);
    expect(recorded).toHaveLength(0);
    await app.close();
  });

  it('rejects an empty comment', async () => {
    const { app } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/report`,
      payload: { reason: 'other', comment: '   ' },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
