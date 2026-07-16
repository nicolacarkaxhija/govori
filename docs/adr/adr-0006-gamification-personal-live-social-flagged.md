---
id: adr-0006
status: accepted
depends-on: [adr-0025]
---

# 0006 — Personal gamification live; social mechanics behind a flag; no punitive mechanics

## Context

Gamification drives retention but is also the most common source of "engagement-maximizing bloat" that drifts focus away from learning. The team's standing design philosophy rejects feature theater and punitive mechanics (e.g. Duolingo-style hearts/lives) while accepting retention mechanics that genuinely serve learning.

## Decision

Personal gamification ships live at launch: streaks with freeze, daily goal, XP, badges, a stats heatmap, and opt-in reminders. Social mechanics — leaderboards, leagues, follows — are built but shipped behind a feature flag, OFF until critical mass of users is reached (see 0025, 0033 for the flip threshold). Hearts/lives or any punitive mechanic are rejected permanently, not just deferred.

## Consequences

- Learners get retention support without exposure to an empty social graph at launch.
- Social features are implementation-complete and ready to flip once usage data justifies them (see 0033).
- "No hearts/lives ever" is a hard product boundary, not a flag — it removes a whole category of future feature requests from consideration.
- Flag dependency graph must express that leaderboards/leagues depend on social being enabled, which itself depends on accounts (see 0025).

## Alternatives considered

- Ship social features live at launch — rejected: leaderboards/leagues are meaningless without critical mass and risk becoming a ghost-town feature.
- Include punitive mechanics (hearts/lives) for retention — rejected outright as feature theater that trades learning focus for engagement metrics.
