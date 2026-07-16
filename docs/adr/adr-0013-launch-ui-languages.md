---
id: adr-0013
status: accepted
depends-on: [adr-0029]
---

# 0013 — Launch UI languages EN + Interslavic; community localization pipeline

## Context

The UI needs to be usable by both an international audience (English) and the Interslavic community itself, without the localization system becoming a bottleneck as more languages are added later by volunteers.

## Decision

The UI ships in English and Interslavic at launch. All UI strings are externalized for translation from day zero (not retrofitted), and a Weblate-style pipeline is used for community translation, matching the no-git-for-contributors principle applied elsewhere (see 0007).

## Consequences

- Two launch languages keep initial localization scope small while covering the core audience and the language the app teaches.
- Day-zero string externalization avoids an expensive later migration to make the app translatable.
- A Weblate-style pipeline lets community translators contribute without touching code or git, consistent with the contributor-friction principle.
- i18n completeness is a CI-checked gate (see 0026), preventing partial translations from shipping silently.

## Alternatives considered

- English-only at launch — rejected: excludes the Interslavic-speaking community itself from a native-language UI.
- Retrofit i18n after launch — rejected: externalizing strings later is markedly more expensive than doing it from the start.
