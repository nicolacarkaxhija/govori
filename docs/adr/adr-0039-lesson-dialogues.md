---
id: adr-0039
status: accepted
depends-on: [adr-0009, adr-0035, adr-0038]
---

# 0039 — Dialogues ride the curriculum artifact as lesson intros

## Context

Generated dialogues need a home in the product. Lessons are the natural
unit — a short scene using the lesson's words primes the vocabulary
before exercises. But lesson rows get fresh ids on every curriculum
reimport (`replaceCurriculum` is wholesale), so any table pointing at
lesson ids would dangle after a reimport.

## Decision

A dialogue is part of the lesson definition, not a separate resource:
the curriculum artifact's lesson gains an optional `dialogue` — a list
of turns `{speaker, text, translation}` in canonical etymological Latin —
stored as a column on the lesson row and served inside `GET /lessons/:id`.
The web app shows it as a dismissible intro card before the exercises,
transliterated to the learner's script.

Dialogues are generated in the forge from the same fact packs as example
sentences, pass the same validation and originality audit, and reach the
artifact only after human review — but unlike sentences they are lesson
material, not items, so they carry provenance on the lesson artifact
rather than entering the review queue table.

## Consequences

- Reimports stay wholesale and safe: the dialogue travels with its
  lesson, nothing references lesson ids from outside.
- `schemaVersion` stays 1 — the field is optional; old artifacts remain
  valid, old importers ignore nothing (they never see the field).
- Cloze and dialogue draw from different pools by design: cloze uses
  published sentence items, dialogues are fixed lesson scenes.

## Alternatives considered

- Dialogue lines as `sentence` items plus a grouping table — rejected:
  dangles on reimport, and dialogue lines out of context make poor
  standalone review items.
- A dedicated dialogues artifact — rejected: a second import ordering
  constraint for no benefit; the curriculum already owns lesson shape.
