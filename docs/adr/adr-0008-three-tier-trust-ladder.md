---
id: adr-0008
status: accepted
---

# 0008 — Three-tier trust ladder with single-approval publishing

## Context

Open contribution needs a moderation model that is neither so strict it discourages participation nor so loose it lets low-quality or bad-faith content through unreviewed. The team wants contribution to feel "1-tap" for audio and generally low-friction (per the working philosophy) while still gating quality.

## Decision

We define three trust tiers: Contributor → Reviewer → Admin. A single Reviewer approval publishes text content; audio auto-publishes but is flaggable after the fact rather than pre-reviewed. Reviewer status is earned, not purchased or self-declared.

## Consequences

- Single-approval publishing keeps the review queue moving without a multi-approver bottleneck.
- Auto-publish-then-flag for audio matches its lower risk profile and keeps the "one-tap" contribution experience intact.
- Requires an explicit, fair process for promoting Contributors to Reviewer, since the whole quality model depends on it.
- Trust tiering interacts with item-vs-curriculum gating (see 0009) and with AI-drafted content, which enters at Contributor-equivalent trust (see 0012).

## Alternatives considered

- Multi-approval (two or more reviewers) publishing — rejected: adds friction and slows the queue without proportionate quality benefit for a small early community.
- Pre-review audio like text — rejected: contradicts the one-tap audio contribution goal for a low-risk content type.
