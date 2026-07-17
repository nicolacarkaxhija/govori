---
id: ts-006
status: accepted
depends-on: [adr-0003, adr-0013, adr-0022, adr-0026, adr-0030, adr-0038]
---

# Web app

App: `apps/web` (`@govori/web`). Vite + React 19 PWA over the domain
packages; no framework state library, no router — a discriminated-union
view machine in `App`.

## Shape

- `App` provides theme, script, and UI language (context), then renders one
  view: home → course → lesson, plus stats, account, review, and users.
- `api/client.ts` — the only network seam: typed zod-validated fetchers
  that fail closed (`null`/`[]`/`false`), same-origin by default (ADR 0027),
  credentialed where a session matters.
- `learn/progress.ts` — local-first SRS (ADR 0022/0030): an append-only
  review-event log in localStorage; scheduling state is derived by replay.
  `mergeEvents` set-unions server history in by event id; push happens on
  sign-in. Multi-device sync is the union of two logs, never a merge of
  states.
- `i18n/` — flat Weblate-ready catalogs (`en`, `isv`), typed keys, English
  fallback, `{param}` interpolation; a catalog-completeness test is the CI
  gate demanded by ADR 0013.

## Exercises

| Mode     | Source                          | Grading                      |
| -------- | ------------------------------- | ---------------------------- |
| choices  | algorithmic distractors         | good/again on the item       |
| typed    | `checkTyped` over `normalize`   | any script, accents optional |
| matching | `buildMatching` pairs (pool ≥4) | per-item first-try grading   |
| cloze    | real sentences via              | blanked pool word credited;  |
|          | `/lessons/:id/sentences`        | deferred due-item advance    |

Rotation is choices → typed → matching → cloze; a cloze is sentence-based,
so entering it defers the due-item check until the blank is answered.

## Rendering rules

Canonical etymological Latin arrives from the API; every display point
calls `transliterate` with the user's script (ADR 0003). Typing is judged
through `normalize`, so Latin, Cyrillic, and accent-free answers all pass.

## Verification

Vitest + Testing Library with a mocked client seam; all four coverage
metrics gated at 85% (ADR 0026). Playwright e2e drives the built PWA
against a Testcontainers-backed API through the golden path.
