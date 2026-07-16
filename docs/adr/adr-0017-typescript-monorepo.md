---
id: adr-0017
status: accepted
depends-on: [adr-0014]
---

# 0017 — TypeScript monorepo: pnpm workspaces + Turborepo; React+Vite SPA; Node API

## Context

The architecture requires a strictly separated domain core, a web frontend, and a backend API, sharing types and validation logic (see 0019) without duplicating them. A single-language, single-repo setup keeps the "one-command dev stack" promise to maintainers (see the working philosophy).

## Decision

The project is a TypeScript-strict monorepo using pnpm workspaces and Turborepo. It contains a pure domain core package (SRS, transliteration, course engine, config — zero framework dependencies, see 0014), a React + Vite single-page app (Capacitor-wrapped, see 0014), and a Fastify API (see 0018), plus a shared Zod schema package.

## Consequences

- Shared types and Zod schemas flow across frontend, backend, and domain core without duplication or drift.
- Turborepo caching keeps build/test cycles fast as the number of packages grows.
- TypeScript-strict everywhere raises a consistent quality bar but requires discipline across all packages, including generated/scaffolded code.
- A monorepo concentrates all CI/CD pipeline complexity (see 0027) in one place rather than coordinating across multiple repos.

## Alternatives considered

- Polyrepo (separate repos for frontend/backend/domain) — rejected: would duplicate shared types/schemas and complicate the one-command dev workflow.
