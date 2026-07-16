---
id: adr-0007
status: accepted
depends-on: [adr-0008, adr-0010]
---

# 0007 — In-app contribution editing with versioned public content export

## Context

Community contributors to the content (linguists, native speakers) are not developers and should not need git or pull requests to contribute. The seamless-for-contributors principle (see the working philosophy) requires in-app tooling for everything: editing, review, and audio.

## Decision

Contributors edit content directly in-app through an editor and review queue — no git required for linguists. All published content is versioned and exported publicly (see 0010 for the license this export carries), so the dataset remains usable outside the app itself.

## Consequences

- Removes the single biggest friction point for non-developer contributors, widening the realistic contributor pool.
- Requires building and maintaining an in-app editor and review workflow instead of relying on GitHub's built-in review tooling.
- Versioned export keeps the dataset forkable and reusable, reinforcing the AGPL/CC BY-SA openness commitments (see 0010, 0015).
- Review-queue state and content versioning become core domain concerns, not an afterthought bolted onto a CMS.

## Alternatives considered

- Git/PR-based contribution (as most open-source projects do) — rejected: excludes non-technical linguists, contradicting the contributor-friction principle.
