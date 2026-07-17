# Tech spec registry

Technical specifications: how subsystems work, one subsystem per file.
Frontmatter: `id`, `status` (draft | accepted | superseded), `depends-on`.

| id                                  | title                  | one-liner                                                                              | status   |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- | -------- |
| [ts-001](ts-001-transliteration.md) | Transliteration engine | Segment-based orthography folding, script rendering, and tolerant answer normalization | accepted |
| [ts-002](ts-002-srs.md)             | SRS engine             | Event-sourced SM-2 scheduling: order-independent replay, swappable transition          | accepted |
| [ts-003](ts-003-config.md)          | Config & feature flags | Layered config building and dependency-aware flag resolution                           | accepted |
| [ts-004](ts-004-content-schemas.md) | Content schemas        | Item/provenance/audit contracts and the versioned artifact seam                        | accepted |
| [ts-005](ts-005-api.md)             | API server             | Fastify adapter over injected ports; OpenAPI generated from the validating schemas     | accepted |
| [ts-006](ts-006-web.md)             | Web app                | PWA view machine, local-first SRS with union sync, four exercise modes, i18n catalogs  | accepted |
| [ts-007](ts-007-deploy.md)          | Deployment stack       | One-origin Caddy over composed Postgres/API/PWA; boot-time migrations, seeded via CLI  | accepted |

_Seeded as subsystems are built; architectural decisions live in [../adr/](../adr/README.md)._
