---
id: adr-0021
status: accepted
---

# 0021 — Self-hosted better-auth for authentication

## Context

Authentication must satisfy GDPR/EU-hosting requirements (see 0023) end to end, which rules out third-party auth providers that store data outside our control. It also needs to support anonymous-first usage (see 0022) as a first-class mode, not an afterthought.

## Decision

We self-host better-auth, using email+password with httpOnly sessions at launch; social OAuth is deferred behind config for later. All auth data stays within our own EU-hosted infrastructure.

## Consequences

- Full control over where auth data lives satisfies EU-only hosting requirements without relying on a third-party processor's compliance posture.
- httpOnly sessions avoid client-side token storage risk and keep the cookie-consent story simple (session cookies only, no banner needed — see 0023).
- Self-hosting auth adds an operated component to the stack, weighed against outsourcing to a hosted auth provider.
- Social OAuth being config-gated and deferred keeps launch scope smaller while leaving a clear extension point.

## Alternatives considered

- Third-party hosted auth (e.g. Auth0, Clerk) — rejected: data residency outside our control complicates the EU-only GDPR posture and adds an external dependency/cost.
- Social OAuth at launch — rejected: deferred as unnecessary launch-scope complexity given anonymous-first usage covers most initial friction.
