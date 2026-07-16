---
id: adr-0010
status: accepted
depends-on: [adr-0007]
---

# 0010 — Learning content licensed CC BY-SA 4.0

## Context

Community-contributed content needs a license that keeps it open and reusable while crediting contributors, and that is compatible with imported sources such as Tatoeba's CC BY 2.0 FR sentences. The license also has to survive account deletion in a way that doesn't corrupt the shared dataset.

## Decision

All learning content is licensed CC BY-SA 4.0. The license is granted by contributors at signup. If a contributor deletes their account, their content stays in the corpus but attribution is pseudonymized; this is disclosed explicitly in the Terms of Service.

## Consequences

- CC BY-SA 4.0 is compatible with importing CC BY 2.0 FR Tatoeba sentences, enabling that seed source (see 0035).
- The dataset stays forkable and reusable outside the app, reinforcing the versioned public export (see 0007).
- Account deletion cannot silently remove content from the shared corpus, since it's licensed to the community — this must be stated plainly in the ToS to avoid surprising users at signup.
- Share-alike means any derivative dataset built on this content must also stay open, protecting against closed forks absorbing community work.

## Alternatives considered

- CC0 (public domain dedication) — rejected: drops attribution, undervaluing contributor credit which matters for a volunteer-driven project.
- Fully deleting a departing contributor's content — rejected: would fragment the shared dataset and is impractical once content is interwoven into curriculum.
