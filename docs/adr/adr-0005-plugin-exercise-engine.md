---
id: adr-0005
status: accepted
depends-on: [adr-0002, adr-0003]
---

# 0005 — Plugin-based exercise engine with seven MVP exercise types

## Context

Course lessons and SRS review (see 0002) both need to present items as exercises, and future exercise types (or language-specific variants) should not require rearchitecting the engine. Answer checking must tolerate the reality that most users cannot easily switch keyboard layout to type Interslavic (see 0029 on per-language packs).

## Decision

We build a plugin-based exercise engine supporting seven MVP exercise types: multiple choice, typed translation (both directions, transliteration-aware checking), cloze, matching pairs, sentence assembly, listening transcription, and record-and-compare. Each exercise type is a plugin over the shared item model; typed-answer checking uses the transliteration engine (see 0003) to tolerate non-native-script input.

## Consequences

- New exercise types can be added as plugins without touching core scheduling/course logic.
- Transliteration-tolerant checking removes the keyboard-layout barrier for typed exercises without requiring OS-level layout switching.
- Listening and record-and-compare types depend on the audio feature, which is flagged off at launch (see 0004) — those types exist but are inert until the flag flips.
- Plugin architecture adds an abstraction layer that must be justified by actual reuse, not speculative flexibility.

## Alternatives considered

- Hard-code exercise types into the course/SRS engines — rejected: would block later additions and language-specific customization without engine changes.
