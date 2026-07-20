---
id: adr-0051
status: accepted
depends-on: [adr-0005, adr-0035]
---

# 0051 — App-side data-quality gating

## Context

The content forge (ADR 0035/0037) triangulates each headword against how many
independent corpora corroborate it and stamps a cross-source **attestation
tier** on word and phrase items: `gold` (3+ sources), `silver` (2), `bronze`
(1). The tier now rides the shared `@glotty/content` schema and the live API
serves it. Most of the Interslavic pool carries no tier yet — the signal is
additive and still filling in — so the vast majority of items arrive with
attestation `undefined`.

A bronze headword is real but thinly attested: one corpus, no corroboration.
Two exercise seams are sensitive to that thinness. First, the algorithmic
distractor builders (ADR 0005) pull wrong-answer options from the rest of the
pool; a bronze item's own translation surfacing as filler in another item's
question teaches a learner to recognise a low-confidence gloss as plausible.
Second, an early learner's first lesson sets the tone: meeting shaky
vocabulary before solid vocabulary is the wrong first impression.

Neither is a reason to hide bronze content — a learner may legitimately study
a bronze word head-on, and a lesson may be all we have. The gate must be
surgical, and it must leave the untiered majority completely untouched, or it
would silently break the live product.

## Decision

- **Bronze is never a distractor.** A pure `excludeBronzeDistractors(pool,
target?)` helper drops `attestation === 'bronze'` items from the candidate
  pool the choice-based builders draw wrong answers from. It is folded into
  `buildChoices`, `buildReverseChoices`, and `buildMatching`. The studied
  `target` is exempt — its own translation is the correct answer, and a bronze
  item stays valid as the thing a learner studies. On a matching board every
  seat is a distractor for the others, so bronze items are kept off the board
  entirely (no target is exempted there). When bronze is the only filler a
  round could draw, the round falls back to fewer choices rather than surface
  it.
- **Bronze is deprioritized in a lesson, never excluded.** A pure
  `prioritizeAttested(items)` helper stably sinks bronze items to the back of
  a lesson's pool so an early learner meets high-confidence vocabulary first.
  It is a stable partition — gold, silver, and untiered items keep their order
  up front; bronze keeps its order at the back. It is wired at `LessonView`'s
  pool assembly and orders only the unseen tail; SRS due-ness (ADR 0036) is
  decided elsewhere and is untouched. A lesson of only bronze words still
  runs.
- **Undefined attestation is neutral, not bronze.** Only an explicit `bronze`
  tier gates. An item with no tier is treated as safe: never excluded as a
  distractor, never deprioritized. This is load-bearing — most of the live
  pool has no tier, and treating absence as suspect would gut the product.
- **The gate lives in the pure exercise engine.** Both helpers sit in
  `exercises.ts` beside the builders, take plain items, and are covered to the
  engine's bar. The client schema simply learns to parse the optional tier;
  the adapters (`LessonView`, the builders) are the only wiring.

## Consequences

- Choice, reverse-choice, and matching rounds never present a single-corpus
  gloss as a plausible wrong answer; the trade is occasionally one fewer
  option in a bronze-heavy pool.
- Early lessons front-load corroborated vocabulary without ever withholding a
  word or breaking a bronze-only lesson.
- The untiered majority behaves exactly as before — the gate is inert until
  the forge's tiering fills in, then tightens automatically as it does.
- The two helpers are pure and deterministic, so the exercise engine's
  determinism and testability are preserved.

## Alternatives considered

- **Exclude bronze items outright** — rejected: a learner may study a bronze
  word legitimately, and a lesson may contain nothing else. Withholding
  content is heavier than the problem, which is only about _filler_ and
  _order_.
- **Treat undefined attestation as bronze** — rejected outright: most of the
  live pool is untiered, so this would silently strip distractors from nearly
  every round and reorder nearly every lesson — breaking Govori today for a
  signal that is still filling in.
- **Deprioritize by hiding bronze from early lessons** — rejected: a sort
  preference keeps the content reachable and degrades gracefully; an exclusion
  would empty a bronze-only lesson.
- **Push the gate into the SRS scheduler** — rejected: it would entangle a
  content-quality concern with due-ness semantics (ADR 0036). Ordering the
  offered tail at the pool seam leaves scheduling pure.

## Implementation note — the golden-set quality benchmark (2026-07-20)

The distractor/ordering gate above is the _preventive_ half of quality. This
note adds the _measured_ half: a reviewer-audited golden set whose mean score
is published on the open-metrics page (ADR 0033).

- **Two tables.** `golden_sample (direction, item_id, added_at)` is the fixed,
  **append-only** per-direction sample — items enter once and stay, so growing
  the course never displaces an already-audited pick. `golden_audits (item_id,
direction, reviewer_id, accuracy, naturalness, fit, comment, audited_at)`
  holds one row per (item, reviewer); re-auditing upserts. Both cascade off
  `items`. Migration `0017_golden-set.sql`.
- **Sampling is a pure, deterministic function.** `selectGoldenSample(pool,
target)` strata-buckets by (kind × attestation-tier, untiered items in their
  own stratum), orders each stratum by an FNV-1a hash of the item id, and
  allocates per-stratum quotas by largest-remainder so the sample's mix mirrors
  the pool's. Re-running over the same pool yields the same ids; the
  append-only table — not the function — is what guarantees a settled pick
  never leaves. `POST /admin/golden/sample` (admin-only) reads the pool, targets
  `min(200, pool)`, and inserts the selection `onConflictDoNothing`, so it is
  idempotent and tops up as the course grows.
- **Auditing is reviewer-gated.** `GET /admin/golden` lists sampled items the
  caller has not yet audited, each hydrated with its text/translations and the
  most recent prior audit (by anyone) as context. `POST /admin/golden/:itemId/
audit` takes three 1-5 integer axes plus an optional comment and upserts;
  only items actually in the sample are auditable.
- **The score is a query, never stored.** `GET /stats` gains `qualityScore`
  (the mean of the three axes across every audit for the direction, rescaled
  1-5 → 0-100, rounded) and `qualityAuditedItems`; the score is `null` until
  the first audit lands. The web StatsView shows it only when non-null and
  always states the audited-item count, so a thin sample is never dressed up as
  a verdict. A reviewer-only "Audit golden set" view (reached from the account
  surface, mirroring the review-queue card) drives the audit loop.
