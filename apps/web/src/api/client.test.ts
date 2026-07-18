import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('community voting clients', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  const entry = {
    item: {
      id: 'cccccccc-0000-4000-8000-000000000001',
      kind: 'sentence',
      text: 'Ja pijų vodų.',
      translations: [{ lang: 'en', text: 'I drink water.' }],
    },
    upvotes: 2,
    downvotes: 1,
    myVote: null,
  };

  it('fetchPendingVotes parses the open queue', async () => {
    const { fetchPendingVotes } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ pending: [entry] }), { status: 200 }),
        ),
    );
    expect(await fetchPendingVotes()).toEqual([entry]);
  });

  it('fetchPendingVotes tells a signed-out session apart from a failure', async () => {
    const { fetchPendingVotes } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'sign in' }), {
          status: 401,
        }),
      ),
    );
    expect(await fetchPendingVotes()).toBe('unauthenticated');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    expect(await fetchPendingVotes()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchPendingVotes()).toBeNull();
  });

  it('castVote returns the fresh tallies and fails closed', async () => {
    const { castVote } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ upvotes: 3, downvotes: 1 }), {
          status: 200,
        }),
      ),
    );
    expect(
      await castVote('cccccccc-0000-4000-8000-000000000001', true),
    ).toEqual({ upvotes: 3, downvotes: 1 });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('gone', { status: 404 })),
    );
    expect(
      await castVote('cccccccc-0000-4000-8000-000000000001', false),
    ).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(
      await castVote('cccccccc-0000-4000-8000-000000000001', true),
    ).toBeNull();
  });
});

describe('contrastive notes on learn items', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('keeps notes when the API serves them', async () => {
    const noted = {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      kind: 'word',
      text: 'čista',
      translations: [{ lang: 'en', text: 'clean' }],
      notes: [{ sourceLang: 'pl', text: 'čista ≈ czysta' }],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ items: [noted] }), { status: 200 }),
        ),
    );
    expect(await fetchItems(1)).toEqual([noted]);
  });

  it('still accepts items without notes', async () => {
    const bare = {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      kind: 'word',
      text: 'voda',
      translations: [{ lang: 'en', text: 'water' }],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ items: [bare] }), { status: 200 }),
        ),
    );
    expect(await fetchItems(1)).toEqual([bare]);
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

describe('audio client', () => {
  it('fetches flags and falls back to none', async () => {
    const { fetchFlags } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ flags: { audio: true } }),
        }),
      ),
    );
    expect(await fetchFlags()).toEqual({ audio: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchFlags()).toEqual({});
  });

  it('lists recordings and falls back to none', async () => {
    const { fetchRecordings } = await import('./client');
    const id = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () =>
            Promise.resolve({ recordings: [{ id, mime: 'audio/webm' }] }),
        }),
      ),
    );
    expect(await fetchRecordings(id)).toEqual([{ id, mime: 'audio/webm' }]);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 404, ok: false })),
    );
    expect(await fetchRecordings(id)).toEqual([]);
  });

  it('addresses a recording stream by id', async () => {
    const { recordingUrl } = await import('./client');
    expect(recordingUrl('abc')).toContain('/audio/abc');
  });

  it('uploads a recording as base64 and reports the outcome', async () => {
    const { uploadRecording } = await import('./client');
    const fetchMock = vi.fn(() => Promise.resolve({ status: 201, ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const ok = await uploadRecording(
      '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
      'audio/webm',
      new Blob(['clip']),
    );
    expect(ok).toBe(true);
    const call = fetchMock.mock.calls[0] as unknown as [URL, { body: string }];
    const body = JSON.parse(call[1].body) as { mime: string; data: string };
    expect(body.mime).toBe('audio/webm');
    expect(atob(body.data)).toBe('clip');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(
      await uploadRecording(
        '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
        'audio/webm',
        new Blob(['clip']),
      ),
    ).toBe(false);
  });
});
