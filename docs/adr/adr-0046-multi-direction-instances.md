---
id: adr-0046
status: accepted
depends-on: [adr-0029, adr-0040, adr-0041, adr-0042, adr-0044]
---

# 0046 — Multi-direction instances

## Context

An instance taught exactly one language: `InstanceConfig` carried a
single `packId`, one translation fallback, one community publish
threshold, and every content row implicitly belonged to that language.
Fol's charter needs a second offering — English for Albanian speakers —
beside the Albanian course, in the same branded product, without
forking the instance or standing up a second deployment. Govori, by
declaration, stays a one-language product.

## Decision

**Direction** becomes an engine concept: one learning offering an
instance hosts, pairing a language pack with the per-direction tuning
that used to sit on the instance.

```ts
interface Direction {
  id: string; // stable id; content rows are scoped by it
  packId: string; // the pack this direction teaches
  label: string; // the direction's own-language label, untranslated
  fallbackTranslationLang: string;
  communityPublishNetVotes: number; // ADR 0040, now per direction
}
```

`InstanceConfig` replaces `packId`/`fallbackTranslationLang`/
`communityPublishNetVotes` with `directions: readonly Direction[]` — a
breaking reshape with no compatibility shims. `resolveInstance` resolves
every direction's pack, failing fast on an empty roster, a duplicate
direction id, or an unknown pack. Govori declares one direction (`isv`);
Fol declares two (`sq`, then `en` with Albanian as fallback).

**Omission is total, never a default.** `resolveDirection` accepts an
omitted direction id only when the instance declares exactly one
direction: the answer is then a total function of config — omission
loses no information, so nothing was "defaulted". The moment a second
direction exists, an omitted or unknown id throws (engine), 400s (api),
or is unrepresentable (web switcher offers only declared ids). The
import CLI's `--direction` flag follows the same rule.

**Data.** `items`, `units`, and `review_queue` gain a `direction`
column; lessons inherit theirs through the unit. The migration leaves
the column nullable on purpose: migrations are static SQL and cannot
know a deployment's directions. Each composition root instead runs a
one-time idempotent backfill right after migrating, stamping NULL rows
with the instance's _first_ direction — the only direction any
pre-direction row can belong to — and every adapter treats a NULL
direction as invalid (absent) from then on. Reads, curriculum
replacement, stats, exports, and the review queue all scope by
direction; approvals and community publications land in the direction a
draft was queued for, judged against that direction's own vote
threshold.

**API.** Routes reading ambiguous content (`/items`, `/stats`,
`/course`, `/lessons/:id`, `/lessons/:id/sentences`, `/export/*`) take
a `direction` query parameter, and `/contribute` a body field, required
exactly when the instance hosts more than one direction. Lookups by
globally-unique id (`/items/:id`, morphology, audio) take none — the
row answers with its owning direction, whose pack derives renderings.
Contributions are validated by the asked direction's pack and named
orthography.

**Web.** The active direction is a persisted per-instance preference;
the switcher renders only when `directions.length > 1`. Its initial
value is the first declared direction — the product's primary in
declared display order, owned by instance config. The exercise surface
(pack judgment calls, script toggle, translation fallback) follows the
active direction. The offline SRS log needs no per-direction
namespacing: events are keyed by item id, and items of different
directions are distinct rows, so the histories cannot collide.

## Consequences

- Fol ships "Shqip" and "English" in one deployment; Govori's UI is
  unchanged — single-direction instances never see a switcher, an extra
  flag, or a required parameter.
- Forges emit per-direction artifacts; the importer requires
  `--direction` for multi-direction instances and each export endpoint
  serves one direction's pool, still round-tripping through the
  importer.
- The community publish bar can differ per direction of one product
  (ADR 0040 extended).
- A direction removed from config strands its rows harmlessly: they
  stop being served, render nothing, and never auto-publish.

## Alternatives considered

- A second instance (`fol-en`) per direction — rejected: splits one
  community across deployments, doubles operations, and breaks the
  shared account, vote, and streak state the charter wants shared.
- A NOT NULL column with a literal backfill in SQL — rejected:
  migrations are shared static files; any literal would name some
  instance's direction inside engine-owned SQL (ADR 0042 violation).
- Inferring the direction of a request from stored text validity —
  rejected: packs overlap (plain Latin parses almost everywhere);
  explicitness is the only honest contract.
