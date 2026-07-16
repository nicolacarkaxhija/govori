---
id: adr-0027
status: accepted
depends-on: [adr-0026]
---

# 0027 — Delivery pipeline: rebase-merge, release-please, auto-staging, gated production

## Context

The project values instant micro-commits and a legible history, automated release management without manual version bumping, and a safe path from merge to production that doesn't require manual deploy steps — all under a near-zero-maintenance constraint for what is largely a solo-maintained project.

## Decision

Local hooks (Husky, lint-staged, commitlint) enforce Conventional Commits before anything reaches CI. PRs are merged via rebase-merge to preserve micro-commit history. release-please turns conventional commits into a Release PR that produces a semver tag and CHANGELOG on merge. Merges to main auto-deploy to a staging stack (a second Docker Compose stack, separate database, basic-auth protected). Production deploys are gated on merging the release-please Release PR, not on every main-branch merge. Migrations run automatically with a health-check and documented rollback procedure. PR checks cover lint, typecheck, unit, integration, build, e2e, coverage, accessibility, i18n, and API contract.

## Consequences

- Rebase-merge preserves the micro-commit granularity the team values for the human-estimates log (see 0028) and history legibility.
- release-please removes manual version/changelog bookkeeping entirely.
- Staging auto-deploys on every main merge, giving fast feedback, while production only deploys on deliberate release-please merges — separating "always current" from "actually released."
- Auto-migrations with health-check + rollback doc trade some operational risk for near-zero manual deploy effort, appropriate given the low-maintenance goal.

## Alternatives considered

- Squash-merge PRs — rejected: would collapse the micro-commit history the project deliberately preserves for granular history and effort tracking.
- Manual version bumping/changelog — rejected: unnecessary manual toil that release-please automates for free.
- Deploy to production on every main merge — rejected: removes the deliberate release gate, risking unintended production releases.
