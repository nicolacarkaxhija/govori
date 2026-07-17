import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCourse, fetchItems, fetchLesson, fetchMeta } from './client';

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

describe('fetchCourse and fetchLesson', () => {
  it('parse valid payloads and fail closed otherwise', async () => {
    const course = { units: [] };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(course), { status: 200 }),
        ),
    );
    expect(await fetchCourse()).toEqual(course);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('x', { status: 500 })),
    );
    expect(await fetchCourse()).toBeNull();
    expect(
      await fetchLesson('9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f'),
    ).toBeNull();
    const lesson = {
      title: 'Lekcija 1',
      items: [
        {
          id: 'aaaaaaaa-0000-4000-8000-000000000001',
          kind: 'word',
          text: 'voda',
          translations: [{ lang: 'en', text: 'water' }],
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(lesson), { status: 200 }),
        ),
    );
    expect(await fetchLesson('9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f')).toEqual(
      lesson,
    );
  });
});

describe('review clients', () => {
  it('fetchPendingReviews parses the queue and fails closed', async () => {
    const { fetchPendingReviews } = await import('./client');
    stubFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          pending: [
            {
              id: 'cccccccc-0000-4000-8000-000000000001',
              kind: 'sentence',
              text: 'Ja piju vodu.',
              translations: [{ lang: 'en', text: 'I drink water.' }],
            },
          ],
        }),
    });
    expect(await fetchPendingReviews()).toHaveLength(1);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await fetchPendingReviews()).toBeNull();
  });

  it('decideReview reports whether the decision landed', async () => {
    const { decideReview } = await import('./client');
    stubFetch({ ok: true, json: () => Promise.resolve({}) });
    expect(
      await decideReview('cccccccc-0000-4000-8000-000000000001', 'approve'),
    ).toBe(true);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(
      await decideReview('cccccccc-0000-4000-8000-000000000001', 'reject'),
    ).toBe(false);
  });

  it('fetchLessonSentences returns empty on failure', async () => {
    const { fetchLessonSentences } = await import('./client');
    stubFetch({ ok: true, json: () => Promise.resolve({ sentences: [] }) });
    expect(
      await fetchLessonSentences('cccccccc-0000-4000-8000-000000000001'),
    ).toEqual([]);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(
      await fetchLessonSentences('cccccccc-0000-4000-8000-000000000001'),
    ).toEqual([]);
  });
});

describe('fetchReviews', () => {
  it('parses the server log and fails closed', async () => {
    const { fetchReviews } = await import('./client');
    stubFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          events: [
            {
              id: 'dddddddd-0000-4000-8000-000000000001',
              itemId: 'bbbbbbbb-0000-4000-8000-000000000001',
              reviewedAt: '2026-07-16T10:00:00.000Z',
              grade: 'good',
            },
          ],
        }),
    });
    expect(await fetchReviews()).toHaveLength(1);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await fetchReviews()).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchReviews()).toBeNull();
  });
});

describe('user directory clients', () => {
  it('fetchUsers parses and fails closed', async () => {
    const { fetchUsers } = await import('./client');
    stubFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          users: [
            {
              id: 'u2',
              email: 'ovca@example.com',
              name: 'Ovca',
              role: 'learner',
              createdAt: '2026-07-17T10:00:00.000Z',
            },
          ],
        }),
    });
    expect(await fetchUsers()).toHaveLength(1);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await fetchUsers()).toBeNull();
  });

  it('setUserRole reports whether the change landed', async () => {
    const { setUserRole } = await import('./client');
    stubFetch({ ok: true, json: () => Promise.resolve({}) });
    expect(await setUserRole('u2', 'admin')).toBe(true);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await setUserRole('u2', 'learner')).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await setUserRole('u2', 'admin')).toBe(false);
  });
});

describe('account clients fail closed', () => {
  it('covers stats, me, auth posts, sync, export, and delete paths', async () => {
    const {
      fetchStats,
      fetchMe,
      signUp,
      signIn,
      signOut,
      pushReviews,
      exportData,
      deleteAccount,
    } = await import('./client');
    stubFetch({
      ok: true,
      json: () =>
        Promise.resolve({ items: 1, translations: 2, reviews: 3, learners: 4 }),
    });
    expect(await fetchStats()).toEqual({
      items: 1,
      translations: 2,
      reviews: 3,
      learners: 4,
    });
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await fetchStats()).toBeNull();
    expect(await fetchMe()).toBeNull();
    expect(await signUp('a@b.c', 'password-123', 'A')).toBe(false);
    expect(await signIn('a@b.c', 'password-123')).toBe(false);
    expect(await signOut()).toBe(false);
    expect(await pushReviews([])).toBeNull();
    expect(await exportData()).toBeNull();
    expect(await deleteAccount()).toBe(false);
    stubFetch({
      ok: true,
      json: () => Promise.resolve({ received: 0, stored: 0 }),
    });
    expect(await pushReviews([])).toEqual({ received: 0, stored: 0 });
    expect(await deleteAccount()).toBe(true);
  });
});

describe('contribute', () => {
  it('maps every server response to a result', async () => {
    const { contribute } = await import('./client');
    const post = (status: number) =>
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ status, ok: status < 300 })),
      );
    post(202);
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }]),
    ).toBe('accepted');
    post(401);
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }]),
    ).toBe('unauthenticated');
    post(400);
    expect(
      await contribute('word', 'снег', [{ lang: 'en', text: 'snow' }]),
    ).toBe('invalid');
    post(500);
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }]),
    ).toBe('failed');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }]),
    ).toBe('failed');
  });
});
