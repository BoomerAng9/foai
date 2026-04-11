# Per|Form for Podcasters — Draft MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Per|Form for Podcasters portal with NFL data, onboarding, Circuit Box, War Room, and basic Workbench by April 15 so sports podcasters can subscribe and prepare NFL Draft content.

**Architecture:** New `/podcasters/` route namespace within the existing Per|Form Next.js 15 app. Extends Neon Postgres with 6 new tables. NFL 32-team database built by Sqwaadrun (pure Python scraping, zero cost). Circuit Box uses layered 2D compositing (base room + wall asset + color overlay). War Room queries existing `perform_players`, `nfl_draft_picks`, `nfl_combine` tables plus new `nfl_teams`, `nfl_rosters` tables. Firebase Auth for login, Paperform payment links for billing (Stripe wired post-launch).

**Tech Stack:** Next.js 15 App Router, Neon Postgres, Firebase Auth, Sqwaadrun (Python), Paperform, GCS, Tailwind CSS

**Spec:** `perform/docs/perform-for-podcasters-directive-v1.md` (778 lines, 13 sections)

**Deadline:** April 15, 2026 (5 days)

---

## File Structure

### New Files (Create)

```
# Database
perform/migrations/004_podcaster_tables.sql          — 6 new tables
perform/migrations/005_nfl_teams_rosters.sql          — NFL teams + rosters

# Sqwaadrun scraping
smelter-os/sqwaadrun/scripts/scrape-nfl-teams.py     — 32 teams + rosters + coaches
smelter-os/sqwaadrun/scripts/scrape-nfl-depth-charts.py — depth charts + injury

# API routes
perform/src/app/api/podcasters/register/route.ts     — POST registration
perform/src/app/api/podcasters/profile/route.ts      — GET/PUT user profile
perform/src/app/api/podcasters/hawks-schema/route.ts  — GET/PUT mission/vision/objectives
perform/src/app/api/nfl/teams/route.ts               — GET all 32 teams
perform/src/app/api/nfl/teams/[abbrev]/route.ts      — GET team detail + roster
perform/src/app/api/nfl/teams/[abbrev]/roster/route.ts — GET full roster
perform/src/app/api/nfl/coaches/route.ts             — GET coaching staff

# Pages
perform/src/app/podcasters/page.tsx                  — Landing/portal page
perform/src/app/podcasters/onboarding/page.tsx       — Stepper onboarding
perform/src/app/podcasters/dashboard/page.tsx        — Circuit Box home
perform/src/app/podcasters/war-room/page.tsx         — War Room data hub
perform/src/app/podcasters/workbench/page.tsx        — Basic workbench

# Components
perform/src/components/podcasters/CircuitBoxRoom.tsx  — Layered room composite
perform/src/components/podcasters/TeamSelector.tsx    — Team card grid
perform/src/components/podcasters/WarRoomPanel.tsx    — Data panel component
perform/src/components/podcasters/OnboardingStepper.tsx — Multi-step form

# Lib
perform/src/lib/podcasters/plans.ts                  — Plan tiers + feature gates
perform/src/lib/podcasters/team-assets.ts            — Team colors, logos, metadata
```

### Modified Files

```
perform/src/middleware.ts                             — Add /podcasters/ to public prefixes
perform/src/app/layout.tsx                           — Add podcasters nav link
```

---

## WORKSTREAM A: NFL Database (Sqwaadrun — runs first, parallel)

### Task 1: Create NFL teams + rosters schema

**Files:**
- Create: `perform/migrations/005_nfl_teams_rosters.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration 005: NFL teams, rosters, coaches for Per|Form for Podcasters

CREATE TABLE IF NOT EXISTS nfl_teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  abbrev TEXT NOT NULL UNIQUE,
  conference TEXT NOT NULL,  -- AFC / NFC
  division TEXT NOT NULL,    -- East / North / South / West
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  helmet_url TEXT,
  stadium TEXT,
  head_coach TEXT,
  offensive_coordinator TEXT,
  defensive_coordinator TEXT,
  owner TEXT,
  gm TEXT,
  wins_2025 INT DEFAULT 0,
  losses_2025 INT DEFAULT 0,
  draft_picks_2026 JSONB DEFAULT '[]'::JSONB,
  cap_space_2026 NUMERIC,
  top_needs TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfl_rosters (
  id SERIAL PRIMARY KEY,
  team_abbrev TEXT NOT NULL REFERENCES nfl_teams(abbrev),
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_number INT,
  age INT,
  height TEXT,
  weight INT,
  college TEXT,
  experience INT,       -- years in NFL
  contract_status TEXT,  -- signed / UFA / RFA / rookie
  cap_hit NUMERIC,
  stats_2025 JSONB DEFAULT '{}'::JSONB,
  depth_chart_rank INT DEFAULT 1,  -- 1=starter, 2=backup, etc.
  injury_status TEXT,   -- healthy / questionable / out / IR
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_abbrev, player_name, position)
);

CREATE INDEX idx_nfl_rosters_team ON nfl_rosters(team_abbrev);
CREATE INDEX idx_nfl_rosters_position ON nfl_rosters(position);
```

- [ ] **Step 2: Run migration on Neon**

Run:
```bash
ssh myclaw-vps "docker run --rm postgres:16-alpine psql 'postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require' -f -" < perform/migrations/005_nfl_teams_rosters.sql
```

- [ ] **Step 3: Verify tables created**

Run:
```bash
ssh myclaw-vps "docker run --rm postgres:16-alpine psql '...' -c '\dt nfl_*'"
```
Expected: `nfl_teams` and `nfl_rosters` listed.

- [ ] **Step 4: Commit**

```bash
git add perform/migrations/005_nfl_teams_rosters.sql
git commit -m "feat(perform): NFL teams + rosters schema for Podcasters"
```

---

### Task 2: Sqwaadrun — Scrape all 32 NFL teams

**Files:**
- Create: `smelter-os/sqwaadrun/scripts/scrape-nfl-teams.py`

- [ ] **Step 1: Write the Sqwaadrun scrape script**

Pure Python. Zero API cost. Scrapes ESPN, Pro Football Reference, and NFL.com for:
- All 32 team names, cities, abbreviations, conferences, divisions
- Team colors (primary + secondary hex)
- Head coach, OC, DC
- Stadium name
- 2025 win/loss record
- 2026 draft pick positions
- Top positional needs
- Full 53-man rosters with: name, position, jersey, age, height, weight, college, experience, depth chart rank

Target URLs (direct scrape, no API):
- `https://www.pro-football-reference.com/teams/` — all 32 teams
- `https://www.espn.com/nfl/team/roster/_/name/{abbrev}` — rosters
- `https://www.espn.com/nfl/team/depth/_/name/{abbrev}` — depth charts
- `https://www.espn.com/nfl/team/stats/_/name/{abbrev}` — stats
- `https://overthecap.com/salary-cap/{team}` — cap data

Script must:
1. Scrape team metadata for all 32 teams
2. Scrape full rosters (all 53-man + practice squad)
3. Scrape coaching staff
4. Insert into `nfl_teams` and `nfl_rosters` tables via direct Postgres connection
5. Handle duplicates with ON CONFLICT UPDATE
6. Log progress: `[1/32] Las Vegas Raiders: 53 players, 12 coaches`
7. Rate limit: 1 second between requests (Lil_Guard_Hawk)

- [ ] **Step 2: Run the scrape**

```bash
cd smelter-os/sqwaadrun
PYTHONIOENCODING=utf-8 DATABASE_URL='postgresql://neondb_owner:npg_25fRtnTYlpsr@ep-dawn-bar-a4orhend-pooler.us-east-1.aws.neon.tech/performdb?sslmode=require' python3 scripts/scrape-nfl-teams.py
```

Expected: 32 teams, ~1,700 roster entries.

- [ ] **Step 3: Verify data**

```bash
ssh myclaw-vps "docker run --rm postgres:16-alpine psql '...' -c 'SELECT COUNT(*) FROM nfl_teams; SELECT COUNT(*) FROM nfl_rosters;'"
```
Expected: 32 teams, 1600-1800 roster entries.

- [ ] **Step 4: Commit**

```bash
git add smelter-os/sqwaadrun/scripts/scrape-nfl-teams.py
git commit -m "feat(sqwaadrun): NFL 32-team scrape — rosters, coaches, cap data"
```

---

### Task 3: NFL API routes

**Files:**
- Create: `perform/src/app/api/nfl/teams/route.ts`
- Create: `perform/src/app/api/nfl/teams/[abbrev]/route.ts`
- Create: `perform/src/app/api/nfl/teams/[abbrev]/roster/route.ts`

- [ ] **Step 1: Write GET /api/nfl/teams**

Returns all 32 teams with conference/division grouping. Supports `?conference=AFC&division=East` filters.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const conference = req.nextUrl.searchParams.get('conference');
  const division = req.nextUrl.searchParams.get('division');

  let query = 'SELECT * FROM nfl_teams';
  const conditions: string[] = [];
  const params: string[] = [];

  if (conference) { conditions.push(`conference = $${params.length + 1}`); params.push(conference); }
  if (division) { conditions.push(`division = $${params.length + 1}`); params.push(division); }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY conference, division, name';

  const teams = await sql.unsafe(query, params);
  return NextResponse.json({ teams, count: teams.length });
}
```

- [ ] **Step 2: Write GET /api/nfl/teams/[abbrev]**

Returns single team with full detail + roster count.

- [ ] **Step 3: Write GET /api/nfl/teams/[abbrev]/roster**

Returns full roster for a team with position filter support.

- [ ] **Step 4: Add /api/nfl/ to public prefixes in middleware.ts**

- [ ] **Step 5: Build and verify**

```bash
npm run build && curl https://perform.foai.cloud/api/nfl/teams | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['count'], 'teams')"
```

- [ ] **Step 6: Commit**

```bash
git add perform/src/app/api/nfl/ perform/src/middleware.ts
git commit -m "feat(perform): NFL teams + roster API endpoints"
```

---

## WORKSTREAM B: Podcaster Portal (builds on NFL data)

### Task 4: Podcaster database tables

**Files:**
- Create: `perform/migrations/004_podcaster_tables.sql`

- [ ] **Step 1: Write migration**

```sql
-- Migration 004: Per|Form for Podcasters user tables

CREATE TABLE IF NOT EXISTS podcaster_users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  podcast_name TEXT NOT NULL,
  podcaster_name TEXT NOT NULL,
  location TEXT,
  subscriber_count INT DEFAULT 0,
  primary_platforms TEXT[] DEFAULT '{}'::TEXT[],
  primary_vertical TEXT NOT NULL,  -- 'nfl' | 'cfb' | 'nba' | 'mlb'
  addon_vertical TEXT,             -- optional cross-vertical bundle
  selected_team TEXT,              -- team abbrev or school name
  plan_tier TEXT DEFAULT 'free',   -- free | bmc | premium | bucket_list | lfg
  huddl_name TEXT,                 -- custom Circuit Box name
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcaster_hawks_schema (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES podcaster_users(id),
  mission TEXT,
  vision TEXT,
  objectives JSONB DEFAULT '[]'::JSONB,
  needs_analysis TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcaster_content (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES podcaster_users(id),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,  -- 'script' | 'recording' | 'clip' | 'post'
  body TEXT,
  transcript TEXT,
  audio_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'draft',  -- draft | ready | published | scheduled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_podcaster_content_user ON podcaster_content(user_id);
CREATE INDEX idx_podcaster_users_vertical ON podcaster_users(primary_vertical);
```

- [ ] **Step 2: Run migration**
- [ ] **Step 3: Verify tables**
- [ ] **Step 4: Commit**

---

### Task 5: Team assets — colors, metadata, static data

**Files:**
- Create: `perform/src/lib/podcasters/team-assets.ts`

- [ ] **Step 1: Write the 32-team static data file**

All 32 NFL teams with: name, city, abbrev, conference, division, primary color, secondary color, logo path placeholder. This is the UI-side reference — the DB has the full data, this is for instant client-side rendering.

- [ ] **Step 2: Write plan tiers**

Create: `perform/src/lib/podcasters/plans.ts`

Define plan tiers and feature gates. For MVP, plan checking is a simple function — Stripe comes later.

```typescript
export type PlanTier = 'free' | 'bmc' | 'premium' | 'bucket_list' | 'lfg';

export const PLAN_FEATURES: Record<PlanTier, { name: string; warRoom: boolean; workbench: boolean; distribution: boolean; customHawks: boolean; whiteLabel: boolean }> = {
  free: { name: 'Free Trial', warRoom: true, workbench: false, distribution: false, customHawks: false, whiteLabel: false },
  bmc: { name: 'BMC', warRoom: true, workbench: true, distribution: false, customHawks: false, whiteLabel: false },
  premium: { name: 'Premium', warRoom: true, workbench: true, distribution: true, customHawks: false, whiteLabel: false },
  bucket_list: { name: 'Bucket List', warRoom: true, workbench: true, distribution: true, customHawks: true, whiteLabel: false },
  lfg: { name: 'LFG', warRoom: true, workbench: true, distribution: true, customHawks: true, whiteLabel: true },
};

export function hasFeature(tier: PlanTier, feature: keyof typeof PLAN_FEATURES['free']): boolean {
  return PLAN_FEATURES[tier]?.[feature] ?? false;
}
```

- [ ] **Step 3: Commit**

---

### Task 6: Podcaster registration + profile API

**Files:**
- Create: `perform/src/app/api/podcasters/register/route.ts`
- Create: `perform/src/app/api/podcasters/profile/route.ts`

- [ ] **Step 1: Write POST /api/podcasters/register**

Accepts onboarding data, creates `podcaster_users` + `podcaster_hawks_schema` rows. Requires Firebase auth.

- [ ] **Step 2: Write GET/PUT /api/podcasters/profile**

GET returns current user profile. PUT updates mission/vision/objectives.

- [ ] **Step 3: Commit**

---

### Task 7: Podcasters landing page

**Files:**
- Create: `perform/src/app/podcasters/page.tsx`

- [ ] **Step 1: Write the landing page**

Dark broadcast theme. Hero section: "Your Draft Command Center" with sport-specific imagery. CTA: "Get Started" → `/podcasters/onboarding`. Feature highlights: War Room, Workbench, Distribution. Pricing section with plan tiers (link to Paperform payment). No auth required to view.

- [ ] **Step 2: Add to middleware public routes**

Add `/podcasters` to PUBLIC_PATHS and `/podcasters/` to PUBLIC_PREFIXES in middleware.ts.

- [ ] **Step 3: Build and verify**
- [ ] **Step 4: Commit**

---

### Task 8: Onboarding stepper

**Files:**
- Create: `perform/src/app/podcasters/onboarding/page.tsx`
- Create: `perform/src/components/podcasters/OnboardingStepper.tsx`
- Create: `perform/src/components/podcasters/TeamSelector.tsx`

- [ ] **Step 1: Write OnboardingStepper component**

7-step stepper matching the directive:
1. Account info (name, podcast name, location, subscriber count, platforms)
2. League selection (NFL / CFB / NBA Coming Soon / MLB Coming Soon)
3. Add-on offer (NFL↔CFB bundle)
4. Mission/Vision/Objectives
5. Team selection (TeamSelector grid)
6. Plan selection (link to Paperform payment or "Start Free")
7. Confirmation → redirect to `/podcasters/dashboard`

On submit: POST to `/api/podcasters/register` with all collected data.

- [ ] **Step 2: Write TeamSelector component**

Grid of 32 NFL team logo cards (or 134 CFB teams grouped by conference). Click to select. Gold border on selected. Uses team-assets.ts for colors.

- [ ] **Step 3: Write onboarding page**

Wraps the stepper. Requires Firebase auth (redirect to `/login?redirect=/podcasters/onboarding` if not authed).

- [ ] **Step 4: Build and verify**
- [ ] **Step 5: Commit**

---

### Task 9: Circuit Box dashboard

**Files:**
- Create: `perform/src/app/podcasters/dashboard/page.tsx`
- Create: `perform/src/components/podcasters/CircuitBoxRoom.tsx`

- [ ] **Step 1: Write CircuitBoxRoom component**

Layered composite:
- Base: static penthouse room image (dark, broadcast aesthetic — CSS/gradient for MVP, GCS-hosted render later)
- Wall asset: team logo/colors composited via CSS absolute positioning
- Color overlay: team primary color at 15% opacity over room elements
- Avatar: ACHEEVY helmet or user-uploaded image in character position

For MVP: CSS-based room with team color theming. Full GCS-rendered rooms come in v2.

- [ ] **Step 2: Write dashboard page**

Requires auth + podcaster registration. Shows:
- CircuitBoxRoom at top (hero)
- Huddl name (editable)
- Quick stats: team record, upcoming draft picks, roster size
- Navigation cards: War Room, Workbench, Scripts, Settings
- Recent content list from podcaster_content

- [ ] **Step 3: Build and verify**
- [ ] **Step 4: Commit**

---

### Task 10: War Room — NFL data hub

**Files:**
- Create: `perform/src/app/podcasters/war-room/page.tsx`
- Create: `perform/src/components/podcasters/WarRoomPanel.tsx`

- [ ] **Step 1: Write WarRoomPanel component**

Reusable data panel with: title, icon, collapsible content, loading state. Dark card aesthetic.

- [ ] **Step 2: Write War Room page**

Requires auth + registration. Fetches data from NFL APIs based on user's selected team. Panels:
1. **Current Roster** — `/api/nfl/teams/{abbrev}/roster` → table with position, jersey, name, age, college
2. **Coaching Staff** — head coach, OC, DC from `/api/nfl/teams/{abbrev}`
3. **Team Needs** — top_needs array from nfl_teams displayed as priority badges
4. **Draft Picks** — 2026 draft picks from nfl_teams.draft_picks_2026 JSONB
5. **Star Players** — top 5 roster players by a simple stat sort
6. **Last Season** — 2025 record from nfl_teams
7. **Incoming Draft Class** (if CFB add-on) — query perform_players for prospects projected to this team's picks

Each panel calls the API on mount, caches client-side.

- [ ] **Step 3: Build and verify**
- [ ] **Step 4: Commit**

---

### Task 11: Basic Workbench

**Files:**
- Create: `perform/src/app/podcasters/workbench/page.tsx`

- [ ] **Step 1: Write workbench page**

MVP workbench with:
- Script editor (rich text area with section headers: Intro, Segment 1, Segment 2, Outro)
- Save script to `podcaster_content` table
- Load previous scripts
- "Insert from War Room" button — pulls team stats/player data into script
- Episode template selector (Weekly Recap, Draft Analysis, Player Spotlight)

Distribution and upload features are post-MVP stubs with "Coming Soon" badges.

- [ ] **Step 2: Build and verify**
- [ ] **Step 3: Commit**

---

### Task 12: Deploy and verify full flow

- [ ] **Step 1: Full build**

```bash
cd perform && rm -rf .next/cache && npm run build
```
Expected: 85+ pages, zero errors.

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A perform/src perform/migrations smelter-os/sqwaadrun/scripts
git commit -m "feat(perform): Per|Form for Podcasters MVP — onboarding, Circuit Box, War Room, Workbench, NFL 32-team DB"
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin HEAD
ssh myclaw-vps "cd /opt/foai-repo && git pull origin HEAD && cd perform && docker compose up -d --build"
```

- [ ] **Step 4: Verify all routes**

```bash
for path in "/podcasters" "/podcasters/onboarding" "/podcasters/dashboard" "/podcasters/war-room" "/podcasters/workbench" "/api/nfl/teams" "/api/nfl/teams/LV" "/api/nfl/teams/LV/roster"; do
  curl -s -o /dev/null -w "%{http_code}  $path\n" "https://perform.foai.cloud$path"
done
```
Expected: All 200 (except dashboard/war-room/workbench which may 307 for auth).

- [ ] **Step 5: End-to-end test**

1. Visit `/podcasters` — landing loads
2. Click "Get Started" → redirects to login if not authed
3. Login → redirected to `/podcasters/onboarding`
4. Complete stepper: select NFL, pick a team, enter mission
5. Land in Circuit Box dashboard with team theming
6. Navigate to War Room — see roster, coaches, draft picks
7. Navigate to Workbench — write and save a script

---

## Parallel Execution Strategy

```
Day 1 (Apr 11): Task 1-2 (NFL schema + Sqwaadrun scrape) + Task 4-5 (Podcaster tables + assets)
Day 2 (Apr 12): Task 3 (NFL APIs) + Task 6-7 (Registration API + Landing page)
Day 3 (Apr 13): Task 8 (Onboarding stepper + Team selector)
Day 4 (Apr 14): Task 9-10 (Circuit Box + War Room)
Day 5 (Apr 15): Task 11-12 (Workbench + Deploy + Verify)
```

---

## Out of Scope (Post-Launch)

- Stripe billing (use Paperform payment links for MVP)
- YouTube upload integration
- Social platform OAuth (Instagram, TikTok, Twitter, Facebook, LinkedIn)
- Automation rules engine
- Branded audience player
- Audio conditioning pipeline
- Content segmentation (TwelveLabs)
- NBA/MLB data + verticals (Coming Soon stubs only)
- Custom Hawks deployment
- FCS team assets (125 renders)
- Full GCS-rendered Circuit Box rooms (CSS theming for MVP)
