# Govori — repository conventions

## Reading order

Docs use a registry pattern: read `docs/README.md`, then only the registry
indexes you need, then only the files those point at. Never bulk-read a docs
directory. Decisions live in `docs/adr/` — check the ADR registry before
re-deciding anything.

## Architecture rules

- Hexagonal: `packages/*` are pure domain code — no framework, DOM, or I/O
  imports. `apps/*` are thin adapters over them.
- Content is stored in canonical etymological Latin only; scripts and flavours
  are derived via the transliteration engine (ADR 0003).
- Everything is constructor-injected; nothing imports a global singleton.
- Every feature is independently toggleable (ADR 0024/0025).

## Workflow rules

- **TDD, always**: failing test first, then code, then refactor. Bugfixes start
  with the reproducing test.
- Coverage gates: domain packages 100% branch + ≥90% mutation; adapters 85%
  line (ADR 0026).
- **Micro-commits** in Conventional Commits format. Commit messages never
  mention AI, models, or assistants; no co-author trailers.
- Every commit appends a row to `docs/process/human-estimates.md` (estimate of
  equivalent human effort) in the same commit.
- New significant decision → new ADR + registry row, in the same PR.
