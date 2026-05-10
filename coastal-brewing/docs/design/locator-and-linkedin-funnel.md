---
title: Locator + LinkedIn-Ad Survey Funnel + B2B Partnership Pipeline + Defensibility Moat
status: DESIGN ONLY (no code)
owner: ACHEEVY (with Sal_Ang as customer-facing voice)
date: 2026-05-03
related_canon:
  - ~/foai/CLAUDE.md
  - ~/foai/coastal-brewing/PROJECT_BRIEF.md
  - ~/foai/coastal-brewing/docs/00_one_direction_decision.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_agentic_os_ip_layer_synthesis_2026_05_03.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_coastal_canon_wiki_2026_05_01.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_coastal_marketing_vault_2026_04_30.md
  - ~/.claude/projects/C--Users-rishj/memory/feedback_coastal_is_retail_sales_not_rfp.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_temecula_supplier_canon_2026_04_30.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_coastal_payments_via_stepper_paperform.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_acheevy_voice_shipped_canon_2026_05_03.md
  - ~/.claude/projects/C--Users-rishj/memory/reference_pronunciation_library_installed_2026_05_03.md
  - ~/.claude/projects/C--Users-rishj/memory/feedback_sal_ang_customer_facing_acheevy_escalation_2026_05_03.md
  - ~/.claude/projects/C--Users-rishj/memory/feedback_never_publish_internal_tool_names_2026_04_28.md
  - ~/.claude/projects/C--Users-rishj/memory/project_session_delta_2026_05_03_voice_persona_ship.md (LinqIn appendix)
---

# Locator + LinkedIn Funnel + Partnership Pipeline + Moat

## 1. Strategic frame

This feature is **not a map**. It is a **hyperlocal human-network construction engine** disguised as a coffee survey. A LinkedIn user takes a 60-second drink survey thinking they are sharing taste preferences. The survey captures (a) their geography, (b) their travel-coffee memory, and (c) their willingness to support smaller brands. Coastal returns one immediate gift — a recipe for the coffee they remembered drinking abroad — and silently routes the geo signal to an internal partnership pipeline that turns local independent shops into Coastal-hosted vendors and on-demand specialty partners.

**Customer JTBD** — "Recreate the coffee I had in Istanbul / Trieste / Salvador without knowing the name of the bean. Ideally support someone smaller than Starbucks while I do it."

**Coastal JTBD** — Convert a stranger into (a) a recipe-page user → (b) a buyer of the bean we recommend → (c) a referral path to a small local shop we'll co-brand with → (d) a network node in a fulfillment graph that no LLM provider can replicate without humans on the ground.

The Locator is the harvest mechanism for (c). The funnel is the harvest mechanism for (a) and (b). The moat is the durable asset that survives provider commoditization (§6).

---

## 2. Locator architecture

### Footprint principle
Per owner directive: **do not build a world map.** Real estate stays small. Locator is a single inline component that returns 3-5 nearby shops as a vertical list of cards. No tile renderer. No clustering. No pan/zoom UI.

### Recommended provider: **Google Places API (Nearby Search + Place Details)**

| Provider | Cost | Coverage | Indie-shop quality | Verdict |
|----------|------|----------|--------------------|---------|
| **Google Places** | $17 per 1k Nearby Search calls; $17/1k Details. ~$200/mo at 10k surveys | Best-in-class indie cafes (Google Maps is where they self-list) | Strong | **CHOSEN** |
| Mapbox Search Box | $0.75/1k geocode + tile costs | Geocoding strong, POI weak for indies | Medium | No — POI gap |
| OSM Nominatim | Free | Volunteer-maintained; gaps in rural SC | Spotty | No — rural Lowcountry gap |
| Yelp Fusion | Free tier 5k/day | Good in cities, weak below 10k pop | Medium-strong urban only | No — geographic bias |
| SerpAPI (Maps scrape) | $50/mo 5k searches | Same as Google but with TOS risk | Strong via proxy | No — TOS risk for B2B outreach |

Google Places wins because the partnership pipeline depends on shop quality, not query volume. We are NOT building a consumer map; we are building a **lead list**. Google's "small cafe within 5 miles of zip 29401" returns the exact universe Coastal's outreach team needs.

### User-facing UI surface

A single card embedded on the recipe page sidebar AND on the post-survey thank-you screen:

```
[ Find a small shop near you ]
[ ZIP or "Use my location" ]
↓ (after submit)
- Bean & Bay Coffee — Charleston, SC — 1.2 mi
- Lowcountry Roasters — Mount Pleasant, SC — 4.8 mi
- The Daily Grind — North Charleston, SC — 6.1 mi
[ "Tell us if you'd like Coastal to partner with one of these" ] (single button → adds preference to survey record)
```

No map. List view only. Each card is `<200px` tall.

### Data model

```sql
-- Cached results from Google Places
CREATE TABLE partner_shops (
  id UUID PRIMARY KEY,
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat NUMERIC,
  lng NUMERIC,
  phone TEXT,
  website TEXT,
  rating NUMERIC,
  review_count INT,
  category TEXT,  -- 'coffee_shop' | 'roaster' | 'cafe' | 'tea_house'
  is_chain BOOLEAN DEFAULT FALSE,  -- filter Starbucks/Caribou/Dunkin
  partnership_status TEXT DEFAULT 'untouched',  -- untouched | researching | contacted | conversation | declined | partner
  internal_notes TEXT,
  created_at TIMESTAMP,
  last_synced_at TIMESTAMP
);

CREATE TABLE lead_locations (
  id UUID PRIMARY KEY,
  survey_response_id UUID REFERENCES survey_responses(id),
  zip TEXT,
  lat NUMERIC,
  lng NUMERIC,
  geocoded_at TIMESTAMP,
  matched_shop_ids UUID[]  -- 3-5 nearest non-chain shops
);

CREATE TABLE partnership_outreach (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES partner_shops(id),
  triggered_by_lead_id UUID REFERENCES lead_locations(id),
  assigned_to TEXT,  -- internal team member email (NOT customer-facing)
  status TEXT DEFAULT 'queued',  -- queued | researched | first_contact | follow_up | warm | deal | dead
  first_contact_at TIMESTAMP,
  last_touch_at TIMESTAMP,
  notes JSONB,
  proposed_relationship TEXT  -- 'vendor' (Coastal supplies them) | 'on_demand_partner' (they fulfill via Coastal site) | 'co_brand'
);
```

Chains filter is a static blocklist seeded from a Google Place name match: `Starbucks, Dunkin, Caribou, Peet's, Tim Hortons, Dutch Bros, Scooter's, Costa, Tully's, McDonald's`. Anything else passes.

### Caching
Cache `partner_shops` rows for 30 days keyed on (zip, 5mi radius). LinkedIn ad targeting is geographic; we'll see clusters of zips repeat. Cache hit rate after week 2 is the cost-control lever.

---

## 3. LinkedIn-ad funnel + survey

### Funnel topology
```
LinkedIn ad (drink survey, NO Coastal branding) →
  Survey (Paperform) →
    Thank-you screen (recipe match + locator widget) →
      Recipe page (brand reveal, soft) →
        First-purchase or share
```

The LinkedIn ad creative does NOT lead with the Coastal flying-stork mark. It leads with a question: *"What's the best coffee you've had outside the US?"* — Sal_Ang persona-aligned, conversational, low-friction. Coastal is named on the thank-you page, never in the ad pre-click. This matters because LinkedIn's ad cost on cold audiences is 3-4x lower for survey CTAs than for brand CTAs.

### Survey tool: **Paperform**

Already in production for Coastal payments per `reference_coastal_payments_via_stepper_paperform.md`. One vendor, one webhook surface, one billing line. Typeform is more polished but adds a second vendor and a second webhook surface for zero strategic benefit. In-house build is rejected — survey rendering is not Coastal's edge; partnerships are.

Paperform supports: conditional logic, geocoding via Google Places block, webhook to coastal-runner, Stripe under the hood for any optional micro-purchase. All four are required.

### Survey questions (final wording — mobile-optimized, ≤8 questions)

```
Q1. What do you drink most days? (multi-select)
    [ ] Coffee  [ ] Tea  [ ] Matcha  [ ] Functional drinks (mushroom / adaptogens)  [ ] None of the above

Q2. Where do you currently buy it from? (write-in or pick)
    [ Starbucks ]  [ Dunkin ]  [ Caribou ]  [ Local shop ]  [ Grocery store ]  [ Online ]  [ Other: ___ ]

Q3. Have you ever had a coffee, tea, or matcha while traveling that you wished you could recreate at home? (yes/no)
    → If YES → Q4
    → If NO → skip to Q6

Q4. Where were you when you had it? (single-select with write-in fallback)
    [ Italy ]  [ Middle East / Turkey ]  [ Brazil ]  [ Ethiopia / Kenya ]  [ Japan ]  [ Vietnam ]  [ Mexico / Central America ]  [ Other: ___ ]

Q5. How was it served? (helps us match the recipe)
    [ Espresso/short ]  [ Long/American-style ]  [ With spice or cardamom ]  [ Iced ]  [ With milk/foam ]  [ Whisked/ceremonial ]  [ Don't remember ]

Q6. Would you support a smaller brand if the quality and price were right? (yes/maybe/no)

Q7. What ZIP do you live or work in? (we'll suggest small shops near you)
    [ ZIP _____ ]   [ "Use my location" ]

Q8. What's your email if you'd like the recipe and a small-shop list sent over? (optional)
    [ email _____ ]
```

8 questions, ~60 seconds. No Coastal branding above Q8.

### Thank-you screen
- Headline: *"Here's how to brew it at home."*
- Single button → recipe page deep link with `?region=middle_east&style=cardamom&utm_source=linkedin&utm_campaign=drink_survey_q2`
- Inline locator widget (§2) — *"Or pick up a cup nearby."*
- Footer: small Coastal flying-stork mark + "Nothing Chemically, Ever." per `reference_coastal_official_brand_canon_2026_04_30.md`. First brand reveal is here.

### Webhook contract (Paperform → coastal-runner)
`POST /api/v1/intake/drink_survey` with Paperform's signed payload. Server-side: write `survey_responses`, geocode `Q7` zip, insert `lead_locations`, fan-out to partnership_outreach queue if `Q6 != no` AND ≥1 non-chain shop within 10mi.

---

## 4. Recipe-page travel-tie-in

### Content matrix
The recipe page already exists in `~/foai/coastal-brewing/web/`. This design adds a `region × style → recipe` matrix, owner-curated, NOT auto-generated from an LLM.

```
Region              Style               Recipe slug                Coastal SKU match
-----------------   ----------------    ------------------------   --------------------
Italy               Espresso            it-espresso-classico       it-blend-medium-dark
Italy               Cappuccino          it-cappuccino              it-blend-medium-dark
Middle East/Turkey  Cardamom Turkish    me-turkish-cardamom        ethiopia-natural + cardamom-pack
Middle East/Turkey  Saudi Qahwa         me-qahwa-saffron           ethiopia-natural + qahwa-spice-pack
Brazil              Cafezinho           br-cafezinho               brazil-cerrado-natural
Ethiopia            Buna ceremony       et-buna-ceremony           ethiopia-yirgacheffe
Japan               Matcha (usucha)     jp-matcha-usucha           ceremonial-matcha-30g
Japan               Pour-over           jp-pourover                geisha-washed (when stocked)
Vietnam             Phin / cà phê sữa   vn-phin-condensed          vietnam-robusta-blend
Mexico              Café de olla        mx-cafe-de-olla            mexico-chiapas + olla-spice-pack
```

### Schema
```sql
CREATE TABLE recipes (
  slug TEXT PRIMARY KEY,
  region TEXT,
  country TEXT,
  style TEXT,
  brew_method TEXT,
  equipment TEXT[],
  steps_md TEXT,
  cultural_notes_md TEXT,  -- owner-written paragraph; this is the moat content
  matched_skus TEXT[],
  published_at TIMESTAMP
);
```

### Survey → recipe mapping
Q4 region + Q5 style → recipe slug. Direct lookup table; no LLM-generated routing. If no match (e.g. Q4 = "Other: Iceland"), fall back to a curated "Pour-over fundamentals" recipe and flag the survey response for owner review (potential new recipe).

### Share/embed recommendation
Each recipe has a permalink + Open Graph card with a photo of the brewed cup. Add a "share to LinkedIn" button (closes the loop — recipient becomes next survey-taker). No Pinterest/IG embeds in v1; LinkedIn share only because that's where the ad spend is going.

---

## 5. Partnership pipeline (B2B)

### Workflow
```
Survey submit → geocode → match nearby shops → create partnership_outreach card →
  internal team member (Iller_Ang for assets, internal-only ops persona for outreach) picks up →
    research shop (Google Maps reviews, IG, website) →
      first contact (email or DM) →
        conversation →
          deal: vendor | on_demand_partner | co_brand | declined
```

### Where this lives
**Custom admin route at `/owner/partnerships`** in coastal-web, NOT Stepper, NOT Taskade.

Reasoning:
- Stepper is a customer-order state machine per `reference_coastal_payments_via_stepper_paperform.md`. Repurposing it for B2B leads dilutes its single responsibility.
- Taskade is the canon wiki / project surface. It's good for org docs, weak for structured CRM lists.
- A purpose-built admin page reads/writes `partnership_outreach` directly, ships in days, and stays inside the existing auth boundary (owner-only, behind ACHEEVY login).

### UI sketch
```
/owner/partnerships
├── Queue (status = queued)              [count badge]
├── In conversation                       [count badge]
├── Warm / proposing                      [count badge]
├── Closed: partners                      [count badge]
└── Closed: declined / dead               [count badge]

Each row: shop name | city | distance from triggering lead | last touch | next action | [open]
```

### Partnership types
| Type | What it means | Coastal upside | Shop upside |
|------|---------------|----------------|-------------|
| **vendor** | Coastal supplies them with bean / matcha | Recurring B2B SKU revenue | Better-priced specialty than current distributor |
| **on_demand_partner** | They appear on Coastal site as a pickup/delivery node | Hyperlocal fulfillment without Coastal opening cafes | Foot traffic + Coastal-driven orders |
| **co_brand** | Joint product (e.g. "Bean & Bay × Coastal Lowcountry Blend") | Marketing leverage + storytelling content | Brand halo + co-marketing spend |

### Trigger detail
A background job (existing `coastal-runner` worker) consumes `lead_locations` rows where `created_at > now - 1h AND processed = false`. For each, it:
1. Calls Google Places Nearby Search if no cache hit.
2. Filters out chains.
3. Picks top 3 by rating × review_count.
4. Inserts `partnership_outreach` rows with status=queued.
5. Marks lead row processed.

No customer-visible side effects. The locator widget is independent — it queries the same `partner_shops` cache for display.

---

## 6. Defensibility moat — surviving LLM commoditization

This is the section that matters. The feature itself is not the moat. The feature is **how we accumulate the moat**. Frame: a generic LLM provider (Claude, OpenAI, Gemini) could build a coffee-survey-to-recipe app in a weekend. They cannot build what this feature *generates* in a weekend, in a year, or arguably ever — because what it generates is a real-world graph of human relationships, anchored in a curated cultural lens, fronted by a brand that has its own voice and pronunciation engine.

### Moats Coastal already has (today)

1. **Brand-as-memory** — Per `reference_agentic_os_ip_layer_synthesis_2026_05_03.md`, the voice/persona/register-modulation library *is* the IP layer. Coastal owns:
   - The flying-stork mark + "Nothing Chemically, Ever." motto (`reference_coastal_official_brand_canon_2026_04_30.md`)
   - Sal_Ang customer-facing voice (Brandon clone, Black-Am lead-barista persona, owner-approved 2026-05-03)
   - ACHEEVY internal escalation voice (Nas Queensbridge baritone IVC clone, `reference_acheevy_voice_shipped_canon_2026_05_03.md`)
   - 47-rule pronunciation engine with 6 priority-ordered YAML packs (`reference_pronunciation_library_installed_2026_05_03.md`)
   - Belter Creole register-modulator at LLM layer
   An LLM provider can rent out a model. They cannot rent out a brand that says "Achievee" on TTS while displaying ACHIEVEMOR everywhere else.

2. **Real-world fulfillment substrate** — Temecula partnership (`reference_temecula_supplier_canon_2026_04_30.md`) is a signed, MOQ-defined, FDA-compliant supplier relationship with Shopify-only fulfillment, 12u/SKU bulk, mushroom strict-lane compliance, Thursday onboarding cadence. An LLM cannot ship beans. We can.

3. **Owner-curated taste matrix** — The recipe page is not LLM-generated. It is opinions from the owner about which Yirgacheffe pairs with cardamom and why a Vietnamese phin should go with robusta-blend, not arabica. This is *cultural* IP, not data. It compounds as the owner adds entries.

### Net-new moats this feature unlocks

4. **Hyperlocal partnership graph** — The `partner_shops × partnership_outreach × deal_status` graph compounds. Each closed partnership is a real human relationship: someone met someone, agreed terms, signed a co-brand deal. Three years in, the graph is hundreds of small-shop nodes across the Lowcountry and beyond, each one a fulfillment endpoint AND a recommendation source. **This cannot be cloned by a competitor running the same survey** because the relationships are 1:1 and exclusivity is a natural by-product (a small shop won't sign with two roasters offering the same lane).

5. **Geo-survey first-party data flywheel** — Every survey response is owned by Coastal: zip, drink mix, travel memory, willingness to support indies, email. After 12 months at modest LinkedIn ad spend, this is a 5-10k-row first-party panel of US specialty-drink consumers, geo-tagged, intent-tagged. LLM providers do not have this. Meta/Google have *more* data but it's not specialty-drink-intent labeled, and their TOS prevents Coastal-style monetization. This dataset becomes a second product (anonymized trend reports for indie coffee press, partner shops, supplier R&D).

6. **Recipe-page cultural canon as moat content** — Per `feedback_only_acheevy_speaks_to_users_on_coastal_chat.md` (now superseded by Sal-front + ACHEEVY-escalation per `feedback_sal_ang_customer_facing_acheevy_escalation_2026_05_03.md`), customer-facing copy is voice-distinctive. Recipe cultural notes written in Sal_Ang's voice (lead-barista, warm, specific) are not interchangeable with a generic LLM-generated recipe. The voice IS the moat — even if Claude/GPT/Gemini becomes free tomorrow, none of them write like Sal_Ang because Sal_Ang's voice is owner-curated and lives in a YAML pronunciation/register layer Coastal controls (`reference_pronunciation_library_installed_2026_05_03.md`).

7. **Defense against upstream rug-pull** — This is the most important new moat. If Anthropic raises Claude prices 10x, or OpenAI bans coffee-related queries, or Google deprecates Gemini 3.1 Flash for our use case, **Coastal's customer-facing surface keeps working.** Why: Sal_Ang's voice canon is recorded WAVs + IVC clone IDs. The pronunciation engine is YAML on disk. The recipe matrix is in Postgres. The partnership graph is real humans with phone numbers. The model layer is swappable; the brand/relationship/content layer is not. Per `reference_agentic_os_ip_layer_synthesis_2026_05_03.md`, this is the explicit thesis: voice+persona+register-modulation is the second moat, SmelterOS Crucible/A.I.M.S./AVVA NOON is the first.

8. **Why a generic LLM-powered app cannot copy this in a weekend** — Try it. A solo founder uses Claude to spin up a coffee-survey-to-recipe app. They will get: a survey, a recipe matrix (LLM-generated, generic), and a Google Places lookup. They will NOT get: an owner-curated Lowcountry voice, signed Temecula supplier MOQ, a flying-stork brand with a 6-month story, a partnership pipeline with real relationships, or a pronunciation engine. The first three are content; the last five are time + relationships + persistence. Coastal already has 9-12 months of head start on those.

### Anti-moats (things that LOOK like moats but aren't)
- "We have ACHEEVY chat" — chat UX is commodity. The voice is the moat, not the chat.
- "We use Claude/Gemini" — model access is commodity. Don't rely on it.
- "We have a Google Places integration" — anyone can buy that. The PARTNERSHIP PIPELINE off the geo signal is the moat, not the API call.

### Sacred Separation reminder
Per `feedback_tts_samples_must_be_customer_safe_2026_05_03.md` and `feedback_never_publish_internal_tool_names_2026_04_28.md`: customer surfaces NEVER name Anthropic/Google/Inworld, internal personas (LUC, Melli internal-naming), Temecula, model names, or pricing-floor logic. The locator surface says "small shops near you" not "Google Places results." The recipe page says "brewed honest, served by ACHEEVY" not "powered by Claude." This is enforced because it's load-bearing for the moat: the brand, not the stack, is what compounds.

---

## 7. Sequencing — what to build first, second, third

**Phase 1 — Survey + recipe match (week 1)**
- Build Paperform survey with 8 questions above
- Wire webhook to new `coastal-runner` endpoint `/api/v1/intake/drink_survey`
- Schema migration: `survey_responses`, `lead_locations`, `recipes`
- Seed `recipes` table with 10 owner-written entries (matrix in §4)
- Recipe page deep-link routing with UTM params
- Files to touch: `~/foai/coastal-brewing/web/app/recipes/`, `~/foai/coastal-brewing/runner/api_server.py`

**Phase 2 — Locator widget + Google Places integration (week 2)**
- Add Google Places API key to `openclaw-sop5-openclaw-1` container env (per CLAUDE.md secret rule)
- Schema migration: `partner_shops`
- Background worker: cache nearby shops on zip submission
- Locator card component on recipe page sidebar + thank-you screen
- Chain blocklist filter
- Files to touch: `~/foai/coastal-brewing/web/components/locator/`, runner background worker

**Phase 3 — Partnership pipeline admin (week 3)**
- Schema migration: `partnership_outreach`
- Background fan-out: lead_location → outreach card creation
- Admin route `/owner/partnerships` with kanban-by-status view
- Internal-team auth gate (existing ACHEEVY-login owner role)
- Email/DM templates for first-contact (drafted in Sal_Ang voice)

**Phase 4 — LinkedIn ad creative + spend (week 4)**
- Ad creative: 3 variants of the survey-as-question hook
- Targeting: SC + GA + NC zips, 25-55, professional categories
- $500 test budget, optimize for survey completion
- UTM convention: `utm_source=linkedin&utm_campaign=drink_survey_<variant>&utm_term=<region>`
- Read against `reference_coastal_marketing_vault_2026_04_30.md` for tracking conventions

**Out of scope for v1**
- Map UI (rejected — owner directive)
- Multiple survey languages
- Auto-generated recipes (rejected — owner-curated only)
- LinkedIn auto-DM (rejected — TOS risk + Sacred Separation)

---

## 8. Risks + open questions

1. **Google Places cost overrun** — At >50k surveys/month, costs hit $1k+. Mitigation: cache aggressively, add quota cap, escalate to ACHEEVY if approaching limit.
2. **LinkedIn ad TOS** — LinkedIn does not love off-platform redirects to surveys. Need to confirm Lead Gen Form is acceptable substitute or that direct survey-link ads pass review. Open question for owner before ad spend.
3. **Survey-to-purchase conversion unknown** — No baseline. Phase 4 budget is small ($500) for exactly this reason. Tune before scaling.
4. **Partnership outreach voice/identity** — Who signs the email? Sal_Ang is customer-facing per `feedback_sal_ang_customer_facing_acheevy_escalation_2026_05_03.md` but B2B outreach to a shop owner is different from customer-facing. Open question: do we use a real-named human (the owner) for B2B, or Sal_Ang? Recommendation: **owner's real name** for B2B because shop owners want to know who they're dealing with. Customer-facing chat stays Sal/ACHEEVY.
5. **Chain blocklist drift** — New chains appear (Black Rifle, Stumptown-acquired-by-Peets, etc.). Need quarterly review of blocklist.
6. **Geocoding privacy** — Capturing user ZIP via LinkedIn ad funnel has CCPA/GDPR implications. Need privacy policy update + survey footer disclosure.
7. **Recipe page becomes the funnel bottleneck** — If Phase 1 ships and recipes are thin, conversion craters. Owner must commit to ≥10 recipes BEFORE ad spend turns on. Hard gate.
8. **Stepper vs custom admin** — Confidence on §5's "custom admin" recommendation is medium. Reconsider after Phase 2 when scope is clearer; Stepper extension is not impossible if the partnership flow ends up similar to order flow.
9. **Coastal's competitor signal leakage** — Publishing a public locator widget tells competitors which towns Coastal is hunting in. Mitigation: locator returns shops to the user but partnership_outreach status stays internal.
10. **Voice consistency on recipe pages** — Recipe cultural-notes copy must be in Sal_Ang voice. Need owner-written first 10 entries; cannot be LLM-generated without voice review per Sacred Separation. This is a content-velocity bottleneck, not a tech bottleneck.

---

*End of design doc. Implementation pending owner approval per `feedback_owner_approval_boundaries.md` (Coastal docs/04).*
