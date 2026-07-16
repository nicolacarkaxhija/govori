---
id: adr-0020
status: accepted
depends-on: [adr-0018]
---

# 0020 — Drizzle ORM on PostgreSQL

## Context

The backend needs a typed, lightweight data-access layer over a relational store capable of full-text search for the dictionary/content (see 0013's SEO ambitions) without adding operational surface area beyond what the €10–20/mo budget (see 0016) and near-zero-maintenance goal can support.

## Decision

We use Drizzle ORM on PostgreSQL, leveraging Postgres's built-in full-text search rather than a separate search service. No Redis is introduced at MVP; it is added only if measured need arises (e.g. from NFR budgets not being met).

## Consequences

- Drizzle's TypeScript-first, SQL-close API fits the shared-types philosophy of the monorepo (see 0017, 0019) better than a heavier ORM.
- Postgres FTS covers dictionary/content search needs without operating a separate search cluster, keeping infra minimal.
- Deferring Redis keeps the deployment footprint small (see 0027's Docker Compose setup) until caching is proven necessary, not assumed necessary.
- If Postgres FTS or caching needs later outgrow this setup, that migration is deliberately deferred rather than pre-built.

## Alternatives considered

- A heavier ORM/query builder (e.g. Prisma) — rejected in favor of Drizzle's lighter, more SQL-transparent approach.
- Dedicated search service (e.g. Elasticsearch/Meilisearch) — rejected at MVP: Postgres FTS is sufficient for the current content scale and avoids another operated service.
- Redis at MVP — rejected: no measured need yet; adding it preemptively contradicts the minimal-infra, low-budget goal.
