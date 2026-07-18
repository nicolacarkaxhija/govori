---
id: adr-0041
status: accepted
depends-on: [adr-0029, adr-0031]
---

# 0041 — One engine, many language apps

## Context

ADR 0029 decided the platform core is language-agnostic with per-language
packs and branded instances, but the repository still _was_ Govori: the
npm scope, env prefix, brand strings, and orthography imports all named
the Interslavic product. A second product — Fol, for Albanian — is now
planned, and its content forge already had to fork schemas because the
shared ones hardcoded Interslavic validation. The platform and its first
product needed separate names and separate homes for their code.

## Decision

This repository is **glotty**, an open community language-learning
engine, structured as one platform monorepo:

- `packages/*` — the engine: language-agnostic domain packages under the
  `@glotty/*` scope. Engine code never names a language or an instance.
- `packs/*` — language packs (ADR 0042): everything language-specific,
  starting with `@glotty/pack-isv`.
- `instances/*` — instances as config: branding, catalog sets, learner
  rosters, fallback languages. `@glotty/instance-govori` is the first.
- `apps/*` — deployable shells (web, api) that resolve one instance at
  build/boot from an explicit, required id (`VITE_INSTANCE` /
  `GLOTTY_INSTANCE`); deployment config uses the `GLOTTY_` env prefix.

Product brands stay per-app: **Govori** remains the working brand of the
Interslavic instance (naming vote pending, ADR 0031); **Fol** is the
planned Albanian instance. The engine has no default product — a build
or boot without an instance fails fast.

## Consequences

- Fol needs a language pack and an instance directory, not a fork.
- The forge repositories consume language-agnostic schemas and bind
  their own pack's validator (ADR 0042); the Albanian forge's local
  schema fork can be deleted.
- Every rename is done once, now: `@govori/*` → `@glotty/*`, `GOVORI_` →
  `GLOTTY_`, repo description and docs retitled.
- Separate branded instances (ADR 0029) become literal directory
  structure, so "instances are config" is enforced by the build, not by
  convention.

## Alternatives considered

- Keep the repo as Govori and extract a shared library later — rejected:
  every week of coupling adds migration cost, and the Albanian forge was
  already paying it.
- Separate repositories per product over a published engine — rejected
  for now: one monorepo keeps the seam honest under the existing test
  gates; publishing packages is deferred until an external consumer
  needs semver.
