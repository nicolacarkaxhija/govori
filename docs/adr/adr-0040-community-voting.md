---
id: adr-0040
status: accepted
depends-on: [adr-0008, adr-0038]
---

# 0040 — Community voting joins the review process

## Context

Every publishable draft — AI-generated or learner-contributed — waits in
the review queue (0038) for a single Reviewer+ approval (0008). The
queue grows faster than the small reviewer pool can drain it, and the
wider community that already contributes items has no way to help move
them. Duolingo-style course incubation shows that lightweight community
voting can carry much of this load.

## Decision

Any signed-in learner can vote a pending draft up or down: one vote per
person per draft, changeable at any time. When a draft's net score
(upvotes − downvotes) reaches 3, it publishes exactly like a reviewer
approval — the queue entry is decided `approved` by `community:vote`
and the item is upserted into the published pool.

This is an additional publish path, not a replacement: single-approval
by Reviewer+ (0008) remains, and reviewers can still approve or reject
a draft regardless of its vote tally. Votes on decided entries are
refused; a rejection ends the vote.

## Consequences

- The queue drains through two doors: one trusted reviewer or three net
  community voices; neither blocks the other.
- The publish threshold is a single named constant in the review ports,
  so tuning it is a one-line change.
- Brigading (coordinated vote pushes) is a real risk we accept at the
  current community size, where voters are few and known; revisit the
  threshold, weighting, or eligibility rules as the community grows.
- Vote tallies are per-draft state alongside the queue entry; cascade
  deletion keeps them from outliving it.

## Alternatives considered

- Votes as an advisory signal for reviewers only — rejected: does not
  relieve the reviewer bottleneck, which is the problem being solved.
- Trust-weighted votes (reviewer votes count more) — rejected:
  complexity before any evidence the flat threshold misbehaves.
- Time-boxed voting windows with quorum — rejected: drafts in a small
  community would routinely miss quorum and stall exactly like today.
