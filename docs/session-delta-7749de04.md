# Session Delta — 7749de04-69a7-4b24-920f-6a0420daf882

**Dates**: 2026-04-15 → 2026-04-16
**Agent**: Claude Opus 4.6 (1M context)
**Scope**: Per|Form homepage work, Cloudflare reduction, security hardening, PMO-PRISM scoping, ecosystem reframing

---

## Platform delta

### Per|Form frontend
- Homepage: podcaster-portal → draft-first → season-aware with algorithmic featured-moment rotator
- Top 10 Big Board (live `/api/players` pull)
- Team Needs Board (32-team draft order + consensus picks, data-dated daily)
- Freshness badges (green/amber/red) on Big Board, Team Needs, Shows
- Experience tiles: Player Index · Franchise Sim · Mock · War Room · Shows
- Podcast network demoted to a 4-card strip (content preserved, placement corrected)
- Multi-sport tabs on `/players` (Football live, Basketball/Baseball Coming Soon)
- Light/dark theme actually works (33 files' hardcoded `#0A0A0F` → `var(--pf-bg)`)
- Audio URL normalization fix (Shows page no longer 404s on play)

### Per|Form backend
- `perform_players`: **2,268 → 30,359 rows** (27,939 CFB FBS/FCS seeded from Sqwaadrun)
- Schema additions: `sport`, `level`, `conference`, `birthplace`, `jersey_number`, `unit`, `season`, `roster_source`, `roster_updated_at`
- New APIs: `/api/platform/freshness`, `/api/draft/team-needs`
- Public preview widened: `PREVIEW_COLUMNS` now includes rank/grade/tier/NFL comp (deep scouting still paywalled)
- `/api/players/forecast` — `?viz=1` and `?c1=1` flags now auth-gated (cost abuse vector closed)

### Middleware
- **Root-cause fix**: bearer-authed `/api/*` requests pass the cookie check. This fixed weeks of silently failing crons (`/api/pipeline/run`, `/api/analysts/auto-publish` returning 401).
- Per-endpoint rate limits on 12 cost-heavy LLM/TTS/image/video paths (3–20/min unauth, 9–60/min auth)
- Two new public API paths added to allowlist (freshness + team-needs)

### Ops
- Daily 06:00 UTC cron installed on myclaw-vps for `/api/podcast/auto`
- Audit scripts committed: `perform/ops/route-audit.sh`, `perform/scripts/audit-player-data.ts`, `perform/scripts/seed-cfb-rosters.ts`, `perform/scripts/seed-players.ts`

### Cloudflare reduction
- **7 dead Workers deleted**: `vibesdk-production`, `nurds-vibesdk`, `worker-publisher-template`, `nurds-code`, `nurdscode-api`, `acheevy-nurdscode-sdk`, `coding-nurd-9`
- Workers went 9 → 2 (~78% compute reduction)
- 5 DNS zones kept (nurdscode / deployhub.us / deployplugs.com / trydeploy.us / blurdscode.com)
- R2 bucket `aims-exports` not inventoried (token scope limitation)
- Avatars Cloud Run port merged in #181, ready to deploy when Supabase service key is provisioned
- `deploy-api-gateway` migration scoped in `docs/migrations/deploy-api-gateway-to-cloud-run.md`

### GitHub infrastructure
- Claude Code GitHub Actions live (`.github/workflows/claude.yml`), `ANTHROPIC_API_KEY` set as repo secret
- @claude responder active across `BoomerAng9/foai`
- 40+ stale PRs triaged and closed across AIMS / GRAMMAR / Choose2Achievemor / Makemeachievemor / ACHEEVY2

### MCP / tooling
- **Magic MCP** (21st.dev UI generator) wired into Claude Code user scope — `claude mcp add magic --scope user …`. Active after next Claude Code restart.
- `DEV_AGENT_API_KEY` verified in openclaw (21st.dev Agents platform, for future deploy)

---

## Pull Requests

| # | Title | State |
|---|---|---|
| 177 | Per\|Form Draft Engine v3 — Beast calibration, 2268-player regrade, multi-sport cards | merged |
| 179 | Per\|Form: multi-sport Player Index + HeyGen intro pipeline | merged |
| 180 | ci: Claude Code GitHub Actions for @claude mentions | merged |
| 181 | infra: avatars Cloud Run service + deploy-api-gateway migration spec | merged |
| 182 | perform: draft-first homepage — countdown + Top 10 Big Board | merged |
| 183 | perform: season-aware homepage + team needs + 30K player index | merged |
| 184 | fix: freshness — middleware bearer bypass + UI badges + daily regen | merged |
| 186 | G2 audit: public freshness+team-needs + wider player preview | merged |
| 187 | G3 security hardening: forecast auth gate + per-endpoint rate limits | merged |
| 188 | docs(g4+g5): risk register + gate-to-gate session report | merged |

---

## Memory / directive deltas captured this session

- `feedback_names_are_intentional.md` — FOAI / Deploy / Per\|Form / AIMS / OPEN\|KLASS AI / Blockwise AI / Destinations AI / Plug Me In are literal job descriptions, not themes. Per\|Form = Performance + Form (paperwork) — the pipe is the split.
- `feedback_managed_agents_run_simulations.md` — every Per\|Form simulation runs on Claude Managed Agents (`managed-agents-2026-04-01` beta)
- `project_cloudflare_dns_only.md` — Cloudflare reduced to DNS-only role
- `project_player_index_30k_seeded.md` — schema + provenance for the 30,359 row state
- `project_deploy_platform_in_foai.md` — ACHVMR/DEPLOY deprecated, code consolidated into foai
- `project_acheevy_digital_deprecated.md` — acheevy.digital repo archived
- Open Mind amendment — derivative traps and earning-the-names combinations made explicit

---

## Risk posture

**0 Critical · 5 High · 14 Medium · 9 Low** per `docs/risk-register.md`.

Top 3 highest-leverage follow-ups called out in the register:
1. Cron healthcheck pings (O-02) — prevents "silently broken for weeks" recurrence
2. Per-user LLM quota (C-01) — last remaining cost abuse vector above per-IP rate limits
3. Neon backup/restore runbook (D-01) — recovery posture unverified

---

## What's queued for next session

- **PMO-PRISM Design team** — 4 new Boomer_Angs under Iller_Ang (Brand_Ang · Syst_Ang · Motion_Ang · Surface_Ang), each with persona card + subject-matter knowledgebase
- **Subject-matter knowledgebase** — 8 platform briefs (FOAI / Deploy / Per\|Form / AIMS / OKAI / Blockwise / Destinations / Plug Me In) + 21st.dev Magic & Agents SDK reference + 5 design principles
- **21st.dev Agents SDK** — install `@21st-sdk/agent`, `@21st-sdk/node`, `@21st-sdk/nextjs`, `@21st-sdk/react` into `foai/perform/`, wire to `DEV_AGENT_API_KEY`
- **Design audit** — OKAI / Blockwise / Destinations / Plug Me In (4 platforms not yet mapped for brand briefs)
- **Per\|Form dual-lane homepage** — balanced Per + Form with cross-read ("your grade × your contract"), no segmentation
- **Draft Simulator → Managed Agents migration** — directive captured, not yet implemented
- **Avatars Cloud Run deploy** — unblocked only when Supabase service key is provisioned

---

*Close-out: platform is materially stronger than 24 hours prior. All merged code is in production on `main`. No regressions introduced.*
