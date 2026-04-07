ACHIEVEMOR
PHASE 0
OWNER BYPASS + ACCESS LEVEL HOOK
CLAW-CODE IMPLEMENTATION PLAN
Parent Directive: Three-Surface Integration Architecture v1.0
Target: cti-hub repository (shared by cti.foai.cloud + deploy.foai.cloud)
Document Version: 1.0
Date: April 6, 2026
Estimated Duration: ~4 hours
Approving Authority: ACHEEVY — Digital CEO
Executing Agent: Chicken Hawk → Lil_Code_Hawk (Claw-Code)
1. PURPOSE
This plan delivers two foundational pieces that every subsequent phase in the Three-Surface Integration Architecture depends on. Without these, no visual work, no tool integration, and no customer-facing surface can ship correctly.
Deliverable A — Owner Bypass: Wire isOwner() into every remaining paywall gate so the owner never sees a pricing prompt, never accidentally charges themselves, and never hits a tier limit on their own platform.
Deliverable B — Access Level Hook: Create the canonical useAccessLevel() hook that replaces usePlatformMode() and becomes the single permission check every dashboard component uses to decide what to render for OWNER vs. ENTERPRISE vs. GROWTH vs. STARTER vs. PUBLIC.
Both deliverables land in the same cti-hub repo. Both are pure code changes — no visual work, no new routes beyond one small API endpoint, no dependency additions, no infrastructure changes.
2. PREREQUISITE AUDIT — CURRENT STATE
Before writing any code, the executing agent must verify the current state of every file referenced in this plan. The audit below was conducted on April 6, 2026. If any file has been modified since then, re-audit before proceeding.

| File | Current Behavior | isOwner() Present? | Action Required |
| src/lib/allowlist.ts | Exports isOwner(email). Reads OWNER_EMAILS env var. | YES ✔ | None — foundation exists |
| src/lib/auth-guard.ts | Line ~67: calls isOwner for auth fast-path | YES ✔ | None — already wired |
| src/lib/budget.ts | Line ~123: calls isOwner to skip budget enforcement | YES ✔ | None — already wired |
| src/app/api/stripe/checkout/route.ts | POST handler creates Stripe checkout session | NO ✘ | ADD isOwner short-circuit |
| src/app/api/stripe/sqwaadrun/checkout/route.ts | POST handler creates Sqwaadrun checkout | NO ✘ | ADD isOwner short-circuit |
| src/app/(dashboard)/pricing/page.tsx | Renders tier grid with Stripe buttons | NO ✘ | ADD owner UI override |
| src/app/(dashboard)/billing/page.tsx | Renders current plan + upgrade CTA | NO ✘ | ADD owner UI override |
| src/app/api/stripe/webhook/route.ts | Processes inbound Stripe webhook events | N/A | None — owner never triggers webhooks |

⚠️  If any file marked NO above now contains isOwner(), skip that file’s implementation step. Do NOT duplicate the bypass.

---

## 2.1 EXECUTION ANNOTATIONS (added 2026-04-06 after source spot-check)

Four corrections to the plan below, verified against the live cti-hub repo before execution. Apply these when you hit the referenced sections — do NOT follow the original wording at those points.

### ANNOTATION A — Auth import name (applies to Sections 3.1, 3.2, 3.3)

The plan references `getServerSession` from `@/lib/auth-guard` and destructures `authResult.context.profile.email` / `authResult.session.user.email`. **Neither exists in the repo.** The real pattern used by every Stripe route in the codebase is:

```ts
import { requireAuthenticatedRequest } from '@/lib/server-auth';

// inside the POST/GET handler:
const authResult = await requireAuthenticatedRequest(request);
if (!authResult.ok) return authResult.response;

const email = authResult.context.user.email;  // <-- canonical path
```

**Return shape (exact, verified from src/lib/server-auth.ts):**
```ts
{ ok: true, context: { token, user: { uid, email, displayName }, profile } }
| { ok: false, response: NextResponse }
```

**Apply to Section 3.1 (stripe/checkout):** replace the plan's insertion snippet with:
```ts
// --- OWNER BYPASS (Phase 0) ---
// (import goes at top of file with other imports)
// import { isOwner } from '@/lib/allowlist';
//
// Insert INSIDE the POST handler, immediately after:
//   if (!authResult.ok) return authResult.response;
// and BEFORE the rate-limit block.
if (isOwner(authResult.context.user.email)) {
  return NextResponse.json({
    owner_bypass: true,
    redirect_url: '/dashboard?owner_unlimited=1',
    message: 'Owner clearance — no checkout required.',
  });
}
// --- END OWNER BYPASS ---
```

**Apply to Section 3.2 (sqwaadrun/checkout):** identical to 3.1. Same import, same block, same position (right after `if (!authResult.ok) return authResult.response;`).

**Apply to Section 3.3 (new /api/auth/owner-check route):** the plan's suggested file uses `getServerSession()` which does not exist. Use this verified version instead:

```ts
// src/app/api/auth/owner-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedRequest(request);
  if (!authResult.ok) {
    // Anonymous visitors get a graceful response, not a 401 —
    // this endpoint is for UI personalization only.
    return NextResponse.json({ isOwner: false, email: null });
  }
  const email = authResult.context.user.email ?? null;
  return NextResponse.json({
    isOwner: isOwner(email),
    email,
  });
}
```

### ANNOTATION B — Skip Section 4.3 entirely

Section 4.3 ("Migration from usePlatformMode") is a **NO-OP**. `usePlatformMode` does not exist in the cti-hub repo (verified via grep: existing hooks are `useAgentFleet`, `useAuth`, `useSystemStatus`, `useWhiteLabel` — no `usePlatformMode`). `useAccessLevel` lands as a clean first-time addition with zero migration debt. **Skip 4.3 in its entirety.** Do not search for call sites, do not add deprecation comments, do not touch any existing hook.

### ANNOTATION C — Server-side access level (Section 4.4)

Section 4.4 imports `getServerSession` from `@/lib/auth-guard`. Same fix as Annotation A. Use this verified version:

```ts
// src/lib/server-access-level.ts
import type { NextRequest } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';
import type { AccessLevel } from '@/hooks/useAccessLevel';

export async function getServerAccessLevel(
  request: NextRequest,
): Promise<AccessLevel> {
  const authResult = await requireAuthenticatedRequest(request);
  if (!authResult.ok) return 'PUBLIC';

  const email = authResult.context.user.email;
  if (isOwner(email)) return 'OWNER';

  // Profile tier lookup — verify actual UserProfile shape in
  // src/lib/auth-paywall.ts before shipping. Fallback: STARTER.
  const profile = authResult.context.profile as any;
  const tier = (profile?.tier ?? profile?.subscription?.tier ?? 'starter')
    .toString()
    .toLowerCase();

  const tierMap: Record<string, AccessLevel> = {
    enterprise: 'ENTERPRISE',
    growth: 'GROWTH',
    starter: 'STARTER',
    free: 'PUBLIC',
  };
  return tierMap[tier] ?? 'STARTER';
}
```

Note: `getServerAccessLevel` now requires a `NextRequest` argument (Next.js App Router pattern), matching the rest of the codebase. Update any call sites accordingly.

### ANNOTATION D — useAuth hook return shape (Section 4.1) — VERIFIED 2026-04-07

Source spot-check performed on `src/context/auth-provider.tsx` (lines 25–48) and `src/lib/auth-paywall.ts` (line 32). Canonical `useAuth()` return shape:

```ts
interface AuthContextType {
  user: User | null;              // Firebase User — email at user.email
  profile: UserProfile | null;    // DB profile — tier at profile.tier
  subscription: Subscription | null;   // TOP-LEVEL, not nested under user
  tierLimits: TierLimits | null;
  organization: Organization | null;
  organizations: Organization[];
  loading: boolean;               // ✅ exists, use it
  denied: boolean;                // true if authed but not on allowlist
  // + methods (signIn, signOut, canAccess, trackUsage, etc.)
}
```

**Canonical `profile.tier` union (verified from `src/lib/auth-paywall.ts:32`):**
```ts
tier: 'free' | 'pro' | 'enterprise'
```

**Important:** the real 3-tier DB schema (`free` / `pro` / `enterprise`) does NOT match the architecture doc's 5-level access model (`OWNER` / `ENTERPRISE` / `GROWTH` / `STARTER` / `PUBLIC`). Phase 0 must map between them without touching the DB. Verified mapping:

| `profile.tier` (DB) | `AccessLevel` (app) | Notes |
|---------------------|---------------------|-------|
| n/a (isOwner === true) | `OWNER` | Owner bypass takes priority over profile.tier |
| `enterprise` | `ENTERPRISE` | Direct match |
| `pro` | `GROWTH` | Rename in the app layer only |
| `free` | `STARTER` | Authenticated free-tier users |
| n/a (no user) | `PUBLIC` | Unauthenticated visitors |

**Verified `useAccessLevel.ts` (use this instead of the plan's snippet in Section 4.1):**
```ts
// src/hooks/useAccessLevel.ts
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

export type AccessLevel =
  | 'OWNER'
  | 'ENTERPRISE'
  | 'GROWTH'
  | 'STARTER'
  | 'PUBLIC'
  | 'LOADING';  // see ANNOTATION F — avoid PUBLIC flicker during auth resolution

export function useAccessLevel(): AccessLevel {
  const { user, profile, loading } = useAuth();

  // During auth resolution, return LOADING so consumers can render a skeleton
  // instead of flickering from PUBLIC to the real level on first paint.
  if (loading) return 'LOADING';

  // Owner bypass takes absolute priority
  if (isOwner(user?.email)) return 'OWNER';

  // No user = public
  if (!user) return 'PUBLIC';

  // Map DB tier (`free` | `pro` | `enterprise`) to access level
  const dbTier = profile?.tier ?? 'free';
  const tierMap: Record<string, AccessLevel> = {
    enterprise: 'ENTERPRISE',
    pro: 'GROWTH',
    free: 'STARTER',
  };
  return tierMap[dbTier] ?? 'STARTER';
}
```

**Downstream impact:** any consumer that checks `level === 'STARTER'` must also handle `'LOADING'`. Helpers in `access-helpers.ts` (Section 4.2) must treat `'LOADING'` as "unknown — do not grant access" via `hasAccess()`.

### ANNOTATION E — Prerequisite Audit correction for billing page (Section 2)

**The Section 2 audit row for `src/app/(dashboard)/billing/page.tsx` is factually WRONG.** Re-verified against the live file 2026-04-07:

- Line 17: `import { isOwner } from '@/lib/allowlist';` ✅ already imported
- Line 41: `const ownerAccess = isOwner(userEmail);` ✅ already computed
- Line 63: `if (ownerAccess) return;` ✅ already short-circuits `handleSelectPlan` (but as a silent no-op)
- Line 91: `{ownerAccess && <OwnerBanner />}` ✅ small owner banner already rendered
- Line 353: additional owner-conditional rendering block

**Corrected audit row:**

| File | Current Behavior | isOwner() Present? | Action Required |
|------|------------------|--------------------|-----------------|
| `src/app/(dashboard)/billing/page.tsx` | Has owner check, silent-return handler, small owner banner | **PARTIAL ⚠** | Upgrade banner to full stamp + replace silent return with positive owner feedback (see Annotation F) |

The Section 2 audit table should be updated before the agent runs Step 1 of the execution sequence. Do **not** treat billing as a from-scratch add.

### ANNOTATION F — Section 3.5 (Billing Page) rewrite — delta against current state

The plan's Section 3.5 instructs the agent to add owner-check logic and an `OwnerClearanceStamp` component as if the file has no owner handling. **Ignore Section 3.5 as written. Instead, apply this delta:**

1. **Delete the silent return on line 63.** Replace `if (ownerAccess) return;` with:
   ```ts
   if (ownerAccess) {
     toast.success('Owner clearance — unlimited berth active');
     return;
   }
   ```
   (Note: the current billing file uses `alert()` not `toast`. If `sonner`'s `toast` is not imported in billing, add the import to match pricing page's style.)

2. **Upgrade the existing owner banner (line 91–99).** The current banner is a small amber strip. Replace with the full `OwnerClearanceStamp` component per the plan's Section 3.5 visual spec, keeping the existing `{ownerAccess && (...)}` conditional wrapper.

3. **Keep the tier grid visible for owners** — but render it as a read-only preview with a prominent stamp overlay. Do NOT hide the grid entirely; owners may still want to see plan options for reference. The stamp overlays the grid, it does not replace it.

4. **No fetch to `/api/auth/owner-check` needed on this page.** The billing page already has `isOwner` available via `useAuth` + the direct import — the new API route is only for pages that don't already have the auth context handy. Do not add unnecessary network calls.

### ANNOTATION G — Section 3.6 client-side handler fixes

**Two bugs in Section 3.6's example code:**

**Bug 1 — wrong response field name.** The plan's example uses `data.checkout_url`. The real Stripe checkout route (`src/app/api/stripe/checkout/route.ts:94`) returns `{ url: session.url, sessionId: session.id }`. Both live call sites consume the correct `url` field: `pricing/page.tsx:25` reads `payload.url`, `billing/page.tsx:71` reads `data.url`. **Replace every `data.checkout_url` in Section 3.6 with `data.url`.**

**Bug 2 — does not address the existing silent return on billing.** The plan tells the agent to "add `owner_bypass` handling" but does not instruct them to delete the pre-existing `if (ownerAccess) return;` on `billing/page.tsx:63`. If the agent obeys Section 3.6 literally, the owner path on billing remains unreachable because the handler returns before the fetch. **See Annotation F for the required delta.**

**Verified Section 3.6 example (use this instead of the plan's snippet):**
```ts
const res = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan: planId, commitment }),
});
const data = await res.json();

// NEW: owner bypass path — handle before checking data.url
if (data.owner_bypass) {
  toast.success(data.message ?? 'Owner clearance — no checkout required');
  window.location.href = data.redirect_url ?? '/dashboard';
  return;
}

if (!res.ok) throw new Error(data?.error || 'Unable to start checkout.');
if (!data?.url) throw new Error('Checkout URL not available.');
window.location.href = data.url;
```

Call sites to patch (verified via grep 2026-04-07):
- `src/app/(dashboard)/pricing/page.tsx:17` (in `handleUpgrade`)
- `src/app/(dashboard)/billing/page.tsx:65` (in `handleSelectPlan` — after deleting the silent return per Annotation F)

No third hidden call site.

### ANNOTATION H — Section 4.2 `agentLimit` JSON-safe sentinel

The plan's `agentLimit` returns JavaScript `Infinity` for `OWNER`. **`Infinity` is not JSON-safe:** `JSON.stringify(Infinity) === 'null'`. If this value crosses any serialization boundary (API response, DB column, log line, SSR hydration payload, SWR cache), it silently becomes `null`, and every downstream comparison like `used < limit` becomes `used < null`, which is always `false`. Owner agent limits silently break everywhere they're serialized.

**Fix:** use `Number.MAX_SAFE_INTEGER` as a JSON-safe effectively-unbounded sentinel. Verified `access-helpers.ts`:

```ts
// src/lib/access-helpers.ts
import type { AccessLevel } from '@/hooks/useAccessLevel';

/** Effectively unbounded, JSON-safe sentinel for owner-tier limits. */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

const TIER_RANK: Record<AccessLevel, number> = {
  OWNER: 100,
  ENTERPRISE: 80,
  GROWTH: 60,
  STARTER: 40,
  PUBLIC: 0,
  LOADING: 0,  // treat unknown as no-access — fail closed
};

/** Does the user's level meet or exceed the required minimum? */
export function hasAccess(
  userLevel: AccessLevel,
  requiredLevel: AccessLevel,
): boolean {
  if (userLevel === 'LOADING') return false;   // fail closed during auth resolution
  return TIER_RANK[userLevel] >= TIER_RANK[requiredLevel];
}

export function isOwnerLevel(level: AccessLevel): boolean {
  return level === 'OWNER';
}

export function canSeeInfra(level: AccessLevel): boolean {
  return level === 'OWNER';
}

/** Agent count permitted at this tier. Owner receives UNLIMITED, which is
 *  JSON-safe (survives JSON.stringify). Never use Infinity. */
export function agentLimit(level: AccessLevel): number {
  const limits: Record<AccessLevel, number> = {
    OWNER: UNLIMITED,
    ENTERPRISE: 99,
    GROWTH: 10,
    STARTER: 3,
    PUBLIC: 0,
    LOADING: 0,
  };
  return limits[level];
}
```

### ANNOTATION I — Section 4.4 Server-side access level: split for API routes vs Server Components

**Replaces Annotation C.** A single `getServerAccessLevel(request)` cannot serve both API routes (which have `NextRequest`) and Server Components (which use `next/headers`). Two helpers are needed:

```ts
// src/lib/server-access-level.ts
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isOwner } from '@/lib/allowlist';
import type { AccessLevel } from '@/hooks/useAccessLevel';

const TIER_MAP: Record<string, AccessLevel> = {
  enterprise: 'ENTERPRISE',
  pro: 'GROWTH',
  free: 'STARTER',
};

/** Use in API routes (NextRequest available). */
export async function getAccessLevelFromRequest(
  request: NextRequest,
): Promise<AccessLevel> {
  const authResult = await requireAuthenticatedRequest(request);
  if (!authResult.ok) return 'PUBLIC';

  if (isOwner(authResult.context.user.email)) return 'OWNER';

  const tier = authResult.context.profile?.tier ?? 'free';
  return TIER_MAP[tier] ?? 'STARTER';
}

/** Use in Server Components (no NextRequest — read cookie via next/headers). */
export async function getAccessLevelFromHeaders(): Promise<AccessLevel> {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-auth-token')?.value;
  if (!token) return 'PUBLIC';

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email ?? null;

    if (isOwner(email)) return 'OWNER';

    // Load profile directly from DB — Server Components cannot share the
    // requireAuthenticatedRequest code path because it requires a Request object.
    // This mirrors the loadProfile() logic in src/lib/server-auth.ts.
    // If this helper is needed, copy that logic here or export loadProfile().
    return 'STARTER';  // safe default until profile loader is exposed
  } catch {
    return 'PUBLIC';
  }
}
```

**Note:** `getAccessLevelFromHeaders()` currently returns `'STARTER'` as a safe default for authenticated non-owner users rather than looking up `profile.tier`, because `loadProfile()` is a private function inside `server-auth.ts`. If Server Components need tier-accurate gating in Phase 0, **export `loadProfile(userId)` from `src/lib/server-auth.ts`** as part of this phase so both helpers can share it. Otherwise defer Server Component tier-gating to a follow-up cycle.

### ANNOTATION J — Section 1 duration estimate

The plan's "~4 hours" estimate is optimistic. Realistic scope with the corrected annotations: **6–8 hours of focused coding time**, excluding review cycles. Budget accordingly. The five-gate validation + 14 manual tests alone eat ~90 minutes. Do not rush Phase 0 to fit a 4-hour slot.

---

3. DELIVERABLE A — OWNER BYPASS
Four code changes + one new route + one doc file. Each change is specified at the line level so the executing agent can apply it mechanically.
3.1 Stripe Checkout — src/app/api/stripe/checkout/route.ts
LOCATION
Inside the POST handler function, after the auth session is resolved but BEFORE any call to stripe.customers.create or stripe.checkout.sessions.create.
CODE TO INSERT
// --- OWNER BYPASS (Phase 0) ---
import { isOwner } from '@/lib/allowlist';
// Insert after: const authResult = await resolveAuth(req);
// Insert before: const customer = await stripe.customers.create(...)
const email = authResult?.context?.profile?.email
  ?? authResult?.session?.user?.email;
if (isOwner(email)) {
  return NextResponse.json({
    owner_bypass: true,
    redirect_url: '/dashboard?owner_unlimited=1',
    message: 'Owner clearance — no checkout required.',
  });
}
// --- END OWNER BYPASS ---
WHAT THIS DOES
Reads the authenticated user's email from the auth resolution
Checks it against the OWNER_EMAILS environment variable via isOwner()
If owner: returns a JSON response that the client interprets as a direct redirect to /dashboard with no Stripe session created
If not owner: falls through to the existing Stripe checkout flow unchanged
⚠️  The import goes at the top of the file with other imports. The bypass block goes inside the handler. Do not place the import inside the handler function.
3.2 Sqwaadrun Checkout — src/app/api/stripe/sqwaadrun/checkout/route.ts
CODE TO INSERT
Identical pattern to 3.1. Same import. Same short-circuit block. Same position (after auth resolution, before Stripe API calls). Same response shape.
// --- OWNER BYPASS (Phase 0) ---
import { isOwner } from '@/lib/allowlist';
const email = authResult?.context?.profile?.email
  ?? authResult?.session?.user?.email;
if (isOwner(email)) {
  return NextResponse.json({
    owner_bypass: true,
    redirect_url: '/dashboard?owner_unlimited=1',
    message: 'Owner clearance — no checkout required.',
  });
}
// --- END OWNER BYPASS ---
✅  After this change, the owner can never accidentally trigger a Stripe charge on either the main checkout or the Sqwaadrun checkout path.
3.3 New Route — src/app/api/auth/owner-check/route.ts
PURPOSE
A lightweight GET endpoint that the client-side pricing and billing pages call to determine whether to render the owner-clearance stamp or the normal tier grid. This endpoint is for UI personalization only — the real enforcement stays server-side in the checkout routes above.
FULL FILE CONTENT
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-guard';
import { isOwner } from '@/lib/allowlist';
export async function GET() {
  try {
    const session = await getServerSession();
    const email = session?.user?.email ?? null;
    return NextResponse.json({
      isOwner: isOwner(email),
      email,
    });
  } catch {
    return NextResponse.json({
      isOwner: false,
      email: null,
    });
  }
}
CREATE THIS FILE
This file does not exist yet. Create the directory and file:
mkdir -p src/app/api/auth/owner-check
# Create route.ts with the content above
⚠️  Verify that getServerSession is the correct import for your auth setup. The cti-hub uses Firebase Auth, so this may need to be getFirebaseSession or a custom session resolver. Check src/lib/auth-guard.ts for the exact export name.
3.4 Pricing Page — src/app/(dashboard)/pricing/page.tsx
WHAT CHANGES
Add a client-side fetch to /api/auth/owner-check on component mount. If isOwner is true, replace the entire tier grid with the owner-clearance stamp. If false, render the existing tier grid unchanged.
IMPLEMENTATION PATTERN
'use client';
import { useEffect, useState } from 'react';
export default function PricingPage() {
  const [ownerStatus, setOwnerStatus] = useState<
    { isOwner: boolean; email: string | null } | null
  >(null);
  useEffect(() => {
    fetch('/api/auth/owner-check')
      .then(r => r.json())
      .then(setOwnerStatus)
      .catch(() => setOwnerStatus({
        isOwner: false, email: null
      }));
  }, []);
  if (ownerStatus?.isOwner) {
    return <OwnerClearanceStamp />;
  }
  return (
    // ... existing tier grid JSX unchanged ...
  );
}
OWNER CLEARANCE STAMP COMPONENT
function OwnerClearanceStamp() {
  return (
    <div className="flex items-center justify-center
      min-h-[400px]">
      <div className="text-center p-12 border-2
        border-[#F5A623] rounded-2xl">
        <p className="font-black text-3xl
          text-[#F5A623] tracking-widest">
          UNLIMITED BERTH
        </p>
        <p className="font-mono text-sm
          text-[#F2EAD3] mt-2 uppercase
          tracking-[0.2em]">
          Owner Clearance
        </p>
        <p className="font-mono text-xs
          text-gray-500 mt-4">
          No checkout required
        </p>
      </div>
    </div>
  );
}
⚠️  Do NOT remove the existing tier grid code. Wrap it in the conditional so it still renders for non-owner users. The stamp replaces the grid visually, not structurally.
3.5 Billing Page — src/app/(dashboard)/billing/page.tsx
Same pattern as 3.4. Fetch /api/auth/owner-check on mount. If owner, replace the upgrade CTA and current-tier display with the OwnerClearanceStamp component. Keep the invoice history block but show it empty with a note: 'No billing history — owner clearance active.'
if (ownerStatus?.isOwner) {
  return (
    <div>
      <OwnerClearanceStamp />
      <div className="mt-8 text-center
        text-gray-500 font-mono text-sm">
        No billing history — owner clearance active
      </div>
    </div>
  );
}
✅  After this change, the owner never sees a tier grid, never sees an upgrade button, and the billing page confirms their unlimited status cleanly.
3.6 Client-Side Checkout Handler Update
Wherever the client calls /api/stripe/checkout (likely in a handleCheckout function or similar), add handling for the owner_bypass response:
const res = await fetch('/api/stripe/checkout', {
  method: 'POST',
  body: JSON.stringify({ tier, ... }),
});
const data = await res.json();
if (data.owner_bypass) {
  // Owner detected — redirect to dashboard, no Stripe
  router.push(data.redirect_url);
  toast.success(data.message);
  return;
}
// Normal flow: redirect to Stripe checkout URL
window.location.href = data.checkout_url;
FIND THIS HANDLER
Search the codebase for calls to /api/stripe/checkout:
grep -rn '/api/stripe/checkout' src/ --include='*.ts' --include='*.tsx'
Apply the owner_bypass handling to every call site found. There should be at most 2–3 call sites (main checkout, Sqwaadrun checkout, possibly a plan-change flow).
4. DELIVERABLE B — ACCESS LEVEL HOOK
The canonical permission hook that replaces usePlatformMode() and becomes the single source of truth for what every component renders.
4.1 New File — src/hooks/useAccessLevel.ts
FULL FILE CONTENT
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
export type AccessLevel =
  | 'OWNER'
  | 'ENTERPRISE'
  | 'GROWTH'
  | 'STARTER'
  | 'PUBLIC';
export function useAccessLevel(): AccessLevel {
  const { user, loading } = useAuth();
  // Owner check takes absolute priority
  if (isOwner(user?.email)) return 'OWNER';
  // Unauthenticated or loading = public
  if (!user || loading) return 'PUBLIC';
  // Resolve subscription tier from user profile
  const tier = user?.subscription?.tier
    ?? user?.metadata?.tier
    ?? 'STARTER';
  // Normalize to AccessLevel enum
  const tierMap: Record<string, AccessLevel> = {
    enterprise: 'ENTERPRISE',
    growth: 'GROWTH',
    starter: 'STARTER',
    free: 'PUBLIC',
  };
  return tierMap[tier.toLowerCase()]
    ?? 'STARTER';
}
⚠️  Verify the exact shape of the user object from useAuth(). The tier may live at user.subscription.tier, user.metadata.tier, user.plan, or a custom Firestore field. Check src/hooks/useAuth.ts for the return type and adjust the accessor accordingly.
4.2 Permission Helper Utilities — src/lib/access-helpers.ts
FULL FILE CONTENT
import type { AccessLevel } from
  '@/hooks/useAccessLevel';
// Tier hierarchy: OWNER > ENTERPRISE >
//   GROWTH > STARTER > PUBLIC
const TIER_RANK: Record<AccessLevel, number> = {
  OWNER: 100,
  ENTERPRISE: 80,
  GROWTH: 60,
  STARTER: 40,
  PUBLIC: 0,
};
/** Does the user's level meet or exceed
 *  the required minimum? */
export function hasAccess(
  userLevel: AccessLevel,
  requiredLevel: AccessLevel
): boolean {
  return TIER_RANK[userLevel]
    >= TIER_RANK[requiredLevel];
}
/** Is the user specifically the owner? */
export function isOwnerLevel(
  level: AccessLevel
): boolean {
  return level === 'OWNER';
}
/** Can the user see internal infrastructure
 *  (Claw-Code, Hermes, NemoClaw)? */
export function canSeeInfra(
  level: AccessLevel
): boolean {
  return level === 'OWNER';
}
/** How many agents does this tier permit? */
export function agentLimit(
  level: AccessLevel
): number {
  const limits: Record<AccessLevel, number> = {
    OWNER: Infinity,
    ENTERPRISE: 99,
    GROWTH: 10,
    STARTER: 3,
    PUBLIC: 0,
  };
  return limits[level];
}
These helpers are used by dashboard components to make rendering decisions without hardcoding tier logic. A component asks 'does this user have GROWTH access?' via hasAccess(level, 'GROWTH') rather than checking level === 'GROWTH' || level === 'ENTERPRISE' || level === 'OWNER'.
4.3 Migration from usePlatformMode()
FIND ALL USAGE
grep -rn 'usePlatformMode' src/
  --include='*.ts' --include='*.tsx'
MIGRATION PATTERN
For each file that imports usePlatformMode, replace:
// BEFORE:
const { isOwner, isCustomer } = usePlatformMode();
if (isOwner) { /* full view */ }
if (isCustomer) { /* filtered view */ }
// AFTER:
import { useAccessLevel }
  from '@/hooks/useAccessLevel';
import { isOwnerLevel, hasAccess }
  from '@/lib/access-helpers';
const level = useAccessLevel();
if (isOwnerLevel(level)) { /* full view */ }
if (hasAccess(level, 'STARTER'))
  { /* any paying customer */ }
⚠️  Do NOT delete usePlatformMode() until every call site is migrated and verified. Keep the old file with a deprecation comment during migration. Delete it only after all tests pass with the new hook.
4.4 Server-Side Access Level — src/lib/server-access-level.ts
The useAccessLevel hook is client-side (React). API routes need a server-side equivalent that reads from the session directly.
import { getServerSession }
  from '@/lib/auth-guard';
import { isOwner } from '@/lib/allowlist';
import type { AccessLevel }
  from '@/hooks/useAccessLevel';
export async function getServerAccessLevel():
  Promise<AccessLevel> {
  const session = await getServerSession();
  const email = session?.user?.email;
  if (isOwner(email)) return 'OWNER';
  if (!session?.user) return 'PUBLIC';
  const tier = session.user.subscription?.tier
    ?? session.user.metadata?.tier
    ?? 'STARTER';
  const tierMap: Record<string, AccessLevel> = {
    enterprise: 'ENTERPRISE',
    growth: 'GROWTH',
    starter: 'STARTER',
    free: 'PUBLIC',
  };
  return tierMap[tier.toLowerCase()]
    ?? 'STARTER';
}
Use this in API routes and Server Components where React hooks are not available.
5. DOCUMENTATION — docs/OWNER_BYPASS.md
Create this file in the repo. It serves as the single reference for future developers to understand every bypass point.
FILE CONTENT
# Owner Bypass Reference
## What It Does
Owner emails bypass all paywall, tier,
budget, and Stripe checkout gates.
Owners see UNLIMITED BERTH on pricing/billing.
## Owner Emails
Set via OWNER_EMAILS env var (comma-separated).
Current: bpo@achievemor.io,
  jarrett.risher@gmail.com
## Bypassed Gates
| Gate | File | How |
| Auth guard | src/lib/auth-guard.ts:67
  | Fast-path return |
| Budget check | src/lib/budget.ts:123
  | Skip enforcement |
| Stripe checkout | src/app/api/stripe/
  checkout/route.ts | Short-circuit before
  Stripe API call |
| Sqwaadrun checkout | src/app/api/stripe/
  sqwaadrun/checkout/route.ts | Same pattern |
| Pricing UI | src/app/(dashboard)/
  pricing/page.tsx | Stamp replaces grid |
| Billing UI | src/app/(dashboard)/
  billing/page.tsx | Stamp replaces CTA |
## How to Add a New Owner
Update OWNER_EMAILS on the Cloud Run service.
No code change required.
## How to Verify
1. Sign in as owner email
2. Navigate to /pricing - see stamp
3. Open Network tab, attempt checkout
   - no Stripe request fires
4. Sign in as non-owner - see normal grid
6. FIVE-GATE VALIDATION
Per the Claw-Code capability harness, every code change must clear all five gates before it is eligible for BAMARAM completion.

| Gate | Tool | Command | Pass Criteria |
| 1 | Unit Tests (pytest/jest) | npm run test -- --passWithNoTests | All tests pass, no regressions |
| 2 | Type Check (tsc) | npx tsc --noEmit | Zero errors |
| 3 | Lint (eslint) | npx eslint src/ --ext .ts,.tsx | Zero errors (warnings OK) |
| 4 | Security (npm audit) | npm audit --audit-level=high | Zero critical/high vulns |
| 5 | Build | npm run build | Clean build, zero errors |

RUN ALL FIVE IN SEQUENCE
npm run test -- --passWithNoTests \
  && npx tsc --noEmit \
  && npx eslint src/ --ext .ts,.tsx \
  && npm audit --audit-level=high \
  && npm run build
If any gate fails, fix the issue before proceeding. Do not skip gates.
7. MANUAL TEST CRITERIA
After all five gates pass and code is deployed to local dev, execute these manual tests:

| # | Test | Expected Result | Status |
| 1 | Sign in as bpo@achievemor.io, navigate to /pricing | Owner stamp shown | [ ] PASS |
| 2 | With owner signed in, open Network tab, click any CTA on /pricing | No /api/stripe/checkout request | [ ] PASS |
| 3 | Owner navigates to /billing | Owner stamp + empty history | [ ] PASS |
| 4 | Direct POST to /api/stripe/checkout as owner (curl or Postman) | { owner_bypass: true } | [ ] PASS |
| 5 | Direct POST to /api/stripe/sqwaadrun/checkout as owner | { owner_bypass: true } | [ ] PASS |
| 6 | Sign in as a non-owner test email, navigate to /pricing | Normal tier grid with Stripe buttons | [ ] PASS |
| 7 | Non-owner clicks checkout — verify Stripe session is created | Stripe checkout URL returned | [ ] PASS |
| 8 | GET /api/auth/owner-check as owner | { isOwner: true } | [ ] PASS |
| 9 | GET /api/auth/owner-check as non-owner | { isOwner: false } | [ ] PASS |
| 10 | GET /api/auth/owner-check unauthenticated | { isOwner: false, email: null } | [ ] PASS |
| 11 | useAccessLevel() returns OWNER for owner email | OWNER level confirmed | [ ] PASS |
| 12 | useAccessLevel() returns STARTER for a user with no subscription | STARTER level confirmed | [ ] PASS |
| 13 | useAccessLevel() returns PUBLIC for unauthenticated visitor | PUBLIC level confirmed | [ ] PASS |
| 14 | Budget enforcement (src/lib/budget.ts) still skips for owner | No budget errors for owner | [ ] PASS |

8. FILE MANIFEST
Complete list of files touched by this plan, organized by action type.

| Action | File Path | Deliverable |
| MODIFY | src/app/api/stripe/checkout/route.ts | A — Owner Bypass |
| MODIFY | src/app/api/stripe/sqwaadrun/checkout/route.ts | A — Owner Bypass |
| MODIFY | src/app/(dashboard)/pricing/page.tsx | A — Owner Bypass |
| MODIFY | src/app/(dashboard)/billing/page.tsx | A — Owner Bypass |
| MODIFY | Client-side checkout handler (location TBD via grep) | A — Owner Bypass |
| CREATE | src/app/api/auth/owner-check/route.ts | A — Owner Bypass |
| CREATE | src/hooks/useAccessLevel.ts | B — Access Hook |
| CREATE | src/lib/access-helpers.ts | B — Access Hook |
| CREATE | src/lib/server-access-level.ts | B — Access Hook |
| CREATE | docs/OWNER_BYPASS.md | Documentation |
| DEPRECATE | src/hooks/usePlatformMode.ts (or equivalent) | B — Migration |

Total new files: 5
Total modified files: 5 (+ client-side checkout handlers)
Total deprecated files: 1
New dependencies: 0
9. EXECUTION SEQUENCE
The executing agent should follow this exact sequence. Each step has a checkpoint. Do not advance past a failed checkpoint.
Audit current state — Run the grep commands from Section 2 to verify file locations. Confirm isOwner() exists in allowlist.ts. Confirm auth-guard.ts and budget.ts already call it. Confirm the two checkout routes do NOT call it.
Checkpoint: Audit table matches Section 2. If it differs, update the plan before proceeding.
Create new files — Create all 5 new files (owner-check route, useAccessLevel, access-helpers, server-access-level, OWNER_BYPASS.md) using the exact code from Sections 3.3, 4.1, 4.2, 4.4, and 5.
Checkpoint: npx tsc --noEmit passes with the new files present.
Modify checkout routes — Add the isOwner short-circuit to both Stripe checkout routes per Sections 3.1 and 3.2.
Checkpoint: npx tsc --noEmit still passes. No new type errors.
Modify pricing + billing pages — Add the owner-check fetch and OwnerClearanceStamp component per Sections 3.4 and 3.5.
Checkpoint: npm run build succeeds. Page renders without runtime errors.
Update client-side checkout handlers — Per Section 3.6, find all call sites via grep and add owner_bypass handling.
Checkpoint: Full five-gate validation passes (Section 6 command).
Manual testing — Run all 14 manual tests from Section 7. Mark each PASS/FAIL.
Checkpoint: All 14 tests pass. Zero failures.
Commit + deploy — Single commit with message: 'feat(phase-0): owner bypass + useAccessLevel hook'. Deploy to Cloud Run. Verify OWNER_EMAILS env var is set on the service.
Checkpoint: Production deploy successful. Test #1 passes against production URL.
BAMARAM — Phase 0 is complete. Signal BAMARAM. Ready for Phase 1 (Deploy Realm MVP) or Phase 1B (CTI Layout Shell).
10. DEFINITION OF DONE
Phase 0 is complete when every condition below is true:
isOwner() short-circuits both Stripe checkout routes before any Stripe API call.
/api/auth/owner-check returns { isOwner: true } for owner emails and { isOwner: false } for all others.
/pricing page shows UNLIMITED BERTH stamp for owner, normal tier grid for non-owner.
/billing page shows owner stamp with empty billing history for owner.
Client-side checkout handlers redirect owner to /dashboard without creating a Stripe session.
useAccessLevel() hook exists and correctly returns OWNER, ENTERPRISE, GROWTH, STARTER, or PUBLIC.
access-helpers.ts provides hasAccess(), isOwnerLevel(), canSeeInfra(), and agentLimit() utilities.
server-access-level.ts provides getServerAccessLevel() for API routes and Server Components.
docs/OWNER_BYPASS.md is committed with the complete gate inventory.
All 5 validation gates pass (test, type-check, lint, security, build).
All 14 manual test criteria pass.
OWNER_EMAILS env var is set on the Cloud Run service for both cti.foai.cloud and deploy.foai.cloud.
No new dependencies added to package.json.
END OF PLAN — PHASE 0
Hand this document to Chicken Hawk → Lil_Code_Hawk for execution.
Upon BAMARAM, proceed to Phase 1 per the parent directive.