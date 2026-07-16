---
id: adr-0033
status: accepted
depends-on: [adr-0025, adr-0006]
---

# 0033 — Public stats page with pre-committed feature-flag thresholds

## Context

Flags that are "off until critical mass" (social gamification, see 0006) need an objective, pre-agreed trigger to avoid the decision becoming arbitrary or endlessly deferred. Open metrics also support the project's transparency commitments to its community and donors.

## Decision

We publish a public /stats page showing aggregate metrics only (no individual user data). Feature-flip thresholds for critical-mass-gated features are pre-committed in an ADR rather than decided ad hoc — for example, roughly 200 weekly active users plus a minimum number of active reviewers as the trigger for enabling social features.

## Consequences

- Pre-committed thresholds remove ambiguity and social pressure around "is it time yet" for flag flips like social features.
- Public aggregate stats build trust with donors and the community without exposing individual user data, consistent with the GDPR/privacy posture (see 0023).
- Thresholds must be chosen conservatively enough to reflect genuine readiness (e.g. enough content and reviewers for social features to be meaningful, not just enough raw users).
- The stats page depends on the analytics events already being collected (self-hosted Umami plus first-party learning events, see 0023), so no new tracking is introduced for this purpose alone.

## Alternatives considered

- Decide flag flips ad hoc when they "feel ready" — rejected: invites inconsistency and disputes; a pre-committed number is more defensible and transparent.
- Keep metrics fully private — rejected: forgoes a low-cost transparency win for donors and the community.
