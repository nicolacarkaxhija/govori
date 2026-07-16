---
id: adr-0012
status: accepted
depends-on: [adr-0008, adr-0009]
---

# 0012 — AI-drafted content: human-gated, provenance-tracked, publicly disclosed

## Context

Hand-authoring the full MVP course (roughly 10 units, 500–1000 items) is slow, and the project has access to grounded reference facts (imported dictionary, grammar tables) that make AI drafting practical. But unreviewed generated content risks quality and originality problems, especially given unlicensed reference sources in the same space (see 0035).

## Decision

AI-generated content is allowed as drafts only, always entering through the same review queue as human contributions (see 0008), with per-item provenance stored as one of human / ai-draft / import. The policy is disclosed publicly to the community, not hidden. This effectively upgrades the original "hand-author the MVP course" plan to "AI-draft plus human review," with the seed pipeline (see 0035) acting as the queue's first contributor.

## Consequences

- Course content can be produced at a pace hand-authoring could not match, without lowering the quality bar, since every item still passes through review.
- Provenance tracking makes it possible to audit, retract, or re-review AI-origin content as a class if problems emerge.
- Public disclosure protects trust with the ISV committee and the wider community, who could otherwise discover undisclosed AI content and question the project's integrity.
- Requires the review queue and reviewer tooling to surface provenance, not just content, so reviewers can calibrate scrutiny accordingly.

## Alternatives considered

- Hand-author all MVP content — rejected as too slow relative to the grounded-generation alternative now available.
- Auto-publish AI-drafted content without human review — rejected: contradicts the review-queue quality model and the disclosed-provenance commitment.
