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

**Running total: 74.7–95.7 h**
