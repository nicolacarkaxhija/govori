---
id: adr-0049
status: accepted
depends-on: [adr-0023]
---

# 0049 — The paid-track analytics posture

## Context

ADR 0023 shipped a zero-tracker posture: session cookies only, no consent
banner, self-hosted and PII-scrubbed product and error analytics, and no
third-party processors. A paid track (ADR 0047) wants per-user learning
analytics to drive adaptive features — weak-spot targeting, plan
adaptation, progress insight — which the free tier's zero-tracking promise
does not allow. Rather than dilute that promise, the two coexist as a
deliberate asymmetry, and the asymmetry itself is the trust story.

## Decision

The posture is "analytics you can see."

- Per-user learning analytics exist only on the paid track, are
  flag-gated, and are self-hosted and first-party.
- Every signal collected must power a feature the learner can see. Nothing
  is gathered whose benefit is not visible back to the person it came
  from; a signal with no surfaced feature is a defect, not a reserve.
- Analytics are opt-out and are disclosed at purchase.
- The free tier keeps the ADR 0023 zero-tracking promise unchanged. The
  asymmetry between the tiers is intentional and is the point.
- No tag managers and no third-party analytics, ever, on either track.

## Consequences

- "Every signal is user-visible" is an enforced design constraint: adding
  a signal means shipping the feature that surfaces it in the same change.
- The analytics live behind a flag the free instances never load, so the
  free zero-tracking guarantee stays structurally intact rather than
  merely promised.
- Disclosure at purchase adds a clause to the terms of sale.
- Self-hosting per-user analytics is more operational load than none,
  accepted for the paid track only.

## Alternatives considered

- **Third-party product analytics on the paid track** — rejected: it
  reintroduces trackers, a consent banner, and data export to processors,
  contradicting the entire posture.
- **Analytics on the free tier too** — rejected: it breaks ADR 0023's
  promise; the tier asymmetry is deliberate.
- **No paid analytics at all** — rejected: adaptive paid features need
  per-user signal, so the discipline is making every signal visible, not
  forgoing signal.
