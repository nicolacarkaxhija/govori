---
id: adr-0019
status: accepted
depends-on: [adr-0018]
---

# 0019 — REST API with OpenAPI generated from shared Zod schemas

## Context

The frontend, backend, and domain core need a single, consistent contract for API shapes, with runtime validation and a typed client — without hand-maintaining an OpenAPI spec separately from the validation code, which invites drift.

## Decision

The API is REST, described by an OpenAPI spec generated from the shared Zod schema package (see 0017). The same Zod schemas provide runtime request/response validation and generate the typed API client used by the frontend.

## Consequences

- Single source of truth (Zod schemas) drives validation, documentation, and client types — no manual spec maintenance, no drift.
- OpenAPI contract tests (see 0026) can verify the implementation matches the generated spec automatically.
- REST keeps the API simple and cacheable (relevant for content delivery, see the CDN/ETag strategy under 0030-adjacent NFRs), compared to a query-flexible alternative like GraphQL.
- Schema changes require coordinated updates across all consumers, but TypeScript's shared types make breakage visible at compile time.

## Alternatives considered

- GraphQL — rejected: added flexibility isn't needed for this API's shape, and it complicates caching and the simple typed-client generation the team wanted.
- Hand-maintained OpenAPI spec separate from validation — rejected: invites drift between documented and actual behavior.
