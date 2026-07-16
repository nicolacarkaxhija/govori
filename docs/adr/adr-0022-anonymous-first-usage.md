---
id: adr-0022
status: accepted
depends-on: [adr-0021]
---

# 0022 — Anonymous-first usage: full learning without an account

## Context

A signup wall before any learning is a classic friction point that contradicts the "no signup wall" commitment to end users (see the working philosophy's three-constituencies principle). Yet sync, contribution, and social features genuinely need an account.

## Decision

Full learning is available with no account: progress is stored locally (IndexedDB) and imported into an account automatically if/when the user signs up later. An account is required only for sync across devices, contribution, and social features.

## Consequences

- Removes the single biggest onboarding friction point for end users.
- Local-first progress storage requires a reliable import path at signup so no progress is lost when a user later creates an account.
- Feeds directly into the offline-first, event-sourced progress model (see 0030), since anonymous local progress and synced progress must use the same underlying event log.
- A persistent, gentle in-app hint is needed to warn anonymous users that their progress is browser-local and can be lost, without being a nag.

## Alternatives considered

- Require signup before any learning — rejected outright as a friction-first design contradicting the project's core usability principle.
