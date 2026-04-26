# 12 — Front-End Components v2 (Human-less Company Rebuild)

- supersedes: every prior front-end pass on `brewing.foai.cloud`
- triggers: owner directive 2026-04-25 — "tear it all down and rebuild"
- approval gate: this doc must be owner-approved BEFORE any code/image work begins
- build tools: Iller_Ang skill (visuals), 21st-magic MCP (React components), Live Look In (3D), Neon (DB)

---

## 1. Stack decision

| Layer | Current | New |
|---|---|---|
| Frontend | FastAPI + inline HTML strings | **Next.js 15 App Router (React 19, TS strict)** |
| Backend API | FastAPI on `:8000` | FastAPI stays — API-only (`/api/*`, `/route`, `/run`, `/check`) |
| DB | SQLite (`hermes/coastal_brewing.db`) | **Neon Postgres** (same 6 tables) |
| Static | StaticFiles mount | Next.js `public/` + Iller_Ang-generated assets |
| Routing | nginx → FastAPI :8000 | nginx → Next.js :3000 (`/*`) + FastAPI :8000 (`/api/*`, `/route`, `/run`, `/check`, `/approve/click`) |
| Host | aims-vps (`brewing.foai.cloud`) | aims-vps (unchanged — VPS-only per FOAI rule) |

Rationale: 21st-magic emits React components. FastAPI stays untouched as the runtime/orchestrator boundary. Owner hasn't approved Cloud Run for whole-app surfaces.

---

## 2. Surfaces (pages)

| Path | Audience | Purpose | Key components |
|---|---|---|---|
| `/` | Public + agents | Hero + team intro + featured catalog + scrape payload | `Hero`, `TeamRibbon`, `FeaturedGrid`, `JsonLdRoot` |
| `/products` | Public + agents | Full catalog, filterable | `ProductGrid`, `FilterRail`, `JsonLdProducts` |
| `/products/[slug]` | Public + agents | Single product detail | `ProductDetail`, `BuyBox`, `JsonLdProduct`, `RelatedRail` |
| `/chat` | Customer | ChatGPT-style convo with Sal_Ang (Sales) | `ChatShell`, `MessageList`, `Composer`, `ToolTrace`, `AgentHandoffBanner` |
| `/team` | Public + customer | Meet Sal_Ang, Mark_Ang, The Badgers | `TeamCard` × 3, `LiveLookInTrigger`, `SpinnerKitDisplay` |
| `/cart` | Customer | Cart review | `CartLines`, `CheckoutCTA`, `RecommendBundle` |
| `/checkout` | Customer | Stripe Elements | `CheckoutForm`, `OrderSummary` |
| `/audit/[task_id]?token=` | Owner (HMAC) | Receipt envelope for any task | `AuditEnvelope` (preserved) |
| `/me` | Owner (JWT) | Owner dashboard | `OwnerDashboard` (preserved) |
| `/admin/margin` | Owner (JWT) | Margin calc | `MarginConsole` (preserved) |
| `/api/*`, `/route`, `/run`, `/check`, `/approve/click` | System | FastAPI proxied through nginx | (no Next.js render) |

---

## 3. Agents (the human-less workforce) — CORRECTED v2.1

Two teams. **Sales = a single Boomer_Ang. Marketing = The Sett (13 Badgers under Melli Capensi).** Both use Spinner.

Canonical reference: `~/foai/coastal-brewing/refs/badgers/THE_SETT_CHARTER.md` (Sett Charter Delta v2.0).

### 3.1 Sales — Sal_Ang (Boomer_Ang)
- **Surface**: `/chat` primary, embedded `<ChatPanel agent="sal"/>` on `/products/[slug]`
- **Role**: Single point of customer-facing transaction. Recommends, bundles, checks out, escalates.
- **Spinner kit**: `recommend_bundle`, `add_to_cart`, `apply_discount` (bounded by `suggest_max_deal_discount()` floor in `catalog.py`), `start_checkout`, `handoff_to_sett` (when marketing-shaped intent detected — content/social/PR/funnel-stage question), `escalate_to_owner`
- **Tone**: Lowcountry-warm, transactional, brief.
- **Tool trace**: every Spinner call renders as a collapsible `<ToolTrace/>` card (NemoClaw verdict shown when `escalate_to_owner` fires).
- **Avatar**: Iller_Ang-generated character art per Boomer_Ang theming memory (3 canonical poses: tactical / hoodie / workstation; tinted visor + colored ANG patch).

### 3.2 Marketing — The Sett (per Sett Charter v2.0) — Coastal scope: ONE MEMBER

**Owner directive 2026-04-25**: Coastal Brewing activates exactly **one** Sett member as its full marketing function. The other 12 stay seated and unrendered until/unless a separate Coastal expansion is approved.

**Member selection: TBD** (see §10 Q4). Candidates fitting Coastal's small-batch coffee/tea brand:
- **Melli Capensi** (head; broadest mandate, default if unspecified)
- **Persona Tah** (creator economy / UGC — strong fit for coffee-community angle)
- **Mar Ché** (virality / PR / earned media — strong fit for launch wave)
- **Eve Retti** (vertical specialty — strong fit for "specialty coffee + ceremonial matcha" niches)
- **Arcto Nyx** (first-party CRM / email — strong fit if subscription growth is the priority)

The selected member inherits the entire Sett discipline (BARS internal → polished English with Cultural Attribution header on customer-facing output) but operates solo. They report to ACHEEVY directly per charter §3. Cross-team execution still routes through Chicken Hawk per §12.

#### Melli Capensi — Head of the PMO
- **Taxonomy**: *Mellivora capensis* (Honey Badger). Female. North-East Amexem seed.
- **Surface**: `/team` primary card; addressable in `<ChatPanel agent="melli"/>` when Sal_Ang hands off marketing intent.
- **Role for Coastal**: Owns Coastal's marketing P&L, Funnel System strategy, sign-off on every public-facing asset before it leaves The Sett.
- **Spinner kit**: `draft_campaign_brief` (BARS-native), `dispatch_bg` (routes to a specific BG below), `funnel_design` (calls Meles Mehli), `forecast_funnel` (calls Java Nessa), `sign_for_culture_attribution` (final gate before publish), `escalate_to_acheevy`
- **Voice**: Pan-Amexem cadence — internal stanzas in BARS at 432 Hz; customer-facing output renders as polished English via `/summarize` resolution. Cultural Attribution header shown in footer/metadata.
- **Avatar**: Iller_Ang per charter §14 — bipedal, articulate, 5'2"–5'10", glowing eyes, single shared Sett uniform with Kemetic-ankh brass collar pin + narrow gold Nile-line cuff stitch (her Amexem markers).

#### The 12 BG'z — Coastal funnel ownership
For Coastal's first cycle, the relevant BG'z are pre-assigned per funnel stage. The full roster stays available; not all activate per campaign.

| Funnel stage | Primary BG | Coastal-specific job |
|---|---|---|
| **1 Surface** (Awareness) | **Taxi Dea** (programmatic) + **Mar Ché** (PR) | Top-of-funnel paid digital + earned-media for Coastal launch |
| **2 Entrance** (Interest) | **Arcto Nyx** (first-party) | CRM/email capture, pixel deploy on `brewing.foai.cloud` |
| **3 Tunnel** (Consideration) | **Ana Kuma** (creative narrative) + **Meles Mehli** (architect) | Story arc on origin/sourcing; tunnel design in Sett Canvas |
| **4 Sett-Chamber** (Evaluation) | **Eve Retti** (vertical) | Specialty-coffee + ceremonial-matcha vertical-deep messaging |
| **5 Exit** (Conversion) | **Meles Mehli** (UX) | `/checkout` conversion-point optimization |
| **6 Home Chamber** (Retention) | **Persona Tah** (creator-led onboarding) | Subscription onboarding flow |
| **7 Clan** (Advocacy) | **Mar Ché** (virality) + **Persona Tah** (UGC flywheel) | Customer-as-advocate amplification |
| Cross-stage attribution | **Java Nessa** (forecasting + multi-touch) | Live forecast + brand-safety on every funnel run |
| Cross-region | **Leu Kurus** (i18n + GDPR/CCPA) | Compliance-Gate before any public push |
| Emerging surfaces | **Cuc Phuong** (Web3/AI-native) | Agent-to-agent ad protocol on `brewing.foai.cloud` (ties to §7 scrape spec) |

Other BG'z (**Moscha Tah** video stack, **Orien Talis** social/native) hold seats and activate when Coastal's media plan calls for them.

#### Spinner usage across The Sett
Every BG dispatches via `hawk.foai.cloud/chat` (already wired in `scripts/adapters/lil_hawks.py`). Internal Sett dispatch goes Melli → BG'z. Customer-facing output always passes through `/summarize` to render polished English with the Cultural Attribution header.

### 3.3 Owner-loop (unchanged)
- All Spinner calls write Hermes receipts (Neon-backed).
- NemoClaw `/check` (embedded in Chicken Hawk) gates `escalate_to_owner` and any `BLOCKED_ACTIONS` attempt.
- One-click HMAC approve/reject preserved via `@CoastalBrewBot` Telegram bot.
- Melli's `sign_for_culture_attribution` writes a dedicated receipt row before any public-facing asset goes live.

---

## 4. Component inventory (atomic → composite)

### Primitives (21st-magic generated)
- `<Button variant=primary|ghost|destructive size=sm|md|lg/>`
- `<Input/>`, `<Textarea/>`, `<Select/>`
- `<Badge/>`, `<Avatar/>`, `<Skeleton/>`
- `<Card/>`, `<Sheet/>`, `<Dialog/>`, `<Drawer/>`
- `<Tabs/>`, `<Accordion/>`, `<Tooltip/>`

### Brand atoms (Iller_Ang)
- `<Logo/>` (lockup + mark variants)
- `<MockBackdrop variant=dark|light/>` (uses real photography from Iller_Ang, NOT cropped mock-dark.png placeholders)
- `<SpinnerKitChip tool="recommend_bundle"/>` (boomerang icon + tool name)

### Domain composites
- `<Hero/>` — full-bleed photography, headline, dual CTA (Shop / Talk to Sal_Ang)
- `<TeamRibbon/>` — horizontal strip: Sal_Ang on the left (Sales), Melli Capensi on the right (Marketing / The Sett); click → `/team` or open inline `<ChatPanel agent="sal"|"melli"/>`
- `<TeamCard agent="sal"|"melli"/>` — full character portrait, role, Spinner kit chips, Live Look In trigger
- ~~`<SettGrid/>`~~ — REMOVED for Coastal v1 (one Sett member only; no group composition needed)
- `<BarsAttribution/>` — small footer/metadata badge: *"This work is based on the BARS Notation (Based on Articulated Rhyme Structure), an innovation by ACHIEVEMOR. BARS is rooted in the cultural essence of Hip-Hop and the principle of 432 Hz Resonance, designed for the Vibe Coding era."* Renders on every page that displays Sett-produced content (per charter Appendix C).
- `<ProductCard slug=.../>` — real product photo, name, price, "Ask Sal_Ang" inline button, Schema.org microdata
- `<ProductDetail slug=.../>` — gallery + buy box + ingredients + sourcing + claims footer
- `<ChatShell/>` — full-screen ChatGPT-like layout (sidebar history + message list + composer)
- `<ChatPanel agent=.../>` — embeddable inline version (used on product pages)
- `<MessageList/>` — turns rendered with agent avatar; `<ToolTrace/>` cards interleaved
- `<Composer/>` — text input + voice input stub + product-attach affordance
- `<AgentHandoffBanner from="sal" to="mark"/>` — visible when Sal_Ang escalates a marketing-shaped question to Mark_Ang
- `<LiveLookInTrigger agent=.../>` — opens `<LiveLookInViewer/>` modal
- `<LiveLookInViewer agent=.../>` — Cosmos/HeyGen-v4-driven 3D character; GPU-on-demand (feature-flagged; falls back to looping Seedance video when GPU unavailable)
- `<RecommendBundle context="cart"|"product"/>` — calls `/api/recommend`, renders bundle card
- `<CartDrawer/>`, `<CartLines/>`, `<CheckoutForm/>`, `<OrderSummary/>`
- `<AuditEnvelope task_id=.../>` (preserved from current build, restyled)
- `<OwnerDashboard/>` (preserved, restyled)
- `<MarginConsole/>` (preserved, restyled)

### Scrape payload (invisible to humans, structured for agents)
- `<JsonLdRoot/>` — Schema.org `Organization` on `/` layout
- `<JsonLdProducts/>` — `ItemList` of all SKUs on `/products`
- `<JsonLdProduct slug=.../>` — `Product` + `Offer` + `Brand` per detail page
- `<JsonLdFAQ/>` — `FAQPage` on `/team` (Sal_Ang/Mark_Ang/Badgers Q&A)
- `robots.txt` — allow well-behaved AI crawlers (GPTBot, Claude-Bot, PerplexityBot, etc.); explicit allow rules
- `sitemap.xml` — auto-generated from catalog + static pages
- `/api/schema/products` — JSON-LD blob endpoint for direct agent fetch
- OG + Twitter Card meta on every page

---

## 5. Backend changes (Neon migration)

### Replace `scripts/hermes_db.py` (sqlite3 → psycopg async)
- Same 6 tables, same column shapes
- Connection: `DATABASE_URL=postgres://...neon.tech/...`
- Pool via `psycopg_pool.AsyncConnectionPool`
- Migration script: `scripts/migrate_sqlite_to_neon.py` — dumps current SQLite, replays inserts into Neon

### Preserve
- HMAC tokens (no schema change)
- NemoClaw `/check` integration (Chicken Hawk on myclaw-vps, unchanged)
- Telegram bot `@CoastalBrewBot`

### New endpoints (FastAPI)
- `GET /api/agents` — Sal_Ang + Mark_Ang + Badgers metadata (powers `/team` and `<TeamRibbon/>`)
- `POST /api/chat/send` — replaces current `/chat/send`; agent-aware (`agent=sal|mark`)
- `GET /api/schema/products` — JSON-LD blob
- `GET /sitemap.xml`, `GET /robots.txt`
- `POST /api/livelookin/session` — provisions a 3D session (returns session_id + viewer URL); behind feature flag

---

## 6. Live Look In integration

### Where it shows up
- `<LiveLookInTrigger/>` on each `<TeamCard/>` (Sal_Ang, Mark_Ang)
- "View in 3D" CTA on selected `<ProductDetail/>` pages (e.g. ceremonial matcha, signature blends — agent-render of the bag/packaging in 3D)

### How it works
- Click trigger → `POST /api/livelookin/session` returns viewer URL
- `<LiveLookInViewer/>` mounts iframe / WebGL canvas
- Backed by Cosmos-Transfer2.5 (per Session 3 / Broad|Cast memory) when GPU available
- **GPU-on-demand**: HF Jobs or 2× GCE H100 (per Broad|Cast handoff memory — quota currently zero, owner-tracked)
- **Fallback**: looping Seedance-rendered 360° video when GPU unavailable (so the surface never breaks)
- Feature flag: `NEXT_PUBLIC_LIVELOOKIN_ENABLED` — defaults `false` until GPU wired

### What the user sees in MVP (GPU not yet wired)
- Trigger visible, click opens modal with looping Seedance 360° video of the agent
- Caption: "Live 3D session is queued — currently rendered video while GPU spins up"
- No broken state

---

## 7. Agent-friendly scraping spec

### Goal
A GPT-style buying agent should be able to:
1. Hit `/` and learn what Coastal Brewing sells (Organization + ItemList JSON-LD)
2. Hit `/products` and get the full SKU catalog as structured data
3. Hit `/products/[slug]` and get Product + Offer + Brand for that SKU
4. POST to a documented `/api/order` endpoint (future) for agent-driven checkout
5. Read `robots.txt` and know which paths are allowed

### Implementation
- All product data rendered server-side (Next.js Server Components)
- JSON-LD inline on every product page
- Microdata (`itemtype`, `itemprop`) on `<ProductCard/>`
- Open Graph + Twitter Card per surface
- `meta name="ai-content"` declaring agent-readable surfaces
- Public `/api/catalog` (already exists) + new `/api/schema/products` JSON-LD endpoint
- `robots.txt` explicit allow for: GPTBot, Claude-Bot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai, ChatGPT-User
- Disallow: aggressive scrapers (Bytespider, etc.) — not because we hide, but because they ignore politeness

### NOT in scope yet
- Agent-driven checkout endpoint (`/api/order` POST with product+payment) — Phase 2

---

## 8. Build phases

### Phase 0 — owner approves this doc
No code touched until this doc is signed off.

### Phase 1 — image kit (Iller_Ang) — Coastal scope (1 Sett member + Sal_Ang)
- **Sal_Ang** character art: hero 3/4 portrait + full-body Spinner-equipped pose + workstation/storefront action pose. Recraft V4 Pro (cinematic realism per Shield Division memory).
- **Selected Sett member** character art per Sett Charter §14: hero 3/4 portrait → full-body pose → role-appropriate action pose → BARS-stanza banner. Recraft V4 Pro for portraits, Ideogram 3.0 for BARS banner (text legibility).
- **Hero product photography** (replaces cropped mock-dark.png placeholders): real coffee bag, real tea tin, real ceremonial matcha kit. 11 SKU shots total.
- Output: `~/foai/coastal-brewing/static/iller/{sal_hero,sal_full,sal_action,sett_member_hero,sett_member_full,sett_member_action,sett_member_bars,hero_*,product_*}.{png,webp}`
- **Uniform base design**: charter Appendix B is open — owner ratification needed (tactical-operational / PMO-professional / hybrid) for the one selected member only.
- **Other 12 BG'z + group + couple portraits**: explicitly OUT OF SCOPE for Coastal v1 per owner directive 2026-04-25.

### Phase 2 — Next.js scaffold
- `~/foai/coastal-brewing/web/` — Next.js 15 + TS strict + Tailwind + shadcn-ui
- 21st-magic emits primitives + composites
- Wire Iller_Ang assets
- Wire `/api/*` to existing FastAPI

### Phase 3 — Neon migration
- Provision Neon DB
- Run `migrate_sqlite_to_neon.py`
- Swap `hermes_db.py` to psycopg async
- Smoke-test all 6 tables

### Phase 4 — Live Look In surface (feature-flagged)
- `<LiveLookInTrigger/>` + `<LiveLookInViewer/>` shipped with Seedance fallback
- GPU wiring deferred to owner credential handoff

### Phase 5 — agent-scraping payload
- JSON-LD components shipped
- robots.txt + sitemap.xml deployed

### Phase 6 — nginx cutover
- nginx routes `/*` to Next.js :3000, `/api/*` + `/run` + `/route` + `/check` + `/approve/click` to FastAPI :8000
- Old FastAPI HTML routes deleted
- Lighthouse + Schema.org validator + agent-fetch smoke test

---

## 9. Out of scope (this doc)

- Agent-driven checkout (`POST /api/order` with payment) — Phase 2 of agent-scraping
- Voice composer in `<ChatShell/>` — stubbed, defer wiring
- Mark_Ang autonomous post-scheduling — defer
- Multi-agent debate UI — defer
- Mobile app — defer

---

## 10. Open questions for owner

1. **Sal_Ang character direction** — tactical / hoodie / workstation (per Boomer_Ang theming memory)? Tinted visor color + ANG patch color for the Coastal Sales lane?
2. **Sett uniform base design** — charter Appendix B item 2: tactical-operational cut, PMO-professional cut, or hybrid? Iller_Ang waits on this before rigging Melli.
3. **BARS surfacing on customer chat** — When Melli or a BG handles a customer marketing question, do we (a) keep all output in polished English with a small Cultural Attribution badge in the footer, or (b) optionally show the BARS stanza in a collapsible "see the original brief" expander? Charter says public-facing always renders polished — confirming default is (a).
4. **Sett activation depth for Coastal v1** — start with Melli + Mar Ché + Persona Tah + Java Nessa (smallest functional crew), or activate all 13 from launch? Charter prefers activation per campaign need.
5. **Entandra extension merge** — `entandra-sett-extension.json` and validator already in `~/foai/coastal-brewing/refs/badgers/`. Do we run the merge into `BARS-by-ACHIEVEMOR/dictionaries/entandra.json` as part of this rebuild, or hold for a separate Sett-wide ratification PR?
6. **Neon project name** — `coastal-brewing` standalone, or part of an existing FOAI Neon project?
7. **Live Look In GPU handoff** — wait for H100 quota, or proceed with Seedance fallback only and ship now? Live Look In on `/team` would let users *see* Melli at the PMO podium and Sal_Ang in workstation pose in 3D; without GPU we render the looping Seedance variant.
8. **Cutover plan** — blue/green (parallel deploy on a `v2.brewing.foai.cloud` then DNS swap) or in-place replace?

