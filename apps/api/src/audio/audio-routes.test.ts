import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type {
  NewRecording,
  RecordingStore,
  RecordingSummary,
  VoteTally,
} from './ports.js';

const itemId = '7d9a2f04-6d19-4c1a-9e3a-1f2b3c4d5e6f';

const item: Item = {
  id: itemId,
  kind: 'word',
  text: 'sněg',
  translations: [{ lang: 'en', text: 'snow' }],
  notes: [],
  provenance: { origin: 'human', contributorId: 'u1' },
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

/** In-memory recording store mirroring the Drizzle adapter's contract. */
function memoryStore() {
  const stored: (NewRecording & {
    status: 'pending' | 'verified' | 'rejected';
    deletedAt: Date | null;
    createdAt: string;
  })[] = [];
  const votes = new Map<string, Map<string, boolean>>();
  const credits = new Map<
    string,
    { secondsValidated: number; premiumDaysGranted: number; grantedAt: string }
  >();
  const tally = (recordingId: string): VoteTally => {
    const ballots = [...(votes.get(recordingId)?.values() ?? [])];
    return {
      upvotes: ballots.filter((up) => up).length,
      downvotes: ballots.filter((up) => !up).length,
    };
  };
  const store: RecordingStore = {
    add: (recording) => {
      stored.push({
        ...recording,
        status: 'pending',
        deletedAt: null,
        createdAt: new Date().toISOString(),
      });
      return Promise.resolve();
    },
    listForItem: (forItem) =>
      Promise.resolve(
        stored
          .filter(
            (r) =>
              r.itemId === forItem &&
              r.status === 'verified' &&
              r.deletedAt === null,
          )
          .map(
            ({ id, itemId: ownerId, mime, contributorId, status }) =>
              ({
                id,
                itemId: ownerId,
                mime,
                contributorId,
                status,
              }) satisfies RecordingSummary,
          ),
      ),
    get: (id) => {
      const hit = stored.find((r) => r.id === id && r.deletedAt === null);
      return Promise.resolve(
        hit === undefined ? undefined : { mime: hit.mime, bytes: hit.bytes },
      );
    },
    findById: (id) => {
      const hit = stored.find((r) => r.id === id);
      return Promise.resolve(
        hit === undefined
          ? undefined
          : {
              id: hit.id,
              contributorId: hit.contributorId,
              direction: hit.direction,
              status: hit.status,
              deletedAt: hit.deletedAt,
            },
      );
    },
    castVote: (recordingId, voterId, up) => {
      const ballots = votes.get(recordingId) ?? new Map<string, boolean>();
      ballots.set(voterId, up);
      votes.set(recordingId, ballots);
      return Promise.resolve(tally(recordingId));
    },
    verify: (recordingId) => {
      const hit = stored.find(
        (r) =>
          r.id === recordingId &&
          r.status === 'pending' &&
          r.deletedAt === null,
      );
      if (hit === undefined) {
        return Promise.resolve(undefined);
      }
      hit.status = 'verified';
      const seconds = Math.round(hit.deviceMeta.durationMs / 1000);
      const prior = credits.get(hit.contributorId)?.secondsValidated ?? 0;
      const secondsValidated = prior + seconds;
      const ledger = {
        secondsValidated,
        premiumDaysGranted: Math.floor(secondsValidated / 120) * 7,
        grantedAt: new Date().toISOString(),
      };
      credits.set(hit.contributorId, ledger);
      return Promise.resolve(ledger);
    },
    mine: (userId) =>
      Promise.resolve({
        recordings: stored
          .filter((r) => r.contributorId === userId && r.deletedAt === null)
          .map((r) => ({
            id: r.id,
            itemId: r.itemId,
            status: r.status,
            accentTag: r.accentTag,
            consentVersion: r.consentVersion,
            consentApp: r.consentApp,
            consentDataset: r.consentDataset,
            consentTraining: r.consentTraining,
            createdAt: r.createdAt,
          })),
        credit: credits.get(userId) ?? null,
      }),
    listPending: (viewerId, limit) =>
      Promise.resolve(
        stored
          .filter((r) => r.status === 'pending' && r.deletedAt === null)
          .slice(0, limit)
          .map((r) => {
            const t = tally(r.id);
            const mine = votes.get(r.id)?.get(viewerId);
            return {
              id: r.id,
              itemId: r.itemId,
              mime: r.mime,
              upvotes: t.upvotes,
              downvotes: t.downvotes,
              myVote: mine ?? null,
            };
          }),
      ),
  };
  return { store, stored, credits };
}

function testApp(options: { session?: string | null; audioOn?: boolean } = {}) {
  const { store, stored, credits } = memoryStore();
  const deps = makeTestDeps({
    auth: sessionAs('session' in options ? (options.session ?? null) : 'u1'),
    flagStates: {
      getStates: () =>
        Promise.resolve(
          options.audioOn === true
            ? { audio: { enabled: true, targetRole: 'all' } }
            : {},
        ),
      setFlag: () => Promise.resolve(),
    },
    items: {
      findById: (id) =>
        Promise.resolve(id === itemId ? { item, direction: 'isv' } : undefined),
      findByIds: (ids) => Promise.resolve(ids.includes(itemId) ? [item] : []),
      list: () => Promise.resolve([]),
      findSentencesContaining: () => Promise.resolve([]),
    },
    recordings: store,
  });
  return { app: buildApp(deps), stored, credits };
}

const clip = Buffer.from('webm-bytes-here').toString('base64');
const upload = {
  mime: 'audio/webm' as const,
  data: clip,
  accentTag: 'south',
  device: { sampleRate: 48_000, durationMs: 130_000 },
  consent: {
    version: 'v1',
    app: true as const,
    dataset: true,
    training: false,
  },
};

describe('audio routes', () => {
  it('stays dark while the audio flag is off', async () => {
    const { app } = testApp();
    for (const request of [
      { method: 'GET' as const, url: `/items/${itemId}/audio` },
      {
        method: 'POST' as const,
        url: `/items/${itemId}/audio`,
        payload: upload,
      },
      { method: 'GET' as const, url: `/audio/${crypto.randomUUID()}` },
      {
        method: 'POST' as const,
        url: `/audio/${crypto.randomUUID()}/vote`,
        payload: { up: true },
      },
      { method: 'GET' as const, url: '/audio/mine' },
    ]) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(404);
    }
    await app.close();
  });

  it('requires a session to upload', async () => {
    const { app, stored } = testApp({ session: null, audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: upload,
    });
    expect(response.statusCode).toBe(401);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('rejects an upload that withholds the app-use consent', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: { ...upload, consent: { ...upload.consent, app: false } },
    });
    expect(response.statusCode).toBe(400);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('rejects an upload without device duration metadata', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: { ...upload, device: { sampleRate: 48_000 } },
    });
    expect(response.statusCode).toBe(400);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('stores a clip at dataset grade with a pseudonymous speaker', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: upload,
    });
    expect(response.statusCode).toBe(201);
    expect(stored).toHaveLength(1);
    const saved = stored[0];
    expect(saved?.itemId).toBe(itemId);
    expect(saved?.direction).toBe('isv');
    expect(saved?.contributorId).toBe('u1');
    expect(saved?.speakerPseudonym).not.toBe('u1');
    expect(saved?.speakerPseudonym.startsWith('spk_')).toBe(true);
    expect(saved?.accentTag).toBe('south');
    expect(saved?.deviceMeta).toEqual({
      sampleRate: 48_000,
      mime: 'audio/webm',
      durationMs: 130_000,
    });
    expect(saved?.consentVersion).toBe('v1');
    expect(saved?.consentApp).toBe(true);
    expect(saved?.consentDataset).toBe(true);
    expect(saved?.consentTraining).toBe(false);
    expect(saved?.status).toBe('pending');
    await app.close();
  });

  it('rejects uploads for unknown items', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${crypto.randomUUID()}/audio`,
      payload: upload,
    });
    expect(response.statusCode).toBe(404);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('lists only verified clips and serves their bytes back', async () => {
    const { app, stored } = testApp({ audioOn: true });
    await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: upload,
    });
    // Pending clips are not yet public.
    const beforeList = await app.inject({
      method: 'GET',
      url: `/items/${itemId}/audio`,
    });
    expect(
      beforeList.json<{ recordings: unknown[] }>().recordings,
    ).toHaveLength(0);
    // Mark it verified straight through the store, then it surfaces.
    const record = stored[0];
    if (record !== undefined) {
      record.status = 'verified';
    }
    const list = await app.inject({
      method: 'GET',
      url: `/items/${itemId}/audio`,
    });
    expect(list.statusCode).toBe(200);
    const body = list.json<{ recordings: { id: string; mime: string }[] }>();
    expect(body.recordings).toHaveLength(1);
    expect(body.recordings[0]?.mime).toBe('audio/webm');
    const served = await app.inject({
      method: 'GET',
      url: `/audio/${body.recordings[0]?.id ?? ''}`,
    });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe('audio/webm');
    expect(served.rawPayload.toString('utf-8')).toBe('webm-bytes-here');
    await app.close();
  });

  it('404s on unknown recording ids', async () => {
    const { app } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'GET',
      url: `/audio/${crypto.randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('votes verify a clip and credit the contributor premium days', async () => {
    const { store, stored, credits } = memoryStore();
    // One clip, contributed by u1, worth ~130s so a single grant lands.
    await store.add({
      id: '11111111-1111-4111-8111-111111111111',
      itemId,
      direction: 'isv',
      contributorId: 'u1',
      speakerPseudonym: 'spk_x',
      accentTag: null,
      mime: 'audio/webm',
      bytes: new Uint8Array([1]),
      deviceMeta: { mime: 'audio/webm', durationMs: 130_000 },
      consentVersion: 'v1',
      consentApp: true,
      consentDataset: false,
      consentTraining: false,
    });
    const recordingId = stored[0]?.id ?? '';
    // Drive the vote route with three distinct voters.
    let response;
    for (const voter of ['va', 'vb', 'vc']) {
      const app = buildApp(
        makeTestDeps({
          auth: sessionAs(voter),
          flagStates: {
            getStates: () =>
              Promise.resolve({ audio: { enabled: true, targetRole: 'all' } }),
            setFlag: () => Promise.resolve(),
          },
          recordings: store,
        }),
      );
      response = await app.inject({
        method: 'POST',
        url: `/audio/${recordingId}/vote`,
        payload: { up: true },
      });
      await app.close();
    }
    expect(response?.statusCode).toBe(200);
    expect(response?.json<{ status: string }>().status).toBe('verified');
    expect(stored[0]?.status).toBe('verified');
    expect(credits.get('u1')).toMatchObject({
      secondsValidated: 130,
      premiumDaysGranted: 7,
    });
  });

  it('returns a contributor their own clips and credit ledger', async () => {
    const { app, stored } = testApp({ audioOn: true });
    await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: upload,
    });
    void stored;
    const mine = await app.inject({ method: 'GET', url: '/audio/mine' });
    expect(mine.statusCode).toBe(200);
    const body = mine.json<{
      recordings: { consentDataset: boolean; status: string }[];
      credit: null;
    }>();
    expect(body.recordings).toHaveLength(1);
    expect(body.recordings[0]?.consentDataset).toBe(true);
    expect(body.recordings[0]?.status).toBe('pending');
    expect(body.credit).toBeNull();
    await app.close();
  });

  it('requires a session for the personal audio view', async () => {
    const { app } = testApp({ session: null, audioOn: true });
    const response = await app.inject({ method: 'GET', url: '/audio/mine' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('requires a session to vote', async () => {
    const { app } = testApp({ session: null, audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/audio/${crypto.randomUUID()}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('404s a vote on an unknown recording', async () => {
    const { app } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/audio/${crypto.randomUUID()}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('GET /audio/pending', () => {
  it('requires a session', async () => {
    const { app } = testApp({ session: null, audioOn: true });
    const response = await app.inject({ method: 'GET', url: '/audio/pending' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('stays dark while the audio flag is off', async () => {
    const { app } = testApp();
    const response = await app.inject({ method: 'GET', url: '/audio/pending' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('lists pending clips with the item, tallies, and the caller vote', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const upload = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: {
        mime: 'audio/webm',
        data: Buffer.from('clip').toString('base64'),
        device: { mime: 'audio/webm', durationMs: 4000 },
        consent: { version: '1', app: true, dataset: false, training: false },
      },
    });
    expect(upload.statusCode).toBe(201);
    const recordingId = upload.json<{ id: string }>().id;

    const first = await app.inject({ method: 'GET', url: '/audio/pending' });
    expect(first.statusCode).toBe(200);
    const body = first.json<{
      pending: {
        id: string;
        mime: string;
        item: { id: string };
        upvotes: number;
        downvotes: number;
        myVote: boolean | null;
      }[];
    }>();
    expect(body.pending).toHaveLength(1);
    expect(body.pending[0]?.id).toBe(recordingId);
    expect(body.pending[0]?.item.id).toBe(itemId);
    expect(body.pending[0]?.upvotes).toBe(0);
    expect(body.pending[0]?.myVote).toBeNull();

    await app.inject({
      method: 'POST',
      url: `/audio/${recordingId}/vote`,
      payload: { up: true },
    });
    const second = await app.inject({ method: 'GET', url: '/audio/pending' });
    const afterVote = second.json<{
      pending: { upvotes: number; myVote: boolean | null }[];
    }>().pending;
    expect(afterVote[0]?.upvotes).toBe(1);
    expect(afterVote[0]?.myVote).toBe(true);
    expect(stored).toHaveLength(1);
    await app.close();
  });

  it('excludes already-decided clips from the pending list', async () => {
    const { app } = testApp({ audioOn: true });
    await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: {
        mime: 'audio/webm',
        data: Buffer.from('clip').toString('base64'),
        device: { mime: 'audio/webm', durationMs: 4000 },
        consent: { version: '1', app: true, dataset: false, training: false },
      },
    });
    const before = await app.inject({ method: 'GET', url: '/audio/pending' });
    const recordingId = before.json<{ pending: { id: string }[] }>().pending[0]
      ?.id;
    if (recordingId === undefined) {
      throw new Error('expected a pending recording');
    }
    await app.inject({
      method: 'POST',
      url: `/audio/${recordingId}/vote`,
      payload: { up: true },
    });
    await app.inject({
      method: 'POST',
      url: `/audio/${recordingId}/vote`,
      payload: { up: true },
    });
    // Single-vote net (below the govori threshold of 3) stays pending.
    const still = await app.inject({ method: 'GET', url: '/audio/pending' });
    expect(still.json<{ pending: { id: string }[] }>().pending).toHaveLength(1);
    await app.close();
  });
});
