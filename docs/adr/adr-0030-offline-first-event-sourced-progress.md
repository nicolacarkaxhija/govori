---
id: adr-0030
status: accepted
depends-on: [adr-0021, adr-0022]
---

# 0030 — Offline-first with event-sourced learning progress

## Context

Learners should be able to study with no connectivity, and anonymous-first usage (see 0022) already requires local progress storage. Merging offline progress with server state on reconnect needs a model that can't produce conflicts, since naive last-write-wins would silently lose review history.

## Decision

The app is offline-first: a service worker caches the app shell, and content packs plus SRS state live in IndexedDB, allowing full learning offline. Progress is modeled as an append-only event log — the source of truth — with SRS state derived by deterministic replay (cached via snapshots for performance). Sync is a simple event-set union, which cannot conflict by construction. Anonymous-to-account signup import is just appending the local log to the account's log. Content caching: current and next unit are auto-cached; the rest, plus audio, are cached only on explicit request. Contribution, review, social, and account operations remain online-only at MVP; offline contribution drafting is deferred post-MVP.

## Consequences

- Event-set-union sync eliminates an entire class of merge-conflict bugs that a mutable-state sync model would have to handle explicitly.
- Deterministic replay from an append-only log means SRS state is always reconstructible and auditable, and bugs in derivation logic can be fixed by replaying, not by data migration.
- Snapshot caching is required to keep replay performant as event logs grow; this adds a caching-invalidation concern to the domain core.
- Auto-caching only the current/next unit (not the whole course) keeps offline storage bounded on typical devices while still covering the common case.

## Alternatives considered

- Mutable progress state with last-write-wins sync — rejected: would silently lose data on conflicting offline edits across devices.
- Cache the entire course and all audio automatically — rejected: unbounded storage/bandwidth cost, especially once audio (see 0004) is enabled.
