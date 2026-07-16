# Tech spec registry

Technical specifications: how subsystems work, one subsystem per file.
Frontmatter: `id`, `status` (draft | accepted | superseded), `depends-on`.

| id                                  | title                  | one-liner                                                                              | status   |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- | -------- |
| [ts-001](ts-001-transliteration.md) | Transliteration engine | Segment-based orthography folding, script rendering, and tolerant answer normalization | accepted |
| [ts-002](ts-002-srs.md)             | SRS engine             | Event-sourced SM-2 scheduling: order-independent replay, swappable transition          | accepted |

_Seeded as subsystems are built; architectural decisions live in [../adr/](../adr/README.md)._
