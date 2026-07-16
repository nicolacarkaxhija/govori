---
id: adr-0032
status: accepted
---

# 0032 — Design system: headless primitives, token-based theming, dark mode, no mascot at launch

## Context

Visual design needs to be consistent, accessible, and support dark mode from the start, without over-investing in bespoke component work before the product's core learning experience is proven. It also needs to feel aligned with the Interslavic community's existing visual identity rather than imposing an unrelated brand.

## Decision

The design system uses Radix-style headless primitives skinned by an in-house red/white token system, with dark mode supported day one via tokens. Folk-pattern accents are used sparingly, sourced from public-domain or CC-licensed motifs with attribution, aligned with the community's existing visual identity. WCAG contrast is validated as part of the design process. No mascot ships at launch; one may be commissioned or community-sourced later, possibly timed with the naming vote (see 0031).

## Consequences

- Headless primitives (Radix-style) avoid reinventing accessible component behavior while keeping full control over visual styling via tokens.
- Token-based theming makes dark mode and any future rebrand (see 0031) a configuration change, not a component rewrite.
- Deferring the mascot avoids committing to a visual identity before the community and naming process have had input, and avoids a "cute mascot" tone the minimal-first philosophy resists.
- Sourcing folk-pattern accents from public-domain/CC motifs with attribution avoids licensing risk while still signaling cultural alignment.

## Alternatives considered

- Fully custom component library from scratch — rejected: more upfront work than headless primitives for no proven benefit at this stage.
- Ship a mascot at launch — rejected: premature branding commitment better made alongside the community naming vote.
