---
id: adr-0035
status: accepted
depends-on: [adr-0011, adr-0012]
---

# 0035 — Content seeding: licensed imports + fact-grounded generation pipeline with originality audit

## Context

The MVP course needs roughly 500–1000 items across ~10 units. Verified MIT-licensed sources exist for dictionary and morphology data (medzuslovjansky org's slovnik, js-utils, frequency lists, hunspell/pymorphy dictionaries), and Tatoeba offers CC BY 2.0 FR sentences compatible with our CC BY-SA 4.0 content license (see 0010). But several adjacent sources (interslavic.fun prose, the standard spec, the ISV text corpus) are unlicensed and must never be paraphrased or "re-elaborated," since that would constitute laundering: a derivative work, an EU database-rights violation, a contradiction of the disclosed-provenance policy (see 0012), and grounds to end the ISV committee partnership (see 0011).

## Decision

Content generation runs through a versioned pipeline (location amended by 0037: a dedicated repository, with only a schema-validating artifact importer in this repo), not ad-hoc chat interaction. The curriculum outline is derived from the frequency list; per-lesson briefs are batched with curated fact packs (lexicon slices, grammar facts drawn only from licensed sources); prompts are committed files; output is structured JSON validated against Zod schemas. Generated text is written in canonical etymological Latin only (see 0003), drawing from a closed vocabulary defined by the fact pack. Validation runs a chain: schema check → hunspell/pymorphy dictionary check → vocabulary-membership check → transliteration round-trip check → an originality audit that measures n-gram/shingle overlap against a locally-held reference corpus of the unlicensed sources, bouncing over-threshold content to regeneration or flagged human review with the source shown. A batch audit report is produced before any bulk publish, and the audit result is stored per item alongside provenance. Imported items (slovnik, Tatoeba) are instead audited for intact attribution metadata. Distractors and cloze blanks are generated algorithmically, at zero model cost. All generated content enters the same human review queue as any other contribution (see 0012). Execution is staged: the first unit is generated and iterated interactively to calibrate prompts and validators, then bulk generation runs on a capped external API key (stored in .env, with a hard token cap in config); the strongest available model is used for actual Interslavic text generation (a low-resource constructed language is not a mechanical task), while cheaper tiers or plain algorithms handle scaffolding. Estimated MVP course cost: $20–60 in API spend.

## Consequences

- The originality audit is the load-bearing safeguard that makes fact-grounded generation legally and ethically distinct from paraphrasing unlicensed sources — without it, this entire approach would be indistinguishable from laundering.
- A versioned, file-based pipeline (not ad-hoc generation) makes the process auditable and reproducible, and keeps prompts/fact-packs reviewable as committed artifacts.
- Per-item provenance and audit results stored in metadata (not content strings) keep the disclosure policy (see 0012) enforceable and queryable.
- Hard token/spend caps and staged execution (calibrate one unit, then scale) bound cost risk before committing to full-course generation.
- Algorithmic distractor/cloze generation avoids unnecessary model spend on mechanically-derivable exercise parts.

## Alternatives considered

- Scrape and paraphrase unlicensed sources (interslavic.fun prose, standard spec, ISV corpus) to bootstrap content faster — rejected: derivative-work and EU database-rights exposure, breaks the disclosed-provenance policy, and would end the committee partnership.
- Generate content ad hoc via unversioned chat interaction — rejected: not reproducible or auditable, and harder to keep within the closed-vocabulary and fact-grounding constraints.
- Skip the originality audit and rely on fact-grounding alone — rejected: fact-grounding constrains content but doesn't guarantee surface-level originality against the unlicensed reference prose.
