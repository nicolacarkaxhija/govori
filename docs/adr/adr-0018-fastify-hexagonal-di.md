---
id: adr-0018
status: accepted
depends-on: [adr-0014, adr-0017]
---

# 0018 — Fastify with hand-rolled hexagonal architecture and constructor injection

## Context

The backend must keep business logic decoupled from framework and infrastructure concerns, consistent with the mandatory hexagonal core (see 0014), while staying lightweight — the maintainer runs this project largely solo and wants minimal moving parts (near-zero maintenance, per the working philosophy).

## Decision

The API is built on Fastify with hand-rolled ports-and-adapters architecture and constructor injection — no dependency-injection framework. All infrastructure (database, auth, flags, config) is wired at a single composition root and injected via constructors.

## Consequences

- Avoids the learning curve, magic, and dependency weight of a full DI framework while still getting testable, swappable adapters.
- Composition root becomes the one place that understands the full wiring graph, which must be kept legible as the app grows.
- Hand-rolled DI requires more manual wiring code than a framework would generate, an accepted trade for simplicity and transparency.
- Enables the tiered test-gate strategy (see 0026): domain core is tested in isolation from Fastify entirely.

## Alternatives considered

- A DI framework (e.g. InversifyJS, tsyringe) — rejected: adds a dependency and indirection the project's scale doesn't yet justify.
- NestJS or another opinionated framework — rejected: brings more structure and abstraction than a lean, mostly-solo-maintained backend needs.
