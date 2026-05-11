# AIMS / Plug-Me-In Licensee Deal — owner-ratified structure

**Date:** 2026-05-11
**Status:** RATIFIED (7 answers locked in; pricing-band research still running)
**Supersedes:** the 7 open questions in `appsumo-lifetime-sdk-research-2026-05-11.md` §5
**Pair docs:**
- `appsumo-lifetime-sdk-research-2026-05-11.md` (initial benchmarks)
- `aims-sdk-ltd-2025-2026-trends-2026-05-11.md` (running — 2025-2026 trends + Dealify + two-tier patterns + disclaimer mechanics)
- `lifetime-tier-positioning-2026-05-11.md` (canon — Coastal beverages have no lifetime; lifetime is for AIMS technology stack)

---

## The 7 ratifications

| # | Question | Owner answer | Implication |
|---|---|---|---|
| 1 | Source-code scope at T3 | **Whitelabel only** | No source code at any tier. Buyers get the engine + GUI; engine internals stay ours. |
| 2 | Resale rights | **Yes** | Buyers can resell licenses to their own customers. Multi-level distribution unlocked. |
| 3 | IVC voice ownership when buyer retrains | **Yes — buyers retrain their own** | BUT: buyers get **BYOK Gemini 3.1 Flash Lite** + an **AIMS platform GUI in Deploy Platform** to manage deployment + platform. We must build this GUI surface. |
| 4 | Coastal product-data carve-out | **No** | Buyers create their own vendor relationships, source their own products, build their own catalog. We ship the engine, never the Coastal dataset. |
| 5 | Support SLA — 5-year commitment | **NO five-year commitments. Two-deal model instead:** | One-year deal (higher price, full support) + lifetime deal (lower entry, "subject to change at any time" disclaimer). Owner: "We are in a different era. We don't go by five year commitments." |
| 6 | T2 stacking allowance | **Yes** | T2 codes stack for higher limits — standard AppSumo pattern. |
| 7 | AIMS-matrix interaction | **Template, not platform** | Buyers cannot use the AIMS 8-dim pricing matrix or our matrix. They get a **template** packaged inside the SDK/ADK and build their own pricing + their own vertical. "We're not shipping the entire platform." |

---

## Revised two-deal structure — BOTH PAY-ONCE

Replaces the prior 3-tier single-deal recommendation. **Critical clarification 2026-05-11**: BOTH deals are one-time payments, AppSumo-style. No recurring billing on either. The "1-year deal" buys 1 year of access with premium managed-service support; the "lifetime deal" buys lifetime access with the "subject to change" disclaimer. Customer pays once, never gets billed again on that purchase.

### Deal types (every tier offers both)

| Deal | Payment | Access | Support / SLA | Risk profile |
|---|---|---|---|---|
| **1-year deal (managed)** | One-time payment, HIGHER price | 12 months of access | Full premium SLA included for those 12 months (response-time tiers + onboarding + hands-on managed config) | Premium-tier buyer who wants a managed launch |
| **Lifetime deal** | One-time payment, LOWER entry price | Lifetime access "as long as we operate" | Best-effort only; no SLA. Disclaimer in TOS: "subject to change at any time" | Mass-market acquisition |

**Why is 1-year priced HIGHER than lifetime?** Because the 1-year deal is the *managed-service* offering — buyers pay for a premium onboarding + active support during their first year, not for the access itself. The lifetime deal is bare-bones engine access. Same engine, different service envelope.

### Tier structure (applies to both deal types)

| Tier | Verticals | Sub-accounts | Whitelabel | Stacking | Buyer surface |
|---|---|---|---|---|---|
| **T1 Starter** | 1 vertical | 1 admin | No | No | Hosted only |
| **T2 Growth** | 3 verticals | 5 sub-accounts | Yes | **Yes** | Hosted only |
| **T3 Enterprise** | Unlimited verticals | Unlimited sub-accounts | Yes | n/a (T3 is single-purchase) | Hosted + own-domain whitelabel |

**All tiers ship with:**
- BYOK Gemini 3.1 Flash Lite (buyer plugs their own Google API key — no LLM cost to us)
- AIMS platform GUI in Deploy Platform (buyer manages their deployment + tier mgmt + cadence config)
- SDK/ADK template (pricing matrix template, persona template, cadence template — buyer customizes)
- Resale rights (sell licenses downstream)
- Lifetime tier: "subject to change" disclaimer in TOS

**No tier ships with:**
- Source code (whitelabel = compiled binary / managed-cloud only)
- Coastal product data (SKUs, persona text, brand assets — buyers source their own)
- Coastal voice clones (Sal_Ang, LUC, Melli, ACHEEVY voices stay ours; buyers retrain)
- The live AIMS pricing matrix (buyers get template + build their own)

---

## "Lifetime with disclaimer" canon framing

Owner quote: *"We're not even doing a lifetime deal per se. The lifetime deal is what they say, but we're going to do lifetime deal with exceptions or with a disclaimer that this can change at any time."*

This is the **2025-2026 LTD reality** — not the historical "absolute lifetime" promise. Frame in customer copy as:

> **Lifetime access** — keep your license for as long as we operate the platform. Like every modern lifetime deal: we reserve the right to evolve pricing, support, and feature scope. You'll always have export rights for your data.

The disclaimer is a **product-design choice**, not a footnote — it lets us price the lifetime tier lower (mass-market acquisition) without taking on indefinite-support liability.

---

## Deploy Platform GUI — new workstream

Ratification #3 requires building an **AIMS platform GUI inside Deploy Platform** so buyers can:

- Manage their deployment (deploy / redeploy / rollback)
- Configure tier + cadence + branding
- Plug their BYOK Gemini key + verify it works
- Spin up sub-accounts (T2 / T3)
- View usage / billing / customer count

**Scope:** brand-new workstream — separate spec doc + multiple PRs. Recommend gating until owner ratifies the deal price bands, then dispatch a Code_Ang gate spec.

**Living spec:** `the-deploy-platform/DEPLOY/docs/aims-licensee-gui-spec-PENDING.md` (TBD — not yet created).

---

## What's still open

1. **Deal price bands** — `aims-sdk-ltd-2025-2026-trends-2026-05-11.md` agent running. Expecting recommended 1-year deal prices + lifetime deal prices per tier based on 2025-2026 market reality (AppSumo + Dealify + early-access platforms).
2. **Deploy Platform GUI spec** — separate spec doc + sprint plan. Owner-gated until deal prices land.
3. **TOS disclaimer language** — needs legal-passable phrasing for the "subject to change" lifetime clause. Recommend lawyer pass before any AppSumo / Dealify listing fires.
4. **Vendor template scope** — what exactly goes in the SDK/ADK template package? At minimum: pricing matrix template, persona/cast template, cadence config template, BYOK adapter for Gemini 3.1 Flash Lite, deployment scripts. Spec needed.

---

## What this doc is NOT

- Not the AppSumo listing copy — that comes after price bands are ratified
- Not the Deploy Platform GUI spec — separate workstream
- Not the legal TOS — separate lawyer pass
- Not a Coastal-beverage change — beverage tiers ($49/$99/$199/$499/$999 annual via 3-6-9) unchanged

---

*Made in PLR · Coastal Brewing Co. · AIMS technology stack*
