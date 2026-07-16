import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMeta } from './client';

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
