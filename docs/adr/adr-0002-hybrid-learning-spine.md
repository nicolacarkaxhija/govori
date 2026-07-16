---
id: adr-0002
status: accepted
depends-on: [adr-0001]
---

# 0002 — Hybrid learning spine: course path + SRS over shared content items

## Context

Structured courses give learners a clear path and curriculum coherence; spaced-repetition review maximizes long-term retention but is directionless on its own. Competitor apps typically pick one model. Both learning modes need to operate over the same content rather than maintaining parallel data.

## Decision

We combine a structured course path with SRS-driven review, both operating over one shared content atom, the "item" (see 0003). Course progression introduces items; SRS schedules their review afterward. No competitor in the space (interslavic.fun, LibreLingo, Anki/Memrise decks) combines course and SRS this way.

## Consequences

- Single source of truth for content avoids drift between "course version" and "review version" of the same material.
- Progress model must track both course position and per-item review state, increasing domain complexity (see 0030 for event-sourced implementation).
- Differentiates the product from every known competitor.
- Exercise engine (see 0005) must serve both course lessons and SRS review sessions from the same item pool.

## Alternatives considered

- Course-only (like Duolingo-style linear paths) — rejected: weak long-term retention without spaced review.
- SRS-only (like Anki decks) — rejected: no guided path, poor for absolute beginners, and matches an already-served niche (existing Anki/Memrise decks).
