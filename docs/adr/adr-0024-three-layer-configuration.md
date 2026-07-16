---
id: adr-0024
status: accepted
depends-on: [adr-0017]
---

# 0024 — Three-layer configuration with immutable validated Config class

## Context

The system has three genuinely different kinds of configuration — deployment-time settings, runtime-toggleable feature flags, and per-user preferences — that need distinct storage, validation, and change-propagation models rather than being lumped into one mechanism.

## Decision

Configuration is split into three layers: (1) deployment config — Zod-validated, layered as defaults → file → env, built once into an immutable Config class at the composition root, with derived values computed rather than restated, failing fast at boot on invalid config; (2) runtime feature flags (see 0025); (3) user preferences, stored in the database. All layers are constructor-injected, consistent with the hand-rolled DI approach (see 0018).

## Consequences

- Fail-fast boot validation catches misconfiguration immediately rather than surfacing as runtime errors later.
- Immutability of the deployment Config class prevents accidental runtime mutation of settings that should be fixed for a process's lifetime.
- Clear separation of concerns makes it obvious which mechanism to use for a new setting: deploy-time, flag, or preference.
- Instance branding (per-language product instances, see 0029) is expressed through this same config layer, so branding changes are config changes, not code changes.

## Alternatives considered

- Single flat configuration mechanism for everything — rejected: conflates settings with very different lifecycles (boot-time immutable vs. runtime-toggleable vs. per-user), making each harder to reason about.
