---
id: ts-004
status: accepted
depends-on: [adr-0003, adr-0012, adr-0035, adr-0037]
---

# Content schemas & artifact contract

Package: `packages/content` (`@glotty/content`). Depends on zod and
`@glotty/transliteration-isv` (canonical-orthography validation).

## Public seam

- `ItemSchema` — the content atom: canonical etymological Latin text
  (schema-enforced via `isCanonical`, ADR 0003), kind (word | phrase |
  sentence), ≥1 translation, contrastive notes per source language,
  provenance, optional originality-audit result.
- `ProvenanceSchema` — discriminated union `human | ai-draft | import`;
  ai-draft requires model + generation time, import requires source, license,
  and attribution (ADR 0012).
- `OriginalityAuditSchema` — `clean | flagged | exempt-import`; flagged
  results must cite the overlapping reference (ADR 0035).
- `ContentArtifactSchema` / `parseContentArtifact` — the versioned contract
  between the content-forge repository and this app's importer (ADR 0037);
  `schemaVersion` is a literal, so incompatible artifacts fail loudly, and
  `ArtifactError` reports every offending path.

## Notes

- These schemas are the single source of truth for content shape: the forge
  validates its output against them, the importer re-validates at import
  time, and the API will derive request/response validation and OpenAPI from
  them (ADR 0019).
- Audio references are deliberately absent at this stage: recordings are
  app-side media with their own lifecycle, joined to items in the database,
  never shipped inside content artifacts.
