# hawk.foai.cloud v1.0 Production Ship — Implementation Plan

> **For agentic workers:** This plan is the execution map for Wave 2 of the hawk.foai.cloud ship. Each step contains exact file paths, real code, real verification commands, and per-surface ship-reality gates. No stubs. No placeholders. CALCULATED BETs are marked inline. Operating doctrine: `aims-anticipatory-build-skill`.

**Plan date:** 2026-04-28
**Operating skill:** `~/.claude/skills/aims-anticipatory-build-skill/SKILL.md`
**Source spec (owner-approved 2026-04-27):** `~/.claude/plans/goofy-dancing-avalanche.md` (Wave 2)
**Surface:** `https://hawk.foai.cloud`
**Owner identity:** `asg@achievemor.io` (single-tenant for v1.0)
**Goal:** Ship the customer-facing chat + owner-tier Tool Chest as one declared-shipped surface.

---

## Teleological Anchor

1. **End goal:** Anchor the FOAI ecosystem to one declared-shipped slice. Unblock the owner-tier surface (Tool Chest, `/run`, `/audit`, `/hawks`, `/risk-events`) that has been theatrical for ~10 days behind a broken cookie check. Establish the ship-discipline pattern that subsequent waves (Coastal Brewing, Per|Form, Broad|Cast) will inherit.
2. **What we're doing:** Step 1 deploy verification + Steps 2-9 of the approved Wave 2 spec.
3. **What's expected of me / the engineer:** Production-grade execution. Every shipped path is real (no mocks, no fake data). Per-surface validation gates honored. Iller_Ang voice copy on customer pages. Geist Sans typography. Per-route SEO. Plausible analytics. Mobile + a11y verified.
4. **Measurable result (binary):**
   - Magic-link login → `/me` confirms `asg@achievemor.io` session → `/tools/*` returns 200 (not 401).
   - Anonymous chat at `/` answers "draft me a launch email" inside 5s with real markdown.
   - Sqwaadrun deeplink (`/?prompt=Lil_Diff_Hawk:...`) auto-fires + renders role-specific dispatch beats.
   - `/tools/dispatch` POSTs to `/run`, renders verdict, links to audit chain.
   - Lighthouse mobile: Perf ≥ 80, A11y ≥ 95, Best-Practices ≥ 90, SEO ≥ 90.
   - `git tag v1.0.0` exists on the commit that passes the 5-gate ship contract.

If any of those four cannot be answered truthfully at end-of-plan, the ship contract is **not** clear.

---

## CALCULATED BETs (owner can override mid-plan)

| # | Bet | Rationale | Cost to reverse |
|---|-----|-----------|-----------------|
| 1 | **Plausible over PostHog** for analytics | Lighter (~1KB), EU-hosted, no GDPR consent banner needed for the volume here. PostHog adds session replay value but heavier client + US-host. | Single file (`lib/analytics.ts`) + script tag swap. |
| 2 | **Universal `og:image.png`** (one 1200×630 Recraft V4 generation) over per-route bespoke cards | Per-route saves ~30 min and lifts SEO marginally; universal is good enough for v1.0 share renders. | Per-route can be added in Wave 3 by extending each `metadata` export. |
| 3 | **No frontend test framework added in Wave 2** | Vitest/Playwright is its own scope; this plan uses typecheck + build + grep + curl + Lighthouse + manual smoke as verification. Adds zero deferred TODOs because the gates are real. | Adding Playwright is a clean Wave 3 task with no breaking impact on shipped code. |
| 4 | **`/tools/dispatch` is the only new owner-tier panel** | Risk Events, Audit, Lil_Hawks, Policy Gate panels already exist as templated FastAPI pages. The auth fix is what makes them work. No new UI required to declare Tool Chest "live". | Adding more panels is purely additive, blocks nothing. |
| 5 | **Universal hero image stays the trio render** at `/public/chicken-hawk-trio.png` (already shipped) — Recraft regen is Wave 3 if owner wants new art. | Established brand truth. Don't churn what already validates. | None — keep what works. |

If the owner overrides any of these mid-execution, mark the override in the changelog and proceed. Bet #1 is most likely to flip; Bet #5 is least.

---

## What "shipped" means (ship contract preview)

These journeys MUST work cold (fresh browser, no cache, no localStorage) for the surface to be declared shipped:

1. **Anon visitor** lands on `/` → sees Iller_Ang-voice hero in Geist Sans → types "draft me a launch email" → markdown reply lands inside 5 s → no console errors.
2. **Visitor explores** `/sqwaadrun` → 17 hawk cards render in 3D-tilt grid → click `Lil_Diff_Hawk` → modal with stats + catchphrase → click **Deploy** → routes to `/?prompt=…` → home auto-fires → DispatchTrace renders the role-specific 5-beat lifecycle → markdown reply lands.
3. **Owner signs in** at `/login` → enters `asg@achievemor.io` → Telegram delivers magic link → click → arrives at `/me` showing "Signed in as asg@achievemor.io" → cookie set → all `/tools/*` panels load real data without 401.
4. **Owner uses** `/tools/dispatch` → submits real action + payload → renders verdict (allow / escalate / deny) → captures receipt id → click → routes to `/tools/audit?task_id=…` → audit trail visible.
5. **Visitor pastes URL** in Slack/LinkedIn → og card renders with hero image + title + description.
6. **Visitor on iPhone 13 (375px)** → all 7 routes render without horizontal scroll, all CTAs tappable, mic prompt + attachments work.
7. **Internal healthcheck** `docker exec chicken-hawk-hawk-ui-1 wget -qO- http://127.0.0.1:3010/api/health` returns `{ok:true,gateway:{ok:true},sha:"<commit>"}`.
8. **Forbidden-term grep** `grep -rE "Inter|Roboto|TODO|FIXME|XXX" hawk-ui/{app,components,lib}` returns zero hits (after the typography swap; `node_modules` excluded).
9. **Internal-IP grep** `grep -rE "Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent" hawk-ui/app/{page,about,sqwaadrun,login}/page.tsx` returns zero hits. (`/lil-hawks` introductions page IS allowed to use those terms.)
10. **Lighthouse mobile** scores: Perf ≥ 80, A11y ≥ 95, Best Practices ≥ 90, SEO ≥ 90.
11. **Owner declares "shipped"** after running journeys 1–6 personally (per `feedback_shipped_means_commercial_ready.md`).

---

## File manifest (everything this plan touches)

### Create

```
hawk-ui/app/error.tsx
hawk-ui/app/not-found.tsx
hawk-ui/app/loading.tsx
hawk-ui/app/sitemap.ts
hawk-ui/app/robots.ts
hawk-ui/app/api/health/route.ts
hawk-ui/app/tools/dispatch/page.tsx
hawk-ui/lib/analytics.ts
hawk-ui/lib/request-id.ts
hawk-ui/public/og-image.png                         # universal share card (Recraft V4)
hawk-ui/CHANGELOG.md
docs/superpowers/plans/2026-04-28-hawk-foai-cloud-v1-ship.md   # this file
~/ship-contracts/hawk-foai-cloud-v1.md              # final ship contract record
```

### Modify

```
gateway/main.py                                     # Step 1 — already applied locally, awaits deploy
hawk-ui/app/layout.tsx                              # Geist Sans wiring + Plausible tag + per-page metadata defaults
hawk-ui/app/globals.css                             # remove Inter CDN import, drop font-family directive
hawk-ui/tailwind.config.ts                          # font.sans = Geist
hawk-ui/app/page.tsx                                # Iller_Ang voice + analytics events + reduced-motion guards + a11y
hawk-ui/app/about/page.tsx                          # Iller_Ang voice
hawk-ui/app/lil-hawks/page.tsx                      # Iller_Ang voice (internal terms allowed here)
hawk-ui/app/sqwaadrun/page.tsx                      # Iller_Ang voice + analytics
hawk-ui/app/login/page.tsx                          # Iller_Ang voice
hawk-ui/components/menu-nav.tsx                     # Iller_Ang voice
hawk-ui/components/hawk-footer.tsx                  # Iller_Ang voice
hawk-ui/components/hero-chat-demo.tsx               # voice + a11y
hawk-ui/components/super-agent-badge.tsx            # voice
hawk-ui/components/dispatch-trace.tsx               # reduced-motion guard
hawk-ui/components/sqwaadrun-gallery.tsx            # reduced-motion guard + a11y on tilt cards
hawk-ui/components/markdown-reply.tsx               # a11y on copy button
hawk-ui/components/hawk-chat-input.tsx              # a11y aria-labels
hawk-ui/components/tools-nav.tsx                    # add Dispatch link
hawk-ui/next.config.mjs                             # add X-Request-Id propagation header
hawk-ui/package.json                                # add `geist` dep
hawk-ui/README.md                                   # current architecture + commands
/docker/chicken-hawk/docker-compose.yml             # (myclaw-vps) healthcheck → /api/health
```

### Verify-only (no edits unless test surfaces a bug)

```
gateway/auth.py                                     # already correct
gateway/router.py
gateway/nemoclaw.py
gateway/public_chat.py
gateway/config.py                                   # persona prompt, REFUSE_LINE
hawk-ui/lib/sqwaadrun-roster.ts                     # canonical roster + beats
hawk-ui/public/hawks/*.png                          # 17 byte-for-byte canonical PNGs
```

---

## Non-goals (drift prevention)

This plan does NOT cover:

- Spinner (Inworld Realtime) voice activation — task #25, Wave 3.
- Obsidian Local REST API + obsidian-mcp wiring — task #26, Wave 3.
- Karpathy Autoresearch deployment — task pending, Wave 3.
- Coastal Brewing fulfillment workflows — separate surface.
- Per|Form / CTI Hub / SmelterOS production passes — separate surfaces.
- Multi-tenant auth (customer-tier accounts) — Wave 3.
- Live-plan SSE in chat panel — Wave 3.
- Customer-facing character art for the 11 Lil_Hawks — Wave 3 polish; lucide icons fine for v1.0.
- Worktree predecessor-acronym sweep — task #21, deferred.
- Re-architecting `gateway/auth.py` `_html_response` to use AIMS Light theme — admin internals are dark FOAI palette per `reference_foai_ecosystem_brand_palette.md`; not scope.

---

## Step 1 — Auth chain fix (DEPLOY VERIFICATION)

**Status:** Code applied to `gateway/main.py` lines 33-39 (import expansion) + lines 178-185 (require_auth body). `auth.py` was already correct. Awaiting deploy + verification.

**Surface affected:** every route depending on `require_auth` (14 endpoints).

### Task 1.1 — Deploy gateway code change to myclaw-vps

**Files:** `gateway/main.py` (already modified locally).

- [ ] **Step 1: Pre-flight — confirm local change is committed-to-disk and clean**

```bash
cd ~/foai/chicken-hawk
git diff --stat gateway/main.py
# Expect: gateway/main.py (lines added/removed)
python -c "import ast,io; ast.parse(io.open('gateway/main.py',encoding='utf-8').read()); print('main.py: syntax OK')"
# Expect: main.py: syntax OK
```

- [ ] **Step 2: Sync gateway/ to myclaw-vps via tar pipe**

```bash
cd ~/foai/chicken-hawk
tar --exclude='__pycache__' --exclude='*.pyc' -cf - gateway | \
  ssh myclaw-vps 'cd /docker/chicken-hawk && tar -xf -'
```

- [ ] **Step 3: Restart the gateway container (bind-mounted; no rebuild needed)**

```bash
ssh myclaw-vps 'docker restart chicken-hawk-hawk-gateway-1'
ssh myclaw-vps 'docker logs --tail 30 chicken-hawk-hawk-gateway-1' 2>&1 | grep -E "gateway_started|ERROR"
# Expect: gateway_started provider=...
# No ERROR or Traceback in last 30 lines
```

- [ ] **Step 4: Anonymous-tier smoke (must still work)**

```bash
curl -sS https://hawk.foai.cloud/health
# Expect: {"status":"ok"} or similar 200 response

curl -sS -X POST https://hawk.foai.cloud/api/public/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello"}' | head -c 400
# Expect: 200 with {"reply":"..."} (anonymous chat unaffected)
```

- [ ] **Step 5: Owner-tier 401 (cookie-less) confirms gate still active**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://hawk.foai.cloud/tools
# Expect: 401  (still gated; we just unlocked the JWT path, not removed it)
curl -sS -o /dev/null -w "%{http_code}\n" https://hawk.foai.cloud/hawks
# Expect: 401
```

- [ ] **Step 6: Commit the gateway change**

```bash
cd ~/foai/chicken-hawk
git add gateway/main.py
git commit -m "$(cat <<'EOF'
fix(gateway): wire require_auth to JWT magic-link cookie + bind to OWNER_EMAIL

The session_token cookie path in require_auth() was reading the wrong cookie
name and string-comparing to GATEWAY_SECRET, never JWT-verifying. Owner-tier
auth never worked end-to-end. require_auth now reads ch_session, verifies via
get_owner_from_session, and requires owner == OWNER_EMAIL. Bearer + query-token
M2M paths preserved for Coastal-runner et al.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.2 — End-to-end magic-link verification (live)

- [ ] **Step 1: Trigger magic link**

```bash
curl -sS -X POST https://hawk.foai.cloud/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"asg@achievemor.io"}'
# Expect: HTML "Check your Telegram" page
```

- [ ] **Step 2: Owner taps link in Telegram → browser arrives at /me**

Manual: confirm browser address bar shows `/me`, page renders "Signed in as asg@achievemor.io". DevTools → Application → Cookies → confirm `ch_session` cookie set, HttpOnly, Secure, SameSite=Lax.

- [ ] **Step 3: Curl /me with the cookie**

```bash
# Copy cookie value from DevTools, then:
curl -sS -H "Cookie: ch_session=<jwt>" https://hawk.foai.cloud/me | head -c 200
# Expect: HTML "Signed in as asg@achievemor.io"
```

- [ ] **Step 4: Curl every previously-broken endpoint with the cookie**

```bash
COOKIE='Cookie: ch_session=<jwt>'
for path in /tools /tools/lil-hawks /tools/audit /hawks /audit/integrity-check; do
  printf "%-30s %s\n" "$path" "$(curl -sS -o /dev/null -w '%{http_code}' -H "$COOKIE" https://hawk.foai.cloud$path)"
done
# Expect: every line ends with 200
```

- [ ] **Step 5: Negative — wrong-email JWT must be rejected**

CALCULATED BET: We trust `auth.py:90` to never issue a JWT for any other email. To prove the secondary gate, mint a test JWT signed with the right secret but `"sub": "attacker@example.com"`, set as cookie, hit `/tools` → expect 401.

```bash
ssh myclaw-vps 'docker exec chicken-hawk-hawk-gateway-1 python -c "
import jwt, time, os
secret = os.getenv(\"JWT_SECRET\")
now = int(time.time())
print(jwt.encode({\"sub\":\"attacker@example.com\",\"iat\":now,\"exp\":now+3600,\"kind\":\"session\"}, secret, algorithm=\"HS256\"))
"' > /tmp/bad.jwt
curl -sS -o /dev/null -w "%{http_code}\n" -H "Cookie: ch_session=$(cat /tmp/bad.jwt)" https://hawk.foai.cloud/tools
# Expect: 401  (OWNER_EMAIL gate rejects)
rm /tmp/bad.jwt
```

- [ ] **Step 6: Mark task #27 complete; flip task #28 to in_progress**

### Task 1.3 — Coastal-runner regression (M2M Bearer path still works)

The Coastal Brewing runner posts to `/check` with Bearer `GATEWAY_SECRET`. Confirm we didn't break it.

- [ ] **Step 1: Synthetic /check with Bearer**

```bash
ssh myclaw-vps 'GATEWAY_SECRET=$(docker exec chicken-hawk-hawk-gateway-1 printenv GATEWAY_SECRET); \
  curl -sS -X POST https://hawk.foai.cloud/check \
    -H "Authorization: Bearer $GATEWAY_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"summarize\",\"payload\":{\"text\":\"hi\"}}"' | head -c 200
# Expect: {"verdict":"allow", ...}  200
```

**Step 1 ship gate:** Task 1.2 Step 4 returns five 200s, Task 1.2 Step 5 returns 401, Task 1.3 returns `verdict:"allow"`. If any fails: stop, root-cause, do not proceed.

---

## Step 2 — Production guardrails

**Goal:** Every page has a real loading state, error boundary, 404, plus a `/api/health` route the Docker healthcheck can hit. No more 503s being misread as "service down" when it's just a transient render error.

### Task 2.1 — Top-level loading skeleton

**File:** `hawk-ui/app/loading.tsx` (create)

- [ ] **Step 1: Write the file**

```tsx
export default function Loading() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-foai-bg" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24">
        <div className="h-12 w-3/4 rounded-md bg-foai-surface-2 animate-pulse" />
        <div className="mt-4 h-6 w-2/3 rounded-md bg-foai-surface-2 animate-pulse" />
        <div className="mt-10 h-44 w-full rounded-2xl border border-foai-border bg-foai-surface animate-pulse" />
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading Chicken Hawk</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify Next renders it**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm run dev
# In another shell:
curl -sS http://localhost:3010 | head -c 80
# Expect: starts with <!DOCTYPE html><html...
```

Stop dev server. Loading skeleton is render-side; visual verification on a slow route via DevTools → Network → throttle "Slow 3G" + reload is the real test (manual).

### Task 2.2 — Top-level error boundary

**File:** `hawk-ui/app/error.tsx` (create)

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { plausible?: (e: string, o?: unknown) => void }).plausible) {
      (window as unknown as { plausible: (e: string, o?: unknown) => void }).plausible('error-rendered', {
        props: { digest: error.digest ?? 'no-digest', message: error.message?.slice(0, 80) },
      });
    }
  }, [error]);

  return (
    <main className="relative min-h-screen w-full bg-foai-bg flex items-center justify-center px-6">
      <section className="max-w-md w-full rounded-2xl border border-foai-border bg-foai-surface p-8 shadow-card">
        <div className="size-10 rounded-lg bg-foai-gold-tint text-foai-gold flex items-center justify-center mb-4">
          <AlertCircle className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold text-foai-text">Something went sideways.</h1>
        <p className="mt-3 text-foai-muted leading-relaxed">
          A component on this page hit an unexpected error. We&apos;ve logged it. You can retry, or head home and try a different path in.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-foai-dim font-mono">ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover transition-colors"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-foai-border bg-foai-surface text-foai-text text-sm font-semibold hover:border-foai-gold/50 transition-colors"
          >
            <Home className="size-4" /> Home
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Force an error to verify (manual smoke)**

In dev, temporarily add `throw new Error('test boundary')` to a page component; reload; confirm the error UI renders. Remove the throw afterwards.

### Task 2.3 — 404 not-found

**File:** `hawk-ui/app/not-found.tsx` (create)

- [ ] **Step 1: Write the file**

```tsx
import Link from 'next/link';
import { Bird, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full bg-foai-bg flex items-center justify-center px-6">
      <section className="max-w-md w-full rounded-2xl border border-foai-border bg-foai-surface p-8 shadow-card">
        <div className="size-10 rounded-lg bg-foai-gold-tint text-foai-gold flex items-center justify-center mb-4">
          <Bird className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold text-foai-text">404 — that page never roosted here.</h1>
        <p className="mt-3 text-foai-muted leading-relaxed">
          The link you followed points somewhere we don&apos;t serve. Head home, or jump straight into a chat below.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover transition-colors"
        >
          Take me home <ArrowRight className="size-4" />
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd ~/foai/chicken-hawk/hawk-ui && npm run build
# Expect: build succeeds; .next/server/app/_not-found exists
```

### Task 2.4 — Health route

**File:** `hawk-ui/app/api/health/route.ts` (create)

- [ ] **Step 1: Write the file**

```ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';
const COMMIT_SHA = process.env.COMMIT_SHA || 'unknown';

interface GatewayHealth {
  ok: boolean;
  detail?: string;
}

async function pingGateway(): Promise<GatewayHealth> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${GATEWAY_URL}/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return { ok: false, detail: `gateway returned ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'unknown error' };
  }
}

export async function GET() {
  const gateway = await pingGateway();
  return NextResponse.json(
    { ok: true, sha: COMMIT_SHA, gateway, timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
```

- [ ] **Step 2: Verify in dev**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm run dev &
sleep 4
curl -sS http://localhost:3010/api/health
# Expect: {"ok":true,"sha":"unknown","gateway":{"ok":false,"detail":"..."},"timestamp":"..."}
# (gateway shows ok:false in dev because hawk-gateway isn't reachable from local; that's correct)
kill %1
```

- [ ] **Step 3: Commit Step 2 so far**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/app/loading.tsx hawk-ui/app/error.tsx hawk-ui/app/not-found.tsx hawk-ui/app/api/health/route.ts
git commit -m "$(cat <<'EOF'
feat(hawk-ui): add production guardrails — loading / error / 404 / health

App-level loading skeleton, error boundary with retry + analytics ping,
404 page in Iller_Ang voice, and /api/health that pings the gateway.
Healthcheck route swaps in for the Docker compose healthcheck in the next step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.5 — Docker compose healthcheck rewire

**File (myclaw-vps):** `/docker/chicken-hawk/docker-compose.yml`

- [ ] **Step 1: Read the current healthcheck block**

```bash
ssh myclaw-vps "grep -n -A 6 'hawk-ui:' /docker/chicken-hawk/docker-compose.yml | head -30"
ssh myclaw-vps "grep -n -A 4 'healthcheck' /docker/chicken-hawk/docker-compose.yml"
# Capture the hawk-ui service block to confirm what to edit.
```

- [ ] **Step 2: Replace the wget target**

The current healthcheck likely runs `wget -q --spider http://127.0.0.1:3010/`. Change to hit `/api/health`. CALCULATED BET: standalone Next ships busybox-style wget which supports `-q -O -`. If wget is absent, fall back to `node -e "fetch('http://127.0.0.1:3010/api/health').then(r=>r.ok?process.exit(0):process.exit(1))"`.

```bash
ssh myclaw-vps "sed -i.bak 's|wget -q --spider http://127.0.0.1:3010/|wget -q -O - http://127.0.0.1:3010/api/health|g' /docker/chicken-hawk/docker-compose.yml"
ssh myclaw-vps "diff /docker/chicken-hawk/docker-compose.yml.bak /docker/chicken-hawk/docker-compose.yml"
```

- [ ] **Step 3: Recreate hawk-ui container with new healthcheck**

```bash
ssh myclaw-vps 'cd /docker/chicken-hawk && docker compose up -d --force-recreate hawk-ui'
sleep 8
ssh myclaw-vps 'docker inspect --format="{{.State.Health.Status}}" chicken-hawk-hawk-ui-1'
# Expect: starting → healthy within ~30s
```

- [ ] **Step 4: Confirm health endpoint is reachable from inside container**

```bash
ssh myclaw-vps 'docker exec chicken-hawk-hawk-ui-1 wget -qO- http://127.0.0.1:3010/api/health'
# Expect: JSON with ok:true and gateway:{ok:true}
```

**Step 2 ship gate:** Container `Health.Status == healthy`, `/api/health` returns gateway `ok:true`, force-error and 404 render the new boundaries.

---

## Step 3 — Geist Sans typography + Iller_Ang voice copy pass

**Goal:** Replace Inter (banned by `~/.claude/skills/iller-ang/SKILL.md`) with Geist Sans across body type. Rewrite every customer-facing line in Iller_Ang voice — direct, second-person, customer-benefit, SEO-friendly H1/H2, no internal IP names. Honor the access-tier canon: anonymous-tier surfaces never name `Boomer_Ang`, `Lil_Hawk`, `NemoClaw`, `DeerFlow`, `Hermes Agent`. The `/lil-hawks` introductions page IS allowed to use `Lil_<X>_Hawk` names since that's its purpose.

### Task 3.1 — Install Geist via next/font

**Files:** `hawk-ui/package.json`, `hawk-ui/app/layout.tsx`, `hawk-ui/app/globals.css`, `hawk-ui/tailwind.config.ts`

- [ ] **Step 1: Add the geist package**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm install geist@1.3.1 --save-exact
```

CALCULATED BET: pinning `geist@1.3.1` (current stable as of 2026-04). If `npm view geist version` shows newer, use that; the API surface is stable.

- [ ] **Step 2: Wire Geist in layout.tsx (replaces lines 1-19 entirely)**

```tsx
import type { Metadata } from 'next';
import Script from 'next/script';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hawk.foai.cloud'),
  title: {
    default: 'Chicken Hawk — Your AI Operations Partner',
    template: '%s · Chicken Hawk',
  },
  description:
    'Chicken Hawk is a hands-on AI operations partner for small businesses. Ask anything, get a real answer — with a fleet of specialists working underneath.',
  openGraph: {
    type: 'website',
    siteName: 'Chicken Hawk',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Chicken Hawk — your AI operations partner' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg' },
};

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'hawk.foai.cloud';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-foai-bg text-foai-text font-sans antialiased min-h-screen">
        {children}
        <Script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">{`
          window.plausible = window.plausible || function() {(window.plausible.q = window.plausible.q || []).push(arguments)}
        `}</Script>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Strip Inter from globals.css**

Replace `hawk-ui/app/globals.css` lines 1-29 with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* A.I.M.S. light theme — source of truth at
   ~/.claude/projects/C--Users-rishj/memory/reference_aims_light_theme_canon.md
   Body type: Geist Sans via next/font (see app/layout.tsx).
   Display type: Doto (loaded on-demand by components that need it). */

:root {
  color-scheme: light;
  --foai-bg: #F8FAFC;
  --foai-surface: #FFFFFF;
  --foai-surface-2: #F1F5F9;
  --foai-border: #E2E8F0;
  --foai-text: #0F172A;
  --foai-muted: #475569;
  --foai-dim: #94A3B8;
  --foai-gold: #D97706;
  --foai-gold-hover: #B45309;
}

html, body {
  background: var(--foai-bg);
  color: var(--foai-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

(Lines 31-63 — selection / utilities / scrollbar — stay verbatim. Do NOT remove.)

- [ ] **Step 4: Wire Geist in tailwind.config.ts**

Replace `fontFamily` block (lines 37-41) with:

```ts
fontFamily: {
  sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
  display: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
```

- [ ] **Step 5: Verify**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm run typecheck
# Expect: no errors
npm run build
# Expect: build succeeds; check console for "Geist" font emission
grep -nE "Inter|Roboto" app/globals.css app/layout.tsx tailwind.config.ts
# Expect: zero matches
```

- [ ] **Step 6: Commit**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/package.json hawk-ui/package-lock.json hawk-ui/app/layout.tsx hawk-ui/app/globals.css hawk-ui/tailwind.config.ts
git commit -m "$(cat <<'EOF'
feat(hawk-ui): swap Inter → Geist Sans via next/font + wire Plausible script

Iller_Ang voice canon bans Inter/Roboto/Arial/system fonts as body type.
Geist Sans now ships via next/font (no Google CDN call), Geist Mono replaces
the system mono stack. Plausible script defers in afterInteractive — analytics
events fire from page-level useEffect hooks added in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 3.2 — Iller_Ang voice rewrite: `/` (home page)

**File:** `hawk-ui/app/page.tsx`

The current copy uses internal IP terms ("Boomer_Ang", "Lil_Hawk", "Super Agent", etc.). Rewrite the hero, the meta-chat-demo intro, and the flock cards in second-person customer-benefit voice.

- [ ] **Step 1: Pull current copy locations**

```bash
cd ~/foai/chicken-hawk/hawk-ui
grep -n -E "Super Agent|Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent|OpenClaw" app/page.tsx
# Note line numbers — these are the lines to rewrite.
```

- [ ] **Step 2: Rewrite hero / chat intro / flock card text**

The home page has three text-heavy regions:
1. **Hero** — H1 + subhead + primary CTA
2. **Meta-chat-demo lead-in** (`<HeroChatDemo />` is a component; its surrounding label gets the rewrite)
3. **Flock card preview** — three cards previewing what CH does

Approved replacement copy (Iller_Ang voice — direct, customer-benefit, SEO-friendly):

```text
H1:           Ask anything. Get a real answer.
Subhead:      Chicken Hawk is your hands-on AI operations partner. Open the chat below — it picks the right specialist behind the scenes and gets the job done.
Primary CTA:  Start a conversation
Secondary:    See what it can do →   (links to /sqwaadrun)

Demo lead:    Try it yourself. No sign-up. No setup.

Flock card 1 (Live web research):
  H3: Live web research
  body: Real-time queries pulling from the open web — full pages, not snippets — reorganized in plain English.
Flock card 2 (Browser automation):
  H3: Browser automation
  body: For pages that need clicks, logins, or scroll-to-load. Stealth profiles handle the bot defenses.
Flock card 3 (Custom workflows):
  H3: Custom workflows
  body: Schedule it, automate it, hand it off. Chicken Hawk runs the work on a clock, on a webhook, or on demand.
```

Apply the rewrite via Edit tool (one Edit call per text block; surrounding component structure preserved). Do NOT delete components or change layout — copy only.

- [ ] **Step 3: Verify**

```bash
cd ~/foai/chicken-hawk/hawk-ui
grep -nE "Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent|Super Agent|OpenClaw" app/page.tsx
# Expect: zero hits
npm run typecheck
# Expect: no errors
```

### Task 3.3 — Iller_Ang voice rewrite: `/about`

**File:** `hawk-ui/app/about/page.tsx`

- [ ] **Step 1: Read current**

```bash
cd ~/foai/chicken-hawk/hawk-ui && cat app/about/page.tsx | head -80
```

- [ ] **Step 2: Rewrite — three sections (lead, what-it-does cards, how-it-works)**

Approved replacement copy:

```text
H1:        About Chicken Hawk
Lead:      Chicken Hawk is the front door to a small fleet of AI specialists. You ask one question. The right specialist answers — fast, in plain English, with a paper trail you can audit.

H2 (what it does):  Built for getting things done
Card 1:  Talk like a person.       Plain-language conversation, voice or text. No prompt engineering required.
Card 2:  Real research, not a guess. Pulls from the live web, your files, and your tools — and shows you the sources.
Card 3:  Audit-trail by default.    Every action ChickenHawk takes is logged with a receipt you can pull up by ID.

H2 (how it works): How it works
Step 1:  You ask a question.
Step 2:  Chicken Hawk picks the specialist best suited to answer.
Step 3:  The specialist works the request — research, browsing, drafting, scheduling, whatever it takes.
Step 4:  You get the answer back, with the receipt.
```

Apply via Edit tool. Preserve any existing component structure (cards, icons, layout grid).

- [ ] **Step 3: Verify**

```bash
grep -nE "Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent|Super Agent|OpenClaw" app/about/page.tsx
# Expect: zero hits
```

### Task 3.4 — Iller_Ang voice rewrite: `/sqwaadrun`

**File:** `hawk-ui/app/sqwaadrun/page.tsx`

The page already references "Sqwaadrun" + 17 hawks by name. That's the intentional brand surface — leave the named roster intact (the gallery is the introductions page for the hawks). What needs the voice pass: hero copy, capability cards (`Live web search`, `Browser automation`, `Bulk crawl`), CTA buttons.

- [ ] **Step 1: Approved replacement copy**

```text
Pill chip:   17 specialists · live
H1:          Meet the Sqwaadrun.
Lead:        Seventeen hawks. One web-intelligence fleet. Each one tuned for a specific job — crawl, parse, extract, verify, schedule. When a question needs the open web, Chicken Hawk picks the right squad and they fly. Click any hawk to see who they are and what they do.

Primary CTA:   Open the Sqwaadrun console (external)
Secondary CTA: Dispatch one from chat →

Capability cards (under the gallery):
  H2:      What the fleet does
  Card 1:  Live web search.       Real-time queries with full-page extraction — not just snippets.
  Card 2:  Browser automation.    Pages that need clicks, logins, or scroll-to-load. Stealth profiles handle bot defenses.
  Card 3:  Bulk crawl.            Whole sections of a site, mapped + extracted, dedup'd by content hash, organized for you.
```

(This is essentially the current copy with the pill chip reordered and tightened. Most of `app/sqwaadrun/page.tsx` already reads in voice — this is a confirmation pass, not a heavy rewrite.)

- [ ] **Step 2: Verify**

```bash
grep -nE "Boomer_Ang|NemoClaw|DeerFlow|Hermes Agent|Super Agent|OpenClaw" app/sqwaadrun/page.tsx
# Expect: zero hits  (Lil_<X>_Hawk references are deliberately allowed as they're in the gallery — but the SqwaadrunGallery component does that, not the page.)
```

### Task 3.5 — Iller_Ang voice rewrite: `/lil-hawks` (introductions allowed to use internal terms)

**File:** `hawk-ui/app/lil-hawks/page.tsx`

This page IS where customers meet the 11 Lil_Hawks by name — the introduction surface. Internal terms ARE allowed here (per `feedback_owner_brief_is_not_customer_copy.md`). Voice still needs to be customer-benefit, second-person, no IP-leakage about ACHIEVEMOR/OpenClaw/Boomer_Ang ranks.

- [ ] **Step 1: Approved hero rewrite**

```text
H1:    The Lil_Hawks.
Lead:  Eleven specialists. Each one a senior-level helper tuned for one kind of work. Chicken Hawk routes your request to the right hawk — you talk to one place, the right specialist gets to work.
```

Per-hawk role + blurb already reads cleanly. Confirmation pass — only the hero changes.

- [ ] **Step 2: Verify Boomer_Ang / OpenClaw / NemoClaw / Super Agent NOT in this page (Lil_<X>_Hawk IS allowed)**

```bash
grep -nE "Boomer_Ang|NemoClaw|DeerFlow|Hermes Agent|Super Agent|OpenClaw" app/lil-hawks/page.tsx
# Expect: zero hits
```

### Task 3.6 — Iller_Ang voice rewrite: `/login`

**File:** `hawk-ui/app/login/page.tsx`

Owner-only login surface. No customer-tier copy needed; brief, clean, owner-recognizable.

- [ ] **Step 1: Approved copy**

```text
H1:    Owner sign-in.
Lead:  Drop your email. We'll send a single-use magic link to your Telegram. Tap once. Session lasts 24 hours.

Email field label:  Email
Submit button:      Send the link
After-submit copy:  Sent. Go check your Telegram. The link expires in 15 minutes.
```

- [ ] **Step 2: Verify**

```bash
grep -nE "Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent|Super Agent|OpenClaw" app/login/page.tsx
# Expect: zero hits
```

### Task 3.7 — Iller_Ang voice rewrite: shared components

**Files:** `hawk-ui/components/menu-nav.tsx`, `hawk-ui/components/hawk-footer.tsx`, `hawk-ui/components/hero-chat-demo.tsx`, `hawk-ui/components/super-agent-badge.tsx`

- [ ] **Step 1: Per-component grep for offending strings**

```bash
cd ~/foai/chicken-hawk/hawk-ui
grep -nE "Super Agent|Boomer_Ang|Lil_Hawk|NemoClaw|DeerFlow|Hermes Agent|OpenClaw" components/*.tsx
# Note: components/menu-nav.tsx + super-agent-badge.tsx are likeliest hits.
```

- [ ] **Step 2: Rewrite identified strings**

In `super-agent-badge.tsx`: replace any "our Super Agent in the same class as OpenClaw" language with "your AI operations partner" or remove the badge component from `app/page.tsx`'s import list. CALCULATED BET: the badge component name itself is fine to keep — it just shouldn't render the offending text. If the badge has no customer-facing utility post-rewrite, remove its mount from `app/page.tsx` (do NOT delete the component file per the `feedback_never_delete_without_approval.md` rule — leave the file in place, comment-out the import on `page.tsx` with `// PROPOSED REMOVAL — awaiting owner approval`).

In `menu-nav.tsx`: confirm nav labels are "Home / About / Sqwaadrun / Lil_Hawks". No internal-IP rewrite needed beyond label tone.

In `hawk-footer.tsx`: confirm footer copy is `© ACHIEVEMOR · Chicken Hawk` style — no Super Agent / OpenClaw in footer.

In `hero-chat-demo.tsx`: rewrite any "Super Agent" copy.

- [ ] **Step 3: Final repo-wide grep**

```bash
cd ~/foai/chicken-hawk/hawk-ui
grep -rnE "Super Agent|Boomer_Ang|NemoClaw|DeerFlow|Hermes Agent|OpenClaw" app components --include='*.tsx' --include='*.ts'
# Expect: zero hits across app/* and components/*
# (The lib/sqwaadrun-roster.ts file uses Lil_<X>_Hawk IDs — those are allowed.)
```

- [ ] **Step 4: Commit Step 3**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/app/page.tsx hawk-ui/app/about/page.tsx hawk-ui/app/sqwaadrun/page.tsx hawk-ui/app/lil-hawks/page.tsx hawk-ui/app/login/page.tsx hawk-ui/components
git commit -m "$(cat <<'EOF'
feat(hawk-ui): Iller_Ang voice pass on customer-facing surfaces

Replaced internal-brief positioning ('Super Agent', 'OpenClaw', 'Boomer_Ang',
'NemoClaw', 'DeerFlow', 'Hermes Agent') with second-person customer-benefit
copy on /, /about, /sqwaadrun, /login, and shared header/footer/demo
components. /lil-hawks intentionally retains Lil_<X>_Hawk names — that page
is where customers meet the named flock.

Per the access-tier canon: anonymous-tier surfaces never name internals.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 3 ship gate:** repo-wide grep for forbidden internal terms across `app/` + `components/` returns zero hits. `npm run build` succeeds. Geist renders in DevTools Network panel (not Inter).

---

## Step 4 — `/tools/dispatch` panel (App Inference)

**Goal:** A real owner-tier dispatch UI that POSTs `{action, payload, risk_tags}` to `/run`, renders the NemoClaw verdict, captures the receipt id, and links to the audit trail. No theatre — every submit creates a real audit-chain entry.

### App inference (per the unified skill)

| Layer | Decision |
|-------|----------|
| **Entity** | `RunReceipt` — `{id, action, payload, risk_tags, verdict, escalation_required, timestamp, owner_email}` |
| **Statuses** | `allow` (200), `escalate` (202), `deny` (403) |
| **State transitions** | `submitted` → graded → `(allow → executed | escalate → owner_review_pending | deny → audit_logged)` |
| **Roles** | Owner only (gated by `require_auth` + JWT). M2M Bearer is rejected at the UI (this is a browser surface). |
| **Screens** | Single page: form (compose) + verdict card (read-only after submit) + link to audit. |
| **Actions** | `submit`, `copy receipt id`, `open audit trail` |
| **API route** | Existing gateway `POST /run` — already implements verdict + escalation. |
| **Auth** | Cookie-tier (Step 1's fix). |
| **Loading** | Submit button disabled + inline spinner. |
| **Error** | 401 → redirect to `/login`. 422 → inline form error (bad payload). 5xx → red notice with retry. |
| **Empty** | Pre-submit form prompt explains the action verbs available. |

### Task 4.1 — Build `/tools/dispatch/page.tsx`

**File:** `hawk-ui/app/tools/dispatch/page.tsx` (create)

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, ShieldCheck, ShieldAlert, ShieldX, ArrowRight, Copy, Check } from 'lucide-react';
import { ToolsNav } from '@/components/tools-nav';

type Verdict = 'allow' | 'escalate' | 'deny';

interface DispatchResult {
  verdict: Verdict;
  task_id: string;
  receipt_id?: string;
  reason?: string;
  escalation_required?: boolean;
}

const KNOWN_ACTIONS = [
  'summarize',
  'recommend_bundle',
  'send_payment',
  'publish_post',
  'cancel_subscription',
  'export_dataset',
  'schedule_followup',
];

const KNOWN_RISK_TAGS = [
  'legal',
  'money',
  'health',
  'certification',
  'customer_payment_data',
  'supplier_change',
  'final_public',
];

function verdictPalette(v: Verdict) {
  if (v === 'allow') return { bg: 'bg-foai-ok/10', border: 'border-foai-ok/30', text: 'text-foai-ok', Icon: ShieldCheck };
  if (v === 'escalate') return { bg: 'bg-foai-warn/10', border: 'border-foai-warn/30', text: 'text-foai-warn', Icon: ShieldAlert };
  return { bg: 'bg-foai-err/10', border: 'border-foai-err/30', text: 'text-foai-err', Icon: ShieldX };
}

export default function DispatchPage() {
  const router = useRouter();
  const [action, setAction] = useState('summarize');
  const [payloadText, setPayloadText] = useState('{\n  "text": "Summarize the supplier RFP we received this morning."\n}');
  const [riskTags, setRiskTags] = useState<string[]>([]);
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function toggleTag(tag: string) {
    setRiskTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function submit() {
    setError(null);
    setResult(null);
    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      setError('Payload is not valid JSON.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/gateway/run', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload, risk_tags: riskTags }),
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 422) {
          const detail = await res.json().catch(() => ({}));
          setError(detail.detail || 'The gateway rejected the payload shape.');
          return;
        }
        const data = (await res.json()) as DispatchResult;
        setResult(data);
        if (typeof window !== 'undefined' && (window as unknown as { plausible?: (e: string, o?: unknown) => void }).plausible) {
          (window as unknown as { plausible: (e: string, o?: unknown) => void }).plausible('dispatch-fired', {
            props: { action, verdict: data.verdict, risk_count: riskTags.length },
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  }

  async function copyReceipt() {
    if (!result?.receipt_id && !result?.task_id) return;
    await navigator.clipboard.writeText(result.receipt_id ?? result.task_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="relative min-h-screen w-full bg-foai-bg">
      <ToolsNav />
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 pb-20">
        <h1 className="text-3xl font-semibold text-foai-text">Dispatch a real action</h1>
        <p className="mt-3 text-foai-muted leading-relaxed max-w-2xl">
          Compose an action below and submit. The Policy Gate (NemoClaw) grades it — allow / escalate / deny — and writes a receipt to the audit chain. Escalations ping you on Telegram. Denials log the reason.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-8 rounded-2xl border border-foai-border bg-foai-surface p-6 shadow-card"
        >
          <label className="block">
            <span className="text-sm font-medium text-foai-text">Action verb</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-2 block w-full rounded-md border border-foai-border bg-foai-surface px-3 py-2 text-foai-text focus:outline-none focus:ring-2 focus:ring-foai-gold"
            >
              {KNOWN_ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-medium text-foai-text">Payload (JSON)</span>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              spellCheck={false}
              className="mt-2 block w-full rounded-md border border-foai-border bg-foai-surface-2 px-3 py-2 font-mono text-sm text-foai-text focus:outline-none focus:ring-2 focus:ring-foai-gold"
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-foai-text">Risk tags</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {KNOWN_RISK_TAGS.map((tag) => {
                const on = riskTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      on
                        ? 'bg-foai-gold text-white border-foai-gold'
                        : 'bg-foai-surface text-foai-muted border-foai-border hover:border-foai-gold/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="mt-5 text-sm text-foai-err">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-amber-soft"
          >
            <Send className="size-4" />
            {pending ? 'Dispatching…' : 'Dispatch'}
          </button>
        </form>

        {result ? (() => {
          const { bg, border, text, Icon } = verdictPalette(result.verdict);
          const trailId = result.receipt_id ?? result.task_id;
          return (
            <section className={`mt-8 rounded-2xl border ${border} ${bg} p-6`}>
              <div className="flex items-start gap-3">
                <Icon className={`size-5 ${text}`} />
                <div className="flex-1">
                  <h2 className={`text-lg font-semibold ${text} capitalize`}>{result.verdict}</h2>
                  {result.reason ? (
                    <p className="mt-2 text-sm text-foai-text leading-relaxed">{result.reason}</p>
                  ) : null}
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-foai-muted">Receipt id</dt>
                    <dd className="font-mono text-foai-text flex items-center gap-2">
                      {trailId}
                      <button
                        type="button"
                        onClick={copyReceipt}
                        aria-label="Copy receipt id"
                        className="text-foai-muted hover:text-foai-gold transition-colors"
                      >
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </button>
                    </dd>
                    {result.escalation_required ? (
                      <>
                        <dt className="text-foai-muted">Escalation</dt>
                        <dd className="text-foai-warn">Owner review required — Telegram pinged</dd>
                      </>
                    ) : null}
                  </dl>
                  <Link
                    href={`/tools/audit?task_id=${encodeURIComponent(trailId)}`}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foai-gold hover:text-foai-gold-hover"
                  >
                    Open audit trail <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </section>
          );
        })() : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add Dispatch link to `components/tools-nav.tsx`**

Read the current file and add a `{ href: '/tools/dispatch', label: 'Dispatch' }` entry into the nav array. Position: after Lil_Hawks, before Audit. (Do not rewrite the component — just insert one row.)

- [ ] **Step 3: Verify build + typecheck**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npm run typecheck
npm run build
# Expect: both succeed, /tools/dispatch route appears in build output.
```

### Task 4.2 — Live verification of dispatch flow

These steps require Step 1 deployed + an owner cookie in the browser.

- [ ] **Step 1: Deploy hawk-ui**

```bash
cd ~/foai/chicken-hawk
tar --exclude='node_modules' --exclude='.next' -cf - hawk-ui | \
  ssh myclaw-vps 'cd /docker/chicken-hawk && tar -xf - && \
                  cd hawk-ui && docker build -t hawk-ui:0.6.0 . && \
                  cd .. && docker compose up -d --force-recreate hawk-ui'
```

- [ ] **Step 2: Submit an `allow` action**

In browser at `https://hawk.foai.cloud/tools/dispatch` (with owner cookie):
- action: `summarize`
- payload: `{"text":"hi"}`
- risk_tags: none
- Click Dispatch → verdict card shows `Allow` with receipt id.

- [ ] **Step 3: Submit an `escalate` action**

- action: `send_payment`
- payload: `{"amount":42,"recipient":"vendor@example.com"}`
- risk_tags: `[money]`
- Click Dispatch → 202 escalate, Telegram pings owner.

- [ ] **Step 4: Submit a `deny` action**

- action: `cancel_subscription`
- payload: `{"customer_id":"x"}`
- risk_tags: `[customer_payment_data, final_public]`
- Click Dispatch → 403 deny + reason rendered.

- [ ] **Step 5: Confirm audit trail**

Click "Open audit trail" → `/tools/audit?task_id=…` loads the matching receipt entry.

- [ ] **Step 6: Commit Step 4**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/app/tools/dispatch/page.tsx hawk-ui/components/tools-nav.tsx
git commit -m "$(cat <<'EOF'
feat(hawk-ui): /tools/dispatch — real /run dispatch UI with verdict + audit link

Owner-tier panel that POSTs {action, payload, risk_tags} to gateway /run,
renders the NemoClaw verdict (allow/escalate/deny), captures the receipt id,
and links to /tools/audit?task_id=... for the chain entry. 401 redirects to
/login. 422 surfaces an inline error. Plausible event 'dispatch-fired' fires
on each submission with verdict + risk_count props.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 4 ship gate:** all three verdicts (allow / escalate / deny) round-trip end-to-end. Receipt id is fetchable from `/audit/{id}`. Telegram ping arrives on escalate. 401 redirect works.

---

## Step 5 — SEO + share cards

### Task 5.1 — sitemap.ts

**File:** `hawk-ui/app/sitemap.ts` (create)

- [ ] **Step 1: Write the file**

```ts
import type { MetadataRoute } from 'next';

const BASE = 'https://hawk.foai.cloud';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  return [
    { url: `${BASE}/`,           lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/about`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/sqwaadrun`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/lil-hawks`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/login`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
```

### Task 5.2 — robots.ts

**File:** `hawk-ui/app/robots.ts` (create)

- [ ] **Step 1: Write the file**

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/about', '/sqwaadrun', '/lil-hawks'] },
      { userAgent: '*', disallow: ['/tools/', '/login', '/api/'] },
    ],
    sitemap: 'https://hawk.foai.cloud/sitemap.xml',
    host: 'https://hawk.foai.cloud',
  };
}
```

### Task 5.3 — Universal og-image.png (Recraft V4 generation)

**File:** `hawk-ui/public/og-image.png` (create)

- [ ] **Step 1: Generate via Recraft V4**

CALCULATED BET: brand-truth canonical hero (the trio image) is the right visual for the share card. We use it directly resized + composited with text. If owner has a stronger preference, override.

```bash
# Re-use the existing canonical trio image as the og base; composite text overlay.
# CALCULATED BET: ImageMagick available on dev host; if not, use Recraft V4 prompt below.
cd ~/foai/chicken-hawk/hawk-ui/public
# If trio image exists:
test -f chicken-hawk-trio.png && \
  convert chicken-hawk-trio.png -resize 1200x630^ -gravity center -extent 1200x630 og-image.png
# Verify dimensions:
identify og-image.png
# Expect: 1200x630
```

If ImageMagick unavailable, owner-side: generate via Recraft V4 with prompt: *"Three illustrated hawk characters lined up, AIMS amber-and-cream brand palette, professional editorial composition, room for headline text on the right, photoreal-meets-illustrated style, 1200x630 social share dimensions"*. Save to `hawk-ui/public/og-image.png`.

- [ ] **Step 2: Verify metadata picks it up**

The `metadata.openGraph.images` array in `app/layout.tsx` (Task 3.1 Step 2) already references `/og-image.png`. After deploy:

```bash
curl -sS https://hawk.foai.cloud/ -o /tmp/home.html
grep -E "og:image" /tmp/home.html | head -3
# Expect: <meta property="og:image" content="https://hawk.foai.cloud/og-image.png">
```

- [ ] **Step 3: Real share-card render check**

Manual: paste `https://hawk.foai.cloud` into Slack DM (or LinkedIn post composer). Confirm the og card renders with the image + title + description.

- [ ] **Step 4: Commit Step 5**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/app/sitemap.ts hawk-ui/app/robots.ts hawk-ui/public/og-image.png
git commit -m "$(cat <<'EOF'
feat(hawk-ui): SEO — sitemap.ts + robots.ts + universal og-image.png

5-URL sitemap (home, about, sqwaadrun, lil-hawks, login).
Robots disallows /tools/, /login, /api/ — owner surfaces are not for crawlers.
og-image is the canonical trio hero, resized to 1200x630 for social shares.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 5 ship gate:** `curl /sitemap.xml` returns 5 entries. `curl /robots.txt` returns the policy + sitemap pointer. og card renders in Slack paste. JSON-LD: not required for v1.0 (per the deferral list); adding it is an opt-in Wave 3 SEO upgrade.

---

## Step 6 — Observability

### Task 6.1 — Analytics wrapper

**File:** `hawk-ui/lib/analytics.ts` (create)

- [ ] **Step 1: Write the file**

```ts
type PlausibleProps = Record<string, string | number | boolean>;

interface PlausibleClient {
  (event: string, options?: { props?: PlausibleProps }): void;
  q?: unknown[];
}

declare global {
  interface Window {
    plausible?: PlausibleClient;
  }
}

export function track(event: string, props?: PlausibleProps): void {
  if (typeof window === 'undefined') return;
  if (typeof window.plausible !== 'function') return;
  window.plausible(event, props ? { props } : undefined);
}

export const Events = {
  PageView: 'page-view',
  ChatSend: 'chat-send',
  HawkDeployDeeplinkFired: 'hawk-deploy-deeplink-fired',
  ToolPanelOpen: 'tool-panel-open',
  DispatchFired: 'dispatch-fired',
  DispatchVerdict: 'dispatch-verdict',
  ErrorRendered: 'error-rendered',
} as const;
```

### Task 6.2 — Wire `chat-send` and `hawk-deploy-deeplink-fired` events

**File:** `hawk-ui/app/page.tsx`

- [ ] **Step 1: Import the wrapper at top of page.tsx**

```tsx
import { track, Events } from '@/lib/analytics';
```

- [ ] **Step 2: Inside `send()`, add `track(Events.ChatSend, { has_attachments: attachments.length > 0, has_hawk: !!hawk })` immediately after the `fetch` resolves.**

- [ ] **Step 3: Inside the deeplink-auto-fire `useEffect`, add `track(Events.HawkDeployDeeplinkFired, { hawk: hawk?.id || 'none' })` next to the auto-fire trigger.**

### Task 6.3 — X-Request-Id propagation

**Files:** `hawk-ui/lib/request-id.ts` (create), `hawk-ui/next.config.mjs` (modify), `gateway/main.py` (verify-only)

- [ ] **Step 1: Write `lib/request-id.ts`**

```ts
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 2: Add an `X-Request-Id` header to every gateway-bound fetch**

In `app/page.tsx` `send()` and in `app/tools/dispatch/page.tsx` `submit()`, generate `const reqId = newRequestId();` and add `'X-Request-Id': reqId,` to the fetch headers.

- [ ] **Step 3: Confirm gateway logs include the request id**

CALCULATED BET: `gateway/main.py` already uses `structlog` which includes context vars. If it doesn't already echo X-Request-Id, add a tiny middleware that does. Check first:

```bash
ssh myclaw-vps 'docker exec chicken-hawk-hawk-gateway-1 grep -n -E "X-Request-Id|x_request_id|request_id" /app/main.py /app/router.py | head -10'
```

If absent, add to `gateway/main.py` after `app.add_middleware(SecurityHeadersMiddleware)`:

```python
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id", "")
    structlog.contextvars.bind_contextvars(request_id=rid or "auto")
    response = await call_next(request)
    if rid:
        response.headers["X-Request-Id"] = rid
    return response
```

- [ ] **Step 4: Verify**

After redeploy: trigger one chat round-trip with a known X-Request-Id, then `ssh myclaw-vps 'docker logs chicken-hawk-hawk-gateway-1 --tail 100 | grep <id>'` finds the matching server-side line.

- [ ] **Step 5: Commit Step 6**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/lib/analytics.ts hawk-ui/lib/request-id.ts hawk-ui/app/page.tsx hawk-ui/app/tools/dispatch/page.tsx gateway/main.py
git commit -m "$(cat <<'EOF'
feat: observability — Plausible event wrapper + X-Request-Id propagation

lib/analytics.ts wraps window.plausible with a typed track(event, props) and
an Events catalog. Page-level events fire from chat send, deeplink auto-fire,
and dispatch submit.

X-Request-Id flows from Next.js fetches to the gateway middleware, which
binds it into structlog context for matching client + server logs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 6 ship gate:** Plausible dashboard shows `chat-send` + `dispatch-fired` events fired from the live site. `docker logs ... | grep <known-id>` finds the matching server-side line.

---

## Step 7 — Mobile + a11y + reduced-motion

### Task 7.1 — `useReducedMotion` guard on framer-motion components

**Files:** `hawk-ui/components/dispatch-trace.tsx`, `hawk-ui/components/sqwaadrun-gallery.tsx`, `hawk-ui/components/markdown-reply.tsx` (animations only)

- [ ] **Step 1: For each file, wrap motion variants in a useReducedMotion() check**

framer-motion exports `useReducedMotion()` from `framer-motion`. Pattern:

```tsx
import { motion, useReducedMotion } from 'framer-motion';

function MyAnimated() {
  const reduce = useReducedMotion();
  const variants = reduce
    ? { initial: {}, animate: {}, exit: {} }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };
  return <motion.div variants={variants} initial="initial" animate="animate" />;
}
```

Apply this pattern to:
- `dispatch-trace.tsx` — beat-step pulse animation
- `sqwaadrun-gallery.tsx` — 3D-tilt hover (set `springConfig` to `{ stiffness: 0, damping: 1 }` when reduce)
- `markdown-reply.tsx` — fade-in on copy-button feedback

- [ ] **Step 2: Verify**

```bash
cd ~/foai/chicken-hawk/hawk-ui && npm run typecheck && npm run build
# Expect: no errors
```

Manual: macOS System Settings → Accessibility → Display → Reduce Motion ON; reload; confirm zero motion on the affected components.

### Task 7.2 — Aria labels + tab order

- [ ] **Step 1: Per-component a11y pass**

In `hawk-chat-input.tsx`:
- mic button: `aria-label="Start voice input"` / `aria-label="Stop voice input"` (toggle by state)
- attach button: `aria-label="Attach files"`
- send button: `aria-label="Send message"`
- text input: `aria-label="Message Chicken Hawk"`

In `markdown-reply.tsx`:
- copy button: already has `aria-label="Copy reply"` (verify, don't double-add)

In `sqwaadrun-gallery.tsx`:
- each card is interactive — wrap in `<button>` if not already, with `aria-label={`Deploy ${hawk.title}`}`

In `tools-nav.tsx`:
- nav element: `<nav aria-label="Tool Chest navigation">`

- [ ] **Step 2: Verify with axe-core (CLI)**

```bash
cd ~/foai/chicken-hawk/hawk-ui
npx -y @axe-core/cli http://localhost:3010/ --exit
# Expect: 0 violations on serious/critical
```

Repeat for `/about`, `/sqwaadrun`, `/login`, `/tools` (with cookie).

### Task 7.3 — Mobile 375px sweep

- [ ] **Step 1: Open Chrome DevTools, emulate iPhone 13 (390×844 — closest to spec target 375px)**

For each page, confirm:
- No horizontal scroll bar
- All CTAs have ≥ 44×44 px tap target
- Text wraps cleanly (no overflow)
- Images scale (next/Image with `sizes="(max-width: 768px) 100vw, ..."`)

- [ ] **Step 2: Fix observed issues inline (typically padding tweaks)**

- [ ] **Step 3: Commit Step 7**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/components hawk-ui/app
git commit -m "$(cat <<'EOF'
feat(hawk-ui): a11y + reduced-motion + mobile 375px pass

useReducedMotion guards on dispatch-trace, sqwaadrun-gallery, and markdown-reply.
aria-labels on icon-only buttons. nav landmarks on tools-nav. Mobile
overflow fixes on hero, sqwaadrun cards, tools panels.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 7 ship gate:** axe-core CLI returns 0 serious/critical violations on every public page. Reduce Motion OS toggle visibly stills animations. iPhone 13 emulation: zero horizontal scroll on all 7 routes.

---

## Step 8 — README + CHANGELOG + tag

### Task 8.1 — Update `hawk-ui/README.md`

**File:** `hawk-ui/README.md`

- [ ] **Step 1: Read current and replace if outdated**

```bash
cd ~/foai/chicken-hawk/hawk-ui && cat README.md | head -40
```

- [ ] **Step 2: Approved replacement (architecture + commands sections)**

Sections required:
- 2-line product summary
- Local dev commands (`npm install`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`)
- Required env vars (`NEXT_PUBLIC_GATEWAY_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`)
- Build → docker → deploy command (the tar+ssh recipe from Step 4)
- Surface map (anonymous tier vs owner tier)
- Brand canon pointers (`reference_aims_light_theme_canon.md`, Iller_Ang skill)
- Healthcheck path

Write directly — no need for placeholders or "fill in later".

### Task 8.2 — Cut `hawk-ui/CHANGELOG.md`

**File:** `hawk-ui/CHANGELOG.md` (create)

- [ ] **Step 1: Write honest changelog**

```markdown
# Chicken Hawk UI Changelog

## v1.0.0 — 2026-04-28

First commercially-shipped customer surface.

### Customer-tier
- Iller_Ang voice copy across `/`, `/about`, `/sqwaadrun`, `/login`, and shared header/footer/demo components.
- Geist Sans body type via `next/font` (Inter retired).
- AIMS Light theme wired end-to-end (slate-50 base, white surfaces, amber-600 accent).
- Sqwaadrun gallery — 17 canonical hawk PNGs, 3D-tilt cards, deeplink dispatch back to `/?prompt=…`.
- Anonymous chat with Web Speech API voice input, attachments, markdown reply with code-block + copy-button.
- Production guardrails: top-level loading skeleton, error boundary, 404 page.
- SEO: `sitemap.xml`, `robots.txt`, og-image.png, per-route `<title>` + `<meta>`.
- Plausible analytics with `chat-send`, `hawk-deploy-deeplink-fired`, `dispatch-fired`, `error-rendered` events.
- Reduced-motion + a11y + mobile 375px verified.

### Owner-tier
- Magic-link sign-in via Telegram (24-hour session, bound to `OWNER_EMAIL`).
- Tool Chest panels (Policy Gate, Risk Events, Audit, Lil_Hawks, Cron, Autoresearch).
- New `/tools/dispatch` panel — real `POST /run` with NemoClaw verdict + receipt + audit link.

### Fixed
- BLOCKING: `gateway/main.py` `require_auth` was reading the wrong cookie name (`session_token`) and string-comparing to `GATEWAY_SECRET` instead of JWT-verifying. Owner-tier auth never worked end-to-end. Now reads `ch_session`, verifies via `get_owner_from_session`, requires `owner == OWNER_EMAIL`.
- Standalone Next.js `/_next/image` returning 400 (no sharp in standalone runtime) — `images.unoptimized = true`.
- Traefik path-priority: gateway gets API path-prefixes at priority 200, hawk-ui catchall at priority 10.

### Honest scope notes
- v1.0 is single-tenant (`OWNER_EMAIL` only). Multi-tenant is Wave 3.
- Spinner (Inworld) voice and Obsidian wiring stay scaffolded but inactive — Wave 3.
- Karpathy Autoresearch: `/tools/autoresearch` ships as "coming soon" until the engine is deployed.
- No frontend test framework added; verification is typecheck + build + grep + curl + Lighthouse + manual smoke. Playwright e2e is Wave 3.

### Brand truth
- AIMS Light Theme — `reference_aims_light_theme_canon.md`
- Iller_Ang voice — `~/.claude/skills/iller-ang/SKILL.md`
- Operating doctrine — `~/.claude/skills/aims-anticipatory-build-skill/SKILL.md`
```

### Task 8.3 — `v1.0.0` git tag (gated on owner sign-off)

**Owner-only action.** This step does not execute without explicit "yes, tag it now" from the owner.

- [ ] **Step 1: Stage the tag**

```bash
cd ~/foai/chicken-hawk
git status   # confirm clean
git log --oneline -5
# Confirm the latest commit passes Step 9 ship contract before proceeding.
```

- [ ] **Step 2: Owner approves → cut tag**

```bash
git tag -a v1.0.0 -m "$(cat <<'EOF'
hawk.foai.cloud v1.0.0 — first commercially-shipped FOAI customer surface.

Anonymous chat + 17-hawk Sqwaadrun fleet + owner-tier Tool Chest with real
/run dispatch. Iller_Ang voice. AIMS Light + Geist Sans. SEO + share cards.
Plausible analytics. Mobile + a11y verified. Single-tenant.

Ship contract: ~/ship-contracts/hawk-foai-cloud-v1.md
EOF
)"
git push origin v1.0.0    # only after owner explicit "push"
```

- [ ] **Step 3: Commit Step 8 (README + CHANGELOG only — tag is separate)**

```bash
cd ~/foai/chicken-hawk
git add hawk-ui/README.md hawk-ui/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(hawk-ui): v1.0.0 README + CHANGELOG

Honest changelog naming what's real, what's deferred, and what was fixed.
README walks a new contributor from zero to running locally in three commands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Step 8 ship gate:** README is current and walks new contributor zero-to-running. CHANGELOG names what's real and what's deferred without theatre.

---

## Step 9 — Ship contract validation (binge-ship 5-gate)

### Task 9.1 — Run the 5-gate validation

Per `~/.claude/skills/binge-ship/SKILL.md` — every shipped FOAI surface clears these five gates before the owner can declare shipped.

- [ ] **Step 1: Gate 1 — typecheck**

```bash
cd ~/foai/chicken-hawk/hawk-ui && npm run typecheck
# Expect: zero errors
```

- [ ] **Step 2: Gate 2 — lint**

```bash
cd ~/foai/chicken-hawk/hawk-ui && npm run lint
# Expect: zero errors. Warnings acceptable but documented.
```

- [ ] **Step 3: Gate 3 — image build**

```bash
ssh myclaw-vps 'cd /docker/chicken-hawk/hawk-ui && docker build -t hawk-ui:1.0.0 .'
# Expect: image builds without errors. SHA recorded.
```

- [ ] **Step 4: Gate 4 — healthcheck**

```bash
ssh myclaw-vps 'docker inspect --format="{{.State.Health.Status}}" chicken-hawk-hawk-ui-1'
# Expect: healthy
ssh myclaw-vps 'docker exec chicken-hawk-hawk-ui-1 wget -qO- http://127.0.0.1:3010/api/health'
# Expect: {"ok":true,"sha":"<commit>","gateway":{"ok":true},"timestamp":"..."}
```

- [ ] **Step 5: Gate 5 — five-journey smoke (the ship contract preview)**

Manually walk through journeys 1–6 from the ship contract preview at the top of this plan. Each must work in a fresh-incognito browser.

| Journey | Pass? |
|---------|-------|
| 1. Anon chat → markdown reply in 5s | ___ |
| 2. Sqwaadrun deeplink → role-specific dispatch trace | ___ |
| 3. Magic-link login → /me → /tools no 401 | ___ |
| 4. /tools/dispatch → allow / escalate / deny + audit link | ___ |
| 5. Slack URL paste → og card | ___ |
| 6. iPhone 13 emulation → 7 routes clean | ___ |

If any journey fails: stop. Root-cause. Re-run from the failing step. Do not proceed to ship contract write.

### Task 9.2 — Write the ship contract record

**File:** `~/ship-contracts/hawk-foai-cloud-v1.md` (create)

- [ ] **Step 1: Write the contract**

```markdown
# hawk.foai.cloud v1.0.0 — Ship Contract

**Shipped on:** 2026-04-XX
**Surface:** https://hawk.foai.cloud
**Tag:** v1.0.0
**Commit:** <sha>
**Image:** hawk-ui:1.0.0 + chicken-hawk-hawk-gateway-1 (commit <sha>)
**Owner declaration:** "shipped" by asg@achievemor.io after walking journeys 1–6 personally.

## What's live

- Anonymous customer chat (Iller_Ang voice, Geist Sans, AIMS Light theme)
- 17-hawk Sqwaadrun gallery + deeplink dispatch
- Owner magic-link sign-in (Telegram-delivered, 24h session, OWNER_EMAIL-bound)
- Tool Chest: Policy Gate, Risk Events, Audit, Lil_Hawks, Cron, Autoresearch (placeholder), **Dispatch (new)**
- /run NemoClaw policy gate + audit chain receipts
- SEO sitemap + robots + universal og-image
- Plausible analytics + X-Request-Id propagation
- Production guardrails (loading / error / 404 / health)

## What's deferred to Wave 3 (explicit, not assumed)

- Spinner (Inworld) voice activation
- Obsidian REST API wiring
- Karpathy Autoresearch deployment
- Multi-tenant auth
- Live-plan SSE in chat panel
- Customer-facing character art for the 11 Lil_Hawks
- Per-route bespoke og-images
- Frontend test framework (Vitest / Playwright)

## 5-gate validation evidence

- typecheck: PASS
- lint: PASS
- image build: PASS (sha: <…>)
- healthcheck: healthy, /api/health → ok:true
- five-journey smoke: 6/6 PASS

## Rollback

- `git revert <ship-commit>` + `docker compose up -d --force-recreate hawk-ui hawk-gateway`
- Step-by-step rollback per the plan's Rollback Playbook section
```

- [ ] **Step 2: Final commit**

```bash
cd ~/foai/chicken-hawk
git add ../ship-contracts/hawk-foai-cloud-v1.md   # adjust path if outside repo
# OR if ship-contracts is outside the chicken-hawk repo:
mkdir -p ~/ship-contracts
mv ../docs/superpowers/plans/2026-04-28-hawk-foai-cloud-v1-ship.md ~/ship-contracts/...   # NO — keep the plan in the repo
# Just commit the plan + commit the contract separately to its own location.
```

CALCULATED BET: ship contracts are repo-external (per prior project pattern at `~/ship-contracts/`); plans stay in-repo.

**Step 9 ship gate:** all 5 gates pass, all 6 journeys pass, ship contract written, owner declares "shipped".

---

## Per-surface validation gates (ship-reality checklist)

For each customer-facing surface, the following must be true at ship time:

| Surface  | Loading | Error | Empty | Mobile 375 | A11y axe | Brand (Geist + AIMS Light) | Voice (Iller_Ang) |
|----------|---------|-------|-------|-----------|----------|----------------------------|-------------------|
| `/`         | ✓ skeleton | ✓ boundary | ✓ chat placeholder "Ask anything…" | ✓ | ✓ 0 critical | ✓ | ✓ |
| `/about`    | ✓ skeleton | ✓ boundary | n/a | ✓ | ✓ | ✓ | ✓ |
| `/sqwaadrun`| ✓ skeleton | ✓ boundary | n/a (17 hawks always) | ✓ | ✓ | ✓ | ✓ |
| `/lil-hawks`| ✓ skeleton | ✓ boundary | n/a (11 hawks always) | ✓ | ✓ | ✓ | ✓ (internal terms allowed) |
| `/login`    | ✓ skeleton | ✓ boundary | ✓ pre-submit form | ✓ | ✓ | ✓ | ✓ |
| `/tools/*`  | ✓ skeleton | ✓ boundary | ✓ "no events yet" / "audit empty" | ✓ | ✓ | ✓ | n/a (operator surface, dark FOAI palette acceptable per scope) |

For each owner-tier surface, additionally: 401 redirects to `/login`, 5xx renders error boundary with retry, all writes produce audit-chain receipts.

---

## Rollback playbook (per-step revert path)

Every commit is independently revertable. If something breaks at any step:

| Step | Revert | Impact |
|------|--------|--------|
| 1 (auth) | `git revert <auth-commit>` + `docker restart chicken-hawk-hawk-gateway-1` | Owner-tier auth returns to broken (no worse than today). |
| 2 (guardrails) | Comment-out file imports OR `git revert <guardrails-commit>`. Per `feedback_never_delete_without_approval.md` — DO NOT delete the new files; comment out their references and leave the files in place with `// PROPOSED REMOVAL — awaiting owner approval`. | No production impact. |
| 3 (Geist + voice) | `git revert <typography-commit>` + `<voice-commit>`. Inter returns. | Site reads in old voice but functions. |
| 4 (dispatch) | `git revert <dispatch-commit>` (page) + `<tools-nav-commit>` (link). | `/tools/dispatch` 404s; other panels unaffected. |
| 5 (SEO) | `git revert <seo-commit>`. | Sitemap/robots/og-image disappear. SEO returns to baseline. |
| 6 (observability) | `git revert <observability-commit>`. | Plausible events stop firing; X-Request-Id no longer propagates. |
| 7 (a11y/motion) | `git revert <a11y-commit>`. | Animations resume; aria-labels removed. Visual no-op. |
| 8 (docs) | `git revert <docs-commit>`. | README + CHANGELOG return to prior state. |
| 9 (tag) | `git tag -d v1.0.0` (local) + `git push origin :refs/tags/v1.0.0` (remote, owner-only). | Tag removed; commits remain. |

No step touches data, secrets, the LiteLLM key path, or any owner-side state.

---

## Open decision points the owner controls (already surfaced; no execution branches yet)

1. **Analytics tool** — Plausible (default — see CALCULATED BET #1) or PostHog (more event richness, US-host)?
2. **og:image strategy** — universal (default) or per-route?
3. **Single-tenant for v1.0** — confirms multi-tenant waits.
4. **Push schedule** — rolling deploys per step (default) or single big-bang at Step 8?

If owner chooses Plausible / universal / single-tenant / rolling: this plan executes verbatim. Any other choice: edit the affected step and re-run from there.

---

## End of plan

Saved at `~/foai/chicken-hawk/docs/superpowers/plans/2026-04-28-hawk-foai-cloud-v1-ship.md`.

Awaiting one of:
- **"Execute"** → start at Task 1.1 Step 2 (Step 1.1 Step 1 already cleared at plan-time).
- **"Modify <step>"** → rewrite that step inline.
- **"Hold"** → freeze plan; resume on next session.

Operating skill: `aims-anticipatory-build-skill`. Authority order: owner instructions > skill doctrine > default behavior.
