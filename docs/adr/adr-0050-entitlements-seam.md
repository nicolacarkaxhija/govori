---
id: adr-0050
status: accepted
depends-on: [adr-0047, adr-0048]
---

# 0050 — The entitlements seam

## Context

ADR 0047 chartered freemium for the instances that adopt it: a
provenance-split free/paid boundary, a core-course-free guarantee, and
per-CEFR-level lifetime unlocks with published price bands. It left the
mechanism unbuilt and named its two moving parts — an entitlements module
and payments (a merchant of record for EU VAT plus store in-app purchase)
— as work for "when the day comes."

That day is not payments day. But the entitlements module can and should
exist first: the data model for who holds what, and the gate that decides
whether a piece of content is served, are independent of how a purchase is
taken. Building the seam now lets founder grandfathering (ADR 0047),
seed-ring teacher grants (ADR 0047), and contribution rewards (ADR 0048)
land through one honest path, and lets the gate ship inert until premium
content and payments arrive.

## Decision

- **A pure entitlements domain.** `@glotty/entitlements` owns the model: an
  `Entitlement` is `{ userId, sku, grantedAt, source }` where `source` is
  `purchase | founder | contribution`. `resolve(entitlements, userId, sku)`
  answers holding as timeless set membership — a lifetime unlock never
  expires (ADR 0047), so there is no clock and no validity window.
- **A permissive-by-default content gate.** `gate(content, holds)` reads a
  single boundary, `premiumSku`. Content that declares none is free — the
  core-course-free guarantee and the state of every item today — and the
  ledger is never even consulted for it. Content that declares a SKU is
  served only to a holder. The gate is wired into the live serving path
  (`/items/:id`) but stays inert because nothing sets a `premiumSku` yet;
  it activates the day content carries one.
- **The api owns persistence and the grant path.** An `entitlements` table
  keyed per user and SKU backs a port and Drizzle adapter; grants are
  stamped server-side and idempotent per (user, SKU). `GET /me/entitlements`
  returns a viewer their own holdings. `POST /admin/entitlements` is the
  founder/manual grant path — admin-only. It is how founding users and
  seed-ring teachers receive premium today.
- **Payments are deliberately out of scope.** No merchant of record, no VAT
  handling, no store in-app purchase, no `purchase` grants from any
  automated flow. Those are a later ADR; the `purchase` source exists in
  the model so the seam does not move when they land. Free instances never
  load payments, and until then never load a grant path a user can reach.

## Consequences

- The free/paid boundary is machine-checkable at the serving edge, and the
  grant ledger is an auditable record of every manual entitlement.
- Founder grandfathering, teacher seed grants, and contribution rewards all
  flow through one grant path instead of ad-hoc flags.
- The gate carries a real cost — a per-read entitlement consideration on
  gated content — but pays nothing for free content, which is all content
  today.
- ADR 0047's price bands stay provisional; this ADR fixes no prices.
- Activating premium is a deliberate, reviewable change: give a piece of
  content a `premiumSku`, and the already-wired gate begins enforcing it.

## Alternatives considered

- **Build payments now** — rejected: premature. ADR 0047 defers the
  merchant-of-record and store-purchase work to charging day; the seam does
  not need it to exist, and coupling them would block the module on
  payments integration.
- **Gate by role instead of entitlement** — rejected: entitlements are
  per-SKU lifetime unlocks, not a trust tier. Roles (ADR 0008) already mean
  something else; overloading them would conflate moderation power with
  purchases.
- **A default-deny gate** — rejected outright: it would put content behind
  payment by default and break the core-course-free guarantee the moment it
  shipped. Free-by-default is the covenant; premium is the exception a SKU
  declares.
