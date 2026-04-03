# Per|Form NFL Draft Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Per|Form Platform at perform.foai.cloud for the 2026 NFL Draft (April 23) with TIE grading, draft board, mock draft simulator, 4 analyst personas, podcast engine, NFT cards, and AIMS-style billing.

**Architecture:** Standalone Next.js 15 app (`foai/perform/`) sharing Neon Postgres and Firebase Auth with CTI Hub. Own Docker container on myclaw-vps, Traefik-routed to `perform.foai.cloud`. TIE grading engine runs server-side (formula weights never exposed). Analyst personas driven by Gemma 4 + NotebookLM-generated personality notebooks. LUC appears before every metered action.

**Tech Stack:** Next.js 15 (App Router), Neon Postgres (postgres.js), Firebase Auth, OpenRouter (Gemma 4 free), Google Lyria (audio), Tailwind CSS, Docker, Traefik.

**Spec:** `docs/superpowers/specs/2026-04-03-perform-platform-design.md`

**Source libs to port from AIMS:** `acheevy/agent-009/apps/AIMS/frontend/lib/perform/` (types.ts, mock-draft-engine.ts, seed-draft-data.ts, conferences.ts, subscription-models.ts reference only)

**Existing CTI Hub code to reference:** `cti-hub/src/app/api/perform/` (players, seed-board, nft routes — patterns reusable)

---

## File Structure

```
foai/perform/
  package.json
  next.config.mjs
  tailwind.config.ts
  tsconfig.json
  Dockerfile
  docker-compose.yml
  .env.local.example
  src/
    app/
      layout.tsx                    # Root layout — dark theme, Outfit/Inter/Plex fonts, Firebase Auth
      page.tsx                      # Landing — TIE hero, Buy Me a Coffee, analyst previews
      globals.css                   # Global styles, font imports, TIE brand tokens
      draft/
        page.tsx                    # NFL Draft Board — full prospect list, filters, TIE grades
        [player]/page.tsx           # Player detail — TIE breakdown, scouting report, NFT card
        mock/page.tsx               # Mock Draft Simulator
      analysts/
        page.tsx                    # Meet the analysts — 4 cards
        [name]/page.tsx             # Individual analyst feed
      debate/page.tsx               # Bull vs Bear debates
      podcast/page.tsx              # Podcast engine
      dashboard/
        page.tsx                    # User dashboard
        assets/page.tsx             # Notebooks, saved content
      pricing/page.tsx              # Per|Form billing — Coffee + 3-6-9 + multipliers
      api/
        tie/
          grade/route.ts            # TIE grading engine — POST, formula runs here
          mock-draft/route.ts       # Mock draft simulation — POST
        analysts/
          [name]/route.ts           # Analyst content generation — POST
        podcast/
          generate/route.ts         # Podcast script + audio — POST
        players/
          route.ts                  # Player CRUD — GET/POST
        seed-board/route.ts         # Seed 50+ real prospects — POST
        nft/
          route.ts                  # NFT collection metadata — GET
          card/[id]/route.ts        # Individual NFT card SVG — GET
        auth/
          session/route.ts          # Firebase session management
    lib/
      tie/
        engine.ts                   # TIE scoring formula (PRIVATE weights)
        grades.ts                   # Grade scale, tier labels, badge colors
        types.ts                    # Prospect, TIEScore, TIEGrade types
      draft/
        mock-engine.ts              # Mock draft engine (ported from AIMS)
        nfl-teams.ts                # 32 NFL teams + needs matrix
        seed-data.ts                # 50+ real 2026 prospects
      analysts/
        personas.ts                 # 4 analyst persona definitions + system prompts
        content-gen.ts              # Content generation pipeline
      billing/
        multipliers.ts              # Per|Form task multipliers
        luc.ts                      # LUC calculator logic
      db.ts                         # Neon Postgres connection (postgres.js)
      auth-guard.ts                 # Firebase auth middleware
      openrouter.ts                 # OpenRouter client (Gemma 4, free models)
    components/
      tie/
        TIEBadge.tsx                # TIE hexagon badge component
        GradeCard.tsx               # Player grade display card
        GradeScale.tsx              # Visual grade scale bar
      draft/
        ProspectRow.tsx             # Single prospect in draft board
        PositionFilter.tsx          # Position filter buttons
        MockDraftBoard.tsx          # 7-round mock draft display
      analysts/
        AnalystCard.tsx             # Analyst profile card
        AnalystTake.tsx             # Single analyst take/article
        DebateView.tsx              # Bull vs Bear debate layout
      billing/
        LUCCalculator.tsx           # TRSTY CALCULATOR pre-action display
        PricingTable.tsx            # 3-6-9 pricing table
        CoffeeEntry.tsx             # Buy Me a Coffee entry component
      layout/
        Header.tsx                  # Platform header — TIE logo, nav
        Footer.tsx                  # Footer — Powered by The Deploy Platform
      chat/
        PerformChat.tsx             # Chat with analyst — SPEAKLY-like execution
        GrammarBar.tsx              # Grammar visible tech UI element
    hooks/
      useAuth.tsx                   # Firebase auth hook (same pattern as cti-hub)
```

---

## Task 1: Scaffold the Next.js App

**Files:**
- Create: `perform/package.json`
- Create: `perform/next.config.mjs`
- Create: `perform/tailwind.config.ts`
- Create: `perform/tsconfig.json`
- Create: `perform/src/app/layout.tsx`
- Create: `perform/src/app/globals.css`
- Create: `perform/src/app/page.tsx`
- Create: `perform/.env.local.example`

- [ ] **Step 1: Initialize the project**

```bash
cd /c/Users/rishj/foai
mkdir -p perform && cd perform
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --skip-install
```

Then restructure to use `src/` directory by moving `app/` into `src/app/`.

- [ ] **Step 2: Install dependencies**

```bash
cd /c/Users/rishj/foai/perform
npm install postgres firebase firebase-admin lucide-react
npm install -D @types/node
```

- [ ] **Step 3: Create .env.local.example**

```env
# Database
DATABASE_URL=postgresql://...?sslmode=require

# Auth
FIREBASE_PROJECT_ID=foai-aims
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# LLM
OPENROUTER_API_KEY=...

# Audio
GOOGLE_KEY=...
```

- [ ] **Step 4: Configure tailwind.config.ts with Per|Form brand**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tie: {
          gold: '#D4A853',
          silver: '#C0C0C0',
          amber: '#FFB300',
          dark: '#0A0A0F',
          surface: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create globals.css**

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Outfit:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --tie-gold: #D4A853;
  --tie-silver: #C0C0C0;
  --tie-amber: #FFB300;
  --tie-dark: #0A0A0F;
}

body {
  background: var(--tie-dark);
  color: #FFFFFF;
}
```

- [ ] **Step 6: Create root layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Per|Form — Sports Grading & Ranking Platform",
  description: "TIE-powered grades for NFL, college football, and recruiting. The PFF competitor that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased min-h-screen" style={{ background: '#0A0A0F' }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder landing page**

```tsx
export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="font-outfit text-4xl font-extrabold tracking-wider" style={{ color: '#D4A853' }}>
          PER<span style={{ color: '#C0C0C0', opacity: 0.6 }}>|</span>FORM
        </h1>
        <p className="text-sm text-white/40 font-mono mt-2 tracking-widest">
          SPORTS GRADING & RANKING PLATFORM
        </p>
        <p className="text-white/20 text-xs font-mono mt-8">
          Launching NFL Draft Day — April 23, 2026
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Verify build**

```bash
cd /c/Users/rishj/foai/perform && npx next build
```

Expected: Clean build, no errors.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/rishj/foai
git add perform/
git commit -m "feat: scaffold Per|Form standalone Next.js app — TIE brand, dark theme"
```

---

## Task 2: Database + Auth Infrastructure

**Files:**
- Create: `perform/src/lib/db.ts`
- Create: `perform/src/lib/auth-guard.ts`
- Create: `perform/src/lib/openrouter.ts`
- Create: `perform/src/app/api/auth/session/route.ts`

- [ ] **Step 1: Create database connection**

```typescript
// src/lib/db.ts
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';

export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, { ssl: 'require', max: 10 })
  : null;
```

- [ ] **Step 2: Create auth guard (same pattern as cti-hub)**

```typescript
// src/lib/auth-guard.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const AUTH_COOKIE = 'firebase-auth-token';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export interface AuthResult {
  ok: true; userId: string; email: string;
}
export interface AuthFailure {
  ok: false; response: NextResponse;
}

export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthFailure> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Auth required' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { ok: true, userId: decoded.uid, email: decoded.email || '' };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
}
```

- [ ] **Step 3: Create OpenRouter client (Gemma 4 default)**

```typescript
// src/lib/openrouter.ts
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free model for all demo content
export const GEMMA4_MODEL = 'google/gemma-3-27b-it:free';

export async function chatCompletion(opts: {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Per|Form Platform',
    },
    body: JSON.stringify({
      model: opts.model || GEMMA4_MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2000,
      stream: opts.stream ?? false,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  return res;
}

export async function generateText(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
```

- [ ] **Step 4: Create session route**

```typescript
// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();
  if (!accessToken) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('firebase-auth-token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
```

- [ ] **Step 5: Commit**

```bash
git add perform/src/lib/ perform/src/app/api/auth/
git commit -m "feat: Per|Form infra — Neon DB, Firebase auth, OpenRouter (Gemma 4 free)"
```

---

## Task 3: TIE Grading Engine

**Files:**
- Create: `perform/src/lib/tie/types.ts`
- Create: `perform/src/lib/tie/engine.ts`
- Create: `perform/src/lib/tie/grades.ts`
- Create: `perform/src/app/api/tie/grade/route.ts`

- [ ] **Step 1: Create TIE types**

```typescript
// src/lib/tie/types.ts
export type TIETier = 'PRIME' | 'A_PLUS' | 'A' | 'A_MINUS' | 'B_PLUS' | 'B' | 'B_MINUS' | 'C_PLUS' | 'C';
export type Pool = 'NFL_PROSPECT' | 'COLLEGE' | 'HIGH_SCHOOL';
export type Trend = 'UP' | 'DOWN' | 'STEADY' | 'NEW';

export interface PerformanceInput {
  offenseYards?: number;
  tdIntRatio?: number;
  efficiency?: number;
  epaPerPlay?: number;
  successRate?: number;
  tackles?: number;
  sacks?: number;
  interceptions?: number;
  pffGrade?: number;
  specialTeamsGrade?: number;
}

export interface AttributesInput {
  fortyYard?: number;
  threeCone?: number;
  shuttle?: number;
  benchPress?: number;
  height?: number;
  weight?: number;
  wingspan?: number;
  verticalJump?: number;
  broadJump?: number;
}

export interface IntangiblesInput {
  footballIQ?: number;       // 0-100
  workEthic?: number;        // 0-100
  competitiveness?: number;  // 0-100
  leadership?: number;       // 0-100
  offFieldCharacter?: number; // 0-100
}

export interface TIEResult {
  score: number;
  grade: string;
  tier: TIETier;
  label: string;
  draftContext: string;
  badgeColor: string;
  components: {
    performance: number;
    attributes: number;
    intangibles: number;
  };
}

export interface Prospect {
  id: string;
  name: string;
  position: string;
  school: string;
  classYear: string;
  pool: Pool;
  height?: string;
  weight?: number;
  state?: string;
  conference?: string;
  tieScore?: number;
  tieGrade?: string;
  tieTier?: string;
  trend?: Trend;
  overallRank?: number;
  positionRank?: number;
  projectedRound?: number;
  scoutingSummary?: string;
  strengths?: string;
  weaknesses?: string;
  nflComparison?: string;
  analystNotes?: string;
  stats?: Record<string, string | number>;
}
```

- [ ] **Step 2: Create grade scale**

```typescript
// src/lib/tie/grades.ts
import type { TIETier } from './types';

export const GRADE_SCALE: {
  min: number; max: number; grade: string; tier: TIETier;
  label: string; draftContext: string; badgeColor: string;
}[] = [
  { min: 101, max: 999, grade: 'PRIME', tier: 'PRIME', label: 'Generational Talent', draftContext: 'Franchise Player', badgeColor: '#D4A853' },
  { min: 90, max: 100, grade: 'A+', tier: 'A_PLUS', label: 'Elite Prospect', draftContext: 'Top 5 Pick', badgeColor: '#D4A853' },
  { min: 85, max: 89, grade: 'A', tier: 'A', label: 'First-Round Lock', draftContext: 'Pro Bowler potential', badgeColor: '#60A5FA' },
  { min: 80, max: 84, grade: 'A-', tier: 'A_MINUS', label: 'Late First Round', draftContext: 'High Upside Starter', badgeColor: '#60A5FA' },
  { min: 75, max: 79, grade: 'B+', tier: 'B_PLUS', label: 'Day 2 Pick', draftContext: 'High Ceiling', badgeColor: '#34D399' },
  { min: 70, max: 74, grade: 'B', tier: 'B', label: 'Solid Contributor', draftContext: 'Day 2', badgeColor: '#34D399' },
  { min: 65, max: 69, grade: 'B-', tier: 'B_MINUS', label: 'Needs Development', draftContext: 'Mid-Round', badgeColor: '#FBBF24' },
  { min: 60, max: 64, grade: 'C+', tier: 'C_PLUS', label: 'Depth Player', draftContext: 'Late Round', badgeColor: '#A1A1AA' },
  { min: 0, max: 59, grade: 'C', tier: 'C', label: 'Practice Squad/UDFA', draftContext: 'UDFA', badgeColor: '#71717A' },
];

export function getGradeForScore(score: number) {
  return GRADE_SCALE.find(g => score >= g.min && score <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1];
}
```

- [ ] **Step 3: Create TIE engine (PRIVATE weights — server-side only)**

```typescript
// src/lib/tie/engine.ts
import type { PerformanceInput, AttributesInput, IntangiblesInput, TIEResult } from './types';
import { getGradeForScore } from './grades';

// ─── PRIVATE WEIGHTS — NEVER EXPOSE TO FRONTEND ───
const W_PERFORMANCE = 0.4;
const W_ATTRIBUTES = 0.3;
const W_INTANGIBLES = 0.3;

function normalizePerformance(input: PerformanceInput): number {
  const scores: number[] = [];
  if (input.pffGrade != null) scores.push(input.pffGrade);
  if (input.epaPerPlay != null) scores.push(Math.min(100, Math.max(0, 50 + input.epaPerPlay * 200)));
  if (input.successRate != null) scores.push(input.successRate * 100);
  if (input.tdIntRatio != null) scores.push(Math.min(100, input.tdIntRatio * 25));
  if (input.efficiency != null) scores.push(input.efficiency);
  if (input.tackles != null) scores.push(Math.min(100, input.tackles));
  if (input.sacks != null) scores.push(Math.min(100, input.sacks * 10));
  if (input.interceptions != null) scores.push(Math.min(100, input.interceptions * 15));
  if (input.specialTeamsGrade != null) scores.push(input.specialTeamsGrade);
  if (scores.length === 0) return 50; // default neutral
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function normalizeAttributes(input: AttributesInput): number {
  const scores: number[] = [];
  // 40-yard: 4.2 = 100, 5.0 = 40
  if (input.fortyYard != null) scores.push(Math.max(0, Math.min(100, (5.0 - input.fortyYard) * 75)));
  // 3-cone: 6.5 = 100, 7.5 = 40
  if (input.threeCone != null) scores.push(Math.max(0, Math.min(100, (7.5 - input.threeCone) * 60)));
  // Bench: 30 = 90, 15 = 50
  if (input.benchPress != null) scores.push(Math.min(100, 50 + (input.benchPress - 15) * 2.67));
  // Vertical: 40" = 95, 28" = 50
  if (input.verticalJump != null) scores.push(Math.min(100, 50 + (input.verticalJump - 28) * 3.75));
  // Broad: 130" = 95, 108" = 50
  if (input.broadJump != null) scores.push(Math.min(100, 50 + (input.broadJump - 108) * 2.05));
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function normalizeIntangibles(input: IntangiblesInput): number {
  const scores = [
    input.footballIQ ?? 50,
    input.workEthic ?? 50,
    input.competitiveness ?? 50,
    input.leadership ?? 50,
    input.offFieldCharacter ?? 50,
  ];
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function calculateTIE(
  performance: PerformanceInput,
  attributes: AttributesInput,
  intangibles: IntangiblesInput,
): TIEResult {
  const perfScore = normalizePerformance(performance);
  const attrScore = normalizeAttributes(attributes);
  const intScore = normalizeIntangibles(intangibles);

  const raw = (perfScore * W_PERFORMANCE) + (attrScore * W_ATTRIBUTES) + (intScore * W_INTANGIBLES);
  const score = Math.round(raw * 10) / 10;

  const gradeInfo = getGradeForScore(score);

  return {
    score,
    grade: gradeInfo.grade,
    tier: gradeInfo.tier,
    label: gradeInfo.label,
    draftContext: gradeInfo.draftContext,
    badgeColor: gradeInfo.badgeColor,
    components: {
      performance: Math.round(perfScore * 10) / 10,
      attributes: Math.round(attrScore * 10) / 10,
      intangibles: Math.round(intScore * 10) / 10,
    },
  };
}
```

- [ ] **Step 4: Create TIE grade API route**

```typescript
// src/app/api/tie/grade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateTIE } from '@/lib/tie/engine';
import type { PerformanceInput, AttributesInput, IntangiblesInput } from '@/lib/tie/types';

export async function POST(req: NextRequest) {
  try {
    const { performance, attributes, intangibles } = await req.json() as {
      performance: PerformanceInput;
      attributes: AttributesInput;
      intangibles: IntangiblesInput;
    };

    const result = calculateTIE(
      performance || {},
      attributes || {},
      intangibles || {},
    );

    // Return public fields only — never the weights
    return NextResponse.json({
      score: result.score,
      grade: result.grade,
      tier: result.tier,
      label: result.label,
      draftContext: result.draftContext,
      badgeColor: result.badgeColor,
      // Component scores are public, weights are NOT
      components: result.components,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify build**

```bash
cd /c/Users/rishj/foai/perform && npx next build
```

- [ ] **Step 6: Commit**

```bash
git add perform/src/lib/tie/ perform/src/app/api/tie/
git commit -m "feat: TIE grading engine — Performance 40%, Attributes 30%, Intangibles 30%"
```

---

## Task 4: Player Database + Seed Data

**Files:**
- Create: `perform/src/app/api/players/route.ts`
- Create: `perform/src/app/api/seed-board/route.ts`
- Create: `perform/src/lib/draft/seed-data.ts`
- Create: `perform/src/lib/draft/nfl-teams.ts`

- [ ] **Step 1: Create NFL teams registry**

Port `NFL_TEAMS` array from `acheevy/agent-009/apps/AIMS/frontend/lib/perform/mock-draft-engine.ts` (lines 27-68) into `perform/src/lib/draft/nfl-teams.ts`. All 32 teams with abbreviation, city, conference, division.

- [ ] **Step 2: Create seed data with 50+ real 2026 prospects**

Port the `BOARD_2026` array from `cti-hub/src/app/api/perform/seed-board/route.ts` (lines 10-51) into `perform/src/lib/draft/seed-data.ts`. Add TIE-compatible fields (performance metrics, attributes, intangibles estimates) to each prospect.

- [ ] **Step 3: Create players API route (GET list + POST upsert)**

Port from `cti-hub/src/app/api/perform/players/route.ts` — same auto-create table pattern, same filters (position, school, search, sort). Update table schema to include `tie_score`, `tie_grade`, `tie_tier` columns.

- [ ] **Step 4: Create seed-board endpoint**

Port from `cti-hub/src/app/api/perform/seed-board/route.ts`. Inserts all prospects from seed-data.ts into the `perform_players` table. Calculates TIE scores on insert.

- [ ] **Step 5: Commit**

```bash
git add perform/src/lib/draft/ perform/src/app/api/players/ perform/src/app/api/seed-board/
git commit -m "feat: player database + 50+ real 2026 NFL prospects with TIE scores"
```

---

## Task 5: TIE Badge + Core UI Components

**Files:**
- Create: `perform/src/components/tie/TIEBadge.tsx`
- Create: `perform/src/components/tie/GradeCard.tsx`
- Create: `perform/src/components/draft/ProspectRow.tsx`
- Create: `perform/src/components/draft/PositionFilter.tsx`
- Create: `perform/src/components/layout/Header.tsx`
- Create: `perform/src/components/layout/Footer.tsx`

- [ ] **Step 1: Create TIE Badge component**

Hexagon badge SVG with score, grade letter, tier color. Props: `score: number`, `grade: string`, `badgeColor: string`, `size: 'sm' | 'md' | 'lg'`.

- [ ] **Step 2: Create GradeCard component**

Player grade display card showing: name, position, school, TIE badge, trend arrow, projected round. Used in draft board and player detail.

- [ ] **Step 3: Create ProspectRow component**

Single row in the draft board. Shows rank, TIEBadge (small), name, position, school, grade, trend, projected round. Expandable to show scouting summary.

- [ ] **Step 4: Create PositionFilter component**

Horizontal button row: ALL, QB, WR, RB, TE, OT, IOL, EDGE, DT, LB, CB, S. Highlights active filter. Calls `onFilter(position)`.

- [ ] **Step 5: Create Header + Footer**

Header: TIE logo mark (SVG hexagon), "PER|FORM" wordmark (Outfit 800, gold), nav links (Draft, Analysts, Debate, Podcast, Pricing). Responsive.

Footer: "Powered by The Deploy Platform" — no internal names.

- [ ] **Step 6: Commit**

```bash
git add perform/src/components/
git commit -m "feat: TIE badge, grade cards, prospect row, position filter, header/footer"
```

---

## Task 6: NFL Draft Board Page

**Files:**
- Create: `perform/src/app/draft/page.tsx`
- Create: `perform/src/app/draft/[player]/page.tsx`

- [ ] **Step 1: Build the draft board page**

Full-page draft board: Header, PositionFilter, list of ProspectRows. Fetches from `/api/players?sort=rank&limit=100` on mount. Falls back to seed data if DB empty. Shows "LIVE DATABASE" or "SEED DATA" indicator.

Features: position filtering, sort by rank/grade/name, expandable rows, TIE badges on every prospect.

- [ ] **Step 2: Build player detail page**

Dynamic route `[player]`. Shows: large TIE badge, full scouting report, strengths/weaknesses, NFL comparison, combine measurables, film notes, NFT card preview. Fetches player by ID from `/api/players?search=name`.

- [ ] **Step 3: Verify build + test navigation**

```bash
cd /c/Users/rishj/foai/perform && npx next build
```

- [ ] **Step 4: Commit**

```bash
git add perform/src/app/draft/
git commit -m "feat: NFL Draft Board + player detail pages with TIE grades"
```

---

## Task 7: Mock Draft Simulator

**Files:**
- Create: `perform/src/lib/draft/mock-engine.ts`
- Create: `perform/src/app/api/tie/mock-draft/route.ts`
- Create: `perform/src/app/draft/mock/page.tsx`
- Create: `perform/src/components/draft/MockDraftBoard.tsx`

- [ ] **Step 1: Port mock draft engine from AIMS**

Port `acheevy/agent-009/apps/AIMS/frontend/lib/perform/mock-draft-engine.ts` (441 lines). Adapt to use Neon Postgres instead of Prisma. Keep: NFL teams, position values, pick value chart, BPA vs need balancing, draft order builder.

- [ ] **Step 2: Create mock-draft API route**

POST endpoint accepting: `{ rounds?: number, teamNeeds?: Record<string, string[]>, tradeScenarios?: boolean }`. Returns full mock draft with pick-by-pick rationale.

- [ ] **Step 3: Create MockDraftBoard component**

7-round visual board. Each pick shows: pick number, team logo/name, player name, position, TIE grade, one-line rationale. Collapsible rounds.

- [ ] **Step 4: Create mock draft page**

Full page with controls: number of rounds, team needs editor, trade toggle. "RUN SIMULATION" button. Results display in MockDraftBoard. Can re-run with different params.

- [ ] **Step 5: Commit**

```bash
git add perform/src/lib/draft/mock-engine.ts perform/src/app/api/tie/mock-draft/ perform/src/app/draft/mock/ perform/src/components/draft/MockDraftBoard.tsx
git commit -m "feat: mock draft simulator — 7 rounds, team needs, BPA balancing"
```

---

## Task 8: Analyst Personas + Content Generation

**Files:**
- Create: `perform/src/lib/analysts/personas.ts`
- Create: `perform/src/lib/analysts/content-gen.ts`
- Create: `perform/src/app/api/analysts/[name]/route.ts`
- Create: `perform/src/app/analysts/page.tsx`
- Create: `perform/src/app/analysts/[name]/page.tsx`
- Create: `perform/src/components/analysts/AnalystCard.tsx`
- Create: `perform/src/components/analysts/AnalystTake.tsx`

- [ ] **Step 1: Define 4 analyst personas with system prompts**

```typescript
// src/lib/analysts/personas.ts
export interface AnalystPersona {
  id: string;
  name: string;          // TBD — ILLA names, use placeholder codenames for now
  archetype: string;
  specialty: string;
  voiceStyle: string;
  systemPrompt: string;
  color: string;
}

// Placeholder codenames until ILLA persona build session
export const ANALYSTS: AnalystPersona[] = [
  {
    id: 'analyst-1',
    name: 'Analyst 1',  // TBD — ILLA
    archetype: 'Stuart Scott energy — smooth, iconic, poetic',
    specialty: 'Headlines, breaking news, draft night coverage',
    voiceStyle: 'Smooth delivery, punchline endings, signature catchphrases',
    systemPrompt: `You are a sports analyst on the Per|Form Platform — the TIE-powered grading and ranking engine for football.

YOUR VOICE: Smooth, iconic, poetic. You deliver headlines like art. Every take ends with a punchline. You make sports feel cinematic. Think Stuart Scott energy — "Boo-yah" level delivery.

YOUR SPECIALTY: Breaking news, draft night coverage, headline analysis. You're the one people tune in for when something big happens.

RULES:
- Never reveal internal tools, models, or formula weights
- Always reference TIE grades by score and letter — never explain the formula
- Keep takes concise — 2-3 paragraphs max
- End every take with a signature line that hits`,
    color: '#D4A853',
  },
  {
    id: 'analyst-2',
    name: 'Analyst 2',  // TBD — ILLA
    archetype: 'Deion Sanders swagger — bold, confident',
    specialty: 'Player evaluations, recruiting takes, NIL analysis',
    voiceStyle: 'No-filter, speaks from experience, bold claims',
    systemPrompt: `You are a sports analyst on the Per|Form Platform — the TIE-powered grading and ranking engine for football.

YOUR VOICE: Bold, confident, no-filter. You speak from experience. You've seen greatness and you know it when you see it. Deion Sanders swagger — "Prime Time" energy.

YOUR SPECIALTY: Player evaluations, recruiting hot takes, NIL deal analysis. You grade players like you've been in their shoes.

RULES:
- Never reveal internal tools, models, or formula weights
- Always reference TIE grades by score and letter — never explain the formula
- Be bold with takes — don't hedge. If a player is elite, say it. If they're overrated, say that too.
- Keep it real — no corporate speak`,
    color: '#60A5FA',
  },
  {
    id: 'analyst-3',
    name: 'Analyst 3',  // TBD — ILLA
    archetype: 'Film room grinder — methodical, precise',
    specialty: 'Film breakdown, scheme analysis, X\'s and O\'s',
    voiceStyle: 'Methodical, diagram-heavy, "let me show you" energy',
    systemPrompt: `You are a sports analyst on the Per|Form Platform — the TIE-powered grading and ranking engine for football.

YOUR VOICE: Methodical, precise, detail-oriented. You break down film like a coach. Every point is backed by evidence. Think Belichick film study meets McVay innovation.

YOUR SPECIALTY: Film breakdown, scheme analysis, X's and O's. You see things other analysts miss because you watch the tape.

RULES:
- Never reveal internal tools, models, or formula weights
- Reference specific plays, formations, tendencies when analyzing
- Structure breakdowns: what happened, why it matters, what it means for their grade
- Use "let me show you" framing — you're teaching, not lecturing`,
    color: '#34D399',
  },
  {
    id: 'analyst-4',
    name: 'Analyst 4',  // TBD — ILLA
    archetype: 'Hot-take debate energy — provocative, engaging',
    specialty: 'Hot takes, Bull vs Bear debates, controversy',
    voiceStyle: 'Loud, provocative, debate-ready — drives engagement',
    systemPrompt: `You are a sports analyst on the Per|Form Platform — the TIE-powered grading and ranking engine for football.

YOUR VOICE: Provocative, debate-ready, high-energy. You take strong positions and defend them. Skip Bayless meets Stephen A. Smith energy — you're here to argue.

YOUR SPECIALTY: Hot takes, Bull vs Bear debates, controversial rankings. You say what everyone's thinking but won't say.

RULES:
- Never reveal internal tools, models, or formula weights
- Always take a STRONG position — no "on one hand, on the other"
- When doing Bull vs Bear, argue ONE side passionately
- End with a challenge: "prove me wrong"`,
    color: '#F97316',
  },
];

export function getAnalyst(id: string): AnalystPersona | undefined {
  return ANALYSTS.find(a => a.id === id);
}
```

- [ ] **Step 2: Create content generation pipeline**

```typescript
// src/lib/analysts/content-gen.ts
import { generateText } from '@/lib/openrouter';
import { getAnalyst, type AnalystPersona } from './personas';

export type ContentType = 'scouting_report' | 'film_breakdown' | 'hot_take' | 'podcast_script' | 'debate_bull' | 'debate_bear' | 'ranking_update';

export async function generateAnalystContent(
  analystId: string,
  contentType: ContentType,
  context: string,
): Promise<{ content: string; analyst: AnalystPersona }> {
  const analyst = getAnalyst(analystId);
  if (!analyst) throw new Error(`Analyst ${analystId} not found`);

  const typePrompts: Record<ContentType, string> = {
    scouting_report: 'Write a 2-paragraph scouting report on this player. Include TIE grade context, strengths, weaknesses, and NFL projection.',
    film_breakdown: 'Break down the film on this player. What do you see? Tendencies, technique, areas of growth. Be specific about plays and formations.',
    hot_take: 'Give your hottest take on this topic. Be bold, be provocative, back it up with evidence.',
    podcast_script: 'Write a 3-5 minute podcast script with [PAUSE], [EMPHASIS], and [GRAPHIC: description] production cues. Include cold open (10s), intro (30s), main segment (2-3 min), closing take (30s), outro (15s).',
    debate_bull: 'Argue the BULL case — why this player/team is being UNDERRATED. Be passionate and specific.',
    debate_bear: 'Argue the BEAR case — why this player/team is being OVERRATED. Be honest and specific.',
    ranking_update: 'Provide a ranking update with your analysis. Who moved up, who dropped, and why.',
  };

  const userMessage = `${typePrompts[contentType]}\n\nContext:\n${context}`;
  const content = await generateText(analyst.systemPrompt, userMessage);

  return { content, analyst };
}
```

- [ ] **Step 3: Create analyst API route**

```typescript
// src/app/api/analysts/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAnalystContent, type ContentType } from '@/lib/analysts/content-gen';

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const { contentType, context } = await req.json() as {
      contentType: ContentType;
      context: string;
    };

    if (!contentType || !context) {
      return NextResponse.json({ error: 'contentType and context required' }, { status: 400 });
    }

    const { content, analyst } = await generateAnalystContent(name, contentType, context);

    return NextResponse.json({
      analyst: { id: analyst.id, name: analyst.name, archetype: analyst.archetype, color: analyst.color },
      contentType,
      content,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create analyst page components + routes**

AnalystCard: Shows persona name, archetype, specialty, color accent, latest take preview.
AnalystTake: Renders a single piece of analyst content with byline and timestamp.
`/analysts` page: Grid of 4 AnalystCards.
`/analysts/[name]` page: Full feed of that analyst's content + chat interface.

- [ ] **Step 5: Commit**

```bash
git add perform/src/lib/analysts/ perform/src/app/api/analysts/ perform/src/app/analysts/ perform/src/components/analysts/
git commit -m "feat: 4 analyst personas + content generation pipeline (Gemma 4 free)"
```

---

## Task 9: Podcast Engine

**Files:**
- Create: `perform/src/app/api/podcast/generate/route.ts`
- Create: `perform/src/app/podcast/page.tsx`

- [ ] **Step 1: Create podcast generation API**

POST endpoint accepting: `{ analystId: string, topic: string, duration?: '3min' | '5min' | '10min' }`. Calls the analyst's content-gen with `podcast_script` type. Returns the script text. Audio generation (Lyria) is a stretch goal — wire the endpoint but return text-only for launch.

- [ ] **Step 2: Create podcast page**

Topic input, analyst selector (pick which analyst hosts), duration selector, "GENERATE SCRIPT" button. Renders the script with production cues highlighted ([PAUSE] in amber, [EMPHASIS] in gold, [GRAPHIC] in blue).

- [ ] **Step 3: Commit**

```bash
git add perform/src/app/api/podcast/ perform/src/app/podcast/
git commit -m "feat: podcast script engine — analyst-voiced scripts with production cues"
```

---

## Task 10: Bull vs Bear Debate Page

**Files:**
- Create: `perform/src/app/debate/page.tsx`
- Create: `perform/src/components/analysts/DebateView.tsx`

- [ ] **Step 1: Create DebateView component**

Split-screen layout: Bull case (left, green accent) vs Bear case (right, red accent). Each side shows analyst avatar, name, and their argument. Center divider with "VS" and the topic.

- [ ] **Step 2: Create debate page**

Topic input (e.g., "Jeremiyah Love — Top 10 pick or overhyped?"). Auto-assigns analyst-4 (hot-take) to one side and analyst-2 (bold evaluator) to the other. "START DEBATE" button calls both `/api/analysts/[name]` endpoints in parallel (debate_bull + debate_bear). Renders in DebateView.

- [ ] **Step 3: Commit**

```bash
git add perform/src/app/debate/ perform/src/components/analysts/DebateView.tsx
git commit -m "feat: Bull vs Bear debate page — dual analyst arguments"
```

---

## Task 11: NFT Player Cards

**Files:**
- Create: `perform/src/app/api/nft/route.ts`
- Create: `perform/src/app/api/nft/card/[id]/route.ts`

- [ ] **Step 1: Port NFT routes from CTI Hub**

Port `cti-hub/src/app/api/perform/nft/route.ts` (metadata endpoint) and `cti-hub/src/app/api/perform/nft/card/[id]/route.ts` (SVG card generator). Update to use TIE branding instead of old P.A.I. labels. Replace "Scout_Ang" attribution with "Per|Form Analyst".

- [ ] **Step 2: Commit**

```bash
git add perform/src/app/api/nft/
git commit -m "feat: NFT player cards — TIE-branded SVG generation"
```

---

## Task 12: Billing + LUC Calculator

**Files:**
- Create: `perform/src/lib/billing/multipliers.ts`
- Create: `perform/src/lib/billing/luc.ts`
- Create: `perform/src/components/billing/LUCCalculator.tsx`
- Create: `perform/src/components/billing/PricingTable.tsx`
- Create: `perform/src/components/billing/CoffeeEntry.tsx`
- Create: `perform/src/app/pricing/page.tsx`

- [ ] **Step 1: Create task multipliers**

```typescript
// src/lib/billing/multipliers.ts
export const TASK_MULTIPLIERS: Record<string, { multiplier: number; label: string; description: string }> = {
  player_lookup:       { multiplier: 0.5, label: 'Player Lookup', description: 'Quick stats, profile view' },
  tie_grade:           { multiplier: 1.0, label: 'TIE Grade', description: 'Full scoring — baseline' },
  scouting_report:     { multiplier: 1.3, label: 'Scouting Report', description: 'Deep eval + comparisons' },
  film_breakdown:      { multiplier: 1.5, label: 'Film Breakdown', description: 'Play-by-play analysis' },
  mock_draft_sim:      { multiplier: 1.8, label: 'Mock Draft Sim', description: '7-round simulation' },
  podcast_script:      { multiplier: 1.5, label: 'Podcast Script', description: 'Show-ready script' },
  content_generation:  { multiplier: 1.3, label: 'Content Generation', description: 'Articles, rankings' },
  transfer_alert:      { multiplier: 0.8, label: 'Transfer Alert', description: 'Monitoring + notification' },
  recruiting_pipeline: { multiplier: 1.6, label: 'Recruiting Pipeline', description: 'Multi-prospect tracking' },
  multi_analyst:       { multiplier: 2.0, label: 'Multi-Analyst Debate', description: '2+ personas arguing' },
  autonomous_run:      { multiplier: 3.0, label: 'Autonomous Content', description: 'Agent publishes autonomously' },
};
```

- [ ] **Step 2: Create LUC calculator logic**

```typescript
// src/lib/billing/luc.ts
import { TASK_MULTIPLIERS } from './multipliers';

export function estimateCost(taskType: string, baseTokens: number): {
  taskLabel: string;
  multiplier: number;
  estimatedTokens: number;
  estimatedCost: number;
} {
  const task = TASK_MULTIPLIERS[taskType];
  if (!task) throw new Error(`Unknown task type: ${taskType}`);
  const estimatedTokens = Math.round(baseTokens * task.multiplier);
  const estimatedCost = estimatedTokens / 100; // 100 tokens / $1
  return {
    taskLabel: task.label,
    multiplier: task.multiplier,
    estimatedTokens,
    estimatedCost,
  };
}
```

- [ ] **Step 3: Create LUCCalculator component**

Pre-action overlay styled like the LUC project card (dark glass, gold accents, scope/tokens/cost/time). Props: `taskType`, `baseTokens`, `onConfirm`, `onCancel`. Shows LUC's "LUC" pocket badge icon.

- [ ] **Step 4: Create pricing page**

Full pricing page: Buy Me a Coffee hero at top, 3-6-9 frequency table, V.I.B.E. group selector, Three Pillars toggles, task multiplier table, LUC Calculator demo, competitive comparison table.

- [ ] **Step 5: Commit**

```bash
git add perform/src/lib/billing/ perform/src/components/billing/ perform/src/app/pricing/
git commit -m "feat: Per|Form billing — Coffee entry, 3-6-9, multipliers, LUC calculator"
```

---

## Task 13: Landing Page

**Files:**
- Modify: `perform/src/app/page.tsx`

- [ ] **Step 1: Build the landing page**

Replace placeholder with full landing:
- TIE badge hero (SVG hexagon, large) with "PER|FORM" wordmark
- Tagline: "Sports Grading & Ranking Platform"
- "Buy Me a Coffee" CTA button
- 4 analyst preview cards (archetype + latest take snippet)
- "NFL Draft 2026" countdown/date banner
- Feature grid: TIE Grades, Mock Draft, Analyst Debates, Podcast Engine, NFT Cards, Recruiting
- "Powered by The Deploy Platform" footer

- [ ] **Step 2: Commit**

```bash
git add perform/src/app/page.tsx
git commit -m "feat: Per|Form landing page — TIE hero, Coffee CTA, analyst previews"
```

---

## Task 14: Docker + Traefik Deployment

**Files:**
- Create: `perform/Dockerfile`
- Create: `perform/docker-compose.yml`
- Modify: VPS Traefik config (via SSH)

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
services:
  perform:
    build: .
    restart: unless-stopped
    env_file: .env.local
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.perform.rule=Host(`perform.foai.cloud`)"
      - "traefik.http.routers.perform.tls.certresolver=letsencrypt"
      - "traefik.http.services.perform.loadbalancer.server.port=3000"
    networks:
      - traefik-net

networks:
  traefik-net:
    external: true
```

- [ ] **Step 3: Add `output: 'standalone'` to next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```

- [ ] **Step 4: Deploy to myclaw-vps**

```bash
# Push code
git push origin main

# SSH and deploy
ssh myclaw-vps "cd /opt/foai-repo && git pull origin main && cd perform && docker compose up -d --build"
```

- [ ] **Step 5: Verify perform.foai.cloud is live**

- [ ] **Step 6: Commit any deploy fixes**

```bash
git add perform/Dockerfile perform/docker-compose.yml perform/next.config.mjs
git commit -m "feat: Per|Form Docker + Traefik deployment — perform.foai.cloud"
```

---

## Task 15: CTI Hub Preview Card Update

**Files:**
- Modify: `cti-hub/src/app/plug/perform/page.tsx`

- [ ] **Step 1: Replace the full plug page with a preview card**

The CTI Hub plug page becomes a branded card linking to `perform.foai.cloud`:
- TIE badge
- "Per|Form — Sports Grading & Ranking Platform"
- "View Draft Board", "Meet the Analysts", "Run Mock Draft" buttons linking to perform.foai.cloud routes
- "Go to Per|Form" primary CTA

- [ ] **Step 2: Commit and deploy CTI Hub**

```bash
git add cti-hub/src/app/plug/perform/
git commit -m "fix: CTI Hub perform plug → preview card linking to perform.foai.cloud"
git push origin main
ssh myclaw-vps "cd /opt/foai-repo && git pull && cd cti-hub && docker compose up -d --build"
```

---

## Summary

| Task | What | Depends On |
|------|------|------------|
| 1 | Scaffold Next.js app | — |
| 2 | DB + Auth + OpenRouter infra | 1 |
| 3 | TIE Grading Engine | 2 |
| 4 | Player database + seed data | 2, 3 |
| 5 | TIE Badge + core UI components | 1 |
| 6 | NFL Draft Board pages | 4, 5 |
| 7 | Mock Draft Simulator | 4, 5 |
| 8 | Analyst personas + content gen | 2 |
| 9 | Podcast engine | 8 |
| 10 | Bull vs Bear debate | 8, 5 |
| 11 | NFT player cards | 4 |
| 12 | Billing + LUC calculator | 1 |
| 13 | Landing page | 5, 8, 12 |
| 14 | Docker + Traefik deploy | 1-13 |
| 15 | CTI Hub preview card | 14 |
