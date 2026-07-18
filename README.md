# glotty — open community language-learning engine

**glotty** is a free, open-source, community-driven engine for building
language-learning apps: a structured course path plus spaced-repetition
review over one shared pool of community-maintained content items. The
engine is language-agnostic; each language ships as a pack, and each
product is an instance — configuration, not code (ADR 0029/0041/0042).

> Status: pre-alpha, under active development. Nothing is deployed yet.

## Products

- **Govori** (_"speak!"_) — the Interslavic app, working brand pending a
  community naming vote. Learn
  [Interslavic (Medžuslovjansky)](https://interslavic.fun/) — the zonal
  constructed language intelligible across the Slavic world — with both
  scripts derived on the fly from one canonical orthography.
- **Fol** (_"speak!"_ in Albanian) — the planned Albanian instance.

## What the engine provides

- A **hybrid learning spine**: course path for beginners plus
  spaced-repetition review over the same items.
- **Script- and orthography-aware exercises** driven entirely by the
  language pack: canonical storage, derived scripts, tolerant answer
  checking.
- **Community contribution in-app**: items, review queues, community
  voting, audio — no git required. Content is licensed
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and
  continuously exported for public reuse.
- **Anonymous-first & offline-first** learning; an account only adds
  sync and contribution rights.
- **Privacy by design**: EU hosting, data minimization, no trackers, no
  cookie banner — because there is nothing to consent to.

## Repository layout

```
apps/        deployable shells (web PWA, API server) — instance-agnostic
packages/    the engine: pure domain packages (SRS, content schemas, config, pack contract)
packs/       language packs (isv), including their orthography engines
instances/   products as configuration (govori)
docs/        registry-indexed documentation — start at docs/README.md
```

Vocabulary lives in [CONTEXT.md](CONTEXT.md). Documentation follows a
**registry pattern**: each `docs/*/README.md` is an index; open only the
files you need. Builds are per-instance and explicit: set
`VITE_INSTANCE` (web) / `GLOTTY_INSTANCE` (api, deploy) — there is no
default product.

## Contributing

Language-level contributions will happen inside the apps once they ship.
Development contributions are welcome — start with
[GOVERNANCE.md](GOVERNANCE.md) and the docs registries.

## License

Code: [AGPL-3.0](LICENSE). Learning content: CC BY-SA 4.0 (see
`docs/process/content-licensing.md`).

Dictionary data derives from the MIT-licensed
[medzuslovjansky/slovnik](https://github.com/medzuslovjansky/slovnik) —
thank you to the Interslavic community for keeping the language open.
