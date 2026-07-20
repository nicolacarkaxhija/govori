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
    expect(await fetchItems('isv', 5)).toEqual([item]);
  });

  it('returns null on server errors and network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    expect(await fetchItems('isv')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchItems('isv')).toBeNull();
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
    expect(await fetchCourse('isv')).toEqual(course);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('x', { status: 500 })),
    );
    expect(await fetchCourse('isv')).toBeNull();
    expect(
      await fetchLesson('9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f', 'isv'),
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
    expect(
      await fetchLesson('9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f', 'isv'),
    ).toEqual(lesson);
  });
});

describe('reviewer role on sessions and the directory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('fetchMe accepts a reviewer session', async () => {
    const { fetchMe } = await import('./client');
    const me = {
      user: { id: 'u1', email: 'ovca@example.com', role: 'reviewer' },
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(me), { status: 200 })),
    );
    expect(await fetchMe()).toEqual(me);
  });

  it('fetchUsers accepts reviewer rows', async () => {
    const { fetchUsers } = await import('./client');
    const users = [
      {
        id: 'u2',
        email: 'vlk@example.com',
        name: 'Vlk',
        role: 'reviewer',
        createdAt: '2026-07-17T10:00:00.000Z',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ users }), { status: 200 }),
        ),
    );
    expect(await fetchUsers()).toEqual(users);
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
    expect(await fetchItems('isv', 1)).toEqual([noted]);
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
    expect(await fetchItems('isv', 1)).toEqual([bare]);
  });
});

describe('attestation tier on learn items', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('keeps the tier when the API serves it', async () => {
    const graded = {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      kind: 'word',
      text: 'voda',
      translations: [{ lang: 'en', text: 'water' }],
      attestation: 'bronze',
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ items: [graded] }), { status: 200 }),
        ),
    );
    expect(await fetchItems('isv', 1)).toEqual([graded]);
  });

  it('rejects a payload whose tier is not one of the three grades', async () => {
    const bad = {
      id: 'aaaaaaaa-0000-4000-8000-000000000001',
      kind: 'word',
      text: 'voda',
      translations: [{ lang: 'en', text: 'water' }],
      attestation: 'platinum',
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ items: [bad] }), { status: 200 }),
        ),
    );
    expect(await fetchItems('isv', 1)).toBeNull();
  });

  it('still accepts items with no tier at all', async () => {
    const untiered = {
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
          new Response(JSON.stringify({ items: [untiered] }), { status: 200 }),
        ),
    );
    expect(await fetchItems('isv', 1)).toEqual([untiered]);
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
      await fetchLessonSentences('cccccccc-0000-4000-8000-000000000001', 'isv'),
    ).toEqual([]);
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(
      await fetchLessonSentences('cccccccc-0000-4000-8000-000000000001', 'isv'),
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
        Promise.resolve({
          items: 1,
          translations: 2,
          reviews: 3,
          learners: 4,
          qualityScore: 78,
          qualityAuditedItems: 34,
        }),
    });
    expect(await fetchStats('isv')).toEqual({
      items: 1,
      translations: 2,
      reviews: 3,
      learners: 4,
      qualityScore: 78,
      qualityAuditedItems: 34,
    });
    stubFetch({ ok: false, json: () => Promise.resolve({}) });
    expect(await fetchStats('isv')).toBeNull();
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
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }], 'isv'),
    ).toBe('accepted');
    post(401);
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }], 'isv'),
    ).toBe('unauthenticated');
    post(400);
    expect(
      await contribute('word', 'снег', [{ lang: 'en', text: 'snow' }], 'isv'),
    ).toBe('invalid');
    post(500);
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }], 'isv'),
    ).toBe('failed');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(
      await contribute('word', 'sněg', [{ lang: 'en', text: 'snow' }], 'isv'),
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

  it('uploads a recording with consent and device metadata', async () => {
    const { uploadRecording } = await import('./client');
    const fetchMock = vi.fn(() => Promise.resolve({ status: 201, ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const ok = await uploadRecording(
      '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
      new Blob(['clip']),
      { sampleRate: 48000, mime: 'audio/webm', durationMs: 1200 },
      { version: '1', app: true, dataset: true, training: false },
      'northern',
    );
    expect(ok).toBe(true);
    const call = fetchMock.mock.calls[0] as unknown as [URL, { body: string }];
    const body = JSON.parse(call[1].body) as {
      mime: string;
      data: string;
      accentTag: string;
      device: { sampleRate: number; durationMs: number };
      consent: {
        version: string;
        app: boolean;
        dataset: boolean;
        training: boolean;
      };
    };
    expect(body.mime).toBe('audio/webm');
    expect(atob(body.data)).toBe('clip');
    expect(body.accentTag).toBe('northern');
    expect(body.device).toEqual({ sampleRate: 48000, durationMs: 1200 });
    expect(body.consent).toEqual({
      version: '1',
      app: true,
      dataset: true,
      training: false,
    });
  });

  it('omits an absent sample rate and accent, and fails closed', async () => {
    const { uploadRecording } = await import('./client');
    const fetchMock = vi.fn(() => Promise.resolve({ status: 201, ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await uploadRecording(
      '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
      new Blob(['clip']),
      { mime: 'audio/ogg', durationMs: 900 },
      { version: '1', app: true, dataset: false, training: false },
    );
    const call = fetchMock.mock.calls[0] as unknown as [URL, { body: string }];
    const body = JSON.parse(call[1].body) as {
      device: Record<string, number>;
      accentTag?: string;
    };
    expect('sampleRate' in body.device).toBe(false);
    expect(body.device).toEqual({ durationMs: 900 });
    expect(body.accentTag).toBeUndefined();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(
      await uploadRecording(
        '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
        new Blob(['clip']),
        { mime: 'audio/webm', durationMs: 900 },
        { version: '1', app: true, dataset: false, training: false },
      ),
    ).toBe(false);
  });

  it('reads my recordings, distinguishing unauthenticated from unreachable', async () => {
    const { fetchMyRecordings } = await import('./client');
    const id = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';
    const payload = {
      recordings: [
        {
          id,
          itemId: id,
          status: 'verified',
          accentTag: null,
          consentVersion: '1',
          consentApp: true,
          consentDataset: true,
          consentTraining: false,
          createdAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      credit: {
        secondsValidated: 12,
        premiumDaysGranted: 1,
        grantedAt: '2026-07-20T00:00:00.000Z',
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve(payload),
        }),
      ),
    );
    expect(await fetchMyRecordings()).toEqual(payload);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 401, ok: false })),
    );
    expect(await fetchMyRecordings()).toBe('unauthenticated');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 404, ok: false })),
    );
    expect(await fetchMyRecordings()).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchMyRecordings()).toBeNull();
  });

  it('casts an audio vote and returns the fresh tally with status', async () => {
    const { castAudioVote } = await import('./client');
    const id = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () =>
            Promise.resolve({ upvotes: 3, downvotes: 0, status: 'verified' }),
        }),
      ),
    );
    expect(await castAudioVote(id, true)).toEqual({
      upvotes: 3,
      downvotes: 0,
      status: 'verified',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 404, ok: false })),
    );
    expect(await castAudioVote(id, true)).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await castAudioVote(id, false)).toBeNull();
  });

  it('lists the pending audio queue, unauthenticated from unreachable', async () => {
    const { fetchPendingAudio } = await import('./client');
    const id = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';
    const entry = {
      id,
      mime: 'audio/webm',
      item: {
        id,
        kind: 'word',
        text: 'dom',
        translations: [{ lang: 'en', text: 'house' }],
      },
      upvotes: 1,
      downvotes: 0,
      myVote: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ pending: [entry] }),
        }),
      ),
    );
    expect(await fetchPendingAudio()).toEqual([entry]);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 401, ok: false })),
    );
    expect(await fetchPendingAudio()).toBe('unauthenticated');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ status: 404, ok: false })),
    );
    expect(await fetchPendingAudio()).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchPendingAudio()).toBeNull();
  });
});

describe('fetchForms', () => {
  it('lists inflected forms and falls back to none', async () => {
    const { fetchForms } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ forms: [{ tag: 'pl', text: 'domy' }] }),
        }),
      ),
    );
    expect(await fetchForms('7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f')).toEqual([
      { tag: 'pl', text: 'domy' },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchForms('7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f')).toEqual(
      [],
    );
  });
});

describe('reportItem', () => {
  const itemId = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';

  it('posts a report and reports acceptance on 202', async () => {
    const { reportItem } = await import('./client');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await reportItem(itemId, 'wrong_translation', 'off')).toBe(true);
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    ) as unknown;
    expect(body).toEqual({ reason: 'wrong_translation', comment: 'off' });
  });

  it('omits a blank comment from the body', async () => {
    const { reportItem } = await import('./client');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    await reportItem(itemId, 'other', '   ');
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as { body: string }).body,
    ) as unknown;
    expect(body).toEqual({ reason: 'other' });
  });

  it('is false on a non-202 response and on network failure', async () => {
    const { reportItem } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('no', { status: 404 })),
    );
    expect(await reportItem(itemId, 'not_natural')).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await reportItem(itemId, 'not_natural')).toBe(false);
  });
});

describe('fetchQualityFlags', () => {
  const flag = {
    item: {
      id: '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f',
      kind: 'word',
      text: 'voda',
      translations: [{ lang: 'en', text: 'water' }],
    },
    againCount: 8,
    totalGraded: 12,
    failureRate: 0.66,
    openReports: 3,
    reasons: [{ reason: 'wrong_translation', count: 2 }],
  };

  it('returns the parsed escalation list on success', async () => {
    const { fetchQualityFlags } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ flags: [flag] }), { status: 200 }),
        ),
    );
    expect(await fetchQualityFlags()).toEqual([flag]);
  });

  it('is null when forbidden or unreachable', async () => {
    const { fetchQualityFlags } = await import('./client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('no', { status: 403 })),
    );
    expect(await fetchQualityFlags()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchQualityFlags()).toBeNull();
  });
});

describe('golden-set clients', () => {
  const id = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';

  it('fetches the golden queue with the item and any prior audit', async () => {
    const { fetchGoldenQueue } = await import('./client');
    const entry = {
      item: {
        id,
        kind: 'word',
        text: 'voda',
        translations: [{ lang: 'en', text: 'water' }],
      },
      priorAudit: {
        accuracy: 4,
        naturalness: 3,
        fit: 5,
        comment: 'peer note',
        auditedAt: '2026-07-20T00:00:00.000Z',
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queue: [entry] }),
        }),
      ),
    );
    expect(await fetchGoldenQueue('isv')).toEqual([entry]);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
      ),
    );
    expect(await fetchGoldenQueue('isv')).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await fetchGoldenQueue('isv')).toBeNull();
  });

  it('submits an audit, sending the comment only when non-empty', async () => {
    const { submitGoldenAudit } = await import('./client');
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    expect(
      await submitGoldenAudit(id, {
        accuracy: 5,
        naturalness: 4,
        fit: 3,
        comment: '  ',
      }),
    ).toBe(true);
    const first = fetchMock.mock.calls[0] as unknown as [URL, { body: string }];
    const body = JSON.parse(first[1].body) as Record<string, unknown>;
    expect(body).toEqual({ accuracy: 5, naturalness: 4, fit: 3 });
    expect(String(first[0])).toContain(`/admin/golden/${id}/audit`);

    await submitGoldenAudit(id, {
      accuracy: 2,
      naturalness: 2,
      fit: 2,
      comment: 'thin',
    });
    const second = fetchMock.mock.calls[1] as unknown as [
      URL,
      { body: string },
    ];
    expect((JSON.parse(second[1].body) as { comment?: string }).comment).toBe(
      'thin',
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(
      await submitGoldenAudit(id, { accuracy: 1, naturalness: 1, fit: 1 }),
    ).toBe(false);
  });
});
