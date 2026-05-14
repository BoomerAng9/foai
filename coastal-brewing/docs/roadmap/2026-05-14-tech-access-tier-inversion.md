# Tech-Access Tier Inversion — Canon Refresh

**Date:** 2026-05-14
**Status:** Phase 1D of the Circuit Box consulting-report prereq unblocks. Copy refresh only — NO Stripe re-pricing.
**Predecessor canon (still in force):**
- `~/.claude/projects/C--Users-rishj/memory/reference_coastal_5_tier_pricing_canon_2026_05_12.md` — pricing anchors + tier ids
- `~/.claude/projects/C--Users-rishj/memory/feedback_coastal_tier_monthly_retail_is_canon_anchor.md` — monthly retail = canon, NEVER derive from legacy annual
- `coastal-brewing/scripts/profitability.py` — `_TIER_ENVELOPES_CENTS_FALLBACK` (monthly discount envelope caps)

---

## 0. The inversion in one sentence

**A Coastal subscription is access to our team and tools. Product discounts apply within the subscription window — the deeper you commit, the deeper the discount, with a hard margin floor every SKU must clear.**

This re-frames the existing 5-tier ladder ($7.49 → $14.99 → $29.99 → $74.99 → $149.99) without changing a single Stripe price. What changes is the **lead value proposition** on every plan page and the order in which benefits are presented.

---

## 1. What changes — the positioning flip

### Before (coffee-bundle framing)

| Tier headline | Lead benefit |
|---|---|
| Pooler Pass | "Local membership: 12% off in-store, free local pickup" |
| Custee Card | "Pick the coffee, tea, matcha, or merch you want every month" |
| Wood Stork | "Multi-location buyers: referral discount up to 50%" |

Subscription presented AS the product (a coffee bundle), with team access as flavor text underneath.

### After (tech-access framing)

| Tier headline | Lead benefit |
|---|---|
| Pooler Pass | "Direct access to Sal at the counter + a member discount applied at checkout" |
| Custee Card | "A direct line to our team — Sal at the bar, Melli on wholesale, LUC at the curation desk — plus a member discount on every shipment" |
| Wood Stork | "Your business gets a named contact at Coastal and a monthly review — plus a discount that grows with the business you bring us" |

Subscription presented AS access (to a team that can negotiate, recommend, and act), with product discount as the recurring economic dividend.

The **3-stripped-benefits-per-page** pattern stays (memory `reference_coastal_5_tier_pricing_canon_2026_05_12`). Only the LEAD changes — and on the customer-facing pages, the benefit ordering reshuffles so access-to-team is the first bullet, discount-mechanism is the second, control (pause/swap/cancel) is the third.

---

## 2. What does NOT change

- **Stripe prices.** $7.49 / $14.99 / $29.99 / $74.99 / $149.99 monthly anchors stay. 9-month plan rates stay. Service-initiation fees stay.
- **Tier ids.** `pooler-pass-standard` / `pooler-pass-plus` / `custee-card` / `wood-stork-standard` / `wood-stork-reserve` per profitability.py canon.
- **Envelope caps** (`_TIER_ENVELOPES_CENTS_FALLBACK` in profitability.py):
  - Pooler Pass Standard: $15/mo discount envelope
  - Pooler Pass Plus: $30/mo
  - Custee Card: $60/mo
  - Wood Stork Standard: $150/mo
  - Wood Stork Reserve: $300/mo
- **Existing percentages.** Pooler Pass keeps its 12% at-counter discount. Wood Stork keeps its 18%→25%→35%→45%→50% referral-driven ladder. Coastal Custee keeps its current product-economic shape.
- **3-stripped-benefits ceiling on plan pages.** No new benefit lists, no feature creep. Just reordered + reframed.
- **Pause / swap / cancel** terms in §3 of every plan page.
- **Sacred Separation** — customer-facing copy NEVER names internal tool names, model names, vendor names, supplier names, infrastructure components. No "Lil_Hawk dispatch", no "Boomer_Ang access", no "Sqwaadrun research". Translate to customer-readable verbs.

---

## 3. The floor-discipline rule (load-bearing)

**Every SKU at every tier's discount level must still clear cost-of-goods + shipping + 5–8 percentage points of margin.** This is the floor.

Floor enforcement happens in two places:
1. **Envelope cap** (monthly $$ ceiling on discount stack per tier, in `profitability._TIER_ENVELOPES_CENTS_FALLBACK`)
2. **Per-SKU margin check** at checkout — implemented in the existing envelope gate on all 3 Stripe checkout endpoints (memory `reference_coastal_5_tier_pricing_canon_2026_05_12`)

If a customer's basket combined with their tier's discount would drop a SKU below cost+ship+5pt, the discount caps to the floor on that SKU. Customer sees a `Discount limited to X% on this product to keep us in business — your higher cap still applies to other items in your basket` line at checkout. (Implementation pending — call out in product backlog.)

**Marketing rule:** never advertise a maximum discount % as a guaranteed rate. Marketing copy says "up to 50%" (Wood Stork referral) or "member discount applied at checkout" (Pooler Pass / Custee Card / Wood Stork). The exact rate on a given basket = the floor-respecting cap, computed live.

---

## 4. Translation table — internal language → customer-facing copy

When you write copy that touches the agent surface, use the customer-facing column.

| Internal | Customer-facing |
|---|---|
| ACHEEVY (orchestrator) | "ACHEEVY" (publicly known voice and brand persona) |
| Sal_Ang | "Sal at the bar" / "Sal" |
| LUC | "LUC at the curation desk" / "LUC" |
| Melli (Capensi) | "Melli on wholesale" / "Melli" |
| Iller_Ang / Code_Ang / etc | NEVER surface to customer (operator-internal only) |
| Lil_Hawk dispatch | "Specialist research help" / "Our research desk" |
| Sqwaadrun | "Our research squad" / "Behind-the-scenes intelligence" |
| Boomer_Ang | "Our team" / "Our specialists" |
| NemoClaw / Hermes / OpenClaw | NEVER surface — these are runtime infra |
| Print_Press | "Our communication system" or just omit |
| The Sett / Badgers | "The marketing crew" |
| Roo's | "Our Pooler-shop floor team" |

The Pooler Pass page already correctly references Sal at the counter + member-only events. The Wood Stork page already references Melli + monthly review with ACHEEVY. Both are CONSISTENT WITH the new framing — they just need the LEAD reordered so access comes first.

---

## 5. Pages refreshed in this PR

| File | Lead before | Lead after |
|---|---|---|
| `web/app/membership/page.tsx` | "Pick the coffee, tea, matcha, or merch you want every month" | "Your monthly subscription to Coastal — direct access to our team, plus a member discount on every shipment" |
| `web/app/pooler-pass/page.tsx` | "Local membership · 12% off in-store" | "Pooler-local access to Sal at the counter — plus a member discount applied every time you stop in" |
| `web/app/wood-stork/page.tsx` | "Multi-location buyers, restaurants, offices" | "Your business gets a named line at Coastal — monthly review with ACHEEVY, direct access to Melli, plus a referral-driven discount on every order" |
| `web/app/compare/page.tsx` | "Different category, actually" (already correct shape; one-paragraph tier-positioning section refreshed for tech-access framing) | unchanged thesis, refreshed tier-positioning paragraph |

Each page keeps the same 3-stripped-benefits / terms section / checkout form structure. Diff is copy + benefit-list ordering, not architecture.

---

## 6. Memory canon updates

- `reference_coastal_5_tier_pricing_canon_2026_05_12.md` — append a one-line note pointing at this canon-refresh doc (the dollar anchors stay valid; the framing layer is now in this doc).
- `feedback_coastal_tier_monthly_retail_is_canon_anchor.md` — no change required; the monthly-retail-is-canon rule is unchanged.

---

## 7. What this canon refresh enables (Phase 2 callforward)

The Circuit Box v1 spec (`iCloudDrive/.../FOAI Project/specs/circuit-box/2026-05-14-v1-design.md`) lands the customer-facing Circuit Box variant in Phase 2.5. That surface treats each tier as a *gated workspace shape* — Pooler Pass sees fewer apps in their workspace than Wood Stork Reserve does. This tech-access canon doc is the rulebook the Circuit Box tier-gate consults. Without this canon, Circuit Box doesn't know *what* each tier should see.

---

## 8. Out of scope for this PR

- Stripe price changes (none — anchors unchanged)
- Envelope-cap math (no changes to `_TIER_ENVELOPES_CENTS_FALLBACK`)
- New tier creation
- The compare page's "Roasted to order" attribute language (separate PR — PRD §4.3 compliance audit may flag this; not addressed here)
- New benefit lists (3-stripped-benefits ceiling per existing canon)
- Customer-facing Circuit Box variant build (Phase 2.5)
- Per-SKU margin-floor warning UI at checkout (deferred — product backlog)

---

## 9. Verification

- `npx tsc --noEmit` in `coastal-brewing/web` — type-clean
- Spot-check all 4 refreshed pages render in dev
- `git diff --stat` shows ONLY copy changes — no Stripe price IDs touched
- Sacred Separation pass: grep refreshed pages for internal tool names (none should appear in user-visible strings)
