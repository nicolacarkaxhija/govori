---
id: adr-0048
status: accepted
depends-on: [adr-0004, adr-0040]
---

# 0048 — The community audio program

## Context

ADR 0004 built community audio in full and shipped it behind a flag that
is off at launch; ADR 0044 pre-committed Fol's flip trigger (ten active
contributors or the first teacher pilot). Flipping that flag turns audio
from a dormant feature into a data program: clips must be collected,
validated, and — for a low-resource language — potentially licensed,
while voice recordings are personal data under the GDPR. That program
needs a charter before the flag flips, and the storage schema needs to be
right from day one so no migration is required once the program activates.

## Decision

- **Two-tier collection.** A casual in-app tier lets any learner record
  clips for an item; the reward is premium time, framed as a shared
  mission, never a micro-payout. A studio tier runs guided, scripted
  sessions against a quality checklist; contributors are compensated
  through individual contracts (flat fee or revenue share). The studio
  tier builds a licensable multi-speaker speech corpus whose ASR/TTS value
  is real precisely because the language is under-resourced.
- **Validation reuses the voting machinery.** Recordings are validated
  through the ADR 0040 community-vote publish path — the same net-vote
  threshold, per instance, that decides text drafts.
- **Three separate consent grants, each independently opt-in.** (a) an
  app-use license; (b) inclusion in the commercial dataset pool, tied to
  revenue share or a premium boost; (c) inclusion in aggregate
  model-training corpora. Single-speaker voice cloning is never permitted.
  Withdrawing consent removes a speaker from future dataset versions;
  already-shipped versions are non-recallable, and that limit is disclosed
  up front. A contributor transparency dashboard and public
  dataset-revenue accounting keep the exchange honest.
- **Synthetic fallback, human-first.** The project may train its own
  multi-speaker synthetic-voice model on the consented corpus and serve
  it only as clearly labeled synthetic audio. A human recording always
  takes precedence over synthetic audio when one exists for an item.
- **Data-ready storage from day one**, independent of flag state: a
  pseudonymous speaker id, versioned consent records, an accent/dialect
  tag, item-linked transcript alignment, device and signal-to-noise
  metadata, dataset manifests, and deletion tombstones (the recording is
  removed, a tombstone is retained, and the shipped-version-non-recallable
  limit travels with it).
- **Lawyer review is required before the program launches.**

## Consequences

- The storage schema carries dataset-grade metadata even while audio is
  dark, so activating the dataset arm needs no migration.
- Three separate grants multiply consent UX and record-keeping, but keep
  ordinary app use cleanly separable from commercial exploitation and
  model training.
- Public revenue accounting becomes a standing transparency obligation.
- Studio contracts add real legal and operations work; the casual tier
  stays lightweight because it settles in premium time alone.

## Alternatives considered

- **Micro-payouts per clip** — rejected: administrative overhead, low
  dignity, and an invitation to gaming; premium time and studio contracts
  are cleaner instruments.
- **A single blanket consent** — rejected: bundling app use with the
  commercial pool and model training is not informed consent, and both the
  GDPR and the trust story demand the grants be separable.
- **Synthetic-first audio** — rejected: human recordings are the point of
  the program and the source of the corpus's value; synthetic audio is a
  labeled fallback only.
- **Single-speaker cloning** — rejected outright: it carries impersonation
  risk and is unnecessary for a multi-speaker corpus.
