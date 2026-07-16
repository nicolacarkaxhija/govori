---
id: adr-0036
status: accepted
depends-on: [adr-0002, adr-0030]
---

# 0036 — SRS scheduling: SM-2 baseline behind a swappable transition function

## Context

The review queue (see 0002) needs a spaced-repetition scheduler. Progress is an
append-only event log with derived state (see 0030), so the scheduler must be a
deterministic, pure transition function. Modern alternatives exist: FSRS fits
memory models per user with ~20 trained parameters and measurably better
retention/effort trade-offs, but it is far harder to verify, needs review data
we do not have yet, and its reference implementations evolve quickly.

## Decision

Reviews are graded on the four-step scale `again | hard | good | easy`
(exercise adapters map exercise results to grades). Scheduling state is derived
exclusively by folding review events through a pure transition function
`applyReview(schedule, event)`; the published SM-2 algorithm (quality mapping
2/3/4/5, ease-factor formula with floor 1.3, intervals 1d → 6d → previous ×
ease, failure resets repetitions) is the baseline implementation. The
transition function is the swap point: FSRS can replace it later item-by-item,
replaying the same event log — no migration, because state is never stored
authoritatively.

## Consequences

- Deterministic replay keeps multi-device sync trivially correct and makes the
  scheduler property-testable (order-independence, dedup idempotence).
- SM-2 is public-domain, verifiable against the published spec, and good
  enough at MVP scale; retention data collected via the event log is exactly
  what a future FSRS fit needs.
- Grades stay stable in the event schema even if the scheduler changes —
  events record what the learner did, never scheduler internals.

## Alternatives considered

- FSRS now — rejected: heavier to verify, benefits depend on per-user review
  history that doesn't exist yet; adopting it later costs only a new
  transition function thanks to event sourcing.
- Binary correct/incorrect grades — rejected: loses information FSRS (or any
  future scheduler) can use, and the four-step scale is an industry-standard UX.
