---
id: ts-005
status: accepted
depends-on: [adr-0018, adr-0019, adr-0020, adr-0024, adr-0025, adr-0037]
---

# API server

App: `apps/api` (`@glotty/api`). Fastify 5 over the domain packages.

## Shape

- `buildApp(deps)` — the HTTP adapter, pure of process state: config and
  ports arrive by injection; tests inject requests without binding a port.
- `main.ts` — the only composition root: loads config from env (`GLOTTY_`
  prefix), creates the Drizzle client, runs migrations, wires adapters.
- `import-cli.ts` — the seeding entry (ADR 0037): re-validates a content
  artifact and imports it idempotently. Verified end to end against live
  Postgres (import → serve → derived Cyrillic renderings).

## Ports & adapters

| Port                     | Adapter                 | Notes                                              |
| ------------------------ | ----------------------- | -------------------------------------------------- |
| `ItemRepository` (write) | `DrizzleItemRepository` | Upsert by id; translations/notes replaced per item |
| `ItemQueries` (read)     | `DrizzleItemRepository` | Batched assembly, no N+1                           |
| `FlagStateSource`        | `DrizzleFlagStore`      | States + append-only audit trail                   |

## Routes

`/health`, `/meta` (instance brand), `/flags` (effective flags through the
dependency graph — clients see booleans only), `/items` (paginated),
`/items/:id` (item + scripts derived at the edge via the transliteration
engine), `/openapi.json` (generated from the same Zod schemas that validate
requests — ADR 0019; routes live in a child plugin so the swagger onRoute
hook sees them).

## Verification

Unit/route tests with injected fakes; integration tests against real
Postgres via Testcontainers (import idempotence, reads, flag audit).
Coverage gate 85% (adapter tier, ADR 0026); composition roots excluded.
