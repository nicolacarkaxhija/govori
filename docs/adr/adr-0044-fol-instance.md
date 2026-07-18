---
id: adr-0044
status: accepted
depends-on: [adr-0004, adr-0016, adr-0031, adr-0041, adr-0042]
---

# 0044 — The Fol instance

## Context

ADR 0041 made the repository a platform and promised the Albanian
product a pack and an instance directory, not a fork. The Standard
Albanian pack (`@glotty/pack-sq`) now exists, mirroring the orthography
validator proven in the Albanian content forge. What remained undecided
in writing: who the product is for, what its content canon is, where
its seed content may come from, and how its brand and funding posture
relate to Govori's.

## Decision

**Fol** (`@glotty/instance-fol`, instance id `fol`) is the Albanian
product over the glotty engine, teaching through `@glotty/pack-sq`.

- **Audience, in order**: diaspora heritage speakers and partner
  families first — hence UI languages en, sq, de, it, tr and a learner
  roster adding fr and es — then travelers.
- **Content canon**: Standard Albanian is the only canonical item text;
  Gheg forms appear solely as contrastive variant notes (ADR 0003
  generalized, ADR 0042). The pack rejects Gheg-only spellings at the
  schema seam.
- **Sources**: kaikki (Wiktionary extraction) and Tatoeba under their
  CC licenses; GPL-licensed tooling may be used as tooling only —
  GPL-covered data never enters the CC BY-SA content corpus.
- **Audio**: ships dark (ADR 0004) with a pre-committed flip trigger:
  ten active contributors or the first teacher pilot, whichever comes
  first.
- **Brand**: Fol is a working brand exactly as Govori is (ADR 0031);
  the community poll will choose between Fol, Alba, and Alo before 1.0.
- **Funding posture**: any freemium consideration is reserved to Fol's
  own charter and community. Govori's donation-funded free covenant
  (ADR 0016) is untouched by anything Fol decides.

## Consequences

- The Fol demo stack is config: `GLOTTY_INSTANCE=fol` for the api,
  `VITE_INSTANCE=fol` for the web build; both fail fast when unset.
- The en/sq catalogs are first-class; de/it/tr ship as good-faith
  drafts awaiting community refinement via Weblate (ADR 0013).
- The Albanian forge binds `@glotty/pack-sq`'s validator through the
  shared schemas and can delete its local fork (ADR 0041).
- A naming poll and an audio flip are pre-committed obligations, not
  open questions to relitigate.

## Alternatives considered

- Gheg as a second canonical orthography — rejected: two canons double
  every content decision; contrastive notes serve heritage speakers
  without forking the corpus.
- Launch UI in en+sq only, like Govori's two-language launch —
  rejected: the primary audience lives in German-, Italian-, and
  Turkish-speaking countries; day-one drafts plus Weblate beat waiting.
- Deciding freemium now — rejected: no community exists yet to consult
  (ADR 0016's covenant model), so the charter records only that the
  question belongs to Fol alone.
