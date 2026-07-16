---
id: ts-001
status: accepted
depends-on: [adr-0003]
---

# Transliteration engine

Package: `packages/transliteration` (`@govori/transliteration`). Pure domain
code, no dependencies.

## Public seam

- `transliterate(text, { script: 'latin' | 'cyrillic' })` — accepts canonical
  etymological Latin (also tolerates standard Latin and mixed input) and
  renders the standard orthography of the requested script.
- `normalize(text)` — folds any accepted answer spelling (Cyrillic,
  etymological Latin, standard Latin, bare ASCII) into one comparable form:
  lowercase, diacritic-free, whitespace-collapsed. This is the tolerant
  answer-checking primitive (learners are never punished for their keyboard).

## Model

Input is NFC-normalized, then **segmentized**: each source letter folds to its
standard form and carries a `digraphable` flag. Folded etymological letters are
never digraph-eligible — `ĺj` is л + ј while true `lj` is љ — which the
fold-then-map naive approach gets wrong. Combining-acute forms with no
precomposed glyph (`d́`, `t́`) are consumed as two code points.

## Verification

- Behavior tests with expected values from the official orthography tables.
- Oracle fixtures: Schleicher's fable from the MIT-licensed
  [medzuslovjansky/js-utils](https://github.com/medzuslovjansky/js-utils)
  snapshots (data only, attributed).
- Property invariants (fast-check): script conversion preserves normalized
  meaning; folding, Cyrillic rendering, and normalize are idempotent.
- Gates: 100% branch coverage; Stryker mutation score ≥ 90% (nightly CI).

## Deliberately deferred

- Flavourization variants (ADR 0003) — additional render targets on the same
  segment model; no downstream consumer needs them yet.
- Glagolitic script — supported by the oracle library; out of MVP scope.
