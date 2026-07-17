---
id: adr-0038
status: accepted
depends-on: [adr-0012, adr-0035, adr-0037]
---

# 0038 — AI drafts publish through an in-app review queue

## Context

The forge produces AI-drafted lesson sentences that pass schema validation
and the originality audit (ADR 0035), but policy requires a human decision
before anything AI-generated reaches learners. Reviewing JSON files in the
forge repository does not scale past the first maintainer and leaves no
in-product audit trail.

## Decision

Unpublished drafts never enter the `items` table. The importer gains a
`--drafts` mode that loads a drafts artifact into a dedicated
`review_queue` table (full item JSON, status `pending`). Admin-gated
endpoints list pending entries and record a decision; **approve** upserts
the item into `items` — where the existing serving paths pick it up with
its `ai-draft` provenance intact — and **reject** keeps the row as a
tombstone with the reviewer's identity. The web app shows a review screen
to admins only.

## Consequences

- Public reads (`/items`, `/lessons/:id/sentences`) can never leak
  unreviewed AI content; the boundary is a table, not a filter.
- Every published draft records who approved it and when, next to the
  model that generated it — provenance end to end (ADR 0012).
- Rejected drafts stay queryable, so regeneration can avoid repeating
  rejected sentences.
- The queue is the seed of the community contribution flow: contributor
  submissions can later enter the same table with a different origin.
