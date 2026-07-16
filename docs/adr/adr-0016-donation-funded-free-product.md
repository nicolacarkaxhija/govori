---
id: adr-0016
status: accepted
depends-on: [adr-0034]
---

# 0016 — Free product funded by donations; monetization changes require community consultation

## Context

A learning app funded by ads or a paywall pressures product decisions toward engagement-maximizing or paywall-shaped features — directly at odds with the "less is more, learning-first" philosophy. The project also needs a realistic, low-cost hosting budget to make donation funding viable.

## Decision

The product is free with no ads and no premium tier, funded by donations. If running costs ever exceed donations, whether to introduce ads or paid features is decided by a community vote, not unilaterally. Infra donations run through a project OpenCollective (public ledger), kept separate from personal maintainer-time donations (GitHub Sponsors/Ko-fi, clearly labeled) — a transparent split that is never feature-gated. Target infra budget is €10–20/month.

## Consequences

- Removes monetization pressure from product decisions, protecting the learning-first design philosophy.
- Low target budget (€10–20/mo) is achievable on the chosen self-hosted stack (see 0020, 0027) but leaves little room for unplanned scale costs.
- Community consultation before monetization changes is a real constraint on future flexibility, deliberately traded for trust.
- Separating infra donations from maintainer-time donations avoids the appearance that personal support buys product influence.

## Alternatives considered

- Ad-supported free tier — rejected outright as the default; only revisited via community vote if donations prove insufficient.
- Freemium/paid-tier model — same rejection: monetization is deferred to a community decision rather than built in from the start.
