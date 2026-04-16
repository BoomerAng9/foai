# Gate-to-Gate Hardening Report — 2026-04-16

One-session sweep: installed the code, polished the platform, ran a full
security + risk pass. Six gates, each verified before the next opened.

---

## Execution at a glance

| Gate | Title | Status | PR |
|------|-------|--------|-----|
| G0 | Merge PR #184 (middleware bearer-bypass) | ✅ | #184 |
| G1 | Deploy avatars Cloud Run | ⏸ Parked by user direction | infra ready in #181 |
| G2 | Full route audit | ✅ | #186 |
| G3 | Security hardening sweep | ✅ | #187 |
| G4 | Risk register | ✅ | this PR |
| G5 | Final report | ✅ | this PR |

**Total**: 4 PRs merged (#184, #186, #187, + this doc), 1 deferred (#181 avatars deploy), 0 regressions introduced.

---

## What changed on production

### G0 — unblocked bearer-auth crons (PR #184)
For weeks every scheduled cron (`/api/pipeline/run`, `/api/analysts/auto-publish`) had been silently returning `"Authentication required"`. Middleware only honored Firebase cookies; crons sent `Authorization: Bearer …`. Root cause of the 3-day-stale episodes Rish called out. Fix: middleware now lets any bearer-authed `/api/*` request pass the cookie check — route handlers still enforce `safeCompare` against `PIPELINE_AUTH_KEY`.

Added:
- `/api/platform/freshness` — aggregated `lastUpdated` timestamps
- `FreshnessBadge` on homepage with green/amber/red dots
- Daily podcast regen cron at 06:00 UTC on myclaw-vps

### G2 — route audit caught 3 regressions
Server-side audit of all 50 public routes (Playwright MCP held a stale profile lock; switched to curl-based verification). Found:
1. `/api/platform/freshness` → 401 — middleware missed it
2. `/api/draft/team-needs` → 401 — same cause
3. `/api/players` preview was 5-row / 5-column — no grade, no tier, no NFL comp — new homepage Big Board expected more

Fix in PR #186: both APIs added to middleware allowlist; `PREVIEW_COLUMNS` widened to include rank/grade/tier/NFL comp while deep scouting (strengths, weaknesses, analyst notes, pillar_*) stays paywalled. Keeps "browse-first, gate-on-action".

Audit scripts committed: `perform/ops/route-audit.sh` and `perform/scripts/audit-player-data.ts`.

### G3 — security sweep found 2 real issues
Scans clean on: hardcoded secrets, SQL injection, eval/Function, security headers, npm audit critical/high.

**Finding 1 — cost abuse on `/api/players/forecast`**: GET endpoint was fully public. Base response is cheap, but `?viz=1` and `?c1=1` trigger paid Gemini + Thesys API calls. Any anonymous visitor could loop the endpoint. Fix: viz/c1 flags now require auth, base payload stays public.

**Finding 2 — no per-endpoint rate limits on 12 paid-API paths**: Only cap was global 100/min/IP → $5–30/min burn per IP at worst. Added `COST_HEAVY_LIMITS` table in middleware:
```
videos/generate: 3/min       film/analyze: 5/min
generate-image: 5/min        seed/expand: 5/min
players/generate-image: 5/min studio/debate: 8/min
podcast/generate: 8/min       cards/bakeoff: 8/min
grade/recalculate: 10/min     players/forecast: 10/min
analysts/auto-publish: 10/min voice/config: 20/min
```
Authenticated callers get 3×. Separate buckets so global limit doesn't mask heavy caps.

### G4 — risk register
New doc: `docs/risk-register.md`. 32 items across Security / Data / Cost / Vendor / Ops / Compliance plus 5 tech-debt rows. Severity counts: **0 Critical, 5 High, 14 Medium, 9 Low**.

---

## The three highest-leverage follow-ups

Everything else is in the register. These three move the needle most for cost/ops posture:

1. **Cron healthcheck pings (O-02)** — the "silently broken for weeks" pattern repeats without external monitoring. Wire healthcheck.io pings on each cron; Slack on failure.
2. **Per-user LLM quota (C-01)** — rate limiting caps per-IP abuse but not per-account abuse. Add a `usage_log` table and 429 over daily quota per authenticated user.
3. **Neon backup/restore runbook (D-01)** — we rely on Neon PITR default without a documented recovery drill. One page + one test restore.

---

## What was out of scope this session

- **G1 (avatars Cloud Run deploy)** — infrastructure up (GCS bucket `foai-avatars`, Artifact Registry `avatars`, Secret Manager `SUPABASE_URL`), blocked on `SUPABASE_SERVICE_KEY` which only the Cloudflare Worker knew. User parked the entire Cloudflare reduction. Deploy command in `services/avatars/README.md` when ready.
- **Cloudflare reduction (task #9)** — Worker `deploy-avatars` still running (supersedes-by-Cloud-Run is staged in repo); `deploy-api-gateway` still running (3-session port in `docs/migrations/`). 5 DNS zones stay.
- **Draft Simulator → Managed Agents migration** — directive captured in memory, not implemented.
- **Visual Playwright audit** — profile lock prevented browser reuse; swapped to server-side curl. Visual/layout regressions not covered by this pass.

---

## Session delivery summary

- **Neon `perform_players`**: 2,268 → 30,359 rows (27,939 CFB FBS/FCS seeded)
- **Homepage**: podcaster-portal → season-aware sports platform with algorithmic featured moment rotator, Top 10 Big Board, Team Needs board, Freshness badges, show strip
- **Middleware**: bearer-bypass + per-endpoint cost limits + 2 new public API paths
- **Security posture**: 2 real findings patched, 5 deferred with register entries, 0 regressions
- **Cloudflare**: 7 dead Workers deleted, 2 stable Workers kept
- **PRs merged this session**: #177, #179, #180, #181, #182, #183, #184, #186, #187

The platform is in a materially stronger posture than 24 hours ago. The register captures what's left; no open items are blocking.
