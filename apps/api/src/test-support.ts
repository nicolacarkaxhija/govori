import { makeContentSchemas, type ContentSchemas } from '@glotty/content';
import { resolveInstance, type ResolvedInstance } from '@glotty/language';
import { govoriInstance } from '@glotty/instance-govori';
import { isvPack } from '@glotty/pack-isv';
import type { AppDependencies } from './app.js';
import type { Auth } from './auth/auth.js';
import { loadConfig } from './config.js';

// Suites run against the govori instance as their concrete fixture; the
// engine under test still receives everything through the seams.

/** Artifact schemas bound to the suite's fixture pack (isv test data). */
export const testSchemas: ContentSchemas = makeContentSchemas((text) =>
  isvPack.validateCanonical(text),
);

/** The fixture instance, resolved exactly as a composition root would. */
export const testResolved: ResolvedInstance = resolveInstance(
  { instances: { govori: govoriInstance }, packs: { isv: isvPack } },
  'govori',
  'TEST_INSTANCE',
);

/**
 * Baseline dependencies for route tests: everything stubbed inert, any
 * piece overridable per test. Lives in src so tests never rebuild it.
 */
export function makeTestDeps(
  overrides: Partial<AppDependencies> = {},
  env: Readonly<Record<string, string | undefined>> = {},
): AppDependencies {
  return {
    config: loadConfig(env, govoriInstance.brand),
    instance: testResolved.instance,
    directions: testResolved.directions,
    items: {
      findById: () => Promise.resolve(undefined),
      findByIds: () => Promise.resolve([]),
      list: () => Promise.resolve([]),
      findSentencesContaining: () => Promise.resolve([]),
    },
    flagStates: {
      getStates: () => Promise.resolve({}),
      setFlag: () => Promise.resolve(),
    },
    auth: {
      handler: () => Promise.resolve(new Response(null, { status: 404 })),
      api: { getSession: () => Promise.resolve(null) },
    } as unknown as Auth,
    userRoles: { getRole: () => Promise.resolve('learner' as const) },
    reviews: {
      addAll: () => Promise.resolve(0),
      listSince: () => Promise.resolve([]),
    },
    stats: {
      counts: () =>
        Promise.resolve({ items: 0, translations: 0, reviews: 0, learners: 0 }),
    },
    course: {
      overview: () => Promise.resolve([]),
      lessonItems: () => Promise.resolve(undefined),
    },
    account: {
      exportData: () => Promise.resolve(undefined),
      deleteAccount: () => Promise.resolve(),
    },
    reviewQueue: {
      addPending: () => Promise.resolve(0),
      listPending: () => Promise.resolve([]),
      findPending: () => Promise.resolve(undefined),
      decide: () => Promise.resolve(undefined),
    },
    votes: {
      castVote: () => Promise.resolve({ upvotes: 0, downvotes: 0 }),
      talliesFor: () => Promise.resolve(new Map()),
    },
    itemWriter: { upsertMany: () => Promise.resolve() },
    userDirectory: {
      listUsers: () => Promise.resolve([]),
      setRole: () => Promise.resolve(false),
    },
    recordings: {
      add: () => Promise.resolve(),
      listForItem: () => Promise.resolve([]),
      get: () => Promise.resolve(undefined),
    },
    morphology: {
      formsFor: () => Promise.resolve([]),
    },
    openData: {
      allItems: () => Promise.resolve([]),
      curriculumUnits: () => Promise.resolve([]),
      morphologyEntries: () => Promise.resolve([]),
    },
    ...overrides,
  };
}
