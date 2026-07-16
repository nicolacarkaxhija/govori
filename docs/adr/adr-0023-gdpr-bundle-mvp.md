---
id: adr-0023
status: accepted
depends-on: [adr-0021, adr-0022]
---

# 0023 — GDPR bundle at MVP: minimization, self-serve deletion/export, no trackers, EU hosting

## Context

Operating in the EU with real user accounts requires GDPR compliance from day one, not retrofitted after launch when it is far more disruptive and legally risky. The project also wants to avoid the friction and trust cost of a cookie-consent banner.

## Decision

GDPR compliance ships as a full bundle at MVP: EU-only hosting, backups, and email; data minimization (only email plus an optional display name is collected; age is 16+, self-declared); self-serve account deletion and JSON data export; session-cookie-only usage (avoiding the need for a cookie banner); self-hosted, PII-scrubbed Umami analytics and GlitchTip error tracking; opt-in reminders; and a versioned, plain-language privacy policy and ToS.

## Consequences

- No cookie-consent banner needed, because no non-essential cookies or third-party trackers are used — a direct UX win.
- Self-hosted analytics/error tracking (Umami, GlitchTip) avoids sending user data to third-party processors, simplifying compliance and hosting decisions (see 0020, 0027).
- Self-serve deletion/export must reconcile with the CC BY-SA content-licensing policy (see 0010): deleting an account pseudonymizes rather than deletes contributed content, and this must be stated plainly in the ToS.
- Building the full bundle at MVP is more upfront work than deferring pieces, but avoids a legally risky retrofit once real user data exists.

## Alternatives considered

- Defer GDPR work post-launch — rejected: legally risky and far more disruptive to retrofit once accounts and data exist.
- Third-party analytics (e.g. Google Analytics) — rejected: conflicts with EU-only hosting and data-minimization goals, and would require a consent banner.
