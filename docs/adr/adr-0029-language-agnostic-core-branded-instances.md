---
id: adr-0029
status: accepted
depends-on: [adr-0003, adr-0024]
---

# 0029 — Language-agnostic platform core with per-language packs and branded instances

## Context

Interslavic is the first language, but the product's structure (course + SRS over items, contribution pipeline, trust ladder) is not inherently Interslavic-specific. A future Albanian/Balkan instance ("hajde") is already anticipated. The core needs to be reusable without becoming a multi-tenant product that mixes languages or accounts across instances.

## Decision

The platform core is language-agnostic. Per-language specifics — orthography, transliteration, normalization, keyboard hints — are delivered as "language pack" plugins, alongside language-scoped data. The product shape is separate branded instances per language, not one multi-language app: Interslavic ships first, "hajde" is reserved for a future Balkan instance, and there is no shared account system across instances. Instance branding is expressed via the config system (see 0024).

## Consequences

- A future language instance reuses the entire platform core and only needs a new language pack plus branding config, not a rewrite.
- No cross-instance accounts avoids the complexity (and privacy/GDPR surface, see 0023) of a multi-tenant identity system before it's needed.
- Keeping instances separate means community/content growth in one language doesn't dilute or complicate another's trust ladder or curriculum.
- The transliteration engine (see 0003) must be designed generically enough to be one instantiation of a language pack, not hard-coded to Interslavic specifics.

## Alternatives considered

- Single multi-language app with shared accounts — rejected: mixes unrelated communities and curricula, and complicates branding, trust, and data-residency concerns per language.
