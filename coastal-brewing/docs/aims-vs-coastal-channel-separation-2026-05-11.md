# AIMS vs Coastal — Channel Separation Canon

**Date:** 2026-05-11
**Status:** CANON — owner-ratified
**Pair docs:**
- `lifetime-tier-positioning-2026-05-11.md` (lifetime is for technology, not beverages)
- `aims-sdk-licensee-ratified-2026-05-11.md` (the 7 owner answers + two-deal structure)
- `aims-sdk-ltd-2025-2026-trends-2026-05-11.md` (price band research)
- `cbrew-369-pricing-canon-2026-05-11.md` (Coastal beverage 3-6-9 cadence)

---

## TL;DR

Coastal Brewing Co. has TWO businesses that share a brand but **do not share a sales channel**:

| Business | What | Channel | Pricing model |
|---|---|---|---|
| **Coastal beverages** (coffee, tea, functional drinks) | The proof-of-concept retail business | `brewing.foai.cloud` (+ Amazon Marketplace, Hostinger Ecommerce) | 3-6-9 monthly subscriptions + pay-as-you-go one-off; Pooler Pass / Custee Card / Wood Stork annual tiers |
| **AIMS technology** (Plug-Me-In SDK / lifetime + 1-year managed deals) | The licensable agentic platform | **AppSumo portal only** | Pay-once lifetime + pay-once 1-year managed |

**The AIMS lifetime and 1-year managed deals are AppSumo-channel-exclusive.** They are NOT sold on `brewing.foai.cloud`. They do NOT appear on any beverage page. They have NOTHING to do with the coffee, tea, or functional drinks.

## What's on `brewing.foai.cloud`

**Beverage surfaces (all 3-6-9 cadence + pay-as-you-go):**
- `/membership` — Coastal Custee Card ($199/yr)
- `/pooler-pass` — Pooler Pass Standard / Plus
- `/wood-stork` — Wood Stork Standard / Reserve (B2B beverage tier)
- `/compare` — comparison vs other coffee brands
- `/products` — retail catalog
- `/pricing` — beverage pricing

**`/partners`** — the AIMS technology offering is **MENTIONED** here as an awareness surface only:
- Describes what AIMS / Plug-Me-In is
- Explains who it's for (licensees wanting to deploy the agentic stack)
- Links OUT to AppSumo for the actual purchase
- Does **NOT** display lifetime / 1-year deal prices
- Does **NOT** include a Buy button or checkout flow

The `/partners` page may have TWO distinct sections going forward:
1. **Beverage partner program** (existing) — coffee shops licensing Coastal beverages + supply chain
2. **AIMS technology partner program** (new section) — licensing the agentic platform via AppSumo

These are different offerings to different audiences. Both can co-exist on `/partners` but their copy + CTAs must be clearly separated so customers don't conflate them.

## What's on AppSumo

AppSumo portal hosts **only** the AIMS technology deals:
- Lifetime deal (pay-once, lifetime engine access with "subject to change" disclaimer)
- 1-year managed deal (pay-once, 12 months premium SLA + onboarding; engine access continues under lifetime terms after)
- T1 Starter / T2 Growth / T3 Enterprise tier ladder
- BYOK Gemini 3.1 Flash Lite + AIMS GUI in Deploy Platform
- SDK/ADK template only — no Coastal product data, no live AIMS pricing matrix

The AppSumo listing copy may reference Coastal Brewing Co. as **the live retail dogfood** that proves the platform works. But the listing IS NOT selling coffee or tea — it's selling the platform that runs Coastal.

## Two distinct uses of "licensee" / "partner"

| Term in Coastal context | Term in AIMS context |
|---|---|
| **Beverage licensee** — coffee shop / brand licensing Coastal beverage brand + supply chain. Surface: `/partners` beverage section. | **AIMS technology licensee** — business buying the agentic platform stack to deploy under their own brand. Surface: AppSumo (with awareness teaser on `/partners`). |
| Wood Stork tier mentions "licensee prospects, largest accounts" — these are beverage-business-scale B2B accounts (multi-location buyers, corporate accounts) | AIMS T3 Enterprise mentions whitelabel — these are technology licensees |

These two never overlap in pricing, channel, or audience. A beverage licensee buys coffee bags + supply chain access. An AIMS technology licensee buys the SDK to run their own business under their own brand.

## What NEVER happens

- Lifetime or 1-year managed deals on any beverage surface (`/membership`, `/pooler-pass`, `/wood-stork`, `/compare`, `/products`, `/pricing`)
- AppSumo listing referencing coffee SKUs, beverage prices, or 3-6-9 cadence
- Cross-channel discount stacking (an AIMS technology buyer does NOT get MEMBER_15 on coffee unless they ALSO bought a beverage tier)
- Marketing copy that conflates "buy our coffee membership" with "buy our technology"
- A Buy button for the AIMS deal anywhere on `brewing.foai.cloud`

## Why this separation matters

1. **Pricing-model clarity.** Beverage = recurring (3-6-9 cadence). Technology = pay-once (AppSumo style). Mixing them on one page confuses buyers and creates billing-system complexity.
2. **Audience clarity.** A coffee customer is not necessarily an AIMS buyer. An AIMS buyer doesn't care about Coastal's roast profile.
3. **Channel economics.** AppSumo takes 5%/30% fee. The Coastal site does not. We don't want to push coffee customers through AppSumo's economics or technology buyers through brewing.foai.cloud's checkout.
4. **Legal / TOS separation.** Beverage TOS covers consumables + shipping. AIMS TOS covers software licensing + "subject to change" disclaimer. Single page = single TOS = scope confusion.

## Surfaces audit (2026-05-11)

Verified clean:
- `web/app/membership/page.tsx` — no AIMS-deal references (uses "licensee prospects" in beverage context only)
- `web/app/wood-stork/page.tsx` — no AIMS-deal references (uses "First-look licensee pricing" in beverage context only)
- `web/app/pooler-pass/page.tsx` — clean
- `web/app/compare/page.tsx` — clean
- `web/app/partners/page.tsx` — AIMS Partner Program copy refers to beverage partnership (supply chain + brand + technology layer for beverage brands). Does NOT advertise AIMS technology lifetime/1-year deals. **Eligible for a new section adding the AIMS technology partner offering when owner greenlights.**

## What this doc is NOT

- Not a new product spec — the AIMS-SDK product already specced in sibling docs
- Not a /partners redesign — that's owner-gated
- Not a Coastal beverage pricing change — beverages stay 3-6-9 + pay-as-you-go

---

*Made in PLR · Coastal Brewing Co. (beverages) · AIMS technology stack (AppSumo)*
