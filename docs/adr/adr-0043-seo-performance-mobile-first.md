---
id: adr-0043
status: accepted
depends-on: [adr-0014, adr-0027, adr-0029]
---

# 0043 — SEO, performance, and mobile-first as enforced posture

## Context

The platform is splitting into an engine (glotty) with per-language product
instances (Govori, Fol) and thin public product-shell repositories. The apps
are deliberately route-less SPAs (view machine, ADR 0014 spirit): excellent
for app UX and offline-first, invisible to search engines. Meanwhile the
product audiences are overwhelmingly mobile, and the content pool is openly
licensed — a search-indexable asset no competitor has.

## Decision

Three commitments, each enforced rather than aspired to:

- **Mobile-first, gated**: Lighthouse CI keeps its mobile emulation and the
  performance, accessibility, best-practices, and SEO categories are all
  blocking at ≥ 0.9, alongside the existing resource-size budgets. The
  Capacitor shell and PWA install path are the primary delivery targets.
- **SEO lives on the product shells, not in the app**: each product shell
  (govori, fol) is a static, prerendered site generated from the open
  content artifacts — dictionary/word pages, lesson previews, and stories
  as crawlable URLs with structured data (JSON-LD), sitemap, hreflang
  across instance UI languages, and llms.txt + the open data export as the
  agentic-SEO surface. The app itself stays route-less; shell pages
  deep-link into it.
- **Performance budgets follow the learner's device**: budgets are tuned
  for mid-range Android over 4G (the diaspora median), not desktop fibre.

## Consequences

- A Lighthouse category regression now fails the merge, like any test.
- Product-shell generators become part of each instance's build; content
  updates republish the shells from fresh artifacts.
- The open-data export doubles as the SEO/AI-discoverability surface,
  reinforcing ADR 0007/0010 rather than adding a parallel system.

## Alternatives considered

- Server-side rendering inside the apps — rejected: contradicts the
  route-less view-machine design and adds runtime cost; static shells get
  the same crawlability for free.
- Treating SEO as a launch-time task — rejected: retrofitted SEO consistently
  underperforms; the shells are cheap to generate from artifacts now.
