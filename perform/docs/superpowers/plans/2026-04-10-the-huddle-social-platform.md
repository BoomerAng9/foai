# The Huddle — Social/Workspace Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "The Huddle" — an AI-run social media platform under Deploy Platform where each analyst persona has an autonomous profile, posts content, and engages with draft news. Includes Stepper webhook validation smoke testing.

**Architecture:** The Huddle lives inside Per|Form's Next.js app at `/huddle/*` routes (later extractable to its own app under Deploy). Uses the existing `performdb` Neon database with new tables for posts, profiles, and reactions. Analyst personas from `personas.ts` are the seed profiles. A background content generator creates posts from scouting data, podcast episodes, and draft news. Stepper/n8n webhooks trigger post generation and validate the pipeline end-to-end.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (performdb), existing Firebase auth, existing analyst personas, existing webhook infrastructure, Stepper.io + n8n for automation validation.

---

## File Map

```
NEW FILES:
  src/app/huddle/page.tsx                          — Main Huddle feed (timeline)
  src/app/huddle/[analyst]/page.tsx                 — Individual analyst profile page
  src/app/huddle/workspace/page.tsx                 — Huddle Workspace (collaborative space)
  src/app/api/huddle/posts/route.ts                 — CRUD for Huddle posts
  src/app/api/huddle/profiles/route.ts              — Analyst profile data
  src/app/api/huddle/generate/route.ts              — AI post generation endpoint
  src/components/huddle/PostCard.tsx                 — Single post component
  src/components/huddle/ProfileHeader.tsx            — Analyst profile header
  src/components/huddle/HuddleFeed.tsx              — Scrollable feed of posts
  src/components/huddle/ComposePost.tsx              — Post composition (admin only)
  src/lib/huddle/post-generator.ts                  — AI content generation from player data
  scripts/seed-huddle-posts.mjs                     — Seed initial posts from existing data

MODIFY:
  src/middleware.ts                                  — Add /huddle/ to public prefixes
  src/components/layout/Header.tsx                   — Add Huddle nav link
  src/app/api/webhooks/stepper/route.ts              — Add 'generate-post' action
```

---

### Task 1: Database Schema — Huddle Tables

**Files:**
- Create: `src/app/api/huddle/posts/route.ts` (table creation in ensureTable pattern)

- [ ] **Step 1: Create the posts API route with schema**

```typescript
// src/app/api/huddle/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const CREATE_POSTS = `
  CREATE TABLE IF NOT EXISTS huddle_posts (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'take',
    content TEXT NOT NULL,
    tags TEXT[],
    player_ref TEXT,
    likes INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const CREATE_PROFILES = `
  CREATE TABLE IF NOT EXISTS huddle_profiles (
    id SERIAL PRIMARY KEY,
    analyst_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    bio TEXT,
    show_name TEXT,
    avatar_color TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

async function ensureTables() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(CREATE_POSTS);
  await sql.unsafe(CREATE_PROFILES);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const url = req.nextUrl;
    const analyst = url.searchParams.get('analyst');
    const type = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `SELECT * FROM huddle_posts WHERE 1=1`;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (analyst) {
      query += ` AND analyst_id = $${paramIdx++}`;
      params.push(analyst);
    }
    if (type) {
      query += ` AND post_type = $${paramIdx++}`;
      params.push(type);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)::int as total');
    query += ` ORDER BY pinned DESC, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const [posts, countResult] = await Promise.all([
      sql.unsafe(query, params),
      sql.unsafe(countQuery, params.slice(0, -2)),
    ]);

    return NextResponse.json({
      posts,
      total: countResult[0]?.total || 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    if (!sql) throw new Error('Database not configured');

    const body = await req.json();
    const { analyst_id, content, post_type, tags, player_ref } = body;

    if (!analyst_id || !content) {
      return NextResponse.json({ error: 'analyst_id and content required' }, { status: 400 });
    }

    const [post] = await sql`
      INSERT INTO huddle_posts (analyst_id, content, post_type, tags, player_ref)
      VALUES (${analyst_id}, ${content}, ${post_type || 'take'}, ${tags || []}, ${player_ref || null})
      RETURNING *`;

    // Update post count
    await sql`UPDATE huddle_profiles SET post_count = post_count + 1 WHERE analyst_id = ${analyst_id}`;

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify tables create on first call**

Run locally: `curl http://localhost:3000/api/huddle/posts`
Expected: `{"posts":[],"total":0,"limit":20,"offset":0}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/huddle/posts/route.ts
git commit -m "feat(huddle): posts API with schema auto-creation"
```

---

### Task 2: Profiles API + Seed Data

**Files:**
- Create: `src/app/api/huddle/profiles/route.ts`
- Create: `scripts/seed-huddle-posts.mjs`

- [ ] **Step 1: Create profiles API**

```typescript
// src/app/api/huddle/profiles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function ensureProfiles() {
  if (!sql) throw new Error('Database not configured');
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS huddle_profiles (
    id SERIAL PRIMARY KEY, analyst_id TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL, bio TEXT, show_name TEXT, avatar_color TEXT,
    followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0, post_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

export async function GET(req: NextRequest) {
  try {
    await ensureProfiles();
    if (!sql) throw new Error('Database not configured');
    const analyst = req.nextUrl.searchParams.get('analyst');

    if (analyst) {
      const [profile] = await sql`SELECT * FROM huddle_profiles WHERE analyst_id = ${analyst}`;
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      return NextResponse.json({ profile });
    }

    const profiles = await sql`SELECT * FROM huddle_profiles ORDER BY post_count DESC`;
    return NextResponse.json({ profiles });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create seed script**

The seed script (`scripts/seed-huddle-posts.mjs`) should:
1. Insert 5 analyst profiles into `huddle_profiles` (Void-Caster, Haze, Colonel, Astra, Bun-E) with handles like `@void-caster`, `@the-haze`, show names, bios, and avatar colors from `personas.ts`
2. For each of the top 10 draft prospects in `perform_players`, generate 2-3 Huddle posts per analyst — short takes (1-3 sentences), hot takes, scouting reactions, draft predictions
3. Add a few cross-analyst interactions (Haze disagreeing with Colonel, Bun-E dropping mysterious hints about a player's "trajectory pattern")
4. Total: ~100-150 seed posts
5. Posts should use post_type values: `take` (hot take), `scouting` (player analysis), `prediction` (draft prediction), `reaction` (responding to news), `thread` (multi-part)
6. Tags should include player name, position, school
7. Content must be in-character (Colonel talks Jersey, Bun-E almost slips, Haze duo argues, etc.)
8. NO "elite", NO AI slop — same rules as scouting overhaul

Write the FULL seed script with all posts inline (not generated via LLM).

- [ ] **Step 3: Run seed script**

```bash
cd perform && node scripts/seed-huddle-posts.mjs
```
Expected: "Seeded 5 profiles, ~120 posts"

- [ ] **Step 4: Commit**

```bash
git add src/app/api/huddle/profiles/route.ts scripts/seed-huddle-posts.mjs
git commit -m "feat(huddle): profiles API + seed data (5 analysts, ~120 posts)"
```

---

### Task 3: Post Card + Feed Components

**Files:**
- Create: `src/components/huddle/PostCard.tsx`
- Create: `src/components/huddle/HuddleFeed.tsx`
- Create: `src/components/huddle/ProfileHeader.tsx`

- [ ] **Step 1: Build PostCard**

PostCard displays a single Huddle post:
- Analyst avatar (colored circle with initials), display name, handle, verified badge, timestamp
- Post content (supports line breaks)
- Tags as small chips below content
- Player reference link (if player_ref set, links to /players/[name]/forecast)
- Like/repost/reply counts (display only — no interaction yet)
- Post type indicator (small badge: TAKE, SCOUTING, PREDICTION, REACTION)
- Dark card on `#0D1117` background, gold accents for verified/pinned
- Matches Per|Form broadcast aesthetic

- [ ] **Step 2: Build HuddleFeed**

HuddleFeed is a scrollable timeline:
- Fetches from `/api/huddle/posts` with pagination
- Infinite scroll or "Load More" button
- Filter tabs: ALL / TAKES / SCOUTING / PREDICTIONS
- Analyst filter chips (click to filter by analyst)
- Uses PostCard for each post
- Loading skeleton while fetching

- [ ] **Step 3: Build ProfileHeader**

ProfileHeader for analyst profile pages:
- Large avatar area (gradient with analyst color)
- Display name, handle, verified badge
- Bio text
- Show name badge linking to /podcast/shows
- Stats: posts, followers, following
- "Follow" button (visual only for now)

- [ ] **Step 4: Commit**

```bash
git add src/components/huddle/
git commit -m "feat(huddle): PostCard, HuddleFeed, ProfileHeader components"
```

---

### Task 4: Huddle Pages (Feed + Profiles)

**Files:**
- Create: `src/app/huddle/page.tsx`
- Create: `src/app/huddle/[analyst]/page.tsx`
- Create: `src/app/huddle/workspace/page.tsx`
- Modify: `src/middleware.ts`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Build main Huddle feed page**

`/huddle` — "The Huddle by Deploy Platform"
- Hero: "THE HUDDLE" with Deploy Platform branding, dark broadcast aesthetic
- "Where the conversation never stops" tagline
- Analyst avatar strip (click to filter)
- HuddleFeed component below
- Per|Form broadcast aesthetic (navy/gold)

- [ ] **Step 2: Build analyst profile page**

`/huddle/[analyst]` — Individual analyst Huddle profile
- ProfileHeader at top
- Their posts feed below (filtered by analyst_id)
- "Listen to their show" link to /podcast/shows
- Recent episodes sidebar

- [ ] **Step 3: Build workspace page**

`/huddle/workspace` — Huddle Workspace placeholder
- "Coming Soon" with Deploy Platform branding
- Description of what Huddle Workspace will be (collaborative AI-native workspace)
- "Huddle Deploy Space" section — ship products from The Huddle
- Email capture for waitlist (visual only)

- [ ] **Step 4: Update middleware + header**

Add `/huddle/` to PUBLIC_PREFIXES in middleware.ts.
Add "The Huddle" link to Header.tsx NAV_ITEMS.

- [ ] **Step 5: Commit**

```bash
git add src/app/huddle/ src/middleware.ts src/components/layout/Header.tsx
git commit -m "feat(huddle): feed page, analyst profiles, workspace placeholder"
```

---

### Task 5: AI Post Generator

**Files:**
- Create: `src/lib/huddle/post-generator.ts`
- Create: `src/app/api/huddle/generate/route.ts`

- [ ] **Step 1: Build post generator**

`post-generator.ts` generates Huddle posts from existing data:
- `generateTakeFromPlayer(analystId, playerName)` — reads player from DB, writes a hot take in the analyst's voice
- `generateScoutingPost(analystId, playerName)` — scouting-depth post using strengths/weaknesses/comp
- `generatePredictionPost(analystId)` — draft prediction using mock draft data
- `generateReactionPost(analystId, newsItem)` — reacts to a news headline

Each function returns `{ analyst_id, content, post_type, tags, player_ref }` ready for INSERT.

Content is template-based with persona-specific vocabulary (NOT LLM-generated at runtime):
- Colonel: "Let me tell you something...", pizza references, Jersey dialect
- Bun-E: legal metaphors, near-slips about "back home", measured tone
- Void-Caster: dark, cinematic, declarative sentences
- Haze: `[HAZE]` and `[SMOKE]` tags, disagreement format
- Astra: fabric/fashion metaphors, unhurried elegance

- [ ] **Step 2: Build generate API**

`/api/huddle/generate` — POST endpoint that triggers post generation:
- Body: `{ analyst_id, type: 'take'|'scouting'|'prediction'|'reaction', player?: string }`
- Generates the post, inserts to DB, returns the post
- Protected by PIPELINE_AUTH_KEY (same as other pipeline endpoints)

- [ ] **Step 3: Commit**

```bash
git add src/lib/huddle/post-generator.ts src/app/api/huddle/generate/route.ts
git commit -m "feat(huddle): AI post generator with persona-specific templates"
```

---

### Task 6: Stepper Webhook Integration + Smoke Test

**Files:**
- Modify: `src/app/api/webhooks/stepper/route.ts`
- Create: `scripts/stepper-smoke-test.mjs`

- [ ] **Step 1: Add generate-post action to webhook**

Add a `generate-post` case to the existing stepper webhook handler:

```typescript
case 'generate-post': {
  if (!sql) throw new Error('Database not configured');
  const analystId = payload.analyst_id as string || 'void-caster';
  const type = payload.post_type as string || 'take';
  const player = payload.player as string;
  // Call the generate endpoint internally
  const genRes = await fetch(`${req.nextUrl.origin}/api/huddle/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.PIPELINE_AUTH_KEY}` },
    body: JSON.stringify({ analyst_id: analystId, type, player }),
  });
  result = await genRes.json();
  break;
}
```

- [ ] **Step 2: Create smoke test script**

`scripts/stepper-smoke-test.mjs` — runs locally, tests the full Stepper/webhook pipeline:
1. Calls `/api/webhooks/stepper` with action `ping` — verify 200
2. Calls with action `grade` + player name — verify player data returns
3. Calls with action `lookup` + search term — verify CFB data returns
4. Calls with action `generate-post` + analyst + player — verify post created
5. Calls GET `/api/webhooks/stepper` — verify reliability stats
6. Calls GET `/api/huddle/posts` — verify post appears in feed
7. Report: X/6 passed, latencies, any errors

- [ ] **Step 3: Run smoke test against live endpoint**

```bash
node scripts/stepper-smoke-test.mjs --url https://perform.foai.cloud
```
Expected: "6/6 passed" with latencies under 2000ms

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/stepper/route.ts scripts/stepper-smoke-test.mjs
git commit -m "feat(huddle): Stepper webhook generate-post action + smoke test"
```

---

### Task 7: Build, Deploy, Validate, PR

**Files:** None (deployment task)

- [ ] **Step 1: Full build test**

```bash
cd perform && npm run build
```
Expected: Clean build, 67+ static pages

- [ ] **Step 2: Run smoke test locally**

```bash
node scripts/stepper-smoke-test.mjs --url http://localhost:3000
```

- [ ] **Step 3: Commit all remaining changes**

```bash
git add -A perform/
git commit -m "feat(huddle): The Huddle social platform - complete implementation"
```

- [ ] **Step 4: Push and deploy**

```bash
git push origin HEAD
ssh myclaw-vps "cd /opt/foai-repo && git pull origin feat/sqwaadrun-security-hardening && cd perform && docker compose up -d --build"
```

- [ ] **Step 5: Verify live routes**

```bash
for path in /huddle /huddle/void-caster /huddle/workspace /api/huddle/posts /api/huddle/profiles; do
  curl -s -o /dev/null -w "%{http_code} $path\n" https://perform.foai.cloud$path
done
```
Expected: All 200

- [ ] **Step 6: Run smoke test against production**

```bash
node scripts/stepper-smoke-test.mjs --url https://perform.foai.cloud
```
Expected: 6/6 passed

- [ ] **Step 7: Update PR #136**

Update the PR description to include The Huddle features.

---

## Post-Implementation: Security Audit (Task 24)

After The Huddle ships, run the security audit:
1. SQL injection scan (verify all queries use parameterized templates)
2. Auth bypass check (middleware covers all protected routes)
3. XSS scan (user-generated content in posts)
4. Env var exposure (no keys in client bundles)
5. Firebase rules (Firestore security rules for FCM tokens)
6. Rate limiting (webhook endpoint abuse prevention)
7. CORS headers
8. Sensitive data in API responses (no internal IDs, no raw DB errors)
