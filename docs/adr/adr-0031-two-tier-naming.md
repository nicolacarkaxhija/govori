---
id: adr-0031
status: accepted
depends-on: [adr-0029]
---

# 0031 — Two-tier naming: working brand Govori; final name by community vote before 1.0

## Context

Waiting for a perfect, community-agreed name before writing any code would stall the project indefinitely. At the same time, the eventual Interslavic-speaking community should have a real say in the product's permanent name, and a name offered unilaterally (e.g. "Besěda") could be seen as presumptuous toward the language committee.

## Decision

"Govori" is adopted as the working brand now — used as the repo name and throughout development — with the final name decided by community vote before the 1.0 release. Because branding is instance configuration (see 0024, 0029), renaming later is cheap: brand fields (short name, full name) live in config, not hard-coded. Candidate domains in the govori/slovo family are purchased immediately to secure the option space. Two names are used everywhere: a short name ("Govori", used in the manifest short_name and in-app) and a long descriptive name ("Govori — Interslavic Learning App" / store listing "Govori: Learn Interslavic") for SEO and store discoverability. "Besěda" is offered to the ISV committee only as a joint branding option, never adopted unilaterally. Redirects (301s) are planned to prevent broken links when the final rename happens.

## Consequences

- Development is not blocked on a naming decision that legitimately belongs to the community.
- Cheap rename later is only possible because branding was designed as config from the start (see 0024) — this decision depends on that architectural choice already being in place.
- Domain purchases now hedge against losing good name candidates while the vote is pending.
- The two-tier short/long name pattern must be threaded through manifest, in-app UI, and store listings consistently from day one.

## Alternatives considered

- Delay development until a final name is chosen — rejected: stalls the project on a decision that isn't blocking and belongs to a community that doesn't exist yet.
- Adopt "Besěda" unilaterally — rejected: risks appearing presumptuous toward the ISV committee; offered only as a joint option instead.
