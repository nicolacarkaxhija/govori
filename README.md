# Govori — Interslavic Learning App

**Govori** (_"speak!"_) is a free, open-source, community-driven app for learning
[Interslavic (Medžuslovjansky)](https://interslavic.fun/) — the zonal constructed
language intelligible to speakers across the Slavic world.

> Status: pre-alpha, under active development. Nothing is deployed yet.

## What it will be

- A **hybrid learning engine**: a structured course path for beginners plus
  spaced-repetition review, both fed by one shared pool of community-maintained
  content items.
- **Both scripts, every flavour**: content is stored once in the etymological
  orthography; Latin, Cyrillic, and flavourized variants are derived on the fly.
- **Community-driven at the language level**: contributions, review, and audio
  recording happen in-app — no git required. Content is licensed
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and
  continuously exported for public reuse.
- **Anonymous-first & offline-first**: learn without an account, on or off the
  network. An account only adds sync and contribution rights.
- **Privacy by design**: EU hosting, data minimization, no trackers, no cookie
  banner — because there is nothing to consent to.

## Repository layout

```
apps/        deployable applications (web PWA, API server)
packages/    pure domain packages (SRS, transliteration, course engine, config)
docs/        registry-indexed documentation — start at docs/README.md
scripts/     repeatable tooling (content pipeline, ops)
```

Documentation follows a **registry pattern**: each `docs/*/README.md` is an
index; open only the files you need.

## Contributing

Language-level contributions will happen inside the app once it ships.
Development contributions are welcome — start with
[GOVERNANCE.md](GOVERNANCE.md) and the docs registries.

## License

Code: [AGPL-3.0](LICENSE). Learning content: CC BY-SA 4.0 (see
`docs/process/content-licensing.md`).

Dictionary data derives from the MIT-licensed
[medzuslovjansky/slovnik](https://github.com/medzuslovjansky/slovnik) —
thank you to the Interslavic community for keeping the language open.
