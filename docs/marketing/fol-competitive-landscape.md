---
id: mkt-0003
status: draft
depends-on: [adr-0044, adr-0047]
---

# Fol competitive landscape

The Albanian learning market, scanned for where Fol wins. The short
version: the mass-market apps do not teach Albanian at all, the paid
specialists that do are thin and closed, and nobody owns the position of a
serious open, community app for the Albanian diaspora. Fol's strategy is
to turn each incumbent's documented weakness into one of its own values,
and to acquire through a genuinely excellent free tier before converting
to paid (ADR 0047).

## The majors do not serve Albanian

Duolingo, Babbel, Rosetta Stone, Busuu, and Drops offer no Albanian course
at all. Duolingo shut down its volunteer-contributor route in 2021, so the
crowdsourced path that once produced long-tail languages is closed. The
field is left to a handful of specialists.

## The specialist field

| Product                            | Tier | Documented weakness                                            |
| ---------------------------------- | ---- | -------------------------------------------------------------- |
| Ling (Simya Solutions)             | Paid | ~$80/yr; shallow, "cookie-cutter" content, thin grammar        |
| Pimsleur                           | Paid | Audio-only ceiling of ~10 lessons / ~5 hours                   |
| Mondly / uTalk                     | Paid | Phrase-thin, essentially no grammar instruction                |
| Glossika                           | Paid | Not live for Albanian                                          |
| 50languages                        | Free | CC BY-NC-ND — non-commercial, no-derivatives; phrasebook depth |
| Edualb                             | Free | Gheg-only; long-tail (~43 ratings)                             |
| GroVo                              | Free | Narrow scope                                                   |
| Memrise community decks            | Free | No quality assurance                                           |
| [Meso!Shqip](https://msoshqip.com) | Free | Aimed at diaspora children; not a modern app                   |

Meso!Shqip is the closest heritage-oriented competitor, and it is a
children's resource rather than a modern learning app.

## The unserved intersection

No product combines: free access, open CC-licensed data, community review
and voting, native and community audio, labelled Gheg respect, morphology
depth, and a heritage-speaker track. Nobody owns "the serious open
community app for the Albanian diaspora." That intersection is Fol's
opening.

## Diaspora market

The addressable heritage audience the incumbents leave unserved:

| Country       | Albanian heritage population (est.) |
| ------------- | ----------------------------------- |
| Italy         | ~440–480k                           |
| Germany       | ~317k (plus an estimated 350–500k)  |
| Switzerland   | 200–300k                            |
| United States | 224k–1M (wide estimate)             |
| Greece        | 400k+ Albanian community            |

Combined, well over 1.5M heritage learners nobody serves well — before
counting the inbound audience inside Albania and Kosovo (tourism, expats
and retirees, and growing Asian labour migration into construction,
hospitality, and delivery), which points at a separate "Albanian for work"
track and employer B2B channel.

## Three positioning claims

Each is truthful and evidenced:

1. **The only free, open-data Albanian app that treats Gheg with respect.**
   Everyone else is Tosk-only; Gheg appears as labelled contrastive variant
   notes, which is unique and hard to copy.
2. **Built for the heritage diaspora the big apps abandoned.** Duolingo
   declined the category; Fol is built for it.
3. **Community-driven depth where the commercial apps stay shallow.** This
   targets the documented "runs out of content / no grammar" complaints
   against Pimsleur, Mondly, and Ling.

## Threat model

The real incumbent to watch is **Ling** (Simya Solutions): it has
distribution (~18.8k ratings), owns the "no Albanian on Duolingo" search
intent, and has the resources to copy features quickly. Fol's moat is what
Ling cannot cheaply fake — open data, a genuine community with review and
voting, dialect respect, and shipping speed. The free tier must stay
genuinely excellent forever, because it is the weapon, and "learn Albanian
free" search intent is owned through the prerendered product shells (ADR
0043).

## Supporting notes

- **Tutor bench is thin.** italki lists roughly 23 and Preply roughly 45
  Albanian tutors, averaging about $22/hour — a shallow live-tutoring
  supply that leaves structured self-study underserved.
- **Grammar quality bar.** Colloquial Albanian (Routledge) is the
  reference standard Fol's grammar coverage is measured against.
