import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchItems, fetchMeta } from './client';

const validMeta = {
  brand: {
    shortName: 'Govori',
    fullName: 'Govori — Interslavic Learning App',
  },
};

function stubFetch(value: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(value)),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMeta', () => {
  it('returns the parsed brand on a 200 response', async () => {
    stubFetch({ ok: true, json: () => Promise.resolve(validMeta) });
    expect(await fetchMeta()).toEqual(validMeta);
  });

  it('returns null when the response is not ok', async () => {
    stubFetch({ ok: false, json: () => Promise.resolve(validMeta) });
    expect(await fetchMeta()).toBeNull();
  });

  it('returns null when the network request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchMeta()).toBeNull();
  });

  it('returns null when the payload does not match the schema', async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ brand: {} }) });
    expect(await fetchMeta()).toBeNull();
  });
});

describe('fetchItems', () => {
  const item = {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    kind: 'word',
    text: 'voda',
    translations: [{ lang: 'en', text: 'water' }],
  };

  it('returns parsed items on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ items: [item] }), { status: 200 }),
        ),
    );
    expect(await fetchItems(5)).toEqual([item]);
  });

  it('returns null on server errors and network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    expect(await fetchItems()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchItems()).toBeNull();
  });
});
