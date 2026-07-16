---
id: ts-002
status: accepted
depends-on: [adr-0030, adr-0036]
---

# SRS engine

Package: `packages/srs` (`@govori/srs`). Pure domain code, no dependencies.

## Public seam

- `applyReview(schedule | undefined, event)` — pure SM-2 transition folding
  one graded review into an item's schedule. This function is the designated
  swap point for future algorithms (FSRS), per ADR 0036.
- `replay(events)` — derives full scheduling state (`Map<itemId, schedule>`)
  from an append-only review-event log.
- `selectDue(state, now)` — items due at `now`, earliest first.

## Contracts

- `ReviewEvent.id` is the event's identity: sync layers union event sets by
  id; two events with one id are one event. Replay deduplicates by id, orders
  by `(reviewedAt, id)`, and is therefore **order-independent** — the property
  the offline/multi-device sync model (ADR 0030) rests on.
- Grades `again | hard | good | easy` record learner behavior only; scheduler
  internals never leak into events, so the algorithm can change by replay.

## Verification

- Worked examples hand-computed from the published SM-2 algorithm.
- Property invariants (fast-check): order-independence, set-union idempotence,
  due-after-review, ease floor, selectDue soundness. The order-independence
  property caught a real contract gap during development (dedup of colliding
  ids with differing payloads), now documented as outside the contract.
- Gates: 100% branch coverage; mutation score 100%.
