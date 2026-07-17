import type { AppDependencies } from './app.js';
import type { Auth } from './auth/auth.js';
import { loadConfig } from './config.js';

/**
 * Baseline dependencies for route tests: everything stubbed inert, any
 * piece overridable per test. Lives in src so tests never rebuild it.
 */
export function makeTestDeps(
  overrides: Partial<AppDependencies> = {},
  env: Readonly<Record<string, string | undefined>> = {},
): AppDependencies {
  return {
    config: loadConfig(env),
    items: {
      findById: () => Promise.resolve(undefined),
      list: () => Promise.resolve([]),
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
    ...overrides,
  };
}
