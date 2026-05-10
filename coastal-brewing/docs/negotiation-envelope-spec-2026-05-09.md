# Negotiation envelope spec — Sal / LUC / ACHEEVY / Melli (2026-05-09)

## CRITICAL FRAMING (owner clarification 2026-05-09 PM)

The catalog MSRP (60%-margin policy) is the **OPENING ANCHOR**, not the final price. The full agentic haggle (Sal → LUC → ACHEEVY → Melli) is the customer's **path down to the ideal landing zone**. This isn't price-as-product — it's **negotiation-as-experience**, and the negotiation IS the proof-of-concept showcase for licensee brands.

**Anchor → Landing Zone (Italian Roast 12oz example)**:

| Stage | Price | Margin | Note |
|---|---|---|---|
| Anchor MSRP (catalog) | $43.99 | 60% | Where every PDP starts |
| Sal auto (5-15%) | $37-42 | 53-58% | First-line haggle |
| Sal conditional 20% | $35.19 | 50% | 3+ asks + past/live purchase |
| LUC counter 25% (sub) | $32.99 | 47% | Visible CoT, sub-commit |
| ACHEEVY bundle 30% | $30.79 | 43% | 5+ items / bundle / bulk |
| Melli +15% B2B stack | $24.19 | 27% | Add product / sub commit / volume rebase |
| **HARD FLOOR** | **$19.08** | 13% | cost + $1.50 |

Typical retail Custee lands at **$26-32** (Sal/LUC tier). B2B bulk lands at **$20-24** (full Melli stack with volume rebase). Floor protects the floor.

**The "ideal landing zone" is NOT Stumptown $20** — Coastal isn't competing on commodity blend pricing. Coastal lands at the price where (a) Custee feels they negotiated a great deal, (b) Coastal earns healthy margin, (c) the experience justifies the spend. That's typically **$26-32 for Tier A blends** — at-market for Counter Culture/Onyx, premium over Stumptown-direct.

**PDP + chat UX implication**: every product card needs a visible "Ask Sal for a price" CTA. Custees should KNOW they can negotiate. Hidden haggle = Custees pay anchor and feel ripped off OR don't buy. Visible haggle = Custees engage Sal, experience the team, walk away with a deal.

**Marketing implication**: every haggle conversation IS the licensee-brand marketing surface. Recording (with consent) Custee → Sal → LUC → ACHEEVY → Melli flows = the demo reel for 7-Brew/Starbucks/Dutch Bros prospects.

---

## Owner directive 2026-05-09 (original) verbatim:

> Sal — up to 20% of the single cost of a product, triggered by three
> requests/haggles, starting at 5% and max auto discount is 15%. The
> only way to get 20% is if the user haggles twice and deliberately
> asks AND has already purchased in the past OR is purchasing
> something currently.
>
> LUC is brought into the conversation and seen in the Chain of Thought
> Thinking and reasoning to be a back-and-forth discussion where LUC
> does the number crunching to make it make sense for us if we approve
> the discount. LUC can offer a 25% deal on the total price if the
> Custee either agrees to a subscription with the 25% off on the first
> month, OR keeps the discount on the one-off purchase.
>
> ACHEEVY is called in if the Custee wants to add more but wants a
> greater discount, this may entail up to 5 or more items, a bundle or
> bulk. In this case, ACHEEVY gives the approval and does a warm
> transfer to Melli, who then closes the customer for their Bulk and/or
> business purchase, where she captures the Custee's Business
> information either by voice STT, or speech-to-speech, or a form
> provided inline of the conversation.
>
> The Discount ACHEEVY approved will remain intact, and Melli can add
> an additional discount up to 15% if the Custee adds an additional
> Product, tests a different product, or commits to a subscription
> plan.

## Agent escalation chain

```
                        ┌────────────────────────────────────────┐
                        │ Custee asks for discount               │
                        └────────────┬───────────────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────────────────────┐
                        │ Sal_Ang (lead barista, customer-facing) │
                        │ • Auto: 5% on first ask                 │
                        │ • Bumps to 10%, 15% across asks 2 + 3   │
                        │ • Max auto: 15% at ask 3                │
                        │ • 20% only if (3+ asks) AND             │
                        │   (past_purchase OR live_purchase)      │
                        └────────────┬────────────────────────────┘
                                     │
                                     ▼ (asks for >20% OR Sal hits cap)
                        ┌──────────────────────────────────────────┐
                        │ LUC_Ang (number-crunching CFO)           │
                        │ ▶ Visible CoT in chat (team deliberation)│
                        │   "Sal, let me run this..."              │
                        │   "OK at 25% the math works IF..."       │
                        │ • Up to 25% IF subscription commit       │
                        │   OR custee accepts 25% on one-off       │
                        └────────────┬─────────────────────────────┘
                                     │
                                     ▼ (custee asks for more items + bigger discount)
                        ┌──────────────────────────────────────────┐
                        │ ACHEEVY (founder, gate-keeper)           │
                        │ • Approves discounts above LUC ceiling   │
                        │ • Triggered by 5+ items, bundle, bulk    │
                        │ • Approves THEN warm-transfers to Melli  │
                        └────────────┬─────────────────────────────┘
                                     │
                                     ▼ (warm transfer for B2B close)
                        ┌──────────────────────────────────────────┐
                        │ Melli_Capensi (Marketing PMO / B2B closer)│
                        │ • Inherits ACHEEVY's discount             │
                        │ • + up to 15% more IF custee adds product │
                        │   OR tests new product OR commits to sub  │
                        │ • Captures business info via STT / S2S /  │
                        │   inline form                             │
                        └────────────┬──────────────────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────────────────────┐
                        │ Stripe Checkout Session minted with      │
                        │ final negotiated terms in metadata       │
                        └──────────────────────────────────────────┘
```

## Sal_Ang — first-line haggle

**State machine** (per chat session, per SKU):

| Ask # | Custee request | Sal auto-discount | Conditions |
|---|---|---|---|
| 1 | "Any discount?" | 5% | unconditional |
| 2 | "Can you do better?" | 10% | unconditional |
| 3 | "I really need a lower price" | 15% | unconditional (this is Sal's auto cap) |
| 4 (rare) | "Please, can you stretch?" | 20% | requires (a) past_purchase OR (b) live_purchase in current cart |

**Floor protection**: any Sal discount that drops `retail × (1 − pct/100)`
below the SKU's floor (cost + $1.50) → Sal declines and triggers LUC
escalation instead.

**State storage**: per-conversation `negotiation_state` in
`session_metadata` — tracks `{sku, asks, max_pct_offered, past_purchase, live_purchase}`.

**Brand voice**: Sal stays warm, never apologetic. "I can do 5% — call
that the first-cup discount. … Real fine, I'll go 10%. … Tell you what,
15% — that's where my counter sits." For 20% conditional: "Lemme bring
LUC in real quick to see if the math works." (Visible LUC handoff.)

## LUC_Ang — visible Chain-of-Thought number-crunching

**Trigger**: Sal nears 15% cap OR custee asks for >15% OR Sal can't
serve the request without breaking floor.

**Visibility**: LUC's deliberation appears in the chat as a separate
agent-bubble exchange (see `team-deliberation-ux-spec-2026-05-09.md`).
Custee sees Sal-LUC team conversing. This is the Kimi-app-style "team
discussion you can watch."

**LUC's reasoning shape** (Chain-of-Thought):
1. Read SKU cost basis from catalog.
2. Compute current proposed price = retail × (1 − requested_pct/100).
3. Compare to floor (cost + $1.50).
4. Compute margin % at proposed price.
5. If margin >= 12%: greenlight at requested_pct.
6. If margin between 5% and 12%: counter-offer with subscription
   sweetener (25% off month 1, then back to standard sub price = 15%
   off ongoing). Math works because lifetime value of sub > one-off.
7. If margin < 5%: decline + counter at LUC's max sustainable pct.

**LUC's two paths to 25%**:
- **Subscription path**: 25% off month 1, then 15% off ongoing
  (standard sub discount).
- **One-off path**: 25% off the single purchase, no subscription.
  (LUC chooses based on which math nets more lifetime value.)

**LUC ceiling**: 25%. Above that → ACHEEVY trigger.

## ACHEEVY — bundle/bulk gate

**Trigger conditions** (any one):
- Custee adds 5+ items to potential order.
- Custee asks for a bundle (Coffee+Tea, multi-region, etc.).
- Custee asks for bulk (5lb+ tier or multi-12oz).
- Custee asks for >25% discount.

**ACHEEVY's job**:
1. Review Sal+LUC chat history.
2. Check past_purchase + B2B signals.
3. Approve discount (up to 30% solo, higher requires owner Telegram).
4. **Warm-transfer to Melli** with full context.

**ACHEEVY message pattern**: "Sal, LUC — good work. This one's
turning into a real order. Melli, take it from here. The rate stays at
[N%]; you've got room to layer more if Custee adds another product
line or commits to recurring."

## Melli — B2B closer

**Inherits**: ACHEEVY's approved discount.

**Layered additional discount** (up to +15%):
- +5% if custee adds an additional product line (e.g. coffee + tea).
- +5% if custee tests a new product (e.g. throws in a sample pack).
- +10% if custee commits to subscription/recurring.
- +15% maximum stack (so e.g. add-product + sub-commit = 5% + 10% = 15%).

**Volume rebase**: When custee bumps order qty into a new bulk tier
(e.g. crosses 24-unit case), `equation.py` recomputes cost basis at the
new volume tier BEFORE applying Melli's additional 15%. Without this,
naive stack of "Sal 20% → LUC 25% → ACHEEVY 30% → Melli 15% = 90% off"
would crash through the floor. Floor protection still hard.

**Melli's data capture** — for B2B close, Melli must capture:
- Business name + DBA
- Federal EIN (or state tax ID)
- Billing contact name + email + phone
- Shipping addresses (1 to many for multi-location)
- Resale certificate (if applicable for tax exemption)
- Preferred fulfillment cadence

**Capture surface options** (custee picks):
- Voice STT — Melli asks each field, transcribes via Inworld STT.
- Speech-to-speech — Melli + Inworld TTS-2 chat conversationally.
- Inline form — runner serves a Stripe-flavored form embedded in chat.

## Floor enforcement (hard rule, all agents)

Every proposed price runs through:

```
floor = sku.cost_basis + 1.50  # USD
proposed_price = retail × (1 − total_discount_pct / 100)
if proposed_price < floor:
    decline + escalate to next tier (or owner if Melli)
```

Floor is non-negotiable. The 90%-off-by-naive-stacking scenario in
the doc above is the canonical failure case the engine must catch.

## Engine integration — `equation.py`

Required additions:

1. **Per-SKU floor field**: `cost_basis + 1.50` calculated on load.
2. **Negotiation state**: per-session struct tracking
   `(sku, asks, max_offered, past_purchase, live_purchase, current_agent)`.
3. **Sal step function**: ask# → discount (5/10/15/20).
4. **LUC reasoning function**: input current pct + SKU + sub interest →
   counter-offer (sub-path or one-off path).
5. **ACHEEVY gate**: items_count + bundle_signal + bulk_signal → approval.
6. **Melli stack function**: inherited_pct + additional_signals →
   final_pct (max +15%).
7. **Floor check**: applied before any agent's discount lands.
8. **Volume rebase**: when items_count crosses a bulk MOQ, recompute
   cost basis BEFORE Melli's additional discount stacks.

## Tests required (in `tests/test_equation.py`)

- Sal floor protection: discount that breaks floor → escalates instead.
- LUC subscription-path counter-offer math.
- LUC one-off-path counter-offer math.
- ACHEEVY warm-transfer payload includes Sal+LUC chat history.
- Melli stack: 5+10 = 15 max (not 5+10+10 = 25).
- Volume rebase: 24-unit case crosses MOQ → cost basis updates → floor
  recalculates → Melli's effective stack different than at single-unit.
- 90%-off naive stack scenario → floor blocks it.

## Pairings

- `pricing-margin-model-2026-05-09.md` — sets the retail prices the
  envelope discounts FROM.
- `team-deliberation-ux-spec-2026-05-09.md` — UX surface for the
  visible team chat.
- `reference_coastal_path_a_stripe_direct_2026_05_09.md` — final
  negotiated terms ride into Stripe Checkout metadata.
- `agents/shared/authority_tiers.py` — current tier ceilings (Sal 10/15,
  LUC, ACHEEVY) need updating to match this spec.
