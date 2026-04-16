# Per|Form / FOAI Risk Register

**Compiled**: 2026-04-16 during Gate-to-Gate hardening pass (G4).
**Scope**: `BoomerAng9/foai` monorepo focus on `perform/` service; touches shared FOAI infra where relevant.

Severity scale:
- **Critical** — active breach / data loss / >$1k/day cost exposure
- **High** — imminent breach vector or >$100/day exposure if exploited
- **Medium** — degrades reliability, security-in-depth, or recoverability
- **Low** — polish / defense-in-depth improvements

Each row: state, likelihood, impact, mitigation, next step.

---

## 1. Security

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| S-01 | Anthropic API key leaked in chat history during this session | High | Confirmed exposed | Full API billing abuse, stealth models usage | Key is set as GitHub repo secret only; user declined rotation | **Rotate when convenient** — user explicitly declined ("I'm not changing it") so flagged, not blocked |
| S-02 | Cloudflare API token leaked in chat history | High | Confirmed exposed | Delete Workers, create billable resources, change DNS for 5 zones | Scope is Workers-only; user delegated usage | **Rotate when convenient** |
| S-03 | In-memory rate limiter is per-instance | Medium | Medium (Cloud Run autoscale) | Distributed abuse bypasses cost caps | Global 100/min + per-endpoint caps (PR #187); single-instance on VPS so effectively stateful today | Migrate to Upstash Redis limiter when moving to multi-instance Cloud Run |
| S-04 | CSP allows `unsafe-inline` + `unsafe-eval` for scripts | Medium | Low (requires XSS first) | XSS payload can run inline | Other headers strong (HSTS preload, frame-ancestors none, nosniff) | Nonce-based CSP; Next.js has an official pattern |
| S-05 | `firebase-auth-token` cookie — server-side verification depth unknown in middleware | Medium | Low | Forged cookie bypasses cookie-presence check (route handlers still verify via `requireAuth`, so effective) | Middleware does cookie-presence only; route handlers are authoritative | Document the layered model; ensure all data-writing routes call `requireAuth` |
| S-06 | `PREVIEW_COLUMNS` change in `/api/players` route reverted itself twice in this session | Low | High of recurrence | Homepage Big Board silently breaks on regression | Widened and re-merged in #186; added to freshness audit | Add a CI snapshot test: `GET /api/players?limit=10` returns 10 rows with `grade` field |
| S-07 | Podcast audio files served from `/generated/` without auth | Low | Low | Direct-URL hotlinking, bandwidth abuse | Public-by-design (podcast is marketing surface); `/generated/` is in PUBLIC_PREFIXES | Rate-limit `/generated/*.mp3` at Traefik if bandwidth becomes an issue |

---

## 2. Data integrity + availability

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| D-01 | Neon `performdb` — backup/PITR policy not documented | High | Low (Neon default = PITR) | Data loss on branch delete or destructive query | Neon free tier has 24h PITR; paid tier up to 30d — status of current plan unverified | Verify plan at console.neon.tech; document restore runbook |
| D-02 | 30,359 `perform_players` rows, only 1,920 graded; scouting data gap for majority | Medium | Certain | Pages show empty fields for most CFB roster | Expected after CFB seed; grade fills through TIE regrade | Run `scripts/run-regrade.ts` against broader player set or accept paywall cutoff |
| D-03 | Podcast episode freshness relied on cron that was silently 401-ing for weeks | Medium | Fixed (PR #184) | 3+ days stale content on homepage | Middleware bearer-bypass added; daily cron installed on myclaw-vps | Add Slack/email alert when cron exit code != 0 or response is non-2xx |
| D-04 | Sqwaadrun `schedule.json` references a scheduler that may not be running | Medium | Unknown | Roster/news data can silently stale | Schedule exists in `smelter-os/sqwaadrun/schedule.json` but scheduler binary not verified | SSH to myclaw-vps, confirm scheduler daemon and log path; add to monitoring |
| D-05 | Two stale data files in repo: `beast-measurements.json`, `regraded-prospects.json` gitignored | Low | Certain | Deploys to Cloud Run without seeded local files can produce 500s | Seed script must run before server boot | Bake seed step into cloudbuild or Dockerfile for clean-room deploys |
| D-06 | Player profile pages are client-rendered (no SSR) — 9.7KB skeleton shows until fetch completes | Low | Certain | SEO invisible, slow FCP for detail pages | By design for auth-gating | Consider server-side data fetch on `/players/[name]` for SEO-critical pages |

---

## 3. Cost runaway

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| C-01 | Claude Managed Agents (Franchise Sim + draft-agent) with no per-user cost cap | High | Medium | One user → uncapped LLM spend | Auth-gated but no quota per account | Add per-user daily call count to `perform_players` or a new `usage_log` table; 429 over limit |
| C-02 | 12 cost-heavy endpoints now rate-limited per IP (PR #187) | — | Mitigated | Fixed | 3-20/min unauth, 9-60 auth | Add Sentry budget alerts at $50/day per vendor |
| C-03 | Cloud Run 25 services running — none verified for min-instances=0 | Medium | Low | Always-on cost floor | Unverified | `gcloud run services list --format="value(metadata.name,spec.template.metadata.annotations.'autoscaling.knative.dev/minScale')"` to confirm all are scale-to-zero |
| C-04 | Image generation endpoints (fal.ai / Kie.ai / Ideogram / Recraft) — keys not scoped per endpoint | Medium | Low | Compromised key = full provider credit | Keys in openclaw container env only | Rotate provider keys quarterly; add provider usage dashboards |
| C-05 | Video generation (`/api/videos/generate`) = most expensive call in fleet at ~$0.30/call | High | Low (auth-gated + 3/min cap) | ~$1/min max per IP if looped | Per-endpoint rate limit 3/min, auth required | Move to 1/min/IP + require explicit Stepper workflow for production use |

---

## 4. Vendor lock-in + dependency risk

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| V-01 | Anthropic Managed Agents is beta API (`managed-agents-2026-04-01`) | Medium | Certain | Beta can change contract or be deprecated | Fallback to `/v1/messages` in `lib/franchise/simulation.ts::streamFallbackSimulation` already wired | Weekly sanity check the beta header; subscribe to Anthropic changelog |
| V-02 | 2 Cloudflare Workers still in production: `deploy-api-gateway`, `deploy-avatars` | Medium | Low (stable) | Workers are last CF compute tie | Avatars Cloud Run port in `services/avatars/` (PR #181 merged) but not deployed; gateway migration = 3-session project | Deferred per user direction; revisit when driver surfaces |
| V-03 | Firebase for auth (`firebase-auth-token` cookie) | Low | Low | Firebase Auth pricing changes or deprecation | Mainstream, low-risk vendor | None — status quo acceptable |
| V-04 | Clerk for Nurds Code (referenced in former worker) | Low | Low (Nurds Code deprecated) | N/A after Nurds Code reconstruction decision | Deferred — user redirected focus | None |
| V-05 | Neon Postgres — single-vendor data plane | Medium | Low | Outage = read/write failure for Per\|Form | Cloud-hosted, strong SLA | Export snapshot to GCS weekly; document restore path |
| V-06 | Supabase for Deploy Platform avatars (vmjaqaqeldomfozauhvm project) | Medium | Unknown | Service key unavailable this session | Key lives only on Cloudflare Worker today | When Cloud Run avatars deploys, pull key into Secret Manager |
| V-07 | Google Vertex AI (Gemini models default per policy) | Low | Low | Region outage → no image/video/voice gen | Multi-provider adapters exist (`fal.ai`, `Kie.ai`, `ElevenLabs` fallback) | Verify each adapter's failover path |
| V-08 | 8 low-severity npm audit findings | Low | Low | None exploitable directly | None triggered | `npm audit fix` on next dependency update cycle |

---

## 5. Operational continuity

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| O-01 | Single SSH key (`id_ed25519_myclaw`) for myclaw-vps | Medium | Low | Key loss = locked out of production | Backed up in user's local dotfiles | Keep a second authorized key; document recovery |
| O-02 | Cron jobs on myclaw-vps have no alerting on failure | High | Fixed in response posture (PR #184) | Failures for weeks with no signal (the exact thing that just happened) | Logs at `/var/log/perform-*.log` but unwatched | Add healthcheck.io pings from each cron; Slack/email on missed |
| O-03 | No status page for perform.foai.cloud | Low | Certain | Users can't self-diagnose outages | None | `status.foai.cloud` on a separate host (Cloudflare zone already live) |
| O-04 | `deploy-api-gateway` Worker is sole path for Deploy Platform API traffic | Medium | Low | Cloudflare outage takes Deploy down | Stable for 5 months | Migrate per `docs/migrations/deploy-api-gateway-to-cloud-run.md` when scheduled |
| O-05 | Managed secrets split across openclaw container, GitHub repo secrets, Secret Manager | Medium | Certain | Hard to audit what's where | Documented pattern: openclaw = runtime, GitHub = CI, Secret Manager = Cloud Run | Consolidation plan: one map doc listing every secret and its authoritative source |
| O-06 | Playwright MCP in this session held a stale profile lock that blocked browser restart | Low | Fixed by restart | Cannot do visual audits during long session | Switched G2 to server-side curl audit | Add a `browser_reset` helper doc for future sessions |

---

## 6. Compliance + legal

| ID | Risk | Sev | Likelihood | Impact | Current mitigation | Next step |
|----|------|-----|------------|--------|--------------------|-----------|
| L-01 | NIL player data (college athletes) — name/image usage | Medium | Unknown | State NIL laws vary; some require explicit consent | Memory says "fair-use training policy" for public data | Legal review before monetizing NIL-adjacent features (player cards for sale) |
| L-02 | Audio content moderation not logged end-to-end | Medium | Low | Harmful content → takedown requests unanswered | Moderation service in avatars port uses Vertex SafeSearch; main podcast route is unverified | Add a `moderation_log` table usage on all user-generated uploads |
| L-03 | DoD CMMC path described in memory — not implemented | Low (advertised, not sold) | Certain on contract signing | Can't honor advertised offering without phased build | Memory documents phased plan; no client signed | Keep as "available on request" messaging; don't oversell |
| L-04 | GDPR / CCPA data subject rights (delete, export) — no endpoints | Medium | Low today, high at EU/CA user growth | Regulatory exposure once user base grows | User table in Firebase + `perform_players` (public) | Build `/api/user/delete` + `/api/user/export` when tier 1+ paid users exist |

---

## 7. Known tech debt (not risks but drag)

| ID | Item | Impact | Status |
|----|------|--------|--------|
| T-01 | `~/acheevy.digital/` local clone stays even though repo archived | Low drag | Leave — memory notes it deprecated |
| T-02 | `~/the-deploy-platform/DEPLOY/` local clone of dead ACHVMR/DEPLOY repo | Low drag | Memory notes deprecated |
| T-03 | CSP nonce migration, multi-instance rate limiter, NIL legal review | Medium | Captured above |
| T-04 | Draft Simulator engine still uses local mock + optional ML service, not Managed Agents | Medium | Memory captures directive; migration not scheduled |
| T-05 | 2,268-row legacy `perform_players` rows from initial seed use `class_year='2026'`; CFB seed uses `FR`/`SO`/`JR`/`SR` — schema mixed | Low | Acceptable; filter by `level` column for clean queries |

---

## Summary

**Critical open:** 0
**High open:** 5 (S-01, S-02, D-01, C-01, C-05, O-02) — 4 are cost/ops posture, 2 are rotation tasks the user already has on their todo
**Medium open:** 14
**Low open:** 9

**Top 3 highest-leverage next actions:**
1. **Cron healthcheck pings (O-02)** — prevents the "silently broken for weeks" failure mode we just hit
2. **Per-user LLM quota (C-01)** — the last major cost abuse vector
3. **Neon backup/restore runbook (D-01)** — recovery posture

This document is living. Update as risks are resolved or new ones surface.
