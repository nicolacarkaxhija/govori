---
id: adr-0011
status: accepted
---

# 0011 — Seed strategy: ISV community partnership before launch

## Context

Interslavic is a constructed language maintained by an active community (the ISV language committee). Launching without their engagement risks both a legitimacy problem and a missed source of founding reviewers and dictionary data.

## Decision

We partner with the ISV language committee first — seeking their blessing, a dictionary import, and founding reviewers — before public launch. No scraping of committee-maintained unlicensed sources is done to seed content; only explicitly licensed sources are imported programmatically (see 0035). Outreach happens once a working demo exists (transliteration engine, a few lessons, one polished flow, design docs) rather than at idea stage, and the same outreach package is offered to the LibreLingo course maintainer with a merge proposal.

## Consequences

- Founding reviewers from the committee give the trust ladder (see 0008) credible early staffing.
- Deferred outreach until a working demo exists means the pitch is concrete, not speculative, improving odds of a positive response.
- Committee relationship must be maintained honestly — see 0012 for how AI-drafted content policy is also disclosed to them.
- Risk: if the committee declines to engage, the project proceeds anyway on the licensed sources alone, per the explicit no-scraping rule.

## Alternatives considered

- Scrape unlicensed committee sources (interslavic.fun prose, standard spec) to bootstrap content faster — rejected: derivative-work and EU database-rights exposure, contradicts the disclosed-provenance policy, and would end any chance of partnership.
- Launch without committee contact — rejected: forgoes legitimacy, founding reviewers, and dictionary access for no compensating benefit.
