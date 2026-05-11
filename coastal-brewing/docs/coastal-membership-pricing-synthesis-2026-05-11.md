# Coastal Brewing Co. — Standard Membership pricing synthesis

**Date:** 2026-05-11
**Status:** OWNER-DECISION READY
**Inputs:** 4 parallel research agents (national DTC / local SC+GA market / grocery vendor / experience-frame synthesis)
**Decisions needed:** annual price band + membership name
**Background docs (in this PR or already committed):**
- `annual-membership-pricing-research-2026-05-10.md` — national DTC + adjacent
- `local-market-competitor-research-2026-05-10.md` — Coastal SC + GA
- `grocery-vendor-research-2026-05-10.md` — Publix / Walmart / Food Lion / Sam's / Kroger onboarding
- `standard-membership-pricing-brief-2026-05-10.md` — full-deliverable + agentic-experience frame

---

## TL;DR

The owner asked: "is $199/yr right?"

**Answer:** No. $199 is ~50-66% under-priced. Three of four research lenses converge on **$499-599/yr Standard tier** with anchor at $599-799 and a haggle landing zone of $499-549 via Sal/LUC/ACHEEVY's negotiation envelope.

The fourth lens (national DTC coffee benchmarks alone) suggested $149-249 — but that's because no national DTC coffee competitor has an agentic-experience layer to price against. We're not pricing against coffee; we're pricing against the agentic experience.

**Recommendation:**
- **Price:** anchor **$599/yr**, target landing **$499/yr** via the haggle envelope
- **Name:** **Coastal Custee Card** (or owner picks from list below)
- **Coupon:** `MEMBER_15` stays at 15% off retail (already shipped Phase 5)

---

## The pricing tension, resolved

| Lens | Recommended price | Reasoning | Verdict |
|---|---|---|---|
| National DTC coffee | $149-249/yr | Trade / Atlas / Onyx / Stumptown have NO annual-fee membership; coffee-category whitespace at the lower tier | Underprices the agentic stack |
| Local Coastal SC+GA market | $499-599/yr Standard | PERC ladder $23-46/bag, market accepts $25+ blends, ZERO local annual-fee competitor | ✓ aligns |
| Full-deliverable + agentic | $499/target, $799/anchor | Agentic adds 60-100% premium; Pooler median income supports easily; haggle IS the demo | ✓ aligns |
| Grocery vendor (channel-conflict check) | n/a — different channel | Grocery is $15.99-19.99 retail Tier-A only, never overlaps with membership-exclusive | No conflict |

**3 of 4 converge on $499-599.** The DTC lens looked at coffee-only benchmarks and stayed coffee-anchored. We're past coffee.

---

## Anchor + landing zone (per Coastal canon)

Per `reference_coastal_anchor_haggle_landing_canon_2026_05_09.md`: catalog MSRP is the **opening anchor**, not the final price. Sal / LUC / ACHEEVY / Melli haggle Custees down to the LANDING zone. The haggle conversation IS the licensee proof-of-concept demo.

For Standard Membership:

```
ANCHOR PRICE:    $599/yr  (catalog list, "regular price")
                  ↓
LANDING ZONE:    $499/yr  (Sal's first counter, "I'll meet you at $499 if you commit today")
                  ↓
FLOOR:           $399/yr  (LUC's authority — only with locked-in 12-month auto-renew + 2-referrals-attached pre-commit)
                  ↓
ACHEEVY override: $349/yr (digital-twin authority for narrative-fit edge cases)
```

This puts the negotiation envelope at **$200/yr range** (33% off anchor) — generous enough to feel like a real negotiation, tight enough to protect margin.

---

## Local-market evidence (most direct)

From `local-market-competitor-research-2026-05-10.md`:

- **Three Tree Coffee** is the only physical specialty roaster in Pooler proper. No annual product. Coastal owns the "we visit you in Pooler" radius **uncontested**.
- **PERC Coffee (Savannah)** — largest direct competitor. Full price ladder $23-46. Recurring sub + 6-month gift sub. **No annual membership.**
- **Charleston Coffee Roasters** — runs the canonical "Subscribe & Save 15% + free ship $40+" pattern. No annual.
- **Second State Coffee (Charleston)** — confirms the premium ceiling exists. Sells $167/kg specialty.
- **Per-bag medians in Coastal SC/GA:** $17-22 blends, $22-30 single-origin, $33-46 premium ceiling.
- **Annual membership = white space** — zero of 10 scraped local roasters offer one.
- **Local Standard-tier estimate:** $499-599/yr (research agent's direct read)

Coastal at $599 anchor / $499 landing isn't an outlier — it's the **only player** in this geography offering an annual-membership product at all. First mover.

---

## Why $199 was wrong

- **Underprices the agentic experience.** Sal_Ang voice, live 2D look-in to Pooler floor, Melli's Sett research, the haggle conversation, hand-pack from Sal — none of those are coffee-pricing inputs.
- **Underprices Pooler-specific community access.** "We visit you locally" is unique to Coastal in this radius. Worth $100+/yr alone.
- **Leaves no room for the haggle envelope.** $199 anchor → $149 landing is a $50 envelope. That's not a negotiation — it's a discount code. The licensee demo wants $599 → $499 ($100 envelope) at minimum.
- **Mismatches the welcome box value.** A $45-retail welcome box at $199 fee = 22% of fee in CAC absorbed. At $499 fee = 9%. The lower price makes welcome box CAC eat into operating room.
- **Anchored to Blackbird's $199** — but the DTC research found Blackbird's actual breakfast pass is $75/yr and the $199 figure was likely from a different surface (Inside Blackbird Creator Plan). The original anchor was wrong.

---

## Membership name — owner picks one

The DTC research surfaced that "Blackbird" was a pattern reference, not a name to copy. Coastal needs its own canonical name. Five candidates:

| Option | Anchor | Notes |
|---|---|---|
| **Coastal Custee Card** | Custeez canon | Direct, brandable, mirrors existing customer term ("Custeez") |
| **Coastal Co. Card** | Brand wordmark | Clean, mirrors `Coastal Brewing Co.` exactly |
| **The Pooler Pass** | Geographic / local pride | Emphasizes the "local visit" differentiator; less scalable to licensees |
| **Coastal Reserve** | Premium / catalog tier | Matches existing "Tier F Reserve" SKU naming |
| **The Stork Card** | Brand mark anchor | Pairs with the storefront-window-etching stork; ownable + memorable |

**My recommendation:** **Coastal Custee Card** (matches Custeez canon — "the card for the Custeez").

If owner picks a different name, swap throughout the membership spec + page copy + welcome page in one PR.

---

## Concrete next actions (owner-gated)

1. **Owner picks**: annual price (recommend $599 anchor / $499 landing) + membership name
2. **I update**: `coastal-standard-membership-spec-2026-05-10.md` with final price + name; `web/app/membership/page.tsx` button copy + tier table; `web/app/membership/welcome/page.tsx`
3. **I update**: the in-runner `MEMBERSHIP_PRODUCT_ID` constant + the runbook env var name to match
4. **Owner registers** in Stripe dashboard: Product `Coastal [Name]` at $599/yr recurring → copy `price_XXX` → set env on aims-vps
5. **Owner registers** in Stripe dashboard: Coupon `MEMBER_15` (15% off, forever, restricted to Customers with `membership_tier` metadata)
6. **Smoke-test live** per the Phase 6 runbook
7. **Then** wire `discount_for(customer.metadata)` into the existing escalation + order-intake checkout creators (Phase 5b — separate PR after live verification)

---

## Side-channel: grocery vendor opportunity

From `grocery-vendor-research-2026-05-10.md`:

- **Single funnel: RangeMe.com** for all 5 retailers (Publix / Walmart / Food Lion / Sam's / Kroger)
- **Top 2 fits at current scale:** **Food Lion Local Goodness** (GA in-footprint, lowest barrier) + **Publix** (Pooler is home region; Kahwa Coffee Tampa is the proven precedent)
- **Wholesale floor: ~$9.50-10/12oz** to land at $15.99 retail with 38% retailer margin
- **First action:** Apply to Food Lion Local Goodness via RangeMe. Pre-reqs: GS1 UPCs (~$250), $1M/$2M product liability insurance, sell sheet with case pack
- **Channel-conflict play:** 3-tier SKU partition (grocery $15.99-19.99 blends only / DTC standard $24.99 Tier-A / membership-exclusive Habbak + single-origins, never on retail)

Grocery doesn't compete with membership — they're different SKUs and different channels. Membership stays premium / exclusive; grocery shelf is the awareness funnel that drives Custees to look up Coastal Brewing Co. and discover the membership.

This is a **separate workstream**. Owner picks if/when to apply to Food Lion. ~2-week prep before application is ready.

---

## Side-channel: Mercury bank for B2B + licensee invoicing

From the DTC agent's bonus finding:

- **Stripe stays** for retail Custee checkout + annual membership recurring
- **Mercury added** for B2B wholesale invoicing (Melli's catering, licensee billing tiers $2.5K-$500K/mo)
- Mercury has an official MCP — read-only, OAuth per session
- **Cannot replace Stripe for retail or recurring** today (no hosted checkout, no recurring API)

Owner-gated. Recommend wiring `Lil_Mercury_Hawk` (read-side first) when the second vertical or the first licensee deal closes. Until then, Stripe handles everything.

---

## Open questions for owner

1. **Annual price**: $499 (recommended landing) or $599 (recommended anchor) or different?
2. **Membership name**: Coastal Custee Card / Coastal Co. Card / Pooler Pass / Coastal Reserve / Stork Card / something else?
3. **Welcome-box dripper**: still ceramic V60-style, or upgrade given the higher price point? (Could swap to a Kalita Wave or Coastal-branded ceramic mug.)
4. **Grocery move**: green-light Food Lion Local Goodness application now, or after membership goes live?
5. **Lifetime tier price-anchor adjustment**: if Standard goes to $599/yr, do the Lifetime tiers ($999 once / $4999 once) still feel right, or does Lifetime move to $1499 / $5999 to maintain the spread?

---

*Made in PLR · Coastal Brewing Co.*
