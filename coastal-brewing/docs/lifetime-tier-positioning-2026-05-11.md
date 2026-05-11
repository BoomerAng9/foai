# Lifetime Tier Positioning — Canon Update 2026-05-11

> Owner directive 2026-05-11. This document is canon. All prior references to
> Lifetime Member / Lifetime Concierge as Coastal Custee retail tiers are
> superseded.

## TL;DR

**Lifetime tier = AIMS / Plug-Me-In licensee tier (TECHNOLOGY), NOT a Coastal Custee tier (BEVERAGES).**

Coastal Brewing Co. coffee, tea, and functional beverages do NOT have a lifetime
deal. Membership tiers for beverages are annual / subscription only.

The lifetime-deal mechanic now belongs to the underlying technology stack — the
AIMS platform / Plug-Me-In SDK that licensees can deploy under their own brand.

## Owner quote (source of truth)

> "Lifetime deal is for the technology behind Coastal Brewing Co. So if a
> customer wants to use this technology, they can offer the [...] Lifetime
> deal. So for that, you'll look at AppSumo dot com [...] But for the
> beverages, for the coffee and tea, and functional coffees and teas, we don't
> need a lifetime deal for that because we may not need the business in a year
> or less. So the lifetime deal is for the technology."
>
> — Owner, 2026-05-11

## Why

1. **Beverage business horizon uncertainty.** Coastal Brewing Co. is the
   proof-of-concept storefront for the AIMS / Plug-Me-In platform. The
   beverage business itself may not extend beyond a year. Selling a
   lifetime-of-the-beverage-business deal makes no sense when the lifetime is
   undefined.

2. **Lifetime is a sound proposition for technology.** AIMS / Plug-Me-In is
   the durable IP. A licensee buying a lifetime deal on the technology is
   buying the platform — voice-agent stack, billing matrix, white-label
   surface, ACHEEVY orchestration — to deploy under their own brand.
   AppSumo-style packaging (one-time payment, lifetime access to the SDK +
   updates) is a well-understood market motion for this type of buyer.

3. **Separates the proof-of-concept from the product.** Coastal is the demo.
   AIMS / Plug-Me-In is the product. Pricing structure should mirror that
   split.

## Coastal Custee tiers (what's left)

Per `cbrew-369-pricing-canon-2026-05-11.md` and `cbrew-tier-mechanics-spec-2026-05-10.md`:

| Tier | Annual price | Cadence | Audience |
|---|---|---|---|
| Pooler Pass Standard | $89.88/yr (3-6-9) | annual | Local 50-100 mi from 31322 |
| Pooler Pass Plus | $179.88/yr (3-6-9) | annual | Local power-buyers |
| Coastal Custee Card | $199/yr | annual | National DTC + Amazon (default) |
| Wood Stork Standard | $499/yr | annual | B2B, multi-location, referrers |
| Wood Stork Reserve | $999/yr | annual | Licensee prospects, largest accounts |

All beverage tiers are annual / subscription. No lifetime. No one-time.

## AIMS / Plug-Me-In Lifetime tier (where lifetime moved to)

- **What it is:** one-time payment for lifetime access to the AIMS platform
  stack — Plug-Me-In SDK, ACHEEVY orchestration, billing matrix, voice agents,
  white-label brand surfaces.
- **Who buys it:** licensee brands (coffee chains, retail brands, hospitality
  groups) who want to deploy the AI-managed-retail stack under their own name.
- **Packaging reference:** AppSumo-style lifetime SDK / platform deal.
- **Pricing:** TBD. See `appsumo-lifetime-sdk-research-2026-05-11.md` for
  packaging research (sibling doc).
- **Distribution surface:** `plug-me-in.cloud` + AppSumo marketplace listing
  (planned).
- **Status:** positioning ratified 2026-05-11. Price / package contents
  pending owner ratification of research output.

## Grandfathered customers

Any Coastal Custee who purchased the legacy Lifetime Member ($999 once) or
Lifetime Concierge ($4,999 once) tier BEFORE 2026-05-11 retains their tier
benefit. The Stripe Customer metadata `membership_tier` keys
`lifetime_member` and `lifetime_concierge` remain recognized in
`scripts/membership.py::MEMBER_TIERS` so MEMBER_15 auto-coupon continues to
apply for existing records.

No NEW Coastal customers may be assigned `lifetime_member` or
`lifetime_concierge` tier keys. New signups go through the annual /
subscription tier ladder (Pooler Pass / Coastal Custee Card / Wood Stork).

Active migration of grandfathered customers off these tier keys is pending
owner ratification — until then, no change to existing customer experience.

## Surfaces touched 2026-05-11 (Lifetime references stripped)

- `web/app/membership/page.tsx` — tier comparison table + footer text
- `web/app/compare/page.tsx` — Account Assistant Lifetime Concierge reference
- `docs/coastal-billing-matrix-spec-2026-05-09.md` — Dimension 7 retired
- `docs/coastal-standard-membership-spec-2026-05-10.md` — comparison table + §6 language
- `docs/cbrew-tier-mechanics-spec-2026-05-10.md` — tier table rows
- `docs/annual-membership-pricing-research-2026-05-10.md` — research table rows
- `docs/coastal-media-production-prd-2026-05-10.md` — pricing-dim table row
- `docs/2d-live-look-in-design-2026-05-10.md` — `/live` middleware gate text
- `docs/cbrew-369-pricing-canon-2026-05-11.md` — discount-stack table row
- `docs/coastal-membership-pricing-synthesis-2026-05-11.md` — open question marked RESOLVED
- `docs/coastal-membership-stripe-runbook-2026-05-11.md` — Lifetime mentions reframed
- `~/brain.md` — tier table + AIMS section line
- `~/soul.md` — added to "What We Don't Do"

## Surfaces NOT touched (intentional preserves)

- `scripts/membership.py` — `MEMBER_TIERS` frozenset keeps `lifetime_member` +
  `lifetime_concierge` for grandfathered Stripe Customer records; deprecation
  comment added.
- `tests/test_membership_referral.py` — `test_is_member_recognizes_grandfathered_lifetime_tiers`
  (renamed from `_lifetime_tiers`) still asserts these tier keys count as
  members.
- Generic "lifetime value" / "long-tenure" / "running lifetime total" prose
  across `docs/negotiation-envelope-spec-2026-05-09.md`,
  `docs/team-deliberation-ux-spec-2026-05-09.md`,
  `docs/cbrew-tier-mechanics-spec-2026-05-10.md` (cumulative-count semantics)
  — these are LTV / accounting usages of the English word "lifetime", not the
  retired product tier.

## Cross-references

- `appsumo-lifetime-sdk-research-2026-05-11.md` — AppSumo packaging research
  (parallel agent output; AIMS-side, sibling doc)
- `cbrew-369-pricing-canon-2026-05-11.md` — Coastal beverage tier pricing
  canon (3-6-9 cadence)
- `cbrew-tier-mechanics-spec-2026-05-10.md` — Wood Stork referral mechanics
- `coastal-billing-matrix-spec-2026-05-09.md` — 8-dimensional billing matrix
  (Dimension 7 retired by this doc)

---

*Made in PLR · Coastal Brewing Co. · positioning canon 2026-05-11*
