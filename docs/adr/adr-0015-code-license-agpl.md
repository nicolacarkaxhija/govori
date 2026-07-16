---
id: adr-0015
status: accepted
---

# 0015 — Code licensed AGPL-3.0

## Context

The project is committed to open-source distribution and to preventing closed, hosted forks from freeriding on community-built code without contributing improvements back — a real risk for a network-run learning service.

## Decision

The codebase is licensed AGPL-3.0 and published as a public repository on GitHub.

## Consequences

- Anyone running a modified version of the service as a network service must release their modifications, closing the SaaS loophole plain GPL leaves open.
- Reinforces forkability alongside the CC BY-SA content export (see 0007, 0010) — the whole stack stays genuinely open.
- Some potential commercial adopters may be deterred by AGPL's network-use clause; considered acceptable given the project's non-commercial, donation-funded nature (see 0016).
- Consistent with hosting the repo under the maintainer's personal GitHub with governance safeguards for continuity (see 0034).

## Alternatives considered

- MIT/Apache-2.0 — rejected: would allow closed, hosted forks to compete without any obligation to contribute back.
- Plain GPL-3.0 — rejected: doesn't cover network use, leaving the SaaS-freeriding gap open for a hosted service.
