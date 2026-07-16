---
id: adr-0037
status: accepted
depends-on: [adr-0035]
---

# 0037 — Content preparation lives in a dedicated repository

## Context

ADR 0035 placed the content-generation pipeline in `scripts/content-forge`
inside this repository. The pipeline's footprint differs from the app's in
every dimension: heavy inputs (dictionaries, corpora, morphology data),
external API credentials and token budgets, different run cadence (batch, not
deploy), and audit artifacts that would bloat the app's history.

## Decision

Content _preparation_ moves to a dedicated repository (working name
`govori-content-forge`): source fetchers (slovnik, frequency list, Tatoeba),
fact-pack builder, generation prompts, the validation chain, and the
originality audit. Its output is a **versioned content artifact** — structured
JSON validated against the shared `@govori/content` schemas — published as a
tagged release of that repository. This repository keeps only the bare
minimum to seed: an importer that consumes a content artifact by version and
loads it, re-validating against the same schemas at import time.

## Consequences

- The app repo stays lean; forge dependencies, credentials, and bulk audit
  artifacts never touch app deploys or CI time.
- The artifact boundary is a clean contract: any future content source
  (community export, partner data) can produce artifacts for the same importer.
- Schemas must be shared, not duplicated: the forge consumes
  `@govori/content` from this repository (git dependency; published package
  if that ever becomes limiting).
- Import-time re-validation keeps the app self-defending — a corrupted or
  hand-edited artifact fails loudly at the seam.

## Alternatives considered

- Keep the pipeline in `scripts/content-forge` (ADR 0035's original layout) —
  rejected for repo hygiene: heavyweight batch tooling entangled with app
  deploys, credentials in the app repo, audit bulk in app history.
- Publish schemas to npm now — deferred: a git dependency is sufficient until
  an external consumer needs semver-released schemas.
