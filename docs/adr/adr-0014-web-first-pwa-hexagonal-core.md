---
id: adr-0014
status: accepted
---

# 0014 — Web-first PWA wrapped in Capacitor; native Expo UI deferred; hexagonal core mandatory

## Context

The team wants app-store presence without committing upfront to maintaining two native UIs, and needs a path to a genuinely native experience (e.g. real keyboard-layout switching, see 0029) once it "completes rather than hinders development" — an open, non-blocking trigger point, not a fixed date.

## Decision

We ship a web-first Progressive Web App built in React, wrapped in Capacitor for app-store distribution. A native Expo UI is deferred until it can be added without slowing delivery. This requires the domain core to be strictly hexagonal — zero DOM coupling, ports and adapters only — so a native UI can later be attached to the same core without rewriting business logic.

## Consequences

- Single UI codebase to maintain through launch and beyond, minimizing near-term maintenance burden (a standing constraint — see the working philosophy).
- Store presence is achieved immediately via Capacitor without waiting for a native rewrite.
- The hexagonal-core requirement is non-negotiable up front, even though its payoff (Expo UI) is deferred — retrofitting it later would be far more expensive than building it in from day one.
- Real OS-level keyboard layout switching is unavailable until the Expo UI exists; until then the product relies on transliteration-tolerant input (see 0005, 0029).

## Alternatives considered

- Build native apps (Expo) at launch alongside web — rejected: doubles UI maintenance before there is evidence it's needed.
- Skip the hexagonal constraint and couple domain logic to the DOM/React — rejected: would block a future native UI without a costly rewrite.
