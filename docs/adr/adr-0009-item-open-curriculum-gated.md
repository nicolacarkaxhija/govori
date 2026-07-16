---
id: adr-0009
status: accepted
depends-on: [adr-0008]
---

# 0009 — Item contributions open; curriculum editing role-gated

## Context

Not all contributions carry the same structural risk. Adding or correcting an item (translation, note, audio) is low-risk and independently reviewable. Editing curriculum — course structure, lesson ordering, unit composition — affects the whole learner journey and is easy to break silently.

## Decision

Items, translations, notes, and audio are open to all Contributors. Curriculum edits (course/unit/lesson structure) are gated to Reviewer tier and above.

## Consequences

- Maximizes the pool of people who can add vocabulary and corrections, the highest-volume contribution type.
- Protects the learner-facing course structure from being reshaped by unvetted contributors.
- Requires the contribution editor UI to visibly distinguish item-level edits from curriculum-level edits and enforce the permission boundary server-side.
- Aligns with the trust ladder (see 0008): curriculum trust is a strict superset of item-editing trust.

## Alternatives considered

- Gate all contributions, including items, to Reviewer+ — rejected: would sharply reduce contribution volume for the lowest-risk, highest-value content type.
