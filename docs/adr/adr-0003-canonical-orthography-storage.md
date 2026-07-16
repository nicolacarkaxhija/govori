---
id: adr-0003
status: accepted
depends-on: [adr-0002]
---

# 0003 — Canonical etymological orthography storage with derived scripts/flavours

## Context

Interslavic can be written in etymological or standard Latin, Cyrillic, and various "flavourized" regional variants. Storing every item pre-rendered in each variant would multiply content-maintenance effort and risk inconsistency between variants of the same item.

## Decision

Content items are stored once, in canonical etymological Latin orthography. Standard Latin, Cyrillic, and flavourized variants are derived at render/check time by a deterministic transliteration engine, implemented as a pure domain package with no framework dependencies. Generated content (see 0035) is required to write canonical etymological Latin only, with the engine deriving the rest, and its output is validated round-trip against this engine.

## Consequences

- One authored form per item; all display/script variants stay consistent by construction.
- The transliteration engine becomes a critical-path domain component requiring the highest test rigor (100% branch coverage, ≥90% mutation score — see 0026).
- Typed-answer checking across exercise types must be transliteration-aware, adding logic to the exercise engine (see 0005).
- Community-authored MIT js-utils (medzuslovjansky org) serves as a test oracle/reference for correctness.

## Alternatives considered

- Store each script/flavour variant separately per item — rejected: multiplies authoring and review effort and invites inconsistency across variants.
