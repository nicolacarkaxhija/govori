---
id: adr-0028
status: accepted
---

# 0028 — Registry-pattern documentation and per-commit human-effort estimates

## Context

Documentation that lives in one giant file becomes unreadable and blows up context for anyone (or anything) trying to read it selectively. The team also wants visibility into how much human effort the project represents, commit by commit, as a form of transparency and portfolio value.

## Decision

Docs are organized as registries: docs/{prd,tech,adr,process}/, each with a README.md index table (columns: id, title, one-liner, status) and one concern per file, each file carrying frontmatter (id, status, depends-on). ADRs are seeded from the initial decision-making session and expanded over time. docs/process/human-estimates.md is appended per commit with hash, scope, estimated human effort, notes, and a running total. The CHANGELOG is generated (see 0027), not hand-maintained.

## Consequences

- Selective reading: anyone can read one registry file without loading the whole documentation tree into context.
- Consistent frontmatter (id, status, depends-on) makes cross-referencing and dependency tracking mechanical rather than ad hoc, as used throughout this ADR set.
- Per-commit human-effort estimates create an ongoing transparency artifact but require discipline to keep updated every commit.
- One-concern-per-file scales better than monolithic docs as the project and contributor base grow.

## Alternatives considered

- Single large documentation file(s) per concern area — rejected: does not scale and defeats selective, low-context reading.
