# A.I.M.S. — Antigravity Handoff (Feb 20, 2026)

> **Repo:** `BoomerAng9/AIMS`
> **Branch:** `main` (feature branches merge via PR)
> **VPS:** `76.13.96.107` (`srv1328075.hstgr.cloud`)
> **Domains:** `plugmein.cloud` (lore) | `aimanagedsolutions.cloud` (functions)
> **GCP Project:** `ai-managed-services`

---

## Current Completion: 43%

```
DONE:     9 items  (P0.1-6, P0.9-10, P1.5-6, P2.3, P2.7)
PARTIAL: 10 items  (P0.7-8, P1.1-4, P1.7-8, P2.1-2)
MISSING:  4 items  (P2.4-6)
```

---

## Recent Commits (HEAD)

| Commit | Summary |
|--------|---------|
| `1446018` | **NFL Draft platform** — mock draft engine, simulator, CFBD API client |
| `bb429d3` | **Per\|Form database layer** — Prisma models + Brave Search enrichment |
| `67f3c57` | **Hangar + Mission Control** — URL params, duplicate header fix, button wiring |
| `6bd7848` | **Landing page polish** — design system textures, team names in conference cards, mobile Big Board |

---

## Architecture Overview

```
plugmein.cloud → nginx (:80/443) → Frontend Next.js (:3000)
                                  → UEF Gateway (:3001) → ACHEEVY (:3003)
                                                        → Redis (:6379)
                                                        → Agent Bridge (:3010)
                                                        → n8n (:5678)
                                                        → House of Ang (:3002)

SSL: Host certbot (apt), certs at /etc/letsencrypt, bind-mounted into nginx
CI:  GitHub Actions → Cloud Build → Artifact Registry (build+push only, no Cloud Run)
GPU: Vertex AI Endpoints for PersonaPlex / Nemotron inference
```

**15 default containers:** nginx, frontend, demo-frontend, uef-gateway, house-of-ang, acheevy, redis, agent-bridge, chickenhawk-core, n8n, circuit-metrics, ii-agent, ii-agent-postgres, ii-agent-tools, ii-agent-sandbox

**Optional profiles:**
- `--profile tier1-agents` → research-ang, router-ang
- `--profile ii-agents` → agent-zero
- `--profile perform` → scout-hub, film-room, war-room

---

## Per|Form / Gridiron — Full File Inventory

### UI Pages (`frontend/app/sandbox/perform/`)

| File | What it does |
|------|-------------|
| `page.tsx` | Per\|Form Hub — main sports landing |
| `big-board/page.tsx` | Big Board — ranked prospect list |
| `content/page.tsx` | Content Feed — articles, podcasts, debates |
| `directory/page.tsx` | Conference Directory — 131 CFB teams across 9 conferences |
| `draft/page.tsx` | NFL Draft Hub — landing page |
| `draft/mock/page.tsx` | Mock Draft Board — completed 7-round draft display |
| `draft/simulator/page.tsx` | Draft Simulator — interactive pick-by-pick |
| `prospects/[slug]/page.tsx` | Prospect Profile — P.A.I. grade, scouting, NIL |

### Library (`frontend/lib/perform/`)

| File | What it does |
|------|-------------|
| `cfbd-client.ts` | **CFBD API client** — teams, games, records, player stats, recruits, draft picks, rankings. Uses `CFBD_API_KEY`. **BEING REPLACED** (see Data Source Migration below) |
| `conferences.ts` | Static conference/team data (131 teams) |
| `data-service.ts` | Core data service — seeds DB, enriches via Brave Search, reads from Prisma |
| `mock-draft-engine.ts` | Draft engine — 32 teams x 7 rounds, position value scoring, fit scoring |
| `seed-draft-data.ts` | Seed helpers for draft data |
| `seed-prospects.ts` | Curated prospect seed data |
| `subscription-models.ts` | Subscription tier definitions |
| `types.ts` | Shared types — Prospect, Tier, Trend, ContentType, style maps |

### API Routes (`frontend/app/api/perform/`)

| Route | Methods | What it does |
|-------|---------|-------------|
| `content/route.ts` | GET | Content feed (tries War Room, falls back) |
| `draft/route.ts` | GET, POST | Draft prospects + seeding |
| `draft/generate/route.ts` | POST | Run `generateMockDraft()` |
| `draft/simulate/route.ts` | GET, POST, PUT | Simulator state + pick advancement |
| `enrich/route.ts` | POST | Single prospect Brave Search enrichment |
| `ingest/route.ts` | GET, POST | Upsert prospects, discovery, full seed |
| `prospects/route.ts` | GET | Read prospects (DB → Scout Hub → seed fallback) |
| `teams/route.ts` | GET | Teams with conference filter |

### Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `PerformConference` | CFB conference (name, abbrev, logo) |
| `PerformTeam` | CFB team (school, mascot, location, colors) |
| `PerformTeamSeason` | Season records (W/L, rankings, bowl games) |
| `PerformProspect` | Recruiting prospect (P.A.I. grade, tier, NIL) |
| `PerformContent` | Content articles/podcasts |
| `DraftProspect` | NFL draft prospect with grades |
| `NFLTeamNeeds` | Team positional needs + draft order |
| `MockDraft` | Mock draft instance (year, status) |
| `DraftPick` | Individual pick (round, pick #, team, prospect) |

---

## Data Source Migration: CFBD → ncaa-api + Kaggle

### Why
CFBD API is capped at **1,000 requests/month** on the free tier. The current `cfbd-client.ts` makes 130+ calls just for `getHistoricalRecords()` (one per team). That burns the entire monthly budget in a single seed operation.

### New Architecture

```
Per|Form Data Layer
├── LIVE DATA ──► ncaa-api (self-hosted Docker container, port 3000)
│   ├── /scoreboard/football/fbs/{year}/{week}  → live scores
│   ├── /game/{id}/boxscore                     → box scores
│   ├── /game/{id}/play-by-play                 → PBP data
│   ├── /rankings/football/fbs/{poll}           → AP/CFP/Coaches
│   ├── /standings/football/fbs                 → conference standings
│   ├── /stats/football/fbs/{year}/team/{id}    → team stat leaders
│   ├── /stats/football/fbs/{year}/individual/{id} → player stat leaders
│   ├── /schools-index                          → full school directory
│   └── /logo/{school}.svg                      → school logos (SVG)
│
├── HISTORICAL DATA ──► Kaggle CSVs (downloaded once, loaded at build)
│   ├── jacklichtenstein/espn-nfl-draft-prospect-data  → draft picks 1967-present
│   ├── mitchellweg1/nfl-combine-results-dataset       → combine data 2000-2022
│   ├── dubradave/college-football-portal-and-recruiting → recruiting + portal
│   └── cviaxmiwnptr/college-football-team-stats-2002   → 20+ yrs team stats
│
└── cfbd-client.ts ──► DELETED (replaced by above)
```

### Replacement Map

| CFBD Function | New Source | Notes |
|---------------|-----------|-------|
| `getTeams()` | ncaa-api `/schools-index` + `/logo` | Full directory + logos |
| `getGames()` | ncaa-api `/scoreboard` + `/game/{id}` | Live, 45s cache |
| `getTeamRecords()` | ncaa-api `/standings` | W/L/PCT/streak |
| `getPlayerSeasonStats()` | ncaa-api `/stats/.../individual/{statId}` | Stat leaders |
| `getRecruits()` | Kaggle `dubradave/...` | Bulk CSV |
| `getTeamRecruitingRanks()` | Kaggle `dubradave/...` | Team ranks |
| `getDraftPicks()` | Kaggle `jacklichtenstein/...` | 13k+ prospects |
| `getTransferPortal()` | Kaggle `dubradave/...` | Portal entries |
| `getRankings()` | ncaa-api `/rankings/football/fbs/{poll}` | AP, Coaches, CFP |
| `getHistoricalRecords()` | Kaggle `cviaxmiwnptr/...` | No more 130+ API calls |
| `getHistoricalDraftPicks()` | Kaggle + combine dataset | Draft + combine merged |

### ncaa-api Details
- **Repo:** `henrygd/ncaa-api` (MIT license, 210 stars, actively maintained)
- **Docker:** `docker run -p 3000:3000 henrygd/ncaa-api`
- **Stack:** Bun + ElysiaJS, compiles to standalone binary
- **Data sources:** NCAA GraphQL API (2025+), NCAA Casablanca JSON (legacy), HTML scraping (stats/rankings)
- **Caching:** 45s for live data, 30min for stats/rankings
- **Access control:** Optional `NCAA_HEADER_KEY` env var
- **Bonus data CFBD didn't have:** box scores, play-by-play, scoring summaries, school SVG logos

### Kaggle Datasets

| Dataset | Records | Coverage |
|---------|---------|----------|
| `espn-nfl-draft-prospect-data` | ~13,000 prospects | 1967–present |
| `nfl-combine-results-dataset` | ~6,000 athletes | 2000–2022 |
| `college-football-portal-and-recruiting` | Varies | Recent years |
| `college-football-team-stats-2002` | 20+ seasons | 2002–Jan 2024 |

---

## What Still Needs Work (Priority Order)

### HIGH — In Progress

| Item | Status | What's Left |
|------|--------|-------------|
| **Data Source Migration** | PLANNED | Add ncaa-api to docker-compose, create `ncaa-client.ts` + `kaggle-data.ts`, delete `cfbd-client.ts`, update imports |
| **Per\|Form Lobby** (P1.4) | PARTIAL | Draft hub + simulator built; need live game data, real content feed |
| **Voice I/O** (P0.7) | PARTIAL | Keys cemented (Groq/ElevenLabs/Deepgram); needs end-to-end wiring |
| **Auth Flow** (P0.8) | PARTIAL | Pages exist; needs Google OAuth client ID/secret |

### HIGH — Landing Page

| Item | Notes |
|------|-------|
| Apply `stitch-nano-design.skill.md` design system | Colors, typography, texture, motion |
| Conference cards | Currently show team names + color dots — needs polish |
| Big Board mobile | Table needs responsive work |
| Hero images | Verify `/public/images/acheevy/elder-ceremony-hero.jpeg` and `/public/assets/port_dock_brand.png` exist |

### MEDIUM

| Item | Status |
|------|--------|
| Stripe 3-6-9 integration (P1.7) | Keys cemented, needs webhook + plan setup |
| n8n workflow automation (P1.8) | Container running, bridge code exists, needs workflow JSON |
| Revenue verticals Phase A (P1.1) | Definitions exist, need chat flow wiring |
| Chat → UEF Gateway full loop | Streaming works, needs model selection + thread persistence |

### LOW / MISSING

| Item | Status |
|------|--------|
| Cloud Run jobs (P2.4) | MISSING — no configs yet |
| CDN deploy pipeline (P2.5) | MISSING — UI exists, no push mechanism |
| PersonaPlex voice (P2.6) | MISSING — skill spec only |
| Workshop pages | Placeholder shells |
| Dashboard sub-pages | Most are shells |

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude Code (deployment rules, architecture, testing) |
| `AIMS_PLAN.md` | Full SOP + PRD + roadmap + requirements checklist |
| `HANDOFF.md` | Frontend handoff doc (recent changes, what needs work) |
| `aims-skills/ACHEEVY_BRAIN.md` | ACHEEVY behavior, skills, hooks, recurring tasks |
| `infra/docker-compose.prod.yml` | Production Docker Compose (15 services + profiles) |
| `deploy.sh` | VPS deployment script |
| `cloudbuild.yaml` | GCP Cloud Build (build+push only) |
| `frontend/prisma/schema.prisma` | Database schema (all Per\|Form models) |
| `frontend/lib/perform/` | All Per\|Form business logic |
| `frontend/app/sandbox/perform/` | All Per\|Form UI pages |

---

## Design System Skills

Load these before making any UI changes:

| Skill | Covers |
|-------|--------|
| `aims-global-ui` | Global layout, responsiveness, typography |
| `aims-landing-ui` | Landing page layout |
| `aims-chat-ui` | Chat stream, input bar, onboarding gate |
| `aims-command-center-ui` | Agent control surfaces |
| `aims-crm-ui` | CRM sidebar, list/kanban views |
| `aims-finance-analytics-ui` | KPI strips, charts, dashboards |
| `aims-workflow-ui` | Workflow builder |
| `aims-content-tools-ui` | Content/research tools |
| `aims-auth-onboarding-ui` | Sign-in, sign-up, profile setup |

Also read: `aims-skills/skills/stitch-nano-design.skill.md` (full design system) and `aims-skills/skills/ui-interaction-motion.skill.md` (interaction patterns)

---

## Build & Test

```bash
cd frontend && npm run build           # Frontend — must pass
cd ../backend/uef-gateway && npm run build  # Backend
cd ../../aims-skills && npm test        # Skills/hooks
```

## Deploy

```bash
# Standard deploy
./deploy.sh --domain plugmein.cloud --landing-domain aimanagedsolutions.cloud

# First-time cert
./deploy.sh --domain plugmein.cloud --landing-domain aimanagedsolutions.cloud --email admin@aimanagedsolutions.cloud
```

---

## Env Vars (Per|Form specific)

| Var | Where | Notes |
|-----|-------|-------|
| `CFBD_API_KEY` | `frontend/.env` | **Being replaced** — 1k req/mo cap |
| `BRAVE_API_KEY` | `frontend/.env` | Prospect enrichment via Brave Search |
| `NCAA_HEADER_KEY` | `docker-compose.prod.yml` | Will be added for ncaa-api container |
| `DATABASE_URL` | `frontend/.env` | `file:./dev.db` (SQLite via Prisma) |

---

## Next Session Priorities

1. **Add ncaa-api container** to `docker-compose.prod.yml`
2. **Create `scripts/fetch-kaggle-data.sh`** to download historical datasets
3. **Write `ncaa-client.ts`** (live data) + **`kaggle-data.ts`** (historical)
4. **Delete `cfbd-client.ts`** and update all imports
5. **Update API routes** (`/api/perform/*`) to use new data sources
6. **Wire draft simulator** to real prospect data from ncaa-api + Kaggle
7. **Test full seed pipeline** without hitting CFBD rate limits
