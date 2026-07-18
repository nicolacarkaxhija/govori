---
id: adr-0042
status: accepted
depends-on: [adr-0003, adr-0029, adr-0041]
---

# 0042 — The LanguagePack seam

## Context

The engine needs language judgment calls — what counts as canonical
text, how answers normalize, how words stem, which scripts exist — but
must not own them (ADR 0029/0041). Before this seam, `@govori/content`
imported the Interslavic `isCanonical` directly, the web app imported
`transliterate`, and the api hardcoded a Latin/Cyrillic rendering pair.

## Decision

`@glotty/language` defines the contract; packs implement it; apps bind
it at their composition roots.

```ts
interface LanguagePack {
  id: string; // stable pack id, e.g. 'isv'
  bcp47: string; // language tag for lang= markup
  orthographyName: string; // the pack's own name for its canonical form
  validateCanonical(text: string): boolean;
  normalize(text: string): string; // tolerant answer folding
  stem(word: string): string; // loose inflection-aware stem
  scripts: { id: string; label: string; render(text: string): string }[];
}
```

**In a pack:** orthography rules, transliteration engines, script
inventories and labels, normalization, stemming, the language's own
terminology. Pack internals (e.g. the ISV transliteration tables in
`packs/isv/src/transliteration.ts`) are not exported; only the
`LanguagePack` surface is.

**In the engine:** everything expressible over the contract — content
schemas via `makeContentSchemas(validateCanonical)`, exercise builders
taking `normalize`/`stem`, script toggles over `scripts` (hidden below
two), renderings keyed by script id. `InstanceConfig` and the fail-fast
`resolveInstance` registry helper live beside the pack contract.

**Normative:** the engine never names a language. Packs own orthography,
scripts, naming, and terminology; instances own branding, catalog sets,
and fallback languages; a build without an instance fails fast. That
sentence is the acceptance standard for engine code review.

## Consequences

- A new language means implementing one interface (plus content); the
  planner, cards, api routes, and importers need no changes — verified
  by single-script fake-pack tests.
- The content forge must bind its own pack's validator via
  `makeContentSchemas`; the pre-bound Interslavic exports are gone.
- Packs carry domain-gate rigor (100% branch, ≥90% mutation) because
  answer checking and canonical validation ride on them.
- Single-script languages get a UI without a script toggle and a
  rotation without script drills, automatically.

## Alternatives considered

- Per-language conditionals in engine code — rejected: unbounded
  coupling, untestable combinatorics.
- Duck-typed pack modules without a shared contract package — rejected:
  the interface is the documentation and the compiler enforces it.
