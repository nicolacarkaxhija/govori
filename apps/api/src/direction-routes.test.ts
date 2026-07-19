import { describe, expect, it } from 'vitest';
import type { Item } from '@glotty/content';
import {
  resolveInstance,
  type InstanceConfig,
  type LanguagePack,
  type ResolvedInstance,
} from '@glotty/language';
import { buildApp } from './app.js';
import type { Auth } from './auth/auth.js';
import { makeTestDeps } from './test-support.js';

// A two-direction instance built from fake packs: every route that
// reads or writes content must demand an explicit direction (ADR 0046)
// and thread it through to the scoped ports.

const lowerPack: LanguagePack = {
  id: 'lower',
  bcp47: 'zxx',
  orthographyName: 'lowercase spelling',
  validateCanonical: (text) => /^[a-z .]+$/.test(text),
  normalize: (text) => text.toLowerCase(),
  stem: (word) => word.slice(0, 3),
  scripts: [{ id: 'plain', label: 'aa', render: (text) => text }],
};

const upperPack: LanguagePack = {
  id: 'upper',
  bcp47: 'zxx',
  orthographyName: 'uppercase spelling',
  validateCanonical: (text) => /^[A-Z .]+$/.test(text),
  normalize: (text) => text.toUpperCase(),
  stem: (word) => word.slice(0, 3),
  scripts: [{ id: 'plain', label: 'AA', render: (text) => text }],
};

const twoWayInstance: InstanceConfig = {
  id: 'twoway',
  brand: {
    shortName: 'TwoWay',
    fullName: 'TwoWay — Test App',
    description: 'A two-direction fixture.',
  },
  directions: [
    {
      id: 'forth',
      packId: 'lower',
      label: 'Forthish',
      fallbackTranslationLang: 'en',
      communityPublishNetVotes: 1,
    },
    {
      id: 'back',
      packId: 'upper',
      label: 'Backish',
      fallbackTranslationLang: 'en',
      communityPublishNetVotes: 5,
    },
  ],
  uiLanguages: ['en'],
  learnLanguages: [{ code: 'en', name: 'English' }],
  catalogs: { en: { check: 'Check' } },
};

const twoWay: ResolvedInstance = resolveInstance(
  {
    instances: { twoway: twoWayInstance },
    packs: { lower: lowerPack, upper: upperPack },
  },
  'twoway',
  'TEST_INSTANCE',
);

const backItem: Item = {
  id: '3e2d8f0a-4b1c-4f6e-9a7d-1c2b3a4d5e6f',
  kind: 'word',
  text: 'WATER',
  translations: [{ lang: 'en', text: 'water' }],
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

function testApp(session: string | null = 'u1') {
  const listedDirections: string[] = [];
  const queued: { item: Item; direction: string }[] = [];
  const published: { item: Item; direction: string }[] = [];
  const pendingDirection = { value: 'forth' };
  const deps = makeTestDeps({
    instance: twoWay.instance,
    directions: twoWay.directions,
    auth: sessionAs(session),
    items: {
      findById: () => Promise.resolve(undefined),
      findByIds: () => Promise.resolve([]),
      list: (direction) => {
        listedDirections.push(direction);
        return Promise.resolve(direction === 'back' ? [backItem] : []);
      },
      findSentencesContaining: () => Promise.resolve([]),
    },
    reviewQueue: {
      addPending: (toQueue, direction) => {
        queued.push(...toQueue.map((item) => ({ item, direction })));
        return Promise.resolve(toQueue.length);
      },
      listPending: () => Promise.resolve([]),
      findPending: (id) =>
        Promise.resolve(
          id === backItem.id
            ? { item: backItem, direction: pendingDirection.value }
            : undefined,
        ),
      decide: () =>
        Promise.resolve({ item: backItem, direction: pendingDirection.value }),
    },
    votes: {
      castVote: () => Promise.resolve({ upvotes: 1, downvotes: 0 }),
      talliesFor: () => Promise.resolve(new Map()),
    },
    itemWriter: {
      upsertMany: (toPublish, direction) => {
        published.push(...toPublish.map((item) => ({ item, direction })));
        return Promise.resolve();
      },
    },
  });
  return {
    app: buildApp(deps),
    listedDirections,
    queued,
    published,
    pendingDirection,
  };
}

describe('multi-direction content routes', () => {
  it('refuses every ambiguous read without a direction, naming the ids', async () => {
    const { app } = testApp();
    for (const url of [
      '/items',
      '/stats',
      '/course',
      `/lessons/${backItem.id}`,
      `/lessons/${backItem.id}/sentences`,
      '/export/content',
      '/export/curriculum',
      '/export/morphology',
    ]) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(400);
      expect(response.json<{ message: string }>().message, url).toBe(
        'direction is required; known directions: forth, back',
      );
    }
    await app.close();
  });

  it('rejects an unknown direction id', async () => {
    const { app } = testApp();
    const response = await app.inject({
      method: 'GET',
      url: '/items?direction=sideways',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ message: string }>().message).toBe(
      "unknown direction 'sideways'; known directions: forth, back",
    );
    await app.close();
  });

  it('scopes the item list to the asked direction', async () => {
    const { app, listedDirections } = testApp();
    const back = await app.inject({
      method: 'GET',
      url: '/items?direction=back',
    });
    expect(back.statusCode).toBe(200);
    expect(
      back.json<{ items: Item[] }>().items.map((item) => item.text),
    ).toEqual(['WATER']);
    const forth = await app.inject({
      method: 'GET',
      url: '/items?direction=forth',
    });
    expect(forth.json<{ items: Item[] }>().items).toEqual([]);
    expect(listedDirections).toEqual(['back', 'forth']);
    await app.close();
  });
});

describe('multi-direction contributions', () => {
  const payload = {
    kind: 'word',
    text: 'snow',
    translations: [{ lang: 'en', text: 'snow' }],
  };

  it('requires the direction in the body', async () => {
    const { app, queued } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ message: string }>().message).toBe(
      'direction is required; known directions: forth, back',
    );
    expect(queued).toHaveLength(0);
    await app.close();
  });

  it('validates against the asked direction pack and queues there', async () => {
    const { app, queued } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload: { ...payload, direction: 'forth' },
    });
    expect(response.statusCode).toBe(202);
    expect(queued[0]?.direction).toBe('forth');
    expect(queued[0]?.item.text).toBe('snow');
    await app.close();
  });

  it("names the asked direction's orthography on rejection", async () => {
    const { app, queued } = testApp();
    // Valid uppercase text sent into the lowercase direction: the
    // judgment call belongs to that direction's pack alone.
    const response = await app.inject({
      method: 'POST',
      url: '/contribute',
      payload: { ...payload, text: 'SNOW', direction: 'forth' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<{ message: string }>().message).toBe(
      'the text must be written in lowercase spelling',
    );
    expect(queued).toHaveLength(0);
    await app.close();
  });
});

describe('multi-direction vote thresholds', () => {
  it("publishes at the draft direction's own threshold", async () => {
    // forth publishes at net one; the same tally must not clear back's
    // bar of five. The draft here belongs to forth.
    const { app, published } = testApp();
    const response = await app.inject({
      method: 'POST',
      url: `/review/${backItem.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(published.map((entry) => entry.direction)).toEqual(['forth']);
    await app.close();
  });

  it('holds a draft of the stricter direction below its bar', async () => {
    const { app, published, pendingDirection } = testApp();
    pendingDirection.value = 'back';
    const response = await app.inject({
      method: 'POST',
      url: `/review/${backItem.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(published).toHaveLength(0);
    await app.close();
  });

  it('never auto-publishes a draft stranded outside the roster', async () => {
    const { app, published, pendingDirection } = testApp();
    pendingDirection.value = 'retired';
    const response = await app.inject({
      method: 'POST',
      url: `/review/${backItem.id}/vote`,
      payload: { up: true },
    });
    expect(response.statusCode).toBe(200);
    expect(published).toHaveLength(0);
    await app.close();
  });
});
