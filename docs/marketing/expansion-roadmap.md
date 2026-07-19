---
id: mkt-0004
status: draft
depends-on: [adr-0029, adr-0035]
---

# Language expansion roadmap

Which language packs come after the Balkan wave, ranked by open-data
readiness against demand. The engine is language-agnostic (ADR 0029); each
pack is scored on demand, data availability, competitive vacuum, and how
well a seed community fits. The pipeline data bar, set by the Albanian
baseline, is roughly ≥8–10k Wiktionary senses (via kaikki) and ≥2.5k
Tatoeba sentences.

## Ranked next packs

Score is the sum of demand, data, vacuum, and community fit.

| Rank | Pack                               | Score             | Notes                                                                                                                                                                                                                                           |
| ---- | ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Serbian / BCMS                     | 18                | kaikki 91,544 senses (Serbo-Croatian merged), 52k Tatoeba sr (+78k hr/bs). Ship as one BCMS pack: Serbian core, hr/bs/me flavours, Cyrillic/Latin and ekavian/ijekavian derived — the Govori twin. Community model, DACH Gastarbeiter diaspora. |
| 2    | Armenian                           | 18                | 7M diaspora vs 3M home; 29k senses, 51k Tatoeba. Unique script = an onboarding module. Purest community model (churches, AGBU, diaspora schools). Western Armenian as a follow-on flavour.                                                      |
| 3    | Bulgarian                          | 17                | 74k senses, 26k sentences. EU language, 1.25M abroad, only Mondly competes and shallowly. Best commercial-pack economics; shares Cyrillic tooling with BCMS.                                                                                    |
| 4    | Macedonian                         | 17                | 77k senses, 78k sentences, zero competition anywhere. Community sibling riding the Balkan-Slavic investment.                                                                                                                                    |
| 5–8  | Kurmanji, Georgian, Kazakh, Slovak | 16 / 15 / 15 / 15 | Kurmanji data mid (8k senses, 10k sentences); Georgian rides the relocation wave; Kazakh rises with state derussification; Slovak has elite data.                                                                                               |

**Wave-2 bets:** Kazakh and Georgian, on rising demand. Luxembourgish is
worth force-unblocking despite missing frequency and sentence data — the
citizenship-test market pays.

## Blocked list and the thin-data playbook

Demand is real but data falls short for: Punjabi, Tamil, Telugu, Malayalam
(lexicons fine, Tatoeba under ~900), Sorani (12.7k sentences but only 1.6k
senses), Hausa (21.8k sentences, 2.7k senses), Uzbek, Amharic, Tigrinya,
Somali, Yoruba, Igbo, Twi, Wolof, Pashto, Tajik, Kyrgyz, Sinhala, Lao,
Quechua, Burmese, Maltese, Faroese, and Nepali.

None of these is permanently blocked. The thin-data playbook degrades
gracefully rather than waiting for a full corpus:

- **Starter-pack launches.** The planner degrades to words, phrases, and
  morphology only, labelled "growing," instead of pretending to a full
  course.
- **Generate and gate.** Fact-grounded generation fills gaps through the
  human-gated pipeline with originality auditing (ADR 0035).
- **Lexicon fills** from PanLex and Wikidata lexemes.
- **Upstream sentence drives** on Tatoeba to lift a language over the
  sentence bar.
- **Public-domain skeletons** from FSI / DLI / Peace Corps course material.

## Source stack

The aggressive open-data stack, triaged by license so the free/paid
boundary (ADR 0047) stays machine-checkable per item:

| Tier      | License             | Sources                                                                     | Use                                        |
| --------- | ------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| tier 0    | CC0 / public domain | PanLex, Wikidata lexemes, FSI/DLI/Peace Corps courses + audio, Common Voice | May feed the paid track                    |
| tier 1    | CC BY               | Tatoeba, Global Voices                                                      | Attribution only                           |
| tier 2    | CC BY-SA            | kaikki (Wiktionary), UniMorph, UD treebanks, Wikivoyage                     | Share-alike, free layer                    |
| tool-only | GPL                 | GPL-licensed dictionaries and tooling                                       | Tooling only; data never enters the corpus |

## Halo projects

Chartered for cultural rather than commercial reasons:

- **Old Church Slavonic** for the Govori family — the historical anchor of
  the Slavic packs.
- **Arbëresh** (ISO 639-3 `aae`) for the Fol family: ~70–100k speakers
  across ~50 southern-Italian villages, UNESCO-endangered, with Italian
  legal minority status (legge 482/1999) and an archaic Tosk base plus its
  own traditions. It earns its own small pack for identity, not variant
  notes. Data is thin, so it runs on the starter-pack playbook plus
  public-domain 19th-century literature (De Rada and peers) and community
  contribution. The framing is preservation and non-commercial. The seed
  ring overlaps existing plans — Arbëresh cultural associations and the
  Palermo/Calabria academic chairs — and the Italian UI already ships.
  Strategically it cements Fol's credibility with the Italian diaspora and
  has geographic synergy with the Italian-dialects track. Timing: after
  core Fol traction.

## Exotic tracks

Built after the Balkan wave, each on a starter-pack or variant-note hybrid:

- **Dead languages — Latin-first.** Latin is the flagship, followed by
  Ancient Greek, Old Norse, and Sanskrit, with Old Church Slavonic as the
  Slavic halo.
- **Constructed languages.** Toki Pona is the candidate; never a
  franchise-IP conlang.
- **Dialects.** Swiss German as a standalone pack, plus German and Italian
  dialects: Bavarian and its neighbours; Neapolitan, Sicilian, and Venetian
  (real diaspora demand, UNESCO-recognized) delivered through a
  starter-pack + variant-note hybrid. Other dialects stay as Gheg-model
  variant notes.

## Caveats

- Babbel and Busuu cover only ~14 major languages, so "uncovered" is
  measured against Duolingo's ~40.
- Tatoeba counts above are totals; verify English linkage before
  committing.
- kaikki sense counts understate form yield for template-rich languages —
  BCMS and Bulgarian form counts should exceed Albanian's ~88k.
- Re-verify the hermitdave frequency-list license (CC BY-SA 4.0 per the
  repository) before shipping any pack that leans on it.
