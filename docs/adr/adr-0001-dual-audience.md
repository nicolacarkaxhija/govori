---
id: adr-0001
status: accepted
---

# 0001 — Dual audience: contrastive tracks for Slavic speakers + from-zero track, both at launch

## Context

Interslavic has two structurally different learner populations: native Slavic speakers who can leverage cross-language similarities, and absolute beginners with no Slavic background. Serving only one at launch would exclude a large part of the realistic user base and weaken the case for community partnership.

## Decision

We ship both audiences on day one. Slavic-speaker support is delivered as contrastive tracks — metadata overlays per source language on the same content items, not a separate course — while absolute beginners get a dedicated from-zero course. Both read from one shared content atom (the "item", see 0002).

## Consequences

- Wider addressable audience from launch, which strengthens the case for ISV committee partnership (see 0011).
- No duplicated content trees: contrastive tracks are overlays, so authoring effort is not doubled.
- Curriculum design must account for two entry points from the start, adding upfront design complexity.
- Item metadata schema must carry per-source-language annotations from day one, constraining the content model (see 0003).

## Alternatives considered

- Launch beginner-only track and add contrastive tracks later — rejected: would require retrofitting metadata onto already-published items and delays serving a core audience segment.
