# Glossary

Shared vocabulary for this repository. Definitions only — how things
work lives in `docs/` (ADR 0028).

- **Engine** — the language-agnostic platform in `packages/*` and
  `apps/*`: course + SRS mechanics, contribution pipeline, config, and
  the app shells. Engine code never names a language or an instance
  (ADR 0042).
- **Language Pack** — one language's implementation of the
  `LanguagePack` contract in `packs/*`: canonical-text validation,
  normalization, stemming, scripts, and the language's own terminology
  (ADR 0042).
- **Instance** — one deployable product as configuration in
  `instances/*`: branding, UI catalog set, learner-language roster,
  fallback language, and the pack it teaches. Selected explicitly at
  build/boot; there is no default (ADR 0029/0041).
- **Product / App** — a branded instance running on the engine. Govori
  (Interslavic, working brand pending a community vote, ADR 0031) exists;
  Fol (Albanian) is planned.
- **Canonical Text** — the single stored form of an item's text, valid
  under its pack's canonical orthography; everything else is derived
  (ADR 0003).
- **Script** — one writing system a pack can render canonical text into,
  identified by id with a display label and a pure `render` function
  (ADR 0003/0042).
- **Flavour / Variant Note** — a regional or audience-specific rendering
  or annotation derived from canonical text, never stored as separate
  content (ADR 0003); contrastive notes per source language are its
  current form (ADR 0001).
- **Forge** — a separate content-preparation repository that emits
  versioned artifacts for one language, validated against the shared
  schemas bound to that language's pack (ADR 0037).
- **Artifact** — a versioned, schema-validated JSON bundle (content,
  curriculum, morphology) crossing the forge→importer seam; re-validated
  on import (ADR 0037).
