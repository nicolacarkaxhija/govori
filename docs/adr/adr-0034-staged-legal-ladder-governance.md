---
id: adr-0034
status: accepted
depends-on: [adr-0015]
---

# 0034 — Staged legal ladder and personal-repo governance safeguards

## Context

Legal and organizational overhead (business registration, Impressum, formal entity) is costly and premature before the project has any users. At the same time, hosting the repository under the maintainer's personal GitHub account, rather than an organization, creates a bus-factor and continuity risk that needs mitigating without upfront bureaucracy.

## Decision

Legal setup follows a staged ladder that defers bureaucracy as long as possible: Stage 0, public repo, needs nothing; Stage 1, invite-only beta, needs nothing; Stage 2, public launch, is the only hard trigger and requires an Impressum via a c/o address service (~€10/month, keeping the maintainer's home address private) plus a privacy policy naming the maintainer as data controller; Stage 3, accepting donations, requires an OpenCollective Europe fiscal host and income declaration, and only happens after proven traction; Stage 4, forming a registered association (e.V.), may happen later or never. The repository lives under the maintainer's personal GitHub for now, with safeguards: a GOVERNANCE.md from day one promising succession if the maintainer is unreachable for 6 months, a co-admin collaborator added once someone earns trust, credential escrow via a password manager's emergency access feature, and forkability guaranteed by AGPL licensing (see 0015) plus the versioned public content export (see 0007). Transfer to an organization later is designed to be painless (GitHub preserves redirects and stars; org repos remain pinnable on a personal profile).

## Consequences

- No legal/administrative work is required before there's any real user base to justify it, keeping early velocity high.
- The Stage 2 trigger (public launch) is unambiguous, avoiding the temptation to skip legal setup once real users exist.
- Personal-repo hosting carries genuine continuity risk, which is why governance safeguards (succession promise, co-admin, credential escrow, forkability) are treated as mandatory day-one artifacts, not optional extras.
- Deferring Stage 4 (formal entity) indefinitely is a deliberate choice to avoid bureaucracy the project may never need.

## Alternatives considered

- Form a legal entity or register a business before launch — rejected: premature cost and overhead with no users yet to justify it.
- Host the repo under a GitHub organization from day one — rejected in favor of personal-repo hosting (portfolio value) with explicit governance safeguards to offset the continuity risk; org transfer remains available later.
