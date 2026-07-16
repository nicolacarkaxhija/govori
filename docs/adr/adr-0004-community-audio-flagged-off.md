---
id: adr-0004
status: accepted
depends-on: [adr-0025]
---

# 0004 — Community-recorded audio, feature-flagged off at launch

## Context

Audio (listening transcription, record-and-compare exercises) meaningfully improves learning but has real hosting and moderation cost, and there is no established community of recorders yet at launch. Building the feature and shipping it live are separable concerns.

## Decision

Audio is community-sourced: multiple in-browser recordings per item are allowed, with accent diversity welcomed rather than normalized away. The feature is fully built — recording, storage, exercise integration — but shipped behind a feature flag that is OFF at launch, out of cost caution, using the homegrown flag system (see 0025).

## Consequences

- No object-storage or bandwidth cost exposure until the flag is deliberately flipped.
- Avoids launching with an empty or low-quality audio catalogue.
- Listening transcription and record-and-compare exercise types (see 0005) exist in the engine before they have content to serve, requiring the flag dependency graph to gate them correctly.
- Flipping the flag later requires no further engineering, only a product decision.

## Alternatives considered

- Cut audio entirely for MVP — rejected: the team prefers "built but off" over "not built" once retention value is proven, per standing philosophy.
- Launch with audio on, seeded by a small internal set — rejected: cost caution and lack of a recording community at launch.
