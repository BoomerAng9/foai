# Per|Form Architecture + 2026 NFL Draft Priority Plan
**Status:** WAR-ROOM · **Date:** 2026-04-21 · **Author:** ACHEEVY (under Guided Purpose mandate)
**T-minus:** 2 days to NFL Draft (April 23, Pittsburgh) · NBA Playoffs already live · April 15 testing deadline already missed

---

## 0. Why this doc exists

I (the agent) provisioned a whole-app `perform` Cloud Run service on 2026-04-20 in violation of the actual Per|Form architecture. Owner correction: **Per|Form is a static, content-aware, season-aware website. Cloud Run is per-feature only. Some features run on Claude Managed Agents.** This doc is the agreed-upon architecture, and the priority order to get the NFL Draft feature ready in 48 hours.

This doc supersedes the assumption (now corrected in memory) that Per|Form is a single deployable Next.js container.

---

## 1. The 3-Class Architecture

Per|Form is composed of three deployment classes. Every feature belongs to exactly one.

### Class A — Static (the bulk)

**What:** Pages whose content is computed at build time or fetched at request time but doesn't require persistent server state. Generated via Next.js `generateStaticParams` + ISR + standard SSR.

**Where it runs:** VPS (`myclaw-vps`, `/opt/foai-repo/perform/`, behind Traefik at `perform.foai.cloud`). Long-term: could move to a CDN-fronted static host (Cloudflare Pages / Vercel / S3+CloudFront) if/when the static surface area justifies cutting the VPS dependency.

**Examples (already built or trivially static-able):**
- Marketing / lion brand pages (`/`, `/grading`, `/tie`, `/access`)
- `/cards` index + `/cards/[style]` (17 styles, all `generateStaticParams`)
- `/players/[name]` profile pages (SSG with revalidate)
- `/teams/[sport]/[abbreviation]` team digital twin pages
- `/rankings` + `/rankings/[position]` (SSG with hourly revalidate, hydration of live data via client-side fetch)
- `/podcast/episodes/*`, `/film/*`, `/data/*`, `/huddle/*`
- NIL content + "Mastering the N.I.L." book pages
- ACHIEVEMOR brand pages

**Build mechanism today:** Single Next.js standalone Docker image, container-hosted by VPS Traefik. **Functionally static** even though it's running in a Node container — the Next.js standalone server handles SSR for the dynamic routes and serves prebuilt HTML for the static ones.

### Class B — Per-feature containers

**What:** Specific real-time / stateful / heavy-compute features that legitimately benefit from Cloud Run's pinned-instance / scaling / isolation profile. Each is its own service with its own AR repo, SA, secrets, and domain mapping (e.g. `<feature>.perform.foai.cloud` or `perform.foai.cloud/_svc/<feature>` proxied by Traefik).

**Examples (current + candidates):**
- **SSE pick stream** (`/api/rankings/stream` + `rankings-emitter.ts`) — in-process Set<Subscriber> needs a pinned single instance OR a Redis pub/sub bridge. Standalone Cloud Run service makes sense post-draft.
- **War Room multiplayer** (real-time draft-room with up to 5 users per room) — WebSocket / Durable Object pattern. Standalone service.
- **Live draft ticker / fan-reaction audio bus** during Draft Night broadcast.
- **Public PaaS API v1** (`/api/v1/*` metered) — separable from the marketing site once API keys + LUC metering are wired.
- Heavy image-gen workers (Recraft / Ideogram batch) if/when bulk regen exceeds VPS comfort.

**Pattern reference (correct):** how `hermes`, `ttd-dr`, `voice-gateway`, `chicken-hawk`, `sqwaadrun`, `vault-signer`, `nemoclaw-service` are scoped on `foai-aims`.

**Pattern reference (incorrect):** what I did 2026-04-20 — provisioning the entire perform Next.js as one Cloud Run service. That's been torn down.

### Class C — Claude Managed Agents

**What:** Reasoning workloads that benefit from agent reasoning over canonical digital twins (92 NFL/NBA/MLB teams at `perform/data/{nfl,nba,mlb}-teams/`) + consensus boards. Anthropic `managed-agents-2026-04-01` beta on Sonnet 4.6.

**Examples:**
- **Franchise Simulator** (`perform/src/lib/franchise/simulation.ts:157-238`) — already wired
- **Draft Night AI teams** (`perform/src/lib/draft/managed-agent-draft.ts`) — wired, used by `/api/draft/agent/*` routes + `/draft/agent` UI
- **Player comparison engine** — to be migrated
- **Trade value calculator** — to be migrated
- **Real-time draft analysis + scouting reports** — to be migrated
- **Draft Simulator** at `/api/draft/simulate` — currently uses `mock-engine` + optional `ML_SERVICE_URL`, **needs migration**

**Rule:** Never build a new simulation on statistical-only logic. The reasoning layer IS the product.

---

## 2. NFL Draft 2026 — T-2 Days Triage

**Hard deadline: April 23, 2026, Round 1 first pick (Pittsburgh, Lucas Oil Stadium reportedly).**

### Already in place (live at perform.foai.cloud, verified today)

✅ **Player Index** — 30,359 rows across 263 schools (CFB FBS/FCS + 2,268 draft prospects + NFL/NBA/MLB rosters)
✅ **2026 class fully graded** — 2,429/2,429 graded, 0 non-canonical tiers (just completed today via `scripts/grade-ungraded-180.ts` + `delete-stale-school-dupes.ts` + `delete-cross-position-dupes.ts`)
✅ **Migration 013 live** — `school_normalized` GENERATED column + unique dedupe key (no future cross-spelling dupes can land)
✅ **Top 5 ranked correctly** — Caleb Downs S #1, Mansoor Delane CB #2, Arvell Reese EDGE #3, Fernando Mendoza QB #4, Rueben Bain Jr. EDGE #5 (matches DELTA v1.1 calibration: Mendoza = #1 to Raiders consensus)
✅ **TIE engine** — `@aims/tie-matrix` with 40/30/30 + 9-band PRIME→C scale
✅ **`/cards` (17 styles)** — generates static SEO pages per style
✅ **Mock Draft engine v2** — `lib/draft/mock-engine.ts`
✅ **Consensus board** — DrafTek/Yahoo/Ringer ingested into `perform_consensus_ranks`
✅ **Draft Night Managed Agents path** — `/api/draft/agent/*` routes + `/draft/agent` UI live (per `feedback_managed_agents_run_simulations.md`)
✅ **6 analyst personas** — Void-Caster, Astra Novatos, The Colonel, The Haze, Smoke, Bun-E (audio auditions staged at `public/auditions/*.wav`)

### MUST-SHIP for April 23 (in priority order)

| # | Item | Class | Why critical | Est. work |
|---|---|---|---|---|
| 1 | **Verify VPS perform builds with the new `next.config.mjs` transpile fix + `@aims/tie-matrix` file: dep** (PR #261) | A | The build will fail on next VPS pull if we don't merge + handle the Dockerfile context. PR #261 currently has the fix; the original Dockerfile may or may not handle `file:../aims-tools/*` deps in current VPS context. SSH and test before merge. | 30 min — ssh, dry-build, decide merge or rework |
| 2 | **PFF / ESPN / NFL.com consensus scrape → populate empty 4th comparison column** | A (data) | Memory `feedback_perform_data_quality.md` + DELTA v1.1 specifies cross-system normalization via projected round. Today only DrafTek/Yahoo/Ringer are populated. The 4th column on `/rankings` is empty. Sqwaadrun-based scrape, $0 cost. | 2-3 hours including ingest validation |
| 3 | **Draft Night live broadcast — Round 1 picks ready** | C (Managed Agents) + B (live ticker) | Per `project_draft_night_production.md`: green room, walkouts, Goodell, fan reactions, Lyria music, 32 R1 picks, commercial breaks, all 6 analysts give live commentary. Originally targeted April 11, now T-2. | **8-16 hours. Realistically, scope down to: live pick ticker + per-pick auto-grade + analyst commentary text stream + post-pick card generation. Defer: green room video, Goodell representation, Lyria music, commercial breaks. Owner approves scope cut.** |
| 4 | **War Room (multiplayer up to 5 users per room) — Round 1 only** | B (containerized) | Per `project_perform_platform_v3_vision.md`: real NFL war room visual, big board, prospect cards, team needs matrix, trade phone, countdown clock. **Likely cut from R1, ship Round 2-3 if time.** Owner approves scope cut. | **CUT FROM R1. Defer to R2-3 or post-draft.** |
| 5 | **Real-time draft pick stream → SSE update on `/rankings`** | B (containerized) or A+B hybrid | Today's PR #260 wires `/api/rankings/stream` + `emitPickEvent()`. With VPS single-container setup, fanout to all subscribers works trivially. Confirm VPS Traefik passes through SSE long-hold connections (`Connection: keep-alive`, no buffering). | 1 hour to verify Traefik config |
| 6 | **Mock Draft Simulator (Full Auto + Pick Your Team) — production-ready UI** | C + A | `/draft/agent` exists, needs UI polish + token gating (Stripe). Per `project_draft_experience_engine.md`: $2.99-$49.99 token tiers, 4 modes. **Token gating cut from R1, ship Full Auto + Pick Your Team free for the first 24 hours of draft as launch promo.** Owner confirms. | 4-6 hours UI polish |
| 7 | **Per|Form analyst voice content for Draft Day** | A (static) — analysts deferred per standing rule | OWNER STANDING RULE: analysts wait until players fully graded. Players ARE fully graded as of 2026-04-21. **Analyst content (49-ep re-record + new draft-day commentary) is now unblocked but cost-gated. Owner decision needed.** | Cost approval = unblock |

### NICE-TO-HAVE for April 23 (ship if no above slips)

- Position cards regen for top 100 (Recraft V4 / Ideogram V3 split)
- Live `/draft/board` updating in real-time as picks come in
- "Per|Form Draft Grade" auto-published per pick (round-by-round team grades)
- Per-player comparison engine via Managed Agents

### EXPLICITLY DEFERRED to post-draft

- Green room video segments
- Roger Goodell representation
- Lyria background music + crowd audio
- Commercial break ad slots
- Beast PDF full extraction (629 pages, 2700+ profiles — top 100 already extracted)
- ML longevity model
- Static-host migration (Cloudflare Pages / Vercel / S3)
- Per-feature container peel-off (SSE, War Room as standalone services)
- Public PaaS API v1 with metered keys
- Token gating UI polish past launch promo

---

## 3. NBA Playoffs (concurrent, less acute)

NBA Playoffs are running through May/June. Per|Form has NBA team data at `perform/data/nba-teams/` and NBA roster ingest in `perform_team_rosters`. **Owner: confirm what's the playoff-specific surface — playoff bracket page? Series predictions via Managed Agents? Live game ticker?** Without explicit scope, this is parked at the VPS-as-it-stands.

---

## 4. Post-Draft Cleanup (week of April 28)

1. Peel SSE stream into its own Cloud Run service with Redis pub/sub bridge → unblocks horizontal scaling on the static site
2. Peel War Room multiplayer into its own service (likely Cloudflare Durable Objects or pinned Cloud Run)
3. Migrate Draft Simulator to Managed Agents (kill `mock-engine` + `ML_SERVICE_URL` codepath)
4. Migrate Player Comparison + Trade Value Calculator to Managed Agents
5. Static-host migration audit — measure CDN savings vs VPS comfort
6. Public PaaS API v1 + LUC metering + Stripe key billing
7. Greenlight the 49-episode analyst voice re-record (now unblocked by grading completion)

---

## 5. Open Questions (need owner anchor before next move)

1. **Draft Night scope cut acceptance** — green room video, Goodell, Lyria music, commercial breaks all CUT for R1. Confirm or override.
2. **Mock Draft launch promo** — free Full Auto + Pick Your Team for first 24h of draft (no Stripe token gate). Confirm or override.
3. **NBA Playoffs scope** — what surface needs to be ready (bracket / predictions / ticker / something else)?
4. **PR #261 merge** — once VPS dry-build verifies, merge clean to main. VPS pulls main on next rebuild trigger. Who triggers VPS rebuild — manual or hook?
5. **Analyst voice greenlight** — grading is now closed; the standing rule is unblocked. Want to commit to the 49-ep re-record budget now, or defer?

---

## Appendix — Deferred items rationale

The DELTA v1.1 → Draft Experience Engine → Draft Night Production sequence had targets of April 11, April 15, April 23. We are now T-2 (April 21 → April 23). The realistic delivery is what's already in place + the must-ship list above. Anything bigger is post-draft. Honesty over performative completeness — better to ship a tight, working draft surface than promise the full broadcast simulation and miss.
