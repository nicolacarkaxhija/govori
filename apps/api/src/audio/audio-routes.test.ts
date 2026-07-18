import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import { buildApp } from '../app.js';
import type { Auth } from '../auth/auth.js';
import { makeTestDeps } from '../test-support.js';
import type { RecordingStore, StoredRecording } from './ports.js';

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

function testApp(options: { session?: string | null; audioOn?: boolean } = {}) {
  const stored: StoredRecording[] = [];
  const recordings: RecordingStore = {
    add: (recording) => {
      stored.push(recording);
      return Promise.resolve();
    },
    listForItem: (forItem) =>
      Promise.resolve(
        stored
          .filter((recording) => recording.itemId === forItem)
          .map(({ id, itemId: ownerId, mime, contributorId }) => ({
            id,
            itemId: ownerId,
            mime,
            contributorId,
          })),
      ),
    get: (id) => {
      const hit = stored.find((recording) => recording.id === id);
      return Promise.resolve(
        hit === undefined ? undefined : { mime: hit.mime, bytes: hit.bytes },
      );
    },
  };
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
      findById: (id) => Promise.resolve(id === itemId ? item : undefined),
      findByIds: () => Promise.resolve([]),
      list: () => Promise.resolve([]),
      findSentencesContaining: () => Promise.resolve([]),
    },
    recordings,
  });
  return { app: buildApp(deps), stored };
}

const clip = Buffer.from('webm-bytes-here').toString('base64');

describe('audio routes', () => {
  it('stays dark while the audio flag is off', async () => {
    const { app } = testApp();
    for (const request of [
      { method: 'GET' as const, url: `/items/${itemId}/audio` },
      {
        method: 'POST' as const,
        url: `/items/${itemId}/audio`,
        payload: { mime: 'audio/webm', data: clip },
      },
      { method: 'GET' as const, url: `/audio/${crypto.randomUUID()}` },
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
      payload: { mime: 'audio/webm', data: clip },
    });
    expect(response.statusCode).toBe(401);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('publishes a recording directly against its item', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: { mime: 'audio/webm', data: clip },
    });
    expect(response.statusCode).toBe(201);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.itemId).toBe(itemId);
    expect(stored[0]?.contributorId).toBe('u1');
    expect(Buffer.from(stored[0]?.bytes ?? []).toString('utf-8')).toBe(
      'webm-bytes-here',
    );
  });

  it('rejects uploads for unknown items', async () => {
    const { app, stored } = testApp({ audioOn: true });
    const response = await app.inject({
      method: 'POST',
      url: `/items/${crypto.randomUUID()}/audio`,
      payload: { mime: 'audio/webm', data: clip },
    });
    expect(response.statusCode).toBe(404);
    expect(stored).toHaveLength(0);
    await app.close();
  });

  it('lists recordings and serves their bytes back', async () => {
    const { app } = testApp({ audioOn: true });
    await app.inject({
      method: 'POST',
      url: `/items/${itemId}/audio`,
      payload: { mime: 'audio/webm', data: clip },
    });
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
});
