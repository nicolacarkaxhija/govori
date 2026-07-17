# Roadmap

Status of everything decided in the ADRs against what exists. Updated as
milestones land; one line per work item, grouped by pillar.

## Content initialization (ADR 0035/0037)

| Item                                                              | Status                         |
| ----------------------------------------------------------------- | ------------------------------ |
| slovnik import: 19,004 items, homonym-safe ids, artifact contract | ✅ done                        |
| Frequency list (MIT) → curriculum ordering                        | ⬜ next                        |
| Course model: units → lessons over the item pool                  | ⬜ next                        |
| Second dictionary sheet (additional languages)                    | ⬜ pending                     |
| Tatoeba sentences (CC BY 2.0) import                              | ⬜ pending                     |
| Validation chain: hunspell + morphology checks in the forge       | ⬜ pending                     |
| Originality audit (n-gram overlap vs unlicensed references)       | ⬜ pending                     |
| AI-drafted lessons: fact packs, prompts, capped-key generation    | ⬜ pending (calibration first) |
| Contrastive notes per source language                             | ⬜ pending                     |
| Provenance/attribution display in the app                         | ⬜ pending                     |

## Learning experience

| Item                                                                         | Status              |
| ---------------------------------------------------------------------------- | ------------------- |
| Exercises: multiple choice, tolerant typed                                   | ✅ done             |
| Exercises: cloze, matching, sentence assembly, listening, record-and-compare | ⬜ pending (5 of 7) |
| Local SRS over the event log                                                 | ✅ done             |
| Offline content packs (IndexedDB; current lesson pre-cached)                 | ⬜ pending          |
| Personal gamification: streak, daily goal, XP, badges, heatmap, reminders    | ⬜ pending          |
| Script toggle label legibility (Aa→Аа reads as identical)                    | ⬜ pending          |

## Community pillar (ADR 0007–0009)

| Item                                                        | Status     |
| ----------------------------------------------------------- | ---------- |
| In-app contribution editor + review queue + version history | ⬜ pending |
| Trust ladder roles beyond admin flag gate                   | ⬜ pending |
| Versioned public content export (the forkability guarantee) | ⬜ pending |
| Audio contribution recording (behind flag)                  | ⬜ pending |

## Accounts & privacy (ADR 0021–0023)

| Item                                       | Status                                   |
| ------------------------------------------ | ---------------------------------------- |
| Auth, sessions, /me, review-event sync API | ✅ done                                  |
| Signup/signin UI + local-log push on auth  | ⬜ next                                  |
| Self-serve account deletion + JSON export  | ⬜ pending (MVP-blocking per ADR 0023)   |
| Privacy policy + ToS drafts                | ⬜ pending (hard trigger: public launch) |

## Platform & i18n

| Item                                                          | Status                                       |
| ------------------------------------------------------------- | -------------------------------------------- |
| UI string externalization + Interslavic UI + Weblate pipeline | ⬜ pending (ADR 0013 says day-zero; overdue) |
| Instance theming beyond brand names                           | ⬜ pending                                   |
| Capacitor store wrappers                                      | ⬜ pending (post-beta)                       |

## Operations & growth

| Item                                                                     | Status                         |
| ------------------------------------------------------------------------ | ------------------------------ |
| CI wall, e2e, nightly mutation, release automation                       | ✅ done                        |
| Deploy stack (one-origin Caddy compose)                                  | ✅ done (needs a VPS)          |
| Renovate, backups + restore-test, healthchecks, uptime, Umami, GlitchTip | ⬜ pending (mostly VPS-bound)  |
| Lighthouse/k6 budgets in CI                                              | ⬜ pending                     |
| SEO: prerendered public pages, sitemap, structured data, llms.txt        | ⬜ pending                     |
| Admin UI for flags (endpoint exists)                                     | ⬜ pending                     |
| Outreach templates + committee demo package                              | ⬜ pending (demo nearly ready) |

## Sequencing toward the committee demo

1. Frequency-ordered curriculum + course model (the demo must show _course_, not raw dictionary).
2. Signup UI + sync push; deletion/export self-serve.
3. Two more exercise types (cloze, matching) for variety.
4. i18n externalization with an Interslavic UI pass — the credibility feature.
5. Staging deploy (VPS) → outreach templates → send.
