# Coastal Standard Membership — Pricing Frame

**Date:** 2026-05-10
**Status:** Background research + recommendation. Pricing GATES escalation deploy per `reference_coastal_pricing_canon_2026_05_09`.
**Anchor reminder:** Coastal Brewing Co. (with the period). C|Brew is internal-only.

---

## 1. Benchmarks pulled

### Specialty coffee — DTC bag pricing
- Blue Bottle subscription: **$16-20 / 12oz bag**, single-origins higher; ~17% multi-bag discount.
- Stumptown subscription: **~$19 / 12oz**.
- Counter Culture: **$16 / bag** (most affordable specialty tier).
- Onyx Coffee Lab: **$24 / 10oz bag** (premium specialty ceiling for DTC bags).
- Cometeer (experience-flavored convenience): **$2.00-3.50 / cup** (~2-3x home-brew cost of $0.88/cup).
- Implication: ceiling for "just a bag of beans" DTC = ~$24/10oz. Anything above this needs experience justification.

### Experience-tier subscription benchmarks
- SoulCycle in-studio: **$134-481/mo** ($30-42/class).
- SoulCycle at-home + Equinox+: **$40/mo**.
- Equinox club: **$205-480/mo**.
- Five Iron Golf: tiered membership, "country club feel without country club prices," with paid Green Grass Pass upgrade for premium course access.
- Implication: experience-anchored memberships clear $40/mo digital-only floor and $200+/mo for in-person community access.

### Consumer AI subscriptions
- ChatGPT Plus / Claude Pro / Cursor Pro / Perplexity Pro / Google AI Pro: all **$20/mo** (the converged consumer AI floor).
- ChatGPT Pro / Claude Max: **$100-200/mo** (power-user tier).
- Implication: $20/mo is the trained consumer expectation for "I get to talk to AI."

### Founder-tier brand premium
- Liquid Death: **$1.50-2.00/can** vs commodity water at ~$0.50 — **3-4x commodity** for branded packaging + identity.
- Magic Mind ~$40 / 7-pack vs commodity ~$1.50/dose — **~4x commodity**.
- Implication: founder-brand emotional premium = 3-4x commodity baseline when story + character are real.

### Pooler, GA market
- Pooler median household income: **$91,766** (Coastal Georgia Indicators).
- Average household income: **~$105K** (2024).
- Per capita: **~$54K**.
- Implication: Pooler is well above national median ($75K). Disposable income supports a $30-50/mo lifestyle subscription without strain. NOT a dollar-store market.

---

## 2. Coastal pricing framework

Coastal isn't competing with Stumptown on bags. It's competing with **SoulCycle + ChatGPT Plus + a relationship with a coffee shop owner**, all delivered through agentic infrastructure no DTC roaster has.

**Layered pricing logic:**

| Layer | Driver | Value uplift |
|-------|--------|--------------|
| (a) Product floor | Tier A 12oz at $24.99 (per existing canon) | Baseline — matches Onyx ceiling |
| (b) Experience layer | Sal_Ang voice consults, live look-in, hand-pack from Sal, Sett market research | +60-100% (SoulCycle-class community premium) |
| (c) Local Pooler community | Hand-pack provenance, "Made in PLR" mark, agent voices on local events | +15-25% (founder-brand identity premium, scaled down because we WANT locals in) |
| (d) Referral mechanic | Each referral offsets sticker via credit | Net price-sensitivity dampener — anchor stays high, real-paid drifts down |
| (e) Negotiation envelope | Sal/LUC/ACHEEVY haggle | The anchor IS the experience — Custees who haggle land in their comfort zone, those who don't pay full freight willingly |

The **negotiation envelope is the killer feature**. We don't have to choose one price — we publish the high anchor, and the Sal/LUC/ACHEEVY haggle (5-15% Sal auto, up to 30% ACHEEVY for bundle/bulk per `reference_coastal_pricing_canon_2026_05_09`) actively brings the right Custee to the right landing zone. This is also the licensee demo reel.

---

## 3. Three candidate price points (annual membership)

| Tier | Annual | Monthly equiv | Anchor logic |
|------|--------|--------------|--------------|
| **Low** | **$299/yr** | $24.92/mo | Coffee-first framing. ~12 bags Tier A retail value. Experience treated as "bonus." Risk: undervalues the agentic stack; trains Custees to think this is a bag-of-the-month club. |
| **Target** | **$499/yr** | $41.58/mo | Experience-first framing. Equinox+ ($40/mo) parity + consumable. Includes ~12 bags + agentic Sal access + live look-in + welcome hand-pack + market research access. Pooler median income covers it without thought. |
| **High** | **$799/yr** | $66.58/mo | Founder/concierge framing. Premium category lift (3-pillar stack: Curation + Experience + Provenance per billing matrix). Includes everything above + priority Melli concierge + member-only blends + first-look on TCR releases. Anchor that lets ACHEEVY haggle down to $499-599 sweet spot. |

---

## 4. Recommendation: **anchor $799, target landing $499-599**

**Why $799 as the published price:**
1. Establishes Coastal as a premium-experience brand, not a coffee subscription. Nobody else has Sal_Ang. Nobody else has the live look-in. Nobody else has the haggle.
2. Gives the negotiation envelope room to work (Sal 5-15%, LUC 25%, ACHEEVY 30%) — landing zones cleanly hit $479-679 depending on which agent closes.
3. Built-in tape for licensee pitches: "we open at $799, our agentic team converts at $549 average" is a story 7-Brew / Dutch Bros pays for.
4. Pooler market supports it — $66/mo on $91K household income = 0.87% of monthly income. Equinox is 2.7%. Coastal is a bargain in absolute terms.
5. Floor still respected — cost+$1.50 floor + 60% margin per `_MARGIN_FLOOR_BY_CATEGORY` stays intact even at the low landing.

**Why NOT $499 as the anchor:** leaves no room for the negotiation theater that IS the product. Ship the haggle, then watch the conversion economics print.

**Owner gate before publish:** confirm $799 anchor + $499 floor-landing + Sal/LUC/ACHEEVY envelope range. Once gated, wire to Stripe per `reference_coastal_path_a_stripe_direct_2026_05_09`.

---

## Sources
- [Blue Bottle Coffee Subscription Review — Home Grounds](https://www.homegrounds.co/blue-bottle-coffee-club-review/)
- [Specialty Coffee Subscription | Blue Bottle](https://bluebottlecoffee.com/us/eng/subscriptions)
- [Stumptown Subscribe](https://www.stumptowncoffee.com/pages/subscribe)
- [Counter Culture Single-Origin Subscription](https://counterculturecoffee.com/products/single-origin-subscription-one-bag)
- [Lifeboost vs Counter Culture vs Stumptown 2026 — Brew Pathfinder](https://brewpathfinder.com/articles/sustainable-coffee-brands-compared-2026)
- [Cometeer Coffee Review — Tasty Coffee Tales](https://www.tastycoffeetales.com/reviews/cometeer)
- [SoulCycle Membership Cost 2026](https://membershipdetail.com/soulcycle-membership-cost/)
- [Equinox Membership Cost: Pricing Guide 2026](https://fitlifeway.com/equinox-membership-cost/)
- [Five Iron Golf Membership](https://fiveirongolf.com/membership)
- [Setting the right price for a premium beverage: Liquid Death — Beverage Daily](https://www.beveragedaily.com/Article/2025/09/04/setting-the-right-price-for-a-premium-beverage-liquid-death-study/)
- [How Liquid Death Built a $700M Brand](https://thecaseforbrand.substack.com/p/how-liquid-death-built-a-700m-brand)
- [Pooler GA Median Household Income — Coastal Georgia Indicators](https://www.coastalgaindicators.org/indicators/index/view?indicatorId=315&localeId=159551)
- [Pooler GA Demographics — Data USA](https://datausa.io/profile/geo/pooler-ga)
- [Choosing the Best $20/Month AI Subscription in 2026 — Quasa](https://quasa.io/media/choosing-the-best-20-month-ai-subscription-in-2026-claude-pro-chatgpt-plus-or-google-ai-pro)
- [AI Pricing Compared 2026 — AIonX](https://aionx.co/ai-comparisons/ai-pricing-comparison/)
