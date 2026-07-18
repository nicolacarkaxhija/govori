---
id: ts-003
status: accepted
depends-on: [adr-0024, adr-0025]
---

# Configuration & feature-flag machinery

Package: `packages/config` (`@glotty/config`). Pure domain code; depends only
on zod.

## Public seam

- `buildConfig(schema, sources)` — deep-merges layered sources (defaults →
  file → env; later wins), validates against the Zod schema, and returns a
  deeply frozen typed object. Invalid config throws `ConfigError` with the
  offending path — the process fails at boot, never at request time.
- `envSource(env, prefix)` — reads prefixed environment variables into a
  nested partial (`GOVORI_SERVER__PORT` → `{ server: { port: '8080' } }`).
  Values stay strings; schema coercion is the single place types are decided.
- `defineFlags(definitions)` — validates the flag dependency graph at
  definition time: unknown requirements and cycles are boot failures.
- `resolveFlags(definitions, state)` — a flag is effective only when its own
  stored state and every transitive requirement are enabled; suppressed flags
  report which requirements hold them back (surfaced in the admin UI).

## Notes

- This package is layer machinery, not the app's schema: each app defines its
  own config schema and flag definitions at its composition root and injects
  the frozen result by constructor (ADR 0024).
- Runtime flag _storage_ (DB table, audit log, role targeting) is an API-side
  adapter; the pure resolution semantics live here so they are testable and
  shared with the web client.

## Verification

16 behavior tests (merge precedence, fail-fast paths, deep-freeze, env
nesting, graph validation, diamond dependencies, downstream suppression);
gates: 100% branch coverage, mutation ≥ 90%.
