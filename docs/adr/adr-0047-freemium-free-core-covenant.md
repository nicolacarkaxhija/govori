---
id: adr-0047
status: accepted
depends-on: [adr-0016, adr-0044]
---

# 0047 — Freemium with a free-core covenant

## Context

The repository is a platform engine (ADR 0041) hosting several product
instances. Govori is donation-funded and free, with any monetization
change reserved to a community vote (ADR 0016). Fol (ADR 0044) made no
free-forever promise and explicitly reserved the freemium question to
its own charter, because it launches with no prior community to bind and
therefore nothing to bait-and-switch away from.

What remained undecided in writing is the shape of that freemium: how
free and paid coexist without ever eroding trust, and how the posture
stays contained to the instances that choose it. This ADR charters that
shape for any instance that adopts it — Fol first — while leaving ADR
0016 wholly intact.

## Decision

Freemium is a per-instance charter, not an engine default. It applies
only to instances that adopt it explicitly. Govori's ADR 0016 covenant
is untouched, and nothing here retro-paywalls an already-free instance.

- **Provenance-split, machine-enforced.** The line between free and paid
  is the item's provenance, not a marketing decision. Content that is
  community-contributed or openly licensed (CC / public domain) is free
  forever; the existing `provenance` field is the enforcement boundary,
  and the serving gate may never charge for a community or CC item.
  Premium is supplementary content the project owns outright, plus a thin
  layer of convenience features.
- **Core-course-free guarantee.** The full curriculum path, dialogues,
  dictionary, drills, and all community content are free forever. Premium
  is supplementary only — offline audio packs, the paradigm browser and
  deep drills, extended stories, planner autopilot, and the family
  bundle. No part of the core learning path is ever behind payment.
- **Preview labels and founder grandfathering.** Premium surfaces ship
  labeled "premium preview — free during early access" from day one, so
  nothing is ever silently taken away. Founding users are grandfathered a
  standing perk.
- **Payment model: per-level lifetime unlocks, no subscriptions.**
  Entitlements are per-CEFR-level lifetime unlocks; there are no
  subscriptions anywhere. The price bands are published and decline as a
  level's content matures: A-levels launch at EUR 24–29 and amortize down
  to 9–12; B2 and above sit at a flat, cheap 9; a family bundle runs about
  1.6× a single unlock. These bands are provisional until the entitlements
  ADR fixes them. Learn-at-your-pace is inherent: a lifetime unlock never
  expires.
- **Growth carve-outs.** Teachers in a seed ring receive premium free
  forever as a growth engine, not a revenue target. Contribution earns
  premium time (ADR 0048). No ads, ever.

## Consequences

- The provenance gate must stay machine-checkable and audited: owned
  content and imported content are a hard boundary, and a CC BY-SA slice
  can never be relicensed into paid-exclusive.
- Charging requires an entitlements module and payments (a merchant of
  record for EU VAT, plus store in-app purchase) built when the day comes;
  free instances never load either.
- Published price bands are commitments; revising them after publication
  is a trust event, handled as such.
- Terms of sale and a legal step-up precede any charge.

## Alternatives considered

- **Subscriptions** — rejected: recurring billing contradicts the
  learn-at-your-pace and anti-engagement posture, and lifetime unlocks
  anchor cleanly against incumbents that charge yearly forever.
- **Paywalling any core learning** — rejected: the free tier is the
  acquisition weapon and must stay genuinely excellent forever; premium is
  depth and convenience, never the path itself.
- **A single engine-wide monetization policy** — rejected: ADR 0016 binds
  the existing free instances, so freemium can only be a per-instance
  charter, taken up by Fol first.
- **Retro-paywalling an existing free instance** — rejected outright:
  covenant-breaking and socially radioactive; new paid instances launch
  as paid from day one instead.
