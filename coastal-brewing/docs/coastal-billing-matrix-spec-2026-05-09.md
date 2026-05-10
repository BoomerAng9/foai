# Coastal Brewing Co. — Billing Matrix Spec (2026-05-09)

Owner directive 2026-05-09: design Coastal's billing matrix mirroring
AIMS's multi-dimensional architecture. Coastal isn't selling a product
— it's selling an **experience** that proves the AI-managed-retail tech
stack other brands will license. Pricing must support every Custee
engagement type (one-off / sub / bulk / corporate / vendor / gift) AND
the negotiation envelope (Sal/LUC/ACHEEVY/Melli) AND tunable
quality/experience pillars.

## Architectural parent — AIMS pricing matrix

Reference: `~/AIMS/frontend/lib/stripe.ts` + `~/AIMS/frontend/app/pricing/page.tsx`.

AIMS exposes 8 dimensions that combine via `calculateBill()`:
1. Plan Duration (p2p / 3mo / 6mo / 9mo — Tesla 3-6-9 vortex)
2. Usage Modifiers (overage, maintenance, transaction fees, savings split)
3. Group Structures (individual / family / team / enterprise — multipliers + per-seat addons)
4. Task-Based Multipliers (9 task types, 1.0× to 3.0× cost)
5. Three Pillars (Confidence / Convenience / Security — each standard/enhanced/maximum)
6. White Label (Self-Managed / AIMS-Managed / Fully Autonomous)
7. Lifetime Deal (BYOK / Platform / WhiteLabel — one-time)
8. Platform App Partitioning (Per|Form / LUC / Marketplace / WhiteLabel)

Coastal mirrors this architecture with retail-coffee semantics. Same
shape, different labels + multipliers. Code-level parity allows shared
billing infrastructure later.

## Coastal Billing Matrix — 8 dimensions

### Dimension 1: Engagement Cadence (mirrors AIMS Plan Duration)

```ts
export type CadenceId = 'oneoff' | '3mo' | '6mo' | '9mo' | 'quarterly_bulk';

export const COASTAL_CADENCES: BaseCadence[] = [
  {
    id: 'oneoff',
    name: 'One-off',
    commitmentMonths: 0,
    deliveredMonths: 0,
    monthlyDiscount: 0,                     // no discount, full retail
    description: 'No commitment — buy what you want when you want',
  },
  {
    id: '3mo',
    name: '3-month subscription',
    commitmentMonths: 3,
    deliveredMonths: 3,
    monthlyDiscount: 0.15,                  // 15% off retail per delivery
    description: 'First commitment — 15% off and a free welcome card',
  },
  {
    id: '6mo',
    name: '6-month subscription',
    commitmentMonths: 6,
    deliveredMonths: 6,
    monthlyDiscount: 0.20,                  // 20% off retail per delivery
    description: 'Balance — 20% off and seasonal preferences locked',
  },
  {
    id: '9mo',
    name: '9-month subscription (pay 9, get 12)',
    commitmentMonths: 9,
    deliveredMonths: 12,
    monthlyDiscount: 0.25,                  // effective 25% off
    description: 'Best rate — pay 9, receive 12 months. ACHEEVY-tier benefits',
  },
  {
    id: 'quarterly_bulk',
    name: 'Quarterly bulk drop',
    commitmentMonths: 3,
    deliveredMonths: 3,
    monthlyDiscount: 0.18,                  // 18% off, but at-once delivery
    description: 'Single shipment per quarter — for coffee programs that brew through 5lb in 90 days',
  },
];
```

Mirrors AIMS Tesla 3-6-9. Coastal adds `quarterly_bulk` because it's
a real B2B retail pattern not present in AIMS.

### Dimension 2: Order Modifiers (mirrors AIMS Usage Modifiers)

```ts
export const COASTAL_ORDER_MODIFIERS = {
  freeShippingThreshold: 50.00,        // free ship over $50/order
  expeditedShippingFee: 12.00,         // priority ship +$12/order (TCR doesn't expedite — Coastal absorbs)
  giftWrappingFee: 4.99,               // optional gift box per shipment
  welcomeCardCost: 0,                  // included in first sub delivery (CAC absorbed)
  handwrittenCardFee: 0,               // included with Premium / Concierge experience tier
  custeeProfileMaintenance: 0,         // always included (RAG profile + preferences)
  paymentTransactionFee: 0,            // Stripe fee absorbed, not pass-through
  oneOffTransactionFee: 0,             // no surcharge for non-sub orders
  earlyPauseFee: 0,                    // pause sub anytime, no fee
  earlyCancelFee: 0,                   // cancel anytime, no fee (refund unshipped)
  savingsSplitCustee: 0.50,            // 50% of refunded over-shipment goes to Custee credit
  savingsSplitPlatform: 0.50,          // 50% retained by Coastal (covers ops)
};
```

### Dimension 3: Account Structure (mirrors AIMS Group Structures)

```ts
export type AccountId = 'individual' | 'household' | 'office' | 'multi_loc' | 'enterprise';

export const COASTAL_ACCOUNT_STRUCTURES: AccountStructure[] = [
  {
    id: 'individual',
    name: 'Individual',
    shipToAddresses: '1',
    multiplier: 1.0,
    perAdditionalAddressFee: 0,
  },
  {
    id: 'household',
    name: 'Household',
    shipToAddresses: 'Up to 3',
    multiplier: 1.4,                            // mirrors AIMS family 1.5
    perAdditionalAddressFee: 0,
    description: 'Same Custee, multiple homes (vacation home, partner address)',
  },
  {
    id: 'office',
    name: 'Small Office',
    shipToAddresses: '1, but multi-employee',
    multiplier: 2.0,
    perEmployeeAddon: 4.99,                     // per registered employee per month
    employeeRange: '5-25',
    description: 'Office coffee program — single delivery point, multiple drinkers',
  },
  {
    id: 'multi_loc',
    name: 'Multi-Location Vendor',
    shipToAddresses: '4-10 business locations',
    multiplier: 3.5,
    perLocationAddon: 19.99,                    // per location per month
    description: 'Cafe chain, hotel group, regional restaurant — Melli closes',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    shipToAddresses: '11+ locations or custom',
    multiplier: 0,                              // custom contract — quote-based
    perLocationAddon: 0,
    description: 'Custom — ACHEEVY approves, Melli closes, custom roast profile + co-brand label',
  },
];
```

### Dimension 4: Product-Mix Multipliers (mirrors AIMS Task-Based Multipliers)

```ts
export type CategoryId =
  | 'coffee_blends' | 'special_offerings' | 'flavored_coffees'
  | 'single_origin' | 'single_origin_ft'
  | 'tea_standard' | 'tea_premium' | 'instant' | 'functional';

export const COASTAL_CATEGORY_MULTIPLIERS: CategoryMultiplier[] = [
  { id: 'coffee_blends',     name: 'Coffee Blends',           multiplier: 1.0,  notes: 'Baseline. House + Premium + Decaf.' },
  { id: 'flavored_coffees',  name: 'Flavored Coffees',        multiplier: 1.0,  notes: 'Same per-oz as blends.' },
  { id: 'tea_standard',      name: 'Tea (standard)',          multiplier: 0.95, notes: 'Slight discount — lower velocity, tea segment elasticity.' },
  { id: 'instant',           name: 'Instant Coffee',          multiplier: 1.0,  notes: 'Premium-tier convenience pricing.' },
  { id: 'single_origin',     name: 'Single Origin',           multiplier: 1.05, notes: 'Slight premium — sourcing complexity + origin storytelling.' },
  { id: 'single_origin_ft',  name: 'Single Origin Fair Trade', multiplier: 1.10, notes: '$39/mo TCR FT subscription overhead amortizes here.' },
  { id: 'special_offerings', name: 'Special Offerings',       multiplier: 1.20, notes: 'Limited availability + premium framing (Whiskey Barrel, etc).' },
  { id: 'tea_premium',       name: 'Premium Tea (Matcha)',    multiplier: 1.30, notes: 'Ceremonial-grade matcha; Hojicha drops to standard tier.' },
  { id: 'functional',        name: 'Functional Coffee & Tea', multiplier: 1.15, notes: 'TCR Premium Product subscription overhead + wellness premium.' },
];
```

Custees can mix categories in a single subscription (e.g. 60% coffee
blends + 30% tea + 10% functional). Effective multiplier =
weighted average of category mix, applied to base Cadence price.

### Dimension 5: Three Pillars — Curation / Experience / Provenance (mirrors AIMS Confidence/Convenience/Security)

This is THE differentiator vs Amazon/Publix/Starbucks/grocery. Coastal
isn't selling beans — it's selling a tunable Custee experience built on
top of beans. Each pillar has 3 levels (mirrors AIMS standard/enhanced/maximum).

```ts
export type PillarLevel = 'standard' | 'curated' | 'concierge';

export const COASTAL_PILLARS: Pillar[] = [
  {
    id: 'curation',
    name: 'Curation Pillar',
    icon: '◈',
    tagline: 'How hand-picked your bag is',
    options: [
      {
        id: 'standard',
        name: 'Self-Pick',
        addon: 0,
        features: [
          'Same SKU every recurring delivery',
          'Custee chooses, system fulfills',
          'No agent intervention',
        ],
      },
      {
        id: 'curated',
        name: 'Sal-Curated',
        addon: 0.10,
        features: [
          'Sal/LUC pick best new arrivals matching your palate profile',
          'Rotation on the same cadence',
          'Pre-delivery preview email — accept / swap',
          'Tasting notes on every shipment',
        ],
      },
      {
        id: 'concierge',
        name: 'Concierge',
        addon: 0.25,
        features: [
          'ACHEEVY + Melli quarterly palate review',
          'Custom selection per delivery (no defaults)',
          'Direct line to Sal for between-delivery requests',
          'Special access to Whiskey Barrel + Coffee of the Month before public',
          'Holiday + birthday surprise inclusions',
        ],
      },
    ],
  },
  {
    id: 'experience',
    name: 'Experience Pillar',
    icon: '◉',
    tagline: 'How rich the brand-as-team feel is',
    options: [
      {
        id: 'standard',
        name: 'Web & Email',
        addon: 0,
        features: [
          'Web order / shop / chat with Sal',
          'Email order confirmation',
          'Standard packaging',
        ],
      },
      {
        id: 'curated',
        name: 'Brand-Touched',
        addon: 0.15,
        features: [
          'Hand-written welcome card on signup',
          'Per-delivery tasting note from Sal (printed insert)',
          'Voice message from Sal in account dashboard (Inworld TTS-2)',
          'Custom Coastal branded packaging',
          'Animated team-deliberation visible in chat (per `team-deliberation-ux-spec`)',
        ],
      },
      {
        id: 'concierge',
        name: 'Coastal-Counter',
        addon: 0.35,
        features: [
          'Live chat with Sal anytime — Inworld TTS-2 voice replies',
          'Custom Higgsfield video for your bag (per delivery, ~30s, Iller_Ang produced)',
          'Birthday + anniversary cards from the team',
          'Quarterly virtual taste-test with Sal (1:1 video chat)',
          'Custom co-branded packaging if you want it on your shelf',
          'Direct Telegram channel to Coastal HQ (Melli answers)',
        ],
      },
    ],
  },
  {
    id: 'provenance',
    name: 'Provenance Pillar',
    icon: '◆',
    tagline: 'How transparent the supply chain is',
    options: [
      {
        id: 'standard',
        name: 'Origin-Listed',
        addon: 0,
        features: [
          'Origin country + region on bag',
          'Roast date stamping',
          'Standard ingredient/statement-of-identity per FDA',
        ],
      },
      {
        id: 'curated',
        name: 'Verified',
        addon: 0.10,
        features: [
          'Lot/batch traceability per shipment',
          'Farm-region card with photo + story',
          'Brewing-method recommendation per SKU',
          'Suggested water temp + grind size per SKU',
        ],
      },
      {
        id: 'concierge',
        name: 'Fully Traceable',
        addon: 0.20,
        features: [
          'Named-farm story (where available — TCR provides the data)',
          'Harvest-year provenance + grade certification',
          'Brewing-method tutorial video (Iller_Ang, Higgsfield-produced) per shipment',
          'Cooperative + farmer-direct narrative for FT SKUs',
          'Full audit trail accessible in Custee account',
        ],
      },
    ],
  },
];
```

### Dimension 6: White Label / Licensee (mirrors AIMS White Label)

Coastal-as-licensee — when another brand wants to license Coastal's
AI-managed-retail platform (per `reference_cbrew_proof_of_concept_industry_play_2026_05_07.md`).

```ts
export type WhiteLabelMode = 'self_run' | 'coastal_run' | 'fully_autonomous_aims';

export const COASTAL_WHITE_LABEL_PLANS = [
  {
    id: 'self_run',
    name: 'Self-Run License',
    tagline: 'Your brand, our platform — you operate',
    startingPrice: '$2,499/mo + $5,000 onboarding',
    features: [
      'Full AI-managed-retail platform under your brand',
      'Custom domain (yourbrand.com)',
      'Custom cast voice (Inworld IVC clones, 4 personas)',
      'Custom Higgsfield visual library',
      'You manage your own catalog, fulfillment, pricing',
      'Stripe integration to your account',
      'Standard support (48h response)',
      'Up to 1,000 Custee accounts',
    ],
  },
  {
    id: 'coastal_run',
    name: 'Coastal-Managed',
    tagline: 'Your brand, Coastal runs operations',
    startingPrice: '$7,499/mo + $25,000 onboarding',
    features: [
      'Everything in Self-Run',
      'Coastal team handles Custee operations (Sal/LUC/ACHEEVY/Melli on YOUR brand)',
      'Catalog onboarding + supplier integration',
      'Marketing campaign templates pre-baked',
      'Priority support (4h response)',
      'Up to 25,000 Custee accounts',
      'Quarterly performance review with Coastal team',
    ],
  },
  {
    id: 'fully_autonomous_aims',
    name: 'Fully Autonomous (AIMS-tier)',
    tagline: 'ACHEEVY + Boomer_Angs run everything',
    startingPrice: 'Custom Quote ($50K-$500K/mo)',
    features: [
      'Everything in Coastal-Managed',
      'Dedicated AIMS infrastructure (own GCP project)',
      'ACHEEVY orchestrates all operations 24/7',
      'Custom Boomer_Ang roster trained for your vertical',
      'Self-healing infrastructure',
      'Unlimited Custee accounts',
      'White-glove SLA (1h response, 99.99% uptime)',
      'Multi-vertical scaling (deploy across 50 locations etc.)',
      'Full PMO structure deployed',
    ],
  },
];
```

### Dimension 7: Lifetime Coastal Membership (mirrors AIMS LTD)

One-time membership tier for power Custees + brand-builders.

```ts
export const COASTAL_LIFETIME_PLANS = [
  {
    id: 'lifetime_member',
    name: 'Lifetime Member',
    tagline: 'Coastal counter access forever',
    onetimePrice: 999,
    features: [
      'No subscription fees — ever',
      'Standard Curation + Standard Experience pillars locked in',
      '15% off all one-off orders forever',
      'First-access to limited drops (Whiskey Barrel, Coffee of the Month)',
      'Founding-member badge on profile',
      'Custom Higgsfield-rendered "lifetime member" digital asset',
      'Annual quarterly virtual visit with Sal',
    ],
  },
  {
    id: 'lifetime_concierge',
    name: 'Lifetime Concierge',
    tagline: 'Concierge access forever',
    onetimePrice: 4999,
    features: [
      'Everything in Lifetime Member',
      'Concierge Curation + Concierge Experience + Concierge Provenance locked in',
      '25% off all one-off orders forever',
      'Direct Telegram channel to Melli',
      'Annual in-person Coastal HQ visit (Pooler GA) with founder',
      'Custom annual blend named after you (limited 1/yr)',
      'Reserve seat at any Coastal launch event',
    ],
  },
];
```

### Dimension 8: Catalog Surface Partitioning (mirrors AIMS Platform Apps)

Coastal product surfaces — Custees can subscribe to one or many.

```ts
export const COASTAL_CATALOG_SURFACES = [
  {
    id: 'coffee_retail',
    name: 'Coffee Retail',
    tagline: 'Bags, beans, cups',
    description: 'Whole-bean + ground coffee SKUs across all categories',
  },
  {
    id: 'tea_retail',
    name: 'Tea Retail',
    tagline: 'Loose-leaf + matcha',
    description: 'Tea-only subscription option for non-coffee Custees',
  },
  {
    id: 'b2b_portal',
    name: 'B2B Portal',
    tagline: 'Wholesale + corporate accounts',
    description: 'Separate UX for office-coffee + multi-location vendors. Melli-managed.',
  },
  {
    id: 'whitelabel_platform',
    name: 'White-Label Platform',
    tagline: 'License Coastal-as-stack',
    description: 'For brands wanting to deploy AI-managed-retail under their own name. See Dimension 6.',
  },
];
```

## Negotiation Envelope (Coastal-specific 9th dimension)

This is dynamic — applied at chat-conversation time per `negotiation-envelope-spec-2026-05-09.md`. Sal/LUC/ACHEEVY/Melli haggle through the envelope, final discount stacks on top of the Cadence + Account + Pillar pricing as a one-time price reduction OR a sub-price-lock.

Examples:
- Custee asks for 20% off as Individual / 3-month / Standard Pillars / Coffee Blends mix → Sal offers up to 15% auto, escalates to LUC for 20%, LUC counter-offers "25% off month 1 if you commit to 6mo."
- B2B Custee selects Multi-Loc Vendor / 9-month / Curated Experience → Melli closes at -22% across the board, with +5% if they add Functional category.

## `calculateCoastalBill()` function signature

```ts
export interface CoastalBillEstimate {
  cadence: Cadence;
  account: AccountStructure;
  catalogMix: Array<{ category: CategoryMultiplier; weight: number }>;
  effectiveCategoryMultiplier: number;
  pillarAddons: { curation: number; experience: number; provenance: number; total: number };
  baseBillBeforeDiscounts: number;        // pre-cadence-discount
  cadenceDiscount: number;                // monthly_discount applied
  accountMultiplied: number;              // account-tier multiplier applied
  pillarMultiplied: number;               // pillar addon stack applied
  monthlyEstimate: number;                // FINAL monthly (or per-delivery) price
  commitmentTotal: number;                // monthly × commitmentMonths
  negotiationEnvelopeAvailable: {         // dynamic — applied at chat
    sal_max_pct: number;                  // up to 20% conditional
    luc_max_pct: number;                  // up to 25% with sub commit
    acheevy_max_pct: number;              // up to 30% bundle/bulk
    melli_stack_max_pct: number;          // +15% additional B2B
    floor_per_sku: { sku: string; floor_cents: number }[];
  };
  shippingEstimate: number;
  freeShippingApplied: boolean;
}

export function calculateCoastalBill(
  cadenceId: CadenceId,
  accountId: AccountId,
  shipAddressOrEmployeeCount: number,
  catalogMix: Partial<Record<CategoryId, number>>,    // weights summing to 100
  pillars: PillarSelection,
  options?: { whiteLabelMode?: WhiteLabelMode; lifetimeMode?: LifetimeId },
): CoastalBillEstimate { /* ... */ }
```

## "Build Your Bag" UI (mirrors AIMS pricing page tunable matrix)

Page lives at `/shop/build-your-bag` (or `/account/billing-mix`). Custee sees:
- Cadence selector (4 buttons + quarterly_bulk)
- Account structure selector (5 options, defaults to Individual)
- Catalog mix sliders (9 categories, weights sum to 100)
- Three Pillar selectors (Curation / Experience / Provenance × 3 levels each)
- Live `calculateCoastalBill()` price + commitment total
- "Lock it in" CTA → minted as Stripe Subscription with metadata carrying every dimension's selection

## SaaS-style 3-tier comparison table (owner's prompt example)

Owner provided a SaaS pricing-table prompt. Coastal's analog is the **simplified entry-point** for Custees who don't want the full matrix — pre-tuned bundles of the dimensions above. Lives at `/pricing` (or as a section on the homepage).

The 3 simplified tiers are pre-tuned matrix-snapshots:

### Tier 1 — Self-Serve

- **Cadence**: One-off
- **Account**: Individual
- **Pillars**: Standard / Standard / Standard
- **Price anchor**: Catalog retail (no surcharge, no discount)
- **Visual**: Bright minimal, copper accent, "$0/mo + retail per order"

### Tier 2 — Coastal Counter (RECOMMENDED, badged)

- **Cadence**: 6-month subscription
- **Account**: Individual or Household
- **Pillars**: Curated / Brand-Touched / Verified (the "middle" of each)
- **Price anchor**: 20% off retail per delivery + ~+25% pillar addons → net ~15-20% off retail with Brand-Touched experience
- **Visual**: Highlighted card, copper border with subtle glow, "$45-65/mo typical" range, "Recommended" ribbon

### Tier 3 — Coastal Concierge

- **Cadence**: 9-month (pay 9, get 12) OR Lifetime Concierge
- **Account**: Individual / Household / Office
- **Pillars**: Concierge / Coastal-Counter / Fully Traceable (max of each)
- **Price anchor**: Custom — "Contact Sal" button that opens chat
- **Visual**: Premium card, tier-3 dark accent, "Quote per Custee"

The 3 simplified tiers point Custees who want to mix their own to the
"Build Your Bag" page (Dimension 1-8 tunable matrix).

## Brand-as-product framing (owner directive 2026-05-09)

Premium pricing isn't justified by the bag — TCR sells the same beans
direct at lower retail. Premium is justified by:

| Value layer | Mechanism |
|---|---|
| Team-managed counter | Sal/LUC/ACHEEVY/Melli serving each Custee, visible team-deliberation per `team-deliberation-ux-spec` |
| Personalized intake | Custee profile, palate notes, preferences captured + remembered across sessions |
| Animated visual surfaces | Espresso cup, ledger, coffee pot, authority seal — every chat surface is alive |
| Hand-written welcome card | Sal's first-touch, physical mail, included with first sub delivery |
| Brand consistency | Every reorder remembered, every preference honored, every shipment includes a Sal-voiced touchpoint |
| Proof-of-concept halo | Custees experience the same AI-managed-retail platform that Starbucks / 7-Brew / Dutch Bros will pay $2.5K-$50K/mo to license. Coastal Custees get the platform first |
| Made in PLR (Pooler, GA) provenance | Coastal owns the brand from origin to delivery; TCR is the upstream supplier (never named to Custees per existing canon) |

PDP copy guidance: lead with experience, lead with team, lead with
brand. Bag price is the consequence of all of that, not the lead.

## "Live + Monitored" requirement

Owner directive: the SaaS comparison table must be LIVE (on the
website) and MONITORED (analytics on conversion).

Implementation:
- Page lives at `/pricing`
- Each tier card has a Stripe-friendly CTA (Self-Serve = "Start Shopping" → catalog; Counter = "Start Subscription" → checkout with 6mo defaulted; Concierge = "Talk to Sal" → chat with intent flag).
- Analytics: page views, CTA clicks per tier, conversion to checkout, conversion to chat (Concierge tier), drop-off at each step.
- Analytics surface: AIMS-shared analytics tracking skill (`AIMS/aims-skills/skills/analytics-tracking/SKILL.md`).
- Monitoring: weekly digest to owner Telegram via the existing OWNER_APPROVAL_EMAIL + Telegram path. Per-tier conversion %, MoM delta, anomaly alerts (e.g. Concierge clicks > Counter clicks indicates pricing or messaging mismatch).

## What's NOT in this spec (separate work)

- Stripe Product + Price record creation per dimension combination — happens at checkout time as Stripe Checkout Session line items, NOT pre-created (would be 4 cadences × 5 accounts × 9 categories × 27 pillar combos × 3 surface = thousands of price IDs).
- Catalog code update (`scripts/catalog.py`) to add `category` mapping per SKU per Dimension 4.
- Frontend `/pricing` page implementation — Iller_Ang owns visual, code-ang ships the React component.
- AIMS `lib/stripe.ts` analog at `coastal-brewing/web/lib/coastal-billing.ts` — the actual `calculateCoastalBill()` implementation.

## Owner ratification needed

| Item | Decision required |
|---|---|
| Cadence multipliers (15/20/25%) | Match my proposal or adjust? |
| Account structure multipliers (1.0 / 1.4 / 2.0 / 3.5 / custom) | OK? |
| Category multipliers (0.95-1.30 range) | OK? |
| Pillar addon ranges (0-35% per pillar, max ~95% total) | OK? |
| White Label pricing tiers ($2.5K / $7.5K / Custom) | Defensible or adjust? |
| Lifetime Membership ($999 / $4,999) | Defensible? |
| Live `/pricing` page visual style | Iller_Ang to render mockups for ratification |
| Build Your Bag page priority | Ship at launch or post-launch? |

## Pairings

- `pricing-margin-model-2026-05-09.md` — base SKU retail prices the matrix discounts FROM
- `negotiation-envelope-spec-2026-05-09.md` — Dimension 9 (dynamic chat-time)
- `team-deliberation-ux-spec-2026-05-09.md` — visible team-huddle on Curated/Concierge experience
- `market-pricing-research-2026-05-09.md` — competitor market anchors per category
- `bundle-proposals-2026-05-09.md` — bundles can be pre-mixed Build-Your-Bag presets
- `reference_cbrew_proof_of_concept_industry_play_2026_05_07.md` — White Label tier rationale
- `~/AIMS/frontend/lib/stripe.ts` — architectural parent
- `~/AIMS/frontend/app/pricing/page.tsx` — UI parent for the matrix-tuner page
