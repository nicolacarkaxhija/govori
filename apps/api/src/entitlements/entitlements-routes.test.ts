import { describe, expect, it, vi } from 'vitest';
import type { Item } from '@glotty/content';
import type { Entitlement } from '@glotty/entitlements';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type { EntitlementStore } from './ports.js';

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

const itemId = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';
const freeItem: Item = {
  id: itemId,
  kind: 'word',
  text: 'sněg',
  translations: [{ lang: 'en', text: 'snow' }],
  notes: [],
  provenance: { origin: 'human', contributorId: 'u1' },
};
// A future premium item: it carries a SKU the schema does not model yet.
const premiumItem = { ...freeItem, premiumSku: 'fol/en/a1' };

describe('entitlement routes', () => {
  it('requires a session to read own entitlements', async () => {
    const app = buildApp(makeTestDeps({ auth: sessionAs(null) }));
    const response = await app.inject({
      method: 'GET',
      url: '/me/entitlements',
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns a viewer their own entitlements', async () => {
    const held: Entitlement[] = [
      {
        userId: 'u1',
        sku: 'fol/en/a1',
        grantedAt: '2026-07-19T00:00:00.000Z',
        source: 'founder',
      },
    ];
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs('u1'),
        entitlements: {
          grant: () => Promise.reject(new Error('not used')),
          listForUser: () => Promise.resolve(held),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/me/entitlements',
    });
    expect(response.statusCode).toBe(200);
    expect(
      response.json<{ entitlements: Entitlement[] }>().entitlements,
    ).toEqual(held);
    await app.close();
  });

  it('lets an admin grant an entitlement', async () => {
    const grant = vi.fn((input: Parameters<EntitlementStore['grant']>[0]) =>
      Promise.resolve({
        ...input,
        grantedAt: '2026-07-19T00:00:00.000Z',
      }),
    );
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs('admin'),
        userRoles: { getRole: () => Promise.resolve('admin') },
        entitlements: { grant, listForUser: () => Promise.resolve([]) },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/admin/entitlements',
      payload: { userId: 'u2', sku: 'fol/en/a1', source: 'founder' },
    });
    expect(response.statusCode).toBe(200);
    expect(grant).toHaveBeenCalledWith({
      userId: 'u2',
      sku: 'fol/en/a1',
      source: 'founder',
    });
    await app.close();
  });

  it('refuses the grant path to non-admins', async () => {
    const grant = vi.fn(() => Promise.reject(new Error('not used')));
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs('u1'),
        userRoles: { getRole: () => Promise.resolve('learner') },
        entitlements: { grant, listForUser: () => Promise.resolve([]) },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/admin/entitlements',
      payload: { userId: 'u2', sku: 'fol/en/a1', source: 'founder' },
    });
    expect(response.statusCode).toBe(403);
    expect(grant).not.toHaveBeenCalled();
    await app.close();
  });

  it('refuses the grant path without a session', async () => {
    const app = buildApp(makeTestDeps({ auth: sessionAs(null) }));
    const response = await app.inject({
      method: 'POST',
      url: '/admin/entitlements',
      payload: { userId: 'u2', sku: 'fol/en/a1', source: 'founder' },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
});

describe('the content gate on item reads', () => {
  it('serves an item with no premium SKU freely', async () => {
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs(null),
        items: {
          findById: () => Promise.resolve({ item: freeItem, direction: 'isv' }),
          findByIds: () => Promise.resolve([]),
          list: () => Promise.resolve([]),
          findSentencesContaining: () => Promise.resolve([]),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: `/items/${itemId}`,
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('locks an item that carries a SKU the viewer does not hold', async () => {
    const app = buildApp(
      makeTestDeps({
        auth: sessionAs(null),
        items: {
          // A stand-in for future premium content: it declares a SKU.
          findById: () =>
            Promise.resolve({ item: premiumItem, direction: 'isv' }),
          findByIds: () => Promise.resolve([]),
          list: () => Promise.resolve([]),
          findSentencesContaining: () => Promise.resolve([]),
        },
        entitlements: {
          grant: () => Promise.reject(new Error('not used')),
          listForUser: () => Promise.resolve([]),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: `/items/${itemId}`,
    });
    expect(response.statusCode).toBe(402);
    await app.close();
  });
});
