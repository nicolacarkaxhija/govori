---
id: adr-0025
status: accepted
depends-on: [adr-0024]
---

# 0025 — Homegrown DB-backed feature flags with dependency graph, audit log, role targeting

## Context

Several features are intentionally "built but off" (audio, see 0004; social gamification, see 0006), and some flags have real dependency relationships (e.g. leaderboards require social, which requires accounts; record-and-compare requires audio). The philosophy of "every feature granularly selectable via the config/flag system" needs a mechanism that can express these relationships and be safely operated by non-engineers doing dogfooding.

## Decision

We build a homegrown feature-flag system, Postgres-backed with an in-memory cache, including an admin UI, an audit log of changes, role-based targeting for dogfooding, and a declared dependency graph that is validated (e.g. rejecting an attempt to enable leaderboards without social enabled).

## Consequences

- Dependency-graph validation prevents inconsistent flag states (e.g. a feature enabled whose prerequisite is disabled).
- Audit log gives accountability for who changed what flag and when, important once non-engineers (admins) can flip flags via the UI.
- Homegrown means no external dependency or cost, matching the low-budget, low-maintenance constraints (see 0016), but the team owns its correctness and evolution.
- Public flag-flip thresholds (see 0033) are only meaningful because this system supports precise, auditable, role-targeted rollout.

## Alternatives considered

- A third-party flag SaaS (e.g. LaunchDarkly) — rejected: recurring cost conflicts with the €10–20/mo budget and adds an external dependency for a need the team can meet cheaply itself.
