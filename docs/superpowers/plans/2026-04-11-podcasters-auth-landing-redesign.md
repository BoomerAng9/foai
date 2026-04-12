# Podcasters Auth + Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert podcasters from gate-first to browse-first auth (users see everything, auth only on action), add owner bypass accounts with auto-LFG tier, apply stashed security hardening (rate limiting + CSP + preview-mode APIs), and redesign the landing page to broadcast-grade quality.

**Architecture:** Four pages (dashboard, war-room, workbench, settings) currently fetch `/api/podcasters/profile` on mount and redirect to `/login` on 401. We replace the redirect with a graceful degraded-state render: pages show content but disable action buttons (save, configure, deploy) behind an auth gate. A shared `useAuth` hook centralizes the pattern. Owner emails get auto-provisioned as LFG tier via a server-side allowlist in `auth-guard.ts`. The stashed branch has rate limiting + CSP + preview-mode player/rankings APIs that merge cleanly into this plan.

**Tech Stack:** Next.js 14, Firebase Auth, Neon/postgres.js, React hooks, Tailwind inline styles (Per|Form broadcast theme)

**Stash to apply first:** `git stash pop` on `feat/sqwaadrun-security-hardening` contains: rate-limit.ts, middleware rate limiting, CSP headers, players/rankings preview mode. These changes are folded into Tasks 1-2.

---

### Task 1: Apply stashed security hardening + rate limiting

**Files:**
- Restore from stash: `perform/src/lib/rate-limit.ts` (new)
- Restore from stash: `perform/src/middleware.ts` (modified)
- Restore from stash: `perform/next.config.mjs` (modified — CSP + poweredByHeader)
- Restore from stash: `perform/src/app/api/players/route.ts` (modified — preview mode)
- Restore from stash: `perform/src/app/api/tie/rankings/route.ts` (modified — preview mode)

- [ ] **Step 1: Create feature branch from main**

```bash
cd ~/foai
git checkout main
git checkout -b feat/podcasters-browse-first
```

- [ ] **Step 2: Cherry-pick stashed changes**

```bash
cd ~/foai
git stash pop
```

This restores all the WIP changes from `feat/sqwaadrun-security-hardening`:
- `perform/src/lib/rate-limit.ts` — in-memory sliding-window rate limiter
- `perform/src/middleware.ts` — 100 req/min/IP rate limiting on `/api/` routes
- `perform/next.config.mjs` — CSP headers + `poweredByHeader: false`
- `perform/src/app/api/players/route.ts` — preview mode (5 rows, limited columns) for unauthenticated
- `perform/src/app/api/tie/rankings/route.ts` — preview mode for unauthenticated

- [ ] **Step 3: Verify the rate-limit.ts file exists and has the right exports**

```bash
cd ~/foai/perform
cat src/lib/rate-limit.ts
```

If the file is missing from the stash (it was untracked), create it:

```typescript
// perform/src/lib/rate-limit.ts

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; resetMs: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetMs: windowMs };
  }

  entry.count += 1;
  const resetMs = entry.resetAt - now;

  if (entry.count > max) {
    return { allowed: false, resetMs };
  }

  return { allowed: true, resetMs };
}
```

- [ ] **Step 4: Run build to verify stash applies cleanly**

```bash
cd ~/foai/perform && npx next build 2>&1 | tail -20
```

Expected: Build succeeds (or only pre-existing errors unrelated to these files).

- [ ] **Step 5: Commit security hardening**

```bash
cd ~/foai
git add perform/src/lib/rate-limit.ts perform/src/middleware.ts perform/next.config.mjs perform/src/app/api/players/route.ts perform/src/app/api/tie/rankings/route.ts
git commit -m "feat(perform): add rate limiting, CSP headers, preview mode for unauthenticated API callers"
```

---

### Task 2: Add owner bypass allowlist to auth-guard

**Files:**
- Modify: `perform/src/lib/auth-guard.ts`

- [ ] **Step 1: Add owner allowlist and `isOwner` helper**

Add to `perform/src/lib/auth-guard.ts` after the existing `requireAuth` function:

```typescript
/** Owner emails — unlimited access, auto-LFG, never prompted to pay. */
const OWNER_EMAILS: ReadonlySet<string> = new Set([
  'jarrett.risher@gmail.com',
  'bpo@achievemor.io',
]);

export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAILS.has(email.toLowerCase());
}
```

- [ ] **Step 2: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
cd ~/foai
git add perform/src/lib/auth-guard.ts
git commit -m "feat(perform): add owner email allowlist for bypass auth"
```

---

### Task 3: Create shared `useAuth` hook for browse-first pattern

**Files:**
- Create: `perform/src/hooks/usePodcasterAuth.ts`

- [ ] **Step 1: Create the hook**

```typescript
// perform/src/hooks/usePodcasterAuth.ts
'use client';

import { useEffect, useState } from 'react';

interface AuthState {
  /** Whether auth check is still in progress */
  loading: boolean;
  /** User is logged in AND registered as a podcaster */
  authenticated: boolean;
  /** User profile data (null if not authenticated or not registered) */
  profile: PodcasterProfile | null;
  /** User is an owner (unlimited access) */
  isOwner: boolean;
  /** Trigger login flow — call on action buttons, not on page load */
  promptLogin: () => void;
}

interface PodcasterProfile {
  id: number;
  firebase_uid: string;
  selected_team: string;
  huddl_name: string | null;
  email: string;
  plan_tier: string;
}

export function usePodcasterAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PodcasterProfile | null>(null);

  useEffect(() => {
    fetch('/api/podcasters/profile')
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.user) setProfile(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const authenticated = profile !== null;
  const isOwner = authenticated && (profile?.plan_tier === 'lfg' && isOwnerByEmail(profile.email));

  function promptLogin() {
    const current = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
  }

  return { loading, authenticated, profile, isOwner, promptLogin };
}

const OWNER_EMAILS = new Set(['jarrett.risher@gmail.com', 'bpo@achievemor.io']);
function isOwnerByEmail(email: string): boolean {
  return OWNER_EMAILS.has(email?.toLowerCase());
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
cd ~/foai
git add perform/src/hooks/usePodcasterAuth.ts
git commit -m "feat(perform): add usePodcasterAuth hook for browse-first pattern"
```

---

### Task 4: Convert Dashboard to browse-first

**Files:**
- Modify: `perform/src/app/podcasters/dashboard/page.tsx`

- [ ] **Step 1: Replace auth-redirect pattern with usePodcasterAuth**

In `dashboard/page.tsx`, replace the existing `useEffect` that calls `/api/podcasters/profile` and redirects on 401/404 with:

```typescript
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';
```

Replace the profile-fetch `useEffect` (lines ~117-155) and `loading`/`user` state with:

```typescript
const { loading, authenticated, profile: user, promptLogin } = usePodcasterAuth();
```

Remove:
- `const [user, setUser] = useState<UserProfile | null>(null);`
- `const [loading, setLoading] = useState(true);`
- The entire `useEffect` that fetches `/api/podcasters/profile` and does `router.push('/login')` / `router.push('/podcasters/onboarding')`

Keep the team news and team detail fetches, but gate them on `user?.selected_team` instead:

```typescript
useEffect(() => {
  if (!user?.selected_team) return;
  const team = encodeURIComponent(user.selected_team);
  fetch(`/api/nfl/news?team=${team}&limit=5`)
    .then((r) => r.json())
    .then((d) => setNews(d.news || d.articles || []))
    .catch(() => {});
  fetch(`/api/nfl/teams/${team}`)
    .then((r) => r.json())
    .then((d) => {
      if (d.team) {
        setTeamDetail({
          wins_2025: d.team.wins_2025 || 0,
          losses_2025: d.team.losses_2025 || 0,
          roster_count: d.roster_count || 0,
          draft_picks_2026: d.team.draft_picks_2026 || [],
        });
      }
    })
    .catch(() => {});
}, [user?.selected_team]);
```

- [ ] **Step 2: Add auth-gate banner for unauthenticated users**

When `!authenticated && !loading`, show a non-blocking banner at the top of the page:

```tsx
{!authenticated && !loading && (
  <div
    className="mx-auto max-w-7xl px-6 py-3 mb-4 rounded-lg text-center text-sm"
    style={{ background: T.surface, border: `1px solid ${T.gold}`, color: T.gold }}
  >
    <span>Sign in to save your team, configure deliveries, and access full features. </span>
    <button onClick={promptLogin} className="underline font-bold hover:opacity-80">
      Sign In
    </button>
  </div>
)}
```

- [ ] **Step 3: Gate action buttons on auth**

For the editable huddl name and any save/configure buttons, wrap the interactive parts:

```tsx
{authenticated ? (
  // existing editable name input + save button
) : (
  <span className="text-lg font-bold" style={{ color: T.text }}>
    {user?.huddl_name || 'Command Center'}
  </span>
)}
```

For nav cards that lead to settings/onboarding, keep them navigable but mark settings as requiring auth.

- [ ] **Step 4: Show demo/placeholder content for unauthenticated**

When `!authenticated`, render a demo state for the dashboard — show nav cards (War Room, Workbench, Scripts, Settings) but display "Sign in to view your team data" where personalized data would be:

```tsx
{!user?.selected_team && (
  <div className="text-center py-12" style={{ color: T.textMuted }}>
    <p className="text-lg">Select a team to see your dashboard</p>
    <p className="text-sm mt-2">
      {authenticated
        ? <Link href="/podcasters/onboarding" style={{ color: T.gold }}>Complete onboarding</Link>
        : <button onClick={promptLogin} style={{ color: T.gold }} className="underline">Sign in to get started</button>
      }
    </p>
  </div>
)}
```

- [ ] **Step 5: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
cd ~/foai
git add perform/src/app/podcasters/dashboard/page.tsx
git commit -m "feat(perform): convert podcaster dashboard to browse-first auth"
```

---

### Task 5: Convert War Room to browse-first

**Files:**
- Modify: `perform/src/app/podcasters/war-room/page.tsx`

- [ ] **Step 1: Replace auth-redirect with usePodcasterAuth**

Same pattern as dashboard. Replace the profile-fetch `useEffect` (lines ~99-109) with:

```typescript
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';

// Inside component:
const { loading: authLoading, authenticated, profile, promptLogin } = usePodcasterAuth();
const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

useEffect(() => {
  if (profile?.selected_team) {
    setSelectedTeam(profile.selected_team);
  }
  if (!authLoading) setPageLoading(false);
}, [profile, authLoading]);
```

Remove:
- The `useEffect` that fetches `/api/podcasters/profile` and does `router.push('/login')`

- [ ] **Step 2: Show browse-mode panels for unauthenticated**

War Room panels should still render but show a "Sign in for full team data" overlay on panels that need profile data. The public NFL API routes already work without auth, so roster/news/prospects can load if a team is passed via query param or default.

For unauthenticated users with no team selected, show a team-picker CTA:

```tsx
{!selectedTeam && (
  <div className="text-center py-16" style={{ color: T.textMuted }}>
    <h2 className="text-2xl font-bold mb-4" style={{ color: T.text }}>Pick a Team</h2>
    <p className="mb-6">Select a team to see their War Room intel</p>
    {authenticated
      ? <Link href="/podcasters/onboarding" style={{ color: T.gold }}>Complete setup</Link>
      : <button onClick={promptLogin} style={{ color: T.gold }} className="underline text-lg">Sign in to select your team</button>
    }
  </div>
)}
```

- [ ] **Step 3: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd ~/foai
git add perform/src/app/podcasters/war-room/page.tsx
git commit -m "feat(perform): convert war room to browse-first auth"
```

---

### Task 6: Convert Workbench to browse-first

**Files:**
- Modify: `perform/src/app/podcasters/workbench/page.tsx`

- [ ] **Step 1: Replace auth-redirect with usePodcasterAuth**

Same pattern. Replace profile fetch + redirect with `usePodcasterAuth()`.

- [ ] **Step 2: Gate Save/Deploy buttons on auth**

Templates and the script editor should render for everyone. Gate only the action buttons:

```tsx
<button
  onClick={authenticated ? handleSave : promptLogin}
  style={{ background: T.gold, color: T.bg }}
  className="px-6 py-3 font-bold rounded-lg"
>
  {authenticated ? 'Save Script' : 'Sign In to Save'}
</button>
```

Distribution channel cards are already "COMING SOON" so no change needed.

- [ ] **Step 3: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd ~/foai
git add perform/src/app/podcasters/workbench/page.tsx
git commit -m "feat(perform): convert workbench to browse-first auth"
```

---

### Task 7: Convert Settings to browse-first

**Files:**
- Modify: `perform/src/app/podcasters/settings/page.tsx`

- [ ] **Step 1: Replace auth-redirect with usePodcasterAuth**

Settings is the one page where most content IS the action (configuring delivery). For unauthenticated users, show the form fields as read-only placeholders with a sign-in CTA.

```typescript
import { usePodcasterAuth } from '@/hooks/usePodcasterAuth';

const { loading, authenticated, profile, promptLogin } = usePodcasterAuth();
```

- [ ] **Step 2: Show read-only form preview for unauthenticated**

Render the form layout with default values but disable all inputs and show:

```tsx
{!authenticated && !loading && (
  <div className="text-center py-8 mb-6 rounded-lg"
    style={{ background: T.surface, border: `1px solid ${T.gold}` }}>
    <p style={{ color: T.gold }} className="font-bold mb-2">Sign in to configure your deliveries</p>
    <button onClick={promptLogin} className="underline" style={{ color: T.text }}>Sign In</button>
  </div>
)}
```

All `<select>`, `<input>`, and toggle elements get `disabled={!authenticated}`.

- [ ] **Step 3: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd ~/foai
git add perform/src/app/podcasters/settings/page.tsx
git commit -m "feat(perform): convert settings to browse-first auth"
```

---

### Task 8: Update Onboarding to handle owners

**Files:**
- Modify: `perform/src/app/podcasters/onboarding/page.tsx`
- Modify: `perform/src/app/api/podcasters/register/route.ts`

- [ ] **Step 1: Auto-assign LFG tier for owner emails in register API**

In `perform/src/app/api/podcasters/register/route.ts`, add owner check:

```typescript
import { requireAuth, isOwnerEmail } from '@/lib/auth-guard';

// Inside POST handler, after auth check succeeds:
const effectiveTier = isOwnerEmail(auth.email || '') ? 'lfg' : (plan_tier || 'free');
```

Replace `${plan_tier || 'free'}` with `${effectiveTier}` in the INSERT statement.

- [ ] **Step 2: Keep onboarding auth-gated (this is correct)**

Onboarding SHOULD require auth — it's an action (registration). The `onAuthStateChanged` check stays. No change needed to the page itself for browse-first.

- [ ] **Step 3: Verify build**

```bash
cd ~/foai/perform && npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd ~/foai
git add perform/src/app/api/podcasters/register/route.ts
git commit -m "feat(perform): auto-assign LFG tier for owner emails on registration"
```

---

### Task 9: Redesign landing page — broadcast-grade

**Files:**
- Modify: `perform/src/app/podcasters/page.tsx`

This is the biggest task. The current landing page is functional but generic — card grid + pricing table. The redesign needs to match the War Room / Dashboard broadcast aesthetic: dark cinematic, gold accents, red accent lines, motion energy.

- [ ] **Step 1: Replace the entire landing page**

Replace `perform/src/app/podcasters/page.tsx` with a broadcast-grade design. Key changes:

**Hero section** — Full-width cinematic hero with animated gradient backdrop, large bold headline with Per|Form gold accent, stats ticker bar showing live counts (placeholder-ready for real data later).

```tsx
{/* ═══ LIVE STATS TICKER ═══ */}
<div className="flex items-center justify-center gap-8 mt-10 text-xs font-mono tracking-wider"
  style={{ color: T.textMuted }}>
  <div className="flex flex-col items-center">
    <span className="text-2xl font-black" style={{ color: T.gold }}>32</span>
    <span>NFL TEAMS</span>
  </div>
  <div className="w-px h-8" style={{ background: T.border }} />
  <div className="flex flex-col items-center">
    <span className="text-2xl font-black" style={{ color: T.gold }}>450+</span>
    <span>PROSPECTS</span>
  </div>
  <div className="w-px h-8" style={{ background: T.border }} />
  <div className="flex flex-col items-center">
    <span className="text-2xl font-black" style={{ color: T.gold }}>24/7</span>
    <span>HAWK INTEL</span>
  </div>
</div>
```

**Feature showcase** — Instead of flat cards, use broadcast-style "segment" blocks with left accent bars, icons, and staggered layout. Each feature gets a mini screenshot/preview area (CSS placeholder box).

```tsx
<div className="relative pl-6" style={{ borderLeft: `3px solid ${T.red}` }}>
  <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full" style={{ background: T.red }} />
  <h3 className="text-xl font-black tracking-tight mb-2">WAR ROOM</h3>
  <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
    Rosters, depth charts, cap data, injury reports — your team's complete intelligence
    dossier refreshed by Hawk scouts every cycle.
  </p>
  <div className="mt-4 rounded-lg h-32 flex items-center justify-center text-xs font-mono"
    style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textMuted }}>
    LIVE DATA PREVIEW
  </div>
</div>
```

**CTA section** — Replace "Join the Draft" with a split CTA: "Browse the War Room" (goes to `/podcasters/war-room`, no auth needed) and "Create Your Command Center" (goes to `/podcasters/onboarding`).

```tsx
<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
  <Link href="/podcasters/war-room"
    className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg"
    style={{ background: 'transparent', color: T.gold, border: `2px solid ${T.gold}` }}>
    Browse the War Room
  </Link>
  <Link href="/podcasters/onboarding"
    className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg"
    style={{ background: T.gold, color: T.bg }}>
    Create Your Command Center
  </Link>
</div>
```

**Pricing section** — Keep the 5-tier comparison but improve the visual treatment: highlight Premium as "MOST POPULAR" with a gold border glow, add price placeholders, use the red top-accent from the feature segments.

**Social proof / trust strip** — Add a minimal strip: "POWERED BY PER|FORM · PUBLISHED BY ACHIEVEMOR" with the lion logo area placeholder.

- [ ] **Step 2: Full page implementation**

Write the complete replacement file. The page must:
- Be a Server Component (no `'use client'` — current page is already server-rendered)
- Import `Link` from `next/link`, `BackHomeNav` from `@/components/layout/BackHomeNav`, `PLAN_FEATURES` and `PlanTier` from `@/lib/podcasters/plans`
- Use the same `T` theme token pattern as the current page
- Match the dark broadcast aesthetic of War Room / Dashboard
- Have NO auth checks (it's a public landing page)
- Primary CTAs go to `/podcasters/war-room` (browse) and `/podcasters/onboarding` (register)

- [ ] **Step 3: Verify build and visually inspect**

```bash
cd ~/foai/perform && npx next build 2>&1 | tail -20
```

Then:
```bash
cd ~/foai/perform && npx next dev &
```

Visit `http://localhost:3000/podcasters` to visually verify.

- [ ] **Step 4: Commit**

```bash
cd ~/foai
git add perform/src/app/podcasters/page.tsx
git commit -m "feat(perform): redesign podcasters landing page to broadcast-grade"
```

---

### Task 10: Final verification + cleanup

**Files:**
- All modified files from Tasks 1-9

- [ ] **Step 1: Full build check**

```bash
cd ~/foai/perform && npx next build 2>&1 | tail -30
```

Expected: Clean build, no errors.

- [ ] **Step 2: Verify browse-first flow**

Manual check: Open an incognito browser and visit each route WITHOUT being logged in:
- `/podcasters` — landing page renders fully
- `/podcasters/dashboard` — renders with sign-in banner, no redirect
- `/podcasters/war-room` — renders with team-picker CTA, no redirect
- `/podcasters/workbench` — renders with templates, save buttons show "Sign In to Save"
- `/podcasters/settings` — renders with disabled form + sign-in CTA
- `/podcasters/onboarding` — redirects to login (CORRECT — this is an action)

- [ ] **Step 3: Verify owner bypass**

Log in as `jarrett.risher@gmail.com`, go through onboarding → confirm plan_tier is set to `lfg` in the database. Verify no upgrade prompts appear.

- [ ] **Step 4: Verify rate limiting**

```bash
for i in $(seq 1 105); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/players; done | sort | uniq -c
```

Expected: 100 responses of `200`, 5 responses of `429`.

- [ ] **Step 5: Commit any final fixes, then push**

```bash
cd ~/foai
git push -u origin feat/podcasters-browse-first
```
