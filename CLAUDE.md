# glotty — repository conventions

This repository is **glotty**, the language-learning engine; **Govori**
(Interslavic) and **Fol** (Albanian, planned) are products built on it as
instances (ADR 0041). Vocabulary lives in `CONTEXT.md`.

## Reading order

Docs use a registry pattern: read `docs/README.md`, then only the registry
indexes you need, then only the files those point at. Never bulk-read a docs
directory. Decisions live in `docs/adr/` — check the ADR registry before
re-deciding anything.

## Architecture rules

- Hexagonal: `packages/*` and `packs/*` are pure domain code — no framework,
  DOM, or I/O imports. `apps/*` are thin adapters over them.
- The engine never names a language. Packs own orthography, scripts, naming,
  and terminology; instances own branding, catalog sets, and fallback
  languages; a build without an instance fails fast (ADR 0042).
- Content is stored in each pack's canonical orthography only; scripts and
  flavours are derived through the pack (ADR 0003/0042).
- Everything is constructor-injected; nothing imports a global singleton
  (apps resolve their instance once, at a single entry point).
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
