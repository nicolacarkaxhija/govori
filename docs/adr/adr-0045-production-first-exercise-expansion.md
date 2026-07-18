---
id: adr-0045
status: accepted
depends-on: [adr-0002, adr-0005, adr-0006, adr-0029, adr-0030, adr-0042]
---

# 0045 — Production-first exercise expansion

## Context

The learning spine (ADR 0002) and the rotation engine (ADR 0005) drilled
recognition and guided production well, but every round still fed the
learner a scaffold: pick an option, fill a blank, reorder given tokens.
Nothing asked the learner to produce free output of their own, and
nothing outside a lesson turned self-directed writing into review credit.
Personal momentum (ADR 0006) was a bare streak with no weekly shape.

We wanted to add open production and light planning without breaking two
hard rules: the engine never names a language (ADR 0042), and progress is
an offline-first event log the SRS derives from (ADR 0030). Everything
new therefore had to route through the pack for language judgment and
through the existing review-event log for credit.

## Decision

Four learner-facing capabilities, all built on the existing seams.

- **Free production round.** One round per session (slotted after
  morphology in the single rotation planner) asks the learner to write an
  original sentence using 2–3 due pool words. The check is the pack's
  `validateCanonical` plus stem-containment of every prompted word — the
  same loose stem/containment the cloze round already uses, extracted into
  a shared `matchedWordIds` helper. The learner self-grades good/again,
  and every prompted word takes that grade. When signed in, the sentence
  may be sent to the community review queue via the existing contribute
  client (ADR 0007/0038).
- **Micro-journal.** A home-reachable daily prompt (rotating by UTC day
  from a small catalog-keyed list) and a target-language textarea. Saving
  persists one entry per day locally; any suggested due word the learner
  actually used, detected by `matchedWordIds`, records a `good` review, so
  self-directed writing feeds the same SRS log.
- **Weekly goal chips.** Two-to-three weekly targets derived purely from
  the review log and journal activity — reviews answered, journal entries,
  distinct active days — each framed as a task count with a progress bar
  over a Monday-anchored week. No hours, no social comparison (ADR 0006).
- **Weekly plan.** A Mon–Fri checklist drafted from the weakest items, a
  picked interest unit, and the reviews goal, with the weekend left empty
  as a deliberate rest. Checkable, persisted per week in localStorage.

All prompts, day names, and labels are catalog keys owned by the
instances; the engine composes around them but writes none.

## Consequences

- The rotation planner gains one `production` state with the same
  once-per-session gating morphology uses; `RoundContext` carries
  `productionRounds` and `hasProduction`.
- Production, journal, and plan all reuse `matchedWordIds`, so the pack
  stays the single authority on what counts as "using a word".
- Journal and plan add their own localStorage namespaces alongside the
  review log; none of them changes the review-event schema, so sync
  (ADR 0030) is untouched.
- Goal and plan logic are pure and unit-tested; the adapters stay thin.
- Every new string multiplies across both instances' full catalog sets
  (govori en+isv, fol en+sq+de+it+tr); the parity gate enforces it.

## Alternatives considered

- Grading free production automatically as right/wrong — rejected: open
  output has no single correct form, so the canonical + word-use check
  gates eligibility while the learner owns the good/again call.
- A model-scored writing round — rejected: it would breach the zero
  model-cost posture (ADR 0005/0035) and the offline-first guarantee; the
  pack's deterministic checks are enough for credit.
- Time-based goals (minutes studied) — rejected: hours invite pressure;
  task counts frame momentum without a clock (ADR 0006).
- A journal that never touches the SRS — rejected: writing that earns no
  review credit would sit outside the one progress log and fragment it.
