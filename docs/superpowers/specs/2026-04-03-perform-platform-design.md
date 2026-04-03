# Per|Form Platform — Design Spec

**Date:** 2026-04-03
**Status:** Draft — Pending Review
**Launch Target:** 2026-04-23 (NFL Draft Day, Pittsburgh)
**Domain:** perform.foai.cloud
**Repo:** foai/perform/ (standalone Next.js app)

---

## 1. What Per|Form Is

Per|Form is a **grading and ranking platform for sports** — NFL, college football, and high school recruiting — powered by autonomous AI analyst personas that generate and deliver content 24/7 without human labor.

**The PFF competitor that runs itself.**

NFL Draft is the launch vehicle. After the draft, the platform shifts to college football season, then HS recruiting cycle, and compounds. Each cycle feeds the next.

### Core Capabilities
- **TIE Grading Engine** — Score and rank every player at every level
- **4 Analyst Personas** — Autonomous color analysts with distinct voices, generating scouting reports, podcasts, film breakdowns, debates, and articles
- **Mock Draft Simulator** — 7-round engine with team needs, trade scenarios, BPA balancing
- **Recruiting Pipeline** — Multi-prospect tracking for HS → college → NFL pipeline
- **Content Factory** — Autonomous daily content: rankings, reports, podcast scripts, debate recaps
- **NFT Player Cards** — SVG-generated cards with TIE grades and analyst assessments

### What It Is NOT
- Not just an NFL Draft tool (that's launch, not the product)
- Not a digital twin platform (personas are archetype-inspired, not replicas)
- Not tied to any paid LLM for demos (free models only for all public-facing content)

---

## 2. TIE Grading Engine (Talent & Innovation Engine)

Replaces the old "P.A.I." naming. Same formula, new brand. The TIE hexagon badge (gold/black/silver, tie icon in center, 5 stars) is the visual mark.

### Formula (PRIVATE — never exposed to users)

```
TIE Score = (Performance x 0.4) + (Attributes x 0.3) + (Intangibles x 0.3)
```

#### Performance (40%)
- Offense: yards, TD-INT ratio, efficiency, EPA/play, success rate
- Defense: tackles, sacks, INTs, pressures, coverage grade
- Special Teams: return yards, FG%, punt coverage
- Advanced metrics where available (PFF grades, EPA/play)

#### Attributes (30%)
- Speed: 40-yard dash, burst
- Agility: 3-cone drill, shuttle, lateral quickness
- Strength: bench press, block shedding
- Size/Frame: height, weight, wingspan
- Explosiveness: vertical jump, broad jump

#### Intangibles (30%)
- Football IQ: film study habits, processing speed
- Work Ethic: practice habits, discipline
- Competitiveness: clutch performance, effort plays
- Coachability + Leadership: captain status, team impact
- Off-field: NIL presence, character, discipline record

### Grade Scale

| Score | Grade | Label | Draft Context | Badge Color |
|-------|-------|-------|---------------|-------------|
| 101+ | PRIME | Generational Talent | Franchise Player | Gold hexagon, 5 stars |
| 90-100 | A+ | Elite Prospect | Top 5 Pick | Gold |
| 85-89 | A | First-Round Lock | Pro Bowler potential | Blue |
| 80-84 | A- | Late First Round | High Upside Starter | Blue |
| 75-79 | B+ | Day 2 Pick | High Ceiling | Emerald |
| 70-74 | B | Solid Contributor | Day 2 | Emerald |
| 65-69 | B- | Needs Development | Mid-Round | Amber |
| 60-64 | C+ | Depth Player | Late Round | Zinc |
| <60 | C | Practice Squad/UDFA | UDFA | Zinc dim |

### Multi-Level Support
Same formula, different data inputs per level:
- **NFL Prospects:** College stats + combine measurables + film grades
- **College Players:** Game logs + PFF grades + advanced metrics
- **HS Recruits:** MaxPreps stats + camp measurables + film + recruiting rankings

Scores are normalized so a 90 at HS means the same tier of dominance as a 90 at college — different data, same standard.

### IP Protection
- Formula weights are PRIVATE — never sent to frontend, never in user-facing text
- Users see: TIE Score, letter grade, badge, tier label
- Internal: the 0.4/0.3/0.3 split and sub-component weights stay server-side only

---

## 3. The 4 Analyst Personas

### Build Pipeline
1. **ILLA** designs each analyst's visual identity (Boomer_Ang style — helmet/visor, unique outfit/accessories per persona)
2. **NotebookLM** generates the persona data — voice patterns, catchphrases, analysis frameworks, sample takes, personality rules, style guides
3. **Nano Banana Pro 2** generates portrait/character assets from ILLA's designs
4. **Google Lyria** creates production audio (intros, outros, background music)
5. **Voice cloning tool** (elite free/open-source option, or custom-built via Open Mind) generates unique analyst voices matching archetype energy
6. At runtime: **Gemma 4** (free, stripped of telemetry) drives the language, persona notebook provides personality

### Persona Names
**TBD — ILLA + NotebookLM persona build session.** Names will be crafted through the full pipeline, not assigned arbitrarily.

### Archetype Directions (for persona build session)

| Persona # | Archetype Energy | Specialty | Voice Direction |
|-----------|-----------------|-----------|-----------------|
| 1 | Stuart Scott energy — smooth, iconic, poetic | Headlines, breaking news, draft night coverage | "Boo-yah" energy, punchline delivery |
| 2 | Deion Sanders swagger — bold, confident | Player evaluations, recruiting, NIL analysis | No-filter, speaks from experience |
| 3 | Film room grinder (Belichick/McVay type) | Film breakdown, scheme analysis, X's and O's | Methodical, precise, diagram-heavy |
| 4 | Hot-take debate energy (Skip/Stephen A. type) | Hot takes, Bull vs Bear debates, controversy | Loud, provocative, drives engagement |

### How They Work Together
- **Solo content:** Each analyst generates content in their specialty
- **Multi-Analyst Debate (2x multiplier):** Two+ personas argue Bull vs Bear cases, one moderates
- **Autonomous content runs (3x multiplier):** All 4 generate daily content — rankings, reports, podcasts — published without human intervention

### Persona Data as User Assets
NotebookLM-generated notebooks are stored in the user's **dashboard asset folder**:
- Persistent, downloadable, shareable
- **Importable directly into chat** — callable through the SPEAKLY-like chat execution tool
- Analysts reference notebooks during content generation
- Notebooks are living assets, not static files

---

## 4. LUC — The Boomer_Ang Finance Agent

LUC is a full Boomer_Ang character, not just a billing tool.

### Character Design (for ILLA)
- **Same Boomer_Ang helmet/visor** as the rest of the team (orange glow)
- **Three-piece suit** — always sharp, dark charcoal or navy, gold pocket square
- **"LUC" embroidered on suit jacket pocket** (not on visor)
- **TRSTY CALCULATOR** — holographic display projected from his experimental watch (Green Lantern ring mechanic), powered by V.I.B.E. kinetic energy
- **The watch** is the signature gadget — chunky, futuristic, visible energy conduits
- **Scene concept:** ACHEEVY welcoming LUC to the team, LUC holding the TRSTY CALCULATOR projected from his watch

### Role in Per|Form
- Appears before EVERY metered action with cost estimate
- Shows: scope, tokens estimated, cost, time estimate (the LUC project card UI)
- Pre-action transparency — LUC Calculator is always on
- Fractional finance / CPA / number cruncher personality — precise, measured, warm

---

## 5. Grammar — Visible Tech

Grammar is NOT invisible. It is a **visible UI element** — a piece of tech with device-like aesthetics.

### How It Works in Per|Form
- **Active by default** in every prompt — structures user intent before it reaches analysts or TIE engine
- **Always paired with Scenarios** — the tile-based plugin menu
- Users see Grammar as a tool in the interface (tech device visual)
- User says "grade Jeremiyah Love" → Grammar structures it into a TIE engine call with position, school, data sources
- Grammar is the FILTER — ACHEEVY is the executor. Grammar never speaks to users directly.

---

## 6. Billing Model

Inherits the AIMS 3-6-9 framework. Same V.I.B.E. groups, Three Pillars, LUC Calculator.

### Tiers

| Tier | Price | Tokens | Agents | Concurrent |
|------|-------|--------|--------|------------|
| **Buy Me a Coffee** | One-time entry fee | Generous starter pack | 1 | 1 |
| Pay-per-use | 100 tokens / $1 | Metered | 1 | 1 |
| 3-month | $19.99/mo | 100K/mo | 5 | 2 |
| 6-month | $17.99/mo | 250K/mo | 15 | 5 |
| 9-month → 12 delivered | $14.99/mo | 500K/mo | 50 | 25 |

**Buy Me a Coffee** is the front door — low friction, generous credits, get hooked before committing.

**V.I.B.E. Groups:** Individual (1x), Family (1.5x), Team (2.5x + $10/seat), Enterprise (custom).

**Free models (Gemma 4):** Available for chat and exploration at zero credit cost. Credits consumed only on metered actions.

### Per|Form Task Multipliers

| Task Type | Multiplier | Description |
|-----------|-----------|-------------|
| Player Lookup | 0.5x | Quick stats, profile view |
| TIE Grade | 1x | Full scoring — baseline |
| Scouting Report | 1.3x | Deep 2-paragraph eval + comparisons |
| Film Breakdown | 1.5x | Play-by-play analysis, tendencies |
| Mock Draft Sim | 1.8x | Full 7-round simulation w/ rationale |
| Podcast Script | 1.5x | Show-ready script w/ production cues |
| Content Generation | 1.3x | Articles, ranking updates, debate recaps |
| Transfer Portal Alert | 0.8x | Monitoring + notification |
| Recruiting Pipeline | 1.6x | Multi-prospect tracking, pipeline board |
| Multi-Analyst Debate | 2x | 2+ personas arguing Bull vs Bear |
| Autonomous Content Run | 3x | Agent generates + publishes autonomously |

### Three Pillars
Same as AIMS — Confidence (data verification), Convenience (speed), Security (data isolation). Tiers and percentages identical.

### LUC Calculator
Pre-action cost transparency on every metered action. Always on. Shows the TRSTY CALCULATOR display before execution.

---

## 7. Architecture

### Standalone App
- **Repo:** `foai/perform/` — Next.js 15 (App Router)
- **Container:** Own Docker container on myclaw-vps
- **Domain:** `perform.foai.cloud` via Traefik routing
- **DB:** Same Neon Postgres, new `perform_*` tables
- **Auth:** Same Firebase Auth (shared accounts across FOAI)
- **LLM:** Gemma 4 via OpenRouter (free, telemetry stripped) for all demos
- **Coding agent:** Latest highest-rated free model for code generation tasks

### CTI Hub Integration
The existing `/plug/perform` page becomes a **preview card** linking to the full platform at perform.foai.cloud.

### Route Map

| Route | Purpose |
|-------|---------|
| `/` | Landing — TIE badge hero, Buy Me a Coffee, analyst previews |
| `/draft` | NFL Draft Board — TIE grades, 50+ prospects, filters, trends |
| `/draft/[player]` | Player detail — full TIE breakdown, report, film, NFT card |
| `/draft/mock` | Mock Draft Simulator — 7-round engine, trades, team needs |
| `/college` | College Football hub — team/player rankings by conference (post-draft) |
| `/recruiting` | HS Recruiting board — class rankings, commitments, camps (post-draft) |
| `/analysts` | Meet the analysts — profiles and latest takes |
| `/analysts/[name]` | Individual analyst feed |
| `/debate` | Bull vs Bear — multi-analyst debate format |
| `/podcast` | Podcast engine — scripts + Lyria audio + voice clone playback |
| `/dashboard` | User dashboard — asset folder, usage, billing |
| `/dashboard/assets` | Notebooks (importable to chat), saved reports, scripts |
| `/pricing` | Per|Form Plans — Coffee + 3-6-9 + multipliers + LUC |

### API Routes

| Endpoint | Purpose |
|----------|---------|
| `/api/tie/grade` | TIE grading engine |
| `/api/tie/mock-draft` | Mock draft simulation |
| `/api/analysts/[name]` | Analyst content generation |
| `/api/podcast/generate` | Script + audio generation |
| `/api/voice/clone` | Voice synthesis for analyst personas |
| `/api/players` | Player CRUD + search + filter |
| `/api/recruiting` | Recruiting pipeline management |
| `/api/notebooks` | Notebook CRUD, import/export |

### Data Pipeline

| Source | What | Frequency |
|--------|------|-----------|
| nflverse (R/Python) | NFL stats, combine, draft history | Daily during draft season |
| ESPN hidden API | Live scores, news, injuries | 6x/day |
| 247Sports / On3 | Recruiting rankings, commitments, NIL | 6x/day |
| MaxPreps | HS stats, camp results | Daily during season |
| Brave Search | News enrichment, trend detection | On-demand |
| User uploads | Custom film notes, stat sheets | On-demand |

---

## 8. Agent Architecture

| Agent | Role | Runtime |
|-------|------|---------|
| **ACHEEVY** | Orchestrator — routes user intent to the right analyst/action | Gemma 4 |
| **LUC** | Pre-action cost display, billing, token tracking. TRSTY CALCULATOR. | Internal logic (no LLM) |
| **4 Analyst Personas** (TBD names) | Content generation with persona personality from NotebookLM-generated notebooks | Gemma 4 + persona notebook |
| **Grammar** | Visible tech — structures every prompt by default, always paired with Scenarios | Gemma 4 |

### Custom Swarm Execution (OpenHands-style, built in-house)
Build our own parallel agent execution system — multiple agents work simultaneously on subtasks, merge results. Same pattern as OpenHands swarm coding but:
- **No OpenHands CLI dependency** — fully custom implementation
- Runs through **Chicken Hawk → Lil_Hawks pipeline**
- Agents pick up subtasks, work in parallel, merge results
- Used for: multi-analyst content runs, large scouting batches, mock draft simulations

### SPEAKLY-like Chat Execution
The chat interface supports:
- **Notebook import** — pull a notebook into the active conversation
- **Callable actions** — trigger TIE grades, analyst takes, podcast generation from chat
- **Voice + text parity** — say it or type it, same result
- **Grammar active by default** — every input is structured before execution

### Gemma 4 Privacy
- **Strip all monitoring/telemetry** — no Google tracking, no usage data collection
- Self-host if needed, or use a provider verified to not phone home
- If using OpenRouter: verify their data policy explicitly
- Zero data leakage on our work, our users' data, our proprietary formulas

---

## 9. Visual Identity

### TIE Badge
- Hexagon shape, gold/black/silver palette
- "T|E" lettering with tie icon in center
- 5 stars above
- "TALENT & INNOVATION ENGINE" banner below
- Used on: grade displays, NFT cards, analyst content, platform branding

### Platform Brand
- Dark theme — near-black background (#0A0A0F or similar)
- Gold (#D4A853) primary accent
- Silver (#C0C0C0) secondary
- Amber (#FFB300) for active states
- Outfit 800 for headers, Inter for body, IBM Plex Mono for data

### Boomer_Ang Design System
All personas and agents follow the Boomer_Ang visual language:
- Helmet with orange visor glow
- Unique outfit per character (LUC = three-piece suit, analysts = TBD by ILLA)
- Smoke-cloud head aesthetic for the V.I.B.E. origin lore

---

## 10. Launch Phases

### Phase 1: NFL Draft Day (Apr 23)
- Draft Board with 50+ real 2026 prospects, TIE grades
- Player detail pages with full breakdowns
- 4 analyst personas generating draft coverage
- Podcast script engine (text, Lyria audio TBD)
- Mock Draft Simulator
- NFT player cards
- Buy Me a Coffee entry + pricing page with LUC
- perform.foai.cloud live

### Phase 2: College Football Season (Aug-Dec)
- College player grading (game-by-game TIE updates)
- Conference rankings and team pages
- Autonomous daily content from all 4 analysts
- Transfer Portal tracker
- NIL deal feed

### Phase 3: HS Recruiting Cycle (Jan-Feb)
- HS recruiting board with class rankings
- Camp and combine data integration
- Commitment/decommitment alerts
- Recruiting pipeline for schools/families

### Phase 4: Full Platform (Ongoing)
- White-label for creators (branded Per|Form instances)
- Custom swarm execution for bulk operations
- Voice clone integration for all analyst personas
- Full SPEAKLY chat execution
- Female flag football coverage expansion

---

## 11. Open Questions

1. **Buy Me a Coffee price point** — TBD (suggested range: $4.99-$9.99)
2. **Analyst persona names** — TBD (ILLA + NotebookLM build session)
3. **Voice cloning tool** — Source free/open-source option or build via Open Mind
4. **Gemma 4 hosting** — OpenRouter (verify policy) vs self-hosted on VPS
5. **Coding agent model** — Latest highest-rated free model (evaluate at implementation time)
