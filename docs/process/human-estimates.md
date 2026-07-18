# Human-effort estimates

Per commit: an estimate of what the same work would have cost an experienced
developer working alone. Appended in the same commit it describes.

| date       | commit                                                          | est. hours | notes                                                                                                       |
| ---------- | --------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-07-16 | chore: initialize repository with license and readme            | 0.5–1      | Positioning-aware README, license selection                                                                 |
| 2026-07-16 | chore: scaffold pnpm workspace with turborepo and typescript    | 1–1.5      | Workspace layout, strict TS base config, task graph                                                         |
| 2026-07-16 | chore: add linting, formatting, and commit hooks                | 2–3        | ESLint flat config with typed linting; diagnosing TS 7 / typescript-eslint incompatibility and pinning TS 6 |
| 2026-07-16 | docs: seed architecture decision records 0001-0035              | 6–8        | 35 grounded ADRs with dependencies and alternatives                                                         |
| 2026-07-16 | docs: add documentation registries, governance, and conventions | 2–2.5      | Registry skeleton, continuity/succession policy, repo conventions                                           |

| 2026-07-16 | ci: add verification workflow and release automation | 1.5–2 | PR wall (format/lint/typecheck/build/test) + release-please |

| 2026-07-16 | feat: add transliteration engine with etymological folding and Cyrillic mapping | 3–4 | Package scaffold, Vitest with 100% gates, 7 behavior tests from official orthography tables, digraph/case/folding engine |

| 2026-07-16 | style: format readme with prettier | 0.1 | Formatting fix for pre-hook file |
| 2026-07-16 | ci: keep releases in 0.x until launch | 0.5–1 | Release-please manifest config, pre-major bump strategy |

| 2026-07-16 | feat: add normalize and oracle-verified segment engine | 4–5 | Oracle fixtures from js-utils snapshots caught digraph/folding bug; segment rewrite, normalize(), 4 property-test invariants |

| 2026-07-16 | test: kill mutants with table specs and wire nightly mutation gate | 2–3 | Mutation analysis, exhaustive alphabet specs, dead-code removal, Stryker config + nightly workflow |

| 2026-07-16 | docs: add transliteration tech spec | 0.5 | Subsystem spec + registry row |

| 2026-07-16 | feat: add event-sourced srs engine with sm-2 scheduling | 4–5 | ADR 0036, SM-2 worked examples, replay/selectDue, 4 sync invariants (one caught an id-identity contract gap), 100% mutation |

| 2026-07-16 | docs: split content preparation into dedicated repo (adr 0037) | 0.5 | Decision record + amendment of 0035 |

| 2026-07-16 | feat: add config and feature-flag machinery | 3–4 | buildConfig/envSource/defineFlags/resolveFlags, 16 tests, diamond-dependency semantics, mutation-tested |

| 2026-07-16 | feat: add canonical-orthography validation | 1–1.5 | isCanonical with acute-position strictness; feeds content schemas |

| 2026-07-16 | feat: add content schemas and artifact contract | 2.5–3 | Item/provenance/audit discriminated unions, canonical-text enforcement, versioned artifact seam |

| 2026-07-16 | ci: build dependencies before typed linting | 0.3 | Cross-package typed lint needs emitted declarations |

| 2026-07-16 | feat: scaffold api with composition root and instance meta | 2–2.5 | Fastify app factory (DI, no process state), config schema, env camelization fix in @govori/config, /health + /meta |

| 2026-07-16 | feat: add postgres persistence, artifact importer, and flag store | 5–6 | Drizzle schema+migrations, item/flag adapters, importer use case, Testcontainers integration tests, pnpm build-approval wrangling |

| 2026-07-16 | feat: add item read api with generated openapi | 3–4 | ItemQueries port, Drizzle reads, zod type provider, swagger onRoute ordering, script renderings at the edge |

| 2026-07-16 | feat: serve effective feature flags through the dependency graph | 1.5–2 | Flag definitions module, read port, /flags endpoint resolving transitive requirements |

| 2026-07-16 | feat: add artifact import cli | 1–1.5 | Composition-root script; verified seed-to-serve end to end against live postgres |

| 2026-07-16 | docs: add api tech spec | 0.4 | ts-005 + registry row |

| 2026-07-16 | docs: draft partner outreach plan | 1–1.5 | Stage-0 contacts, pitch structure, disclosure rules |

| 2026-07-16 | feat: scaffold web pwa shell with token theming | 6–8 | Vite+React PWA, WCAG-validated token system, dual dark-mode strategy, typed meta client, 12 tests at 100% coverage |

| 2026-07-16 | feat: add self-hosted auth with session gate | 5–6 | better-auth wiring, auth tables migration, web-request bridge, /me, signup/session integration tests |

| 2026-07-16 | feat: add role-gated admin flag management | 2.5–3 | Role column+migration, UserRoles/FlagStore ports, guarded PUT with audit identity, 4 guard tests |

| 2026-07-16 | feat: add review-event sync with set-union semantics | 3.5–4 | Events table+migration, review store adapter, gated sync routes, real-session integration incl. admin promotion path |

| 2026-07-16 | feat: add lesson slice with local srs and script toggle | 8–10 | Exercise cards (choice + tolerant typed), browser-side transliteration + SM-2 replay over localStorage log, Literata/stitch design pass, 14 new tests |

| 2026-07-17 | fix: allow configured web origins through cors | 1 | Real-browser capture surfaced the gap; config-driven origin list, credentialed |

| 2026-07-17 | feat: support the dictionary corpus letters ė and ľ | 1–1.5 | Corpus-driven alphabet completion; 889 dictionary words unblocked |

| 2026-07-17 | feat: fetch the dictionary and build the seed pipeline (forge repo) | 5–6 | TSV source discovery, parser, homonym-safe ids, machine-translation filter, 19k-item scale verification |
| 2026-07-17 | test: add full-stack end-to-end suite | 4–5 | Testcontainers+api+pwa orchestration, IPv4/excluded-port diagnosis, 4 golden-path specs, CI job |

| 2026-07-17 | feat: add production deployment stack | 3–4 | Multi-stage Dockerfiles (pnpm deploy pruning), one-origin Caddy proxy+SPA, compose with healthchecks, verified locally |

| 2026-07-17 | feat: serve public aggregate stats | 1.5–2 | Stats port + branch-free adapter, /stats route, shared test-deps helper ending fixture churn |

| 2026-07-17 | feat: show open numbers in the app | 1.5–2 | Stats client, tile view with unreachable state, third app view, footer link |

| 2026-07-17 | docs: add decided-vs-done roadmap | 1 | Full sweep of ADRs against implementation |

| 2026-07-17 | feat: order lessons by community frequency | 2–2.5 | Frequency through schema/forge/db/serving; the pool now teaches common words first |

| 2026-07-17 | feat: add the gated course model | 4–5 | Units/lessons tables+migration, course ports+adapter, curriculum artifact contract, importer mode, routes, suites migrated to makeTestDeps |

| 2026-07-17 | feat: teach through the course | 4–5 | Course/lesson clients, CourseView, lesson-scoped play, view machine, e2e over the course path, curriculum generator (forge) |

| 2026-07-17 | feat: add accounts with local-progress sync | 4–5 | Auth/sync clients with credentials, AccountView (signup/signin/signout, error states), push-on-auth of the local log, 6 new tests |

| 2026-07-17 | feat: add self-serve data export and account erasure | 3–4 | AccountRights port+adapter, GET /me/export + DELETE /me, full-lifecycle integration (signup→sync→export→erase→401), defensive-lookup coverage |

| 2026-07-17 | feat: let learners download and erase their data | 2.5–3 | Export blob download, two-step erasure with honest copy, rights client fns |

| 2026-07-17 | feat: add the matching exercise | 3–3.5 | Matching board logic + card, per-item first-try grading, mode rotation with pool guard |

| 2026-07-17 | docs: record the seeding expansion estimate | 4–5 | Forge batch (4 commits): additional-languages sheet merge (16+10 langs), Tatoeba corpus fetcher (resumable API paging), sentence converter with license gating + attribution, artifact assembly; verified 19,790 items / 250,887 translations / 26 langs via importer |

| 2026-07-17 | docs: record the generation groundwork estimate | 4–5 | Forge batch (7 commits): fact-pack builder with closed support vocabulary and sanctioned forms, committed unit-1 grammar facts + prompt template, draft schema + canonical/vocabulary validators, prompt emitter + validation CLI, calibrated lesson-1 generation (16 sentences, 0 errors, 0 warnings) |

| 2026-07-17 | docs: record the lesson draft generation estimate | 3–4 | Forge batch (5 commits): cumulative lesson-pack loader (multi-unit facts/forms, prefix filtering), unit-2 grammar facts, 7 lesson drafts generated and human-reviewed (128 sentences total incl. lesson 1; 0 validation errors, every off-list token flagged) |

| 2026-07-17 | docs: record the course draft completion estimate | 4–5 | Forge batch (5 commits): unit 3–5 grammar facts (past tense, agreement, instrumental, double negation, locative), 12 lessons generated in parallel and reviewed (188 sentences), containment-matcher fix for hyphenated and short agreement forms, one lesson regenerated for suppletive byti |

| 2026-07-17 | docs: record the originality audit estimate | 2.5–3 | Forge batch (2 commits): normalize-folded n-gram shingle audit (module + tests + CLI), reference corpus wiring (interslavic.fun archive 504 pages + Tatoeba), all 316 draft sentences audited clean |

| 2026-07-17 | feat: serve lesson sentences for cloze exercises | 1.5–2 | findSentencesContaining port + whole-word regex query, GET /lessons/:id/sentences, route + integration tests |

| 2026-07-17 | feat: add the cloze exercise over real sentences | 2.5–3 | buildCloze with stem-tolerant blanking crediting the pool word, ClozeCard, sentence-aware mode rotation with deferred advance, client fn, styles, tests at all gates |

| 2026-07-17 | docs: decide the review queue publication path | 0.5 | ADR 0038 + registry row |

| 2026-07-17 | feat: gate ai drafts behind an admin review queue | 3–4 | review_queue table + migration, port + Drizzle adapter (insert-once, decide-once), import-cli --drafts, admin list/decide routes with approve-publishes semantics, role on /me, route + integration tests |

| 2026-07-17 | feat: let admins review drafts in the app | 2.5–3 | Review clients, ReviewView (approve/reject, script-aware, unavailable state), admin entry in AccountView, App wiring, styles, tests to all gates; live end-to-end verification (314 queued → approve → served publicly) |

| 2026-07-17 | fix: proxy every api route through the one-origin caddy | 0.3 | Stats/course/lessons/me-export paths were falling through to the SPA in prod; caught by booting the seeded local stack |

| 2026-07-17 | feat: externalize ui strings with english and interslavic | 4–5 | i18n core (typed flat catalogs, interpolation, en fallback, persisted language toggle, provider/hook), full Interslavic translation of the UI, string externalization across all nine views, catalog-completeness gate in CI, 12 new tests |

| 2026-07-17 | feat: merge server progress into the device on sign-in | 2–2.5 | mergeEvents set-union into the local log, fetchReviews client, pull on session check and sign-in with arrived-count notice, catalog keys, 5 new tests |

| 2026-07-17 | perf: batch the artifact import into chunked upserts | 1–1.5 | Chunked bulk statements under the Postgres parameter limit; 19k-item seed 3m06s → 38s |

| 2026-07-17 | fix: make the script toggle glyphs visibly distinct | 0.2 | Žž↔Жж replaces the identical-looking Aa↔Аа |

| 2026-07-17 | feat: spellcheck drafts against the community dictionary (forge) | 2.5–3 | Hunspell wellformedness stage over the etymological dictionary, annotation CLI, findings on all 314 sentences (64 flagged), systematic orthography corrections to the grammar facts (jesmȯ, -ajų, råzumějų, grådu), forge CI workflow |

| 2026-07-17 | feat: manage user roles through the admin api | 2–2.5 | UserDirectory port + adapter, admin list/role routes with self-demotion guard, route + integration tests |

| 2026-07-17 | feat: promote reviewers from the admin directory | 2–2.5 | Directory clients, UsersView with role flip and refusal handling, admin entry point, catalog keys, client fail-path coverage sweep |

| 2026-07-17 | docs: add web and deploy tech specs | 1.5–2 | ts-006/ts-007 + registry backfill (ts-003..005 rows had drifted) |

| 2026-07-17 | docs: draft the privacy policy and terms | 2–2.5 | GDPR-grounded privacy draft matching the actual data model, contribution-licensing terms, legal registry; operator placeholders for the human pass |

| 2026-07-17 | feat: describe the app to crawlers and language models | 0.5 | Meta description + OpenGraph, llms.txt with content policy and self-host pointers |

| 2026-07-17 | feat: keep content available offline | 1–1.5 | Workbox NetworkFirst runtime cache over the content routes; lessons survive losing the network |

| 2026-07-17 | feat: show the daily learning streak | 1.5–2 | streakDays derivation over the local event log (UTC days, yesterday-grace), hero + lesson-done display, catalog keys, 3 new tests |

| 2026-07-17 | feat: let lessons carry an intro dialogue | 1.5–2 | ADR 0039 (dialogues ride the curriculum artifact), optional canonical-text turns with provenance on the lesson schema, path-named rejections |

| 2026-07-17 | feat: store and serve lesson dialogues | 1.5–2 | Dialogue column + migration, adapter passthrough, lesson route schema with disclosed provenance, route test |

| 2026-07-17 | feat: open lessons with their dialogue scene | 2–2.5 | DialogueCard with AI-disclosure line, intro-first lesson flow, client schema, styles, catalog keys, tests |

| 2026-07-17 | feat: generate lesson dialogues through the pipeline (forge) | 2.5–3 | Dialogue prompt template, emitter mode, unit-1 scenes generated and reviewed (4×6 turns, 0 errors), combined canonical/spelling/originality checker, approved-only curriculum attachment |

| 2026-07-17 | ci: add lighthouse budgets and a k6 load profile | 2–2.5 | Resource-size and category assertions over the built shell as a blocking CI job (verified green then armed), k6 read-path profile with thresholds — baseline p95 75.8 ms at 20 VUs on the seeded stack |

| 2026-07-17 | feat: approve the unit 1 dialogues after review + draft units 2–5 (forge) | 3–3.5 | Review-driven line revisions, approval flow exercised end to end (rebuild → reimport → scenes live), 16 further scenes generated in two parallel waves, all validated clean and queued for review |

| 2026-07-17 | feat: accept learner contributions into review | 1.5–2 | Provenance schema loosened to real auth ids, authenticated POST /contribute building fully validated items with human provenance into the existing review queue, three-path route tests |
| 2026-07-17 | feat: add the contribute form | 1.5–2 | New view wired into the app shell, client call with four-way status mapping, canonical pre-check before the network, sign-in handoff, i18n in both languages, coverage gates held |

| 2026-07-17 | feat: store and serve community recordings behind the audio flag | 2.5–3 | New hexagonal port with Postgres bytea adapter via custom type, three flag-dark routes with session gating and base64 size caps, migration untangled from stale snapshot drift, real-database roundtrip test |

| 2026-07-17 | feat: play and contribute pronunciations in exercises | 2–2.5 | Flag-aware lesson wiring, a playback-and-recorder component over MediaRecorder with mic-denial handling, chunked base64 upload client, both UI languages, coverage held above the gate |

| 2026-07-17 | feat: add listening transcription to the lesson rotation | 1.5–2 | New exercise card that bows out gracefully for clip-less items, rotation slot after cloze and typed rounds gated on the audio flag, driven-through-the-UI rotation tests |

| 2026-07-17 | feat: add sentence assembly and a pure rotation planner | 2–2.5 | Word-bank card with index-tracked duplicates, Fisher-Yates with solved-order guard, rotation logic extracted into an exhaustively tested pure planner alternating cloze and assembly |

| 2026-07-17 | feat: wrap the web app in a native android shell | 2.5–3 | Toolchain bootstrap (JDK 21, SDK command-line tools, platform 35), Capacitor config over the built PWA, generated android project, verified debug APK build |
| 2026-07-17 | feat: open review decisions to the reviewer tier | 1–1.5 | Role widened through port/schema/route enums, reviewer-or-admin guard on both review routes, promotion and guard tests; user and flag administration kept admin-only |
| 2026-07-17 | feat: let the community vote drafts into the course | 2.5–3 | review_votes table + migration, VoteStore port with Drizzle upsert/tally adapter, findPending on the queue, vote and pending routes with net-3 auto-publish and race guard, route + real-Postgres tests |
| 2026-07-17 | docs: charter community voting | 0.5 | ADR 0040 (second publish path, threshold rationale, brigading risk accepted) + registry row |
| 2026-07-17 | feat(content): add part-of-speech fields to items | 0.5–1 | Normalized twelve-value POS enum distilled from the slovnik's raw tag inventory, optional pos/posDetail on the item contract, branch coverage held at 100% |
| 2026-07-17 | feat(content): add the morphology artifact contract | 1–1.5 | New import-seam schema for inflected-form paradigms keyed to item ids, two-form floor, canonical-text gate on every form, parse function mirroring the existing artifact parsers with joined issue paths |
| 2026-07-18 | feat: import word forms and part of speech | 2–2.5 | item_forms table + pos columns in one verified-clean migration, morphology port with chunked delete-then-insert Drizzle adapter, artifact re-validation seam, CLI mode, pos threading through the item repository, unit + real-Postgres tests |
| 2026-07-18 | feat: serve item forms | 0.5–1 | Read port wired through the dependency seam and composition root, GET /items/:id/forms with empty-list semantics for unknown items, four-path route test including the OpenAPI surface |
| 2026-07-18 | feat: publish the open data export | 2.5–3 | Three public CC BY-SA endpoints emitting importer-shaped artifacts, bulk-read adapter with map grouping sized for 250k translations, empty-pool 404 semantics, round-trip tests through the shared parsers at both the route and real-Postgres layers |
| 2026-07-17 | feat: add reverse-direction exercises to the rotation | 2–2.5 | Shared option-picking core with an Interslavic-answer builder, direction-aware exercise card (script-rendered choices, tolerant typing), planner extended with a reverse pass after the sentence round |

| 2026-07-17 | feat: pick exercise translations by learner language | 1–1.5 | translationFor with exact/en/first fallback chain, lang threaded through the choice, matching, cloze, and assembly builders with English defaults, language-gap coverage |

| 2026-07-17 | feat: carry the learner language through every exercise card | 1.5–2 | Persisted useLearnLanguage hook over a curated 12-language list with unknown-code refusal, lang props on exercise/matching/listening cards and the lesson view, gap-fallback UI tests |

| 2026-07-17 | feat: offer the translation-language picker in the footer | 0.5–1 | Native-name select over the curated list wired to the persisted preference and the lesson view, catalog keys in both languages, footer styling |

| 2026-07-17 | feat: surface contrastive notes in exercise feedback | 1–1.5 | Optional notes on the learn-item schema, language-matched hint under the feedback line with quiet fallback, schema roundtrip and card visibility tests |

| 2026-07-17 | feat: add a script drill to the lesson rotation | 2–2.5 | Latin↔Cyrillic transcription card with normalize-tolerant checking, one-per-lesson planner slot after the first sentence round, catalog keys, planner and UI rotation tests |

| 2026-07-17 | refactor: extract the exercise session from the lesson view | 1–1.5 | Session component owning rotation, grading, and cards over a ready pool; lesson view reduced to loading, dialogue, and handoff — groundwork for the practice hub |

| 2026-07-17 | feat: practise weak and common words from the home screen | 2.5–3 | Lapse-ranked weakestItemIds over the local log, practice view running sessions over the worst ten or the frequency top twenty, home practice nav, empty/unreachable states, catalog keys |

| 2026-07-17 | feat: add a timed speed review over matching boards | 2.5–3 | 30-second countdown with reduced-motion-aware bar, boards-cleared score over normally recorded grades, fake-timer suite incl. diagnosing the testing-library jest-global timer bridge |

| 2026-07-17 | feat: reorder seen dialogues instead of replaying them | 2.5–3 | scrambleOrder extracted and reused by assembly, per-lesson seen flags, tap-to-order dialogue card with pragmatic first-item credit, first-visit/return-visit lesson flow tests |

| 2026-07-17 | feat: let learners vote on pending community drafts | 2.5–3 | fetchPendingVotes/castVote clients with a 401-aware result, voting view with server-confirmed tallies and vote-state buttons, sign-in handoff, footer entry, both catalog languages |

| 2026-07-17 | feat: recognize the reviewer role across the app | 1–1.5 | Role enums widened on session/directory/role-change clients, drafts queue opened to reviewers while user management stays admin-only, three-way role picker replacing the flip button, catalog keys |

| 2026-07-18 | feat: drill inflected word forms in the rotation | 1.5–2 | Forms client, a typed-drill card over five curated paradigm slots with graceful bow-out, one rotation slot per session, planner tests reconciled |
| 2026-07-18 | feat: state the content license on the contribute form | 0.5 | CC BY-SA 4.0 notice in both languages ahead of publicizing the open export |

| 2026-07-18 | feat: enforce mobile Lighthouse gates and charter the SEO posture | 0.5–1 | Performance/best-practices/SEO categories armed as blocking at 0.9 on mobile emulation; ADR 0043 pins SEO to prerendered product shells over the open artifacts |
| 2026-07-18 | refactor: rename the workspace scope to glotty | 1–1.5 | Mechanical @govori→@glotty sweep across packages, apps, CI, Dockerfiles, and tech specs; transliteration engine relocated to packs/ as the first language-specific module; lockfile importers rebuilt |

| 2026-07-18 | feat: define the language pack contract | 1–1.5 | New @glotty/language domain package: LanguagePack/ScriptVariant interfaces plus renderIn/hasScriptChoice/nextScript helpers, 100% branch and 100% mutation, full domain gate config |

| 2026-07-18 | feat: ship the interslavic language pack | 1–1.5 | @glotty/pack-isv implementing the contract over the transliteration engine, loose stem promoted from the web app, script-variant factory to keep mutants observable, 100% mutation |

| 2026-07-18 | refactor: decouple content schemas from interslavic orthography | 2.5–3 | makeContentSchemas factory binding parsers to an injected canonical validator, shared parserFor with unchanged ArtifactError semantics, deprecated ISV-bound forge wrappers in their own module to break the import cycle, mutation suite hardened 76→98 |

| 2026-07-18 | feat: name language identity in the pack contract | 0.5–1 | bcp47 and orthographyName on LanguagePack so engine code never hardcodes a language, InstanceConfig contract (brand, packId, uiLanguages, fallback language, catalogs), isv pack fields |

| 2026-07-18 | feat: inject the language pack into the api | 2.5–3 | pack on AppDependencies, artifact schemas bound in buildApp, renderings keyed by pack scripts with a fake-pack route test, contribute rejection worded by the pack, import seams take bound parsers, suites migrated off the deprecated wrappers |

| 2026-07-18 | refactor!: drop the isv-bound content schema exports | 1–1.5 | Breaking seam cleanup: forge-compat module deleted, @glotty/content depends on zod alone, suites rebound to a stand-in validator so the engine package never names a language; forge migration documented for its own repo |

| 2026-07-18 | feat: make the instance an explicit build input | 4–5 | @glotty/instance-govori (brand, catalogs as TS modules, learner roster, fallback language), InstanceConfig extended, web registry with fail-fast VITE_INSTANCE resolution, i18n/learn-language/theme/progress rebuilt over the instance, branded index.html placeholders stamped at build, capacitor/vite/turbo/CI/Docker wiring |

| 2026-07-18 | refactor: render and judge every exercise through the pack | 3.5–4 | transliteration import removed from the web app: cards render via pack scripts, checkTyped/cloze take pack normalize/stem, translationFor and builders require an explicit instance fallback language, lang markup from pack.bcp47, script drill labels from script variants, useScript cycles pack scripts |

| 2026-07-18 | feat: hide the script choice when the pack has none | 1–1.5 | scriptCount on RoundContext with a planner guard and an all-modes never-script test, toggle rendered only under hasScriptChoice, single-script instance test via a mocked entry point |

| 2026-07-18 | refactor: rename the config env prefix to glotty | 0.5 | GOVORI_→GLOTTY_ across the api config seam, compose, e2e bootstrap, config-package samples, and the tech specs |

| 2026-07-18 | feat: require an explicit instance to boot the api | 2–2.5 | Shared fail-fast resolveInstance in the contract package (tested to 100/97.7 mutation), api registry keyed by GLOTTY_INSTANCE, brand injected into config from the instance with no engine default, import CLI resolves the same way, compose fully instance-parametrized with per-instance db and builds, e2e bootstrap updated |

| 2026-07-18 | refactor: fold the transliteration engine into the isv pack | 1–1.5 | Orthography engine and its five suites moved to packs/isv/src/transliteration.ts as unpublished pack internals — no package left for engine code to import; tech specs realigned; merged pack holds 100% branch and 97.8% mutation |

| 2026-07-18 | docs: record the platform split and the pack seam | 1.5–2 | ADR 0041 (one engine, many language apps) and ADR 0042 (LanguagePack seam with the never-names-a-language acceptance standard) plus registry rows, root CONTEXT.md glossary, README retitled to glotty with a products section, CLAUDE.md realigned |

| 2026-07-18 | refactor: purge language-named identifiers from engine strings | 0.5–1 | interslavicAria/isvLabel catalog keys renamed to target-language terms, engine comments reworded, catalogs re-sorted with the parity gate |

| 2026-07-18 | fix: hand the web preview its instance during e2e | 0.25 | vite preview loads vite.config, which fails fast without VITE_INSTANCE; the e2e bootstrap now sets it explicitly — full 4-spec suite green over the instance seam |

| 2026-07-18 | feat: add the standard albanian language pack | 2–2.5 | @glotty/pack-sq: canonical validator mirroring the proven forge orthography (36-letter alphabet as a 27-character class), NFD-fold normalize, min-3 stem, single identity Latin script with hasScriptChoice false; four suites incl. fast-check invariants, 100% branch, 97.1 mutation |

| 2026-07-18 | feat: add the fol instance | 3–4 | @glotty/instance-fol: Fol branding over the sq pack, six-language learner roster, five full UI catalogs (en key inventory + native-care sq, draft de/it/tr flagged for Weblate refinement), parity/sorted/non-empty gate parametrized over all five |

| 2026-07-18 | feat: register fol in the app shells | 1–1.5 | fol/sq lines in both instance registries with the workspace deps, api registry suite proving fol resolves to the sq pack and bootless boots still fail naming both ids; full api (98.3/92.2) and web (92.7/88.4) suites green, VITE_INSTANCE=fol build stamps the Fol brand into index.html and the PWA manifest |

| 2026-07-18 | docs: charter the fol instance | 0.5–1 | ADR 0044 recording Fol's chartered decisions — diaspora-first audience, Standard canon with Gheg contrastive notes, kaikki/Tatoeba CC sources with GPL-as-tool, audio dark with a pre-committed flip, Fol/Alba/Alo naming poll, freemium reserved to Fol's own charter — plus registry row |

| 2026-07-18 | feat: resolve feature flags from the viewer's role | 1.5–2 | resolveFlags in @glotty/config became viewer-aware — flags carry a target ring (all/reviewer/admin), effectiveness now also demands the viewer's ring reach the flag's and rings propagate through requirements; rank-based ring check keeps the branch count flat; suite reworked to the {enabled,targetRole}+viewerRole shape at 100% branch |
| 2026-07-18 | feat: target feature flags by viewer role | 2.5–3 | flag_states/flag_audit gained a target_role ring (drizzle migration 0011, generated clean); the flag store reads/writes it and preserves the ring across a plain on/off flip while auditing the resulting ring; GET /flags now resolves per session role (anonymous without one); PUT /admin/flags/:key takes an optional targetRole; every flag-store stub and the integration suite moved to the {enabled,targetRole} shape; api 98.3/92.4 |
| 2026-07-18 | feat: make the community publish threshold instance config | 1–1.5 | InstanceConfig gained communityPublishNetVotes (govori 3, fol 5); the vote route reads it off the resolved instance handed to buildApp instead of a shared ports constant, which was removed; both thresholds covered via a makeTestDeps instance override; ADR 0040 records thresholds as instance config; language stays 100% branch, api 98.3/92.4 |
| 2026-07-18 | fix: steady the lighthouse gate with a three-run median | 0.2 | Single-run performance scores swing on shared runners; median-of-three removes the flake without loosening the bar |
| 2026-07-18 | docs: draft the launch outreach letters | 0.5–1 | Committee letter, founding-reviewer and bilingual founding-voter invites, sending checklist — stage-1 of the marketing ladder |
| 2026-07-18 | feat: add a free-production exercise round | 2–3 | ProductionCard where the learner writes an original sentence using 2–3 due pool words; pure buildProduction picker and checkProduction (canonical + stem-containment of every word) tested against the isv pack; planNextMode gains one production round per session after morphology, wired through the Session with per-word grading; optional signed-in submit-to-review via contribute; six catalog keys across both instances' seven catalogs |

| 2026-07-18 | feat: add a micro-journal with word crediting | 2–3 | Home-reachable JournalView: a daily prompt rotating by UTC day from a catalog-keyed list, a target-language textarea, and three due-word suggestion chips; on save (localStorage, one entry per day) any suggested word stem-detected in the text records a 'good' SRS review via a shared matchedWordIds helper and a new dueItemIds selector; pure journal module and view tested; ten catalog keys across both instances' seven catalogs |

| 2026-07-18 | feat: add weekly goal chips to the home screen | 1.5–2 | Pure weeklyGoals over the review log and journal days — reviews answered, journal entries, distinct active days this week, each a task count with a Monday-anchored week window; goalFraction/goalMet helpers; GoalChips home widget with progress bars, unit- and render-tested; five catalog keys across both instances' seven catalogs |

| 2026-07-18 | feat: add a weekly plan generator | 2.5–3.5 | Pure buildPlan drafts a Mon–Fri checklist from weak items, a picked interest unit, and the reviews goal, with weekends left as a deliberate rest; per-week checked-state persisted in localStorage with a Monday-anchored key; WeeklyPlanView with a unit picker and checkable tasks, unit- and render-tested; fourteen catalog keys (weekday names, task labels, plan chrome) across both instances' seven catalogs |

| 2026-07-18 | docs: record the production-first exercise expansion | 0.5–1 | ADR 0045 recording the design of the free-production round, micro-journal, weekly goal chips, and weekly plan — how each rides the pack seam and the offline-first review log without naming a language or touching the sync schema — plus its registry row |

**Running total: 257.1–329.7 h**
