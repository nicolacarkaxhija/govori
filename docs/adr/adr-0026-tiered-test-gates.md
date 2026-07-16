---
id: adr-0026
status: accepted
depends-on: [adr-0018]
---

# 0026 — Tiered test gates: 100% branch + 90% mutation on domain core; 85% on adapters

## Context

The domain core (SRS scheduling, transliteration, course engine) is the highest-risk, highest-reuse code in the system — correctness bugs there silently corrupt learning outcomes. Adapters and UI carry lower per-line risk but still need a solid floor. A single blanket coverage number would either under-protect the core or over-tax UI work.

## Decision

We enforce tiered, CI-gated test requirements: domain packages require 100% branch coverage and at least 90% mutation score (via Stryker, run nightly); adapters and UI require 85% line coverage. Gates fail merges, not just warn. TDD (red-green-refactor) is standard practice for every bugfix. The full test toolkit includes Vitest, Testcontainers (real Postgres), Playwright e2e with axe accessibility and visual regression, fast-check property tests (specifically for transliteration and SRS), OpenAPI contract tests, i18n completeness checks, and Lighthouse CI budgets.

## Consequences

- Mutation testing on the domain core catches tests that merely execute code without asserting real behavior — a much stronger signal than coverage alone.
- Property-based testing suits transliteration and SRS well, since both have algebraic invariants (round-trip transliteration, scheduling monotonicity) that are easier to state as properties than as example tests.
- 85% for adapters/UI is a pragmatic floor, not the domain core's rigor, reflecting that infrastructure code is lower-risk per line but should not go untested.
- Nightly (not per-PR) mutation runs balance rigor against CI runtime, given mutation testing's cost.

## Alternatives considered

- One uniform coverage target across the whole codebase — rejected: would either be too weak for the domain core or too costly to enforce uniformly on adapters/UI.
