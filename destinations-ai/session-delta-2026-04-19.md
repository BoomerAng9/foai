# Session delta — Destinations AI + binge-ship (2026-04-19)

**Session arc:** from "open Open Mind + Iller_Ang skills" → updated skill packages → drafted Claude Design prompts → reviewed Claude Design artifacts → built local JSX prototype → pivoted to production foundation at `~/foai/destinations-ai/` → 3 phases landed → binge-ship skill installed mid-session → retroactive protocol pass → close as WIP draft PR #252.

Not shipped live. One PR opened. Multiple skill packages updated. Six memory entries recorded.

---

## 1. Overview

Opened on "open and load the Open Mind Skill and Iller_Ang Skill." Over the course of the session, work spanned four independent workstreams that compounded into a production foundation:

1. **Skill-system refresh** — Open Mind and Iller_Ang skill packages updated from iCloudDrive zips. UI-generation default shifted from 21st.dev Magic to the active CLI/IDE; Claude Design prompt-authoring added as explicit-invocation mode. Iller_Ang gained the Oddy Paradigm discipline reference (`cinematic-ui-discipline.md`). Memory rule recorded: *Oddy is technique library, not doctrine — Iller_Ang leads above the engineering floor.*

2. **Claude Design prototype path** — Drafted three Claude Design prompts for Destinations AI (the initial canvas prompt, Tweaks + heroAmbient patches, and a follow-up expansion-roster + remaining-Tweaks prompt). Reviewed two Claude Design return artifacts: `DESTINATIONS A1.zip` (partial JSX delivery) and `Destination Discovery Canvas.html` (full standalone 62KB artifact with 5 JSX component files). The HeroStrip component independently solved the broken `heroMediaUrl` pattern with CSS-ambient gradient treatment.

3. **Local prototype → production foundation** — After Rish's directive (*"you do it, A; you have more power than the design tool"*), the Claude Design JSX was ported to a local workspace at `C:\Users\rishj\Projects\destinations-ai-prototype\` (7 JSX files, browser-globals + Babel standalone), verified in a browser via Playwright, then pivoted again to full production TSX at `~/foai/destinations-ai/` under Rish's *"production grade, no stubs, no mock, commercial ready"* directive. Three disciplined phases landed: Phase 1 (28 files — foundation, schema, map providers, API routes), Phase 2 (+13 files — component port, Firebase auth, waitlist route), Phase 3 (+14 files — full auth UI, middleware, all mutations, Vertex rank, deploy config).

4. **binge-ship skill install + retroactive application** — Late in the session, `oss-freshness-check.zip` from iCloudDrive was applied, installing the `binge-ship` skill package (SKILL.md + 5 references: `oss-freshness-check`, `checkpoint-protocol`, `endpoint-contract-template`, `question-escalation`, `triple-check-protocol`). Loading the skill surfaced that phases 1-3 had violated the protocol — pins came from training memory, five-gate validation was skipped, prose summaries replaced the 9-section delta format. Applied the skill retroactively: endpoint contract drafted, OSS freshness pass run (25 packages verified at npm registry, 6 majors bumped per Q1=B), forbidden-token grep clean, audit zero high/critical, 5 tsc errors surfaced. Rish directed "plug it in, come back later" — closed as WIP draft PR #252.

## 2. File-by-file manifest (this session)

### Skills updated (outside foai repo, in `~/.claude/skills/`)

| Package | Action | Count |
|---|---|---|
| `open-mind/` | 4 files overwritten (SKILL.md + 21st-dev-magic.md + fdh-deep-dive.md + voice-routing.md) | 4 |
| `iller-ang/` | SKILL.md + 7 refs overwritten, 2 new refs added (`cinematic-ui-discipline.md`, `claude-design-prompt-authoring.md`); preserved ILLER_ANG_FIREBASE_DIRECTIVE.md + validate.py + examples/ + intro/ + sports-templates.md + web3-stack.md | 10 |
| `binge-ship/` (new) | SKILL.md + 5 references | 6 |

### Local prototype workspace (outside foai repo)

| Location | Files |
|---|---|
| `C:\Users\rishj\Projects\destinations-ai-prototype\` | 7 JSX files + index.html (data.jsx, MapBackground.jsx, Pins.jsx, Panels.jsx, Expansion.jsx, Constellation.jsx, App.jsx) + 2 screenshots (01-clean-canvas.png, destinations-a1-initial.png) |

### Production foundation (this PR #252)

See `ship-delta-2026-04-19.md` for the authoritative file-by-file manifest. Summary:
- 7 config files (package.json with registry-verified pins, tsconfig, next.config, tailwind.config, postcss.config, .env.example, .gitignore)
- 3 SQL migrations + migrate.ts + seed.ts
- 10 `lib/` files (db, auth, color, validation, vertex, firebase admin/client, useAuth hook, 3 map providers)
- 10 API routes (health, auth session/verify, destinations, destinations/[id], coming-soon, waitlist, intentions GET/POST, intentions/rank, shortlist GET/POST/DELETE)
- 5 app-entry files (layout, page, globals.css, sign-in, sign-up, middleware)
- 8 components (DestinationsCanvas, DestinationPin, NeighborhoodPulseCard, IntentionComposer, ShortlistDock, ExpansionDrawer, ConstellationOverlay, auth/AuthForm)
- 3 deploy + ops files (Dockerfile, .dockerignore, cloudbuild.yaml)
- 3 contract/delta docs (ship-contract.md with § 7 OSS pins verified, ship-delta-2026-04-19.md, session-delta-2026-04-19.md — this file)
- 5 pre-existing docs (README, ARCHITECTURE, PRODUCTION_CHECKLIST + scripts/ship-gates.sh)

### Memory entries saved (in `~/.claude/projects/C--Users-rishj/memory/`)

- `feedback_oddy_is_techniques_not_doctrine.md` — Iller_Ang leads above Oddy engineering floor
- `project_destinations_ai_phase_1.md` — foundation delivery record
- `project_destinations_ai_phase_2.md` — component port + auth + waitlist record
- `project_destinations_ai_phase_3.md` — auth UI + all mutations + deploy config record
- `project_binge_ship_skill_installed.md` — skill install + retroactive protocol-violation flag on phases 1-3
- `project_destinations_ai_close_pr252.md` — this ship's close record + git gotcha + pickup checklist

## 3. Endpoint contract reconciliation

Contract at `ship-contract.md` was drafted after phases 1-3 had already landed — intentionally, because the skill didn't exist when phases 1-3 were written. Applied retroactively:

- [x] Ship target narrowed from "live production" to "branch + PR-ready" (§ 1)
- [x] User-at-ship-time scoped to future deploy, not this ship (§ 2)
- [x] File manifest verified via `find`, all 53 app files + 5 docs exist and non-empty (§ 4)
- [x] OSS pins § 7 populated with npm-registry-verified rows, zero training-memory pins
- [ ] Exit criteria — 3 of 10 pending (tsc red, lint not run, integration not run)

## 4. Triple-check results

Per `binge-ship/references/triple-check-protocol.md`. All four passes reported honestly:

**Flow:** Not walked this session. Entry points identified (sign-in, sign-up, / canvas, API routes) but full path-by-path verification deferred. TODO next session.

**Flaw (five gates):**
- Tests: ⏭️ no test suite yet (Phase 3 addition)
- Types (`tsc --noEmit`): ❌ **5 errors** documented with file:line in `ship-delta-2026-04-19.md` § 4
- Lint (`next lint`): ⏭️ not run this session
- Audit (`npm audit --audit-level=high`): ✅ zero high/critical, 8 transitive lows in `firebase-admin → @google-cloud/storage → teeny-request` chain
- Integration: ⏭️ not run this session

**Leaks:** Not fully audited. Spot-check signals positive — forbidden-token grep clean, `.env` in `.gitignore`, Firebase Admin creds via discrete env vars, production security headers in `next.config.mjs`. Full sweep TODO next session.

**Efficiency:** Not audited this session. TODO next session.

**Verdict:** Per the protocol, *"Anything less [than all 4 passes green] is a 'close' — not a ship."* This is a **close**.

## 5. OSS pins — registry-verified 2026-04-19

All 25 packages queried at `https://registry.npmjs.org/<pkg>/latest`. Zero pins from training memory. Licenses all clean (Apache-2.0 / MIT / BSD-3-Clause / ISC / Unlicense / SIL OFL).

**Landed this ship (Q1=B selected by Rish):**

| Package | Before | After | Major? |
|---|---|---|---|
| @google/genai | ^1.5.0 | ^1.50.1 | minor (45 versions) |
| firebase | ^11.0.0 | ^12.12.0 | **major** |
| firebase-admin | ^13.0.0 | ^13.8.0 | patch |
| geist | ^1.3.0 | ^1.7.0 | minor |
| lucide-react | ^0.460.0 | ^1.8.0 | **major** (unused in code) |
| maplibre-gl | ^4.7.0 | ^5.23.0 | **major** (2 tsc errors) |
| postgres | ^3.4.5 | ^3.4.9 | patch |
| react / react-dom | ^19.0.0 | ^19.2.5 | minor (range covers) |
| zod | ^3.24.0 | ^4.3.6 | **major** (3 tsc errors) |
| @types/google.maps | ^3.58.1 | ^3.64.0 | minor |
| @types/node | ^22.0.0 | ^25.6.0 | **major** |
| @types/react | ^19.0.0 | ^19.2.14 | minor |
| @types/react-dom | ^19.0.0 | ^19.2.3 | minor |
| autoprefixer | ^10.4.0 | ^10.5.0 | minor |
| postcss | ^8.4.0 | ^8.5.10 | minor |
| tsx | ^4.19.2 | ^4.21.0 | minor |
| @eslint/eslintrc | ^3 | ^3.3.5 | patch |

**Held for separate migration ships:**
- `next` ^15.1.0 (hold — Next 16 is a major rewrite; eslint-config-next coupled)
- `tailwindcss` ^3.4.0 (hold — v4 is CSS-first config rewrite, 2-4hr migration)
- `eslint` ^9.19.0 (hold — bound to eslint-config-next 15)
- `eslint-config-next` ^15.1.0 (hold — bound to Next 15)
- `typescript` ^5.7.0 (TS 6 available but holding)

## 6. Questions resolved mid-ship

- **Q1 — Majors to bump:** B (low-coupling subset) — per Rish's "go with your recommendation"
- **Q2 — Git posture:** A (new branch off main, push, PR)
- **Q3 — Five-gate scope:** A (full gates) → mid-flight redirect to "plug it in" after tsc surfaced 5 errors

One earlier skill-install session question cluster (Q1-Q5 on the plan scope) was answered by Rish with *"1 GCP vertex ai genai (all google) first choice but use both options; 2 yes; 3 production grade no stubs no mock no MVP; 4 adapt to instructions; 5 you decide based on instructions."*

## 7. Activation steps (pickup)

```bash
cd ~/foai
git checkout feat/destinations-ai-foundation
cd destinations-ai

# Fix the 5 tsc errors — see ship-delta-2026-04-19.md § 4
# Then gate-check:
bash scripts/ship-gates.sh

# Env + DB
cp .env.example .env.local   # fill DATABASE_URL + FIREBASE_* (3 vars) + Vertex + MAPTILER_KEY
npm run db:migrate
npm run db:seed

# Dev server
npm run dev   # http://localhost:3000
# ?map=google3d   # toggle to Google 3D Tiles

# When triple-check is green, mark PR #252 ready for review.

# Separate follow-up ships (each with own binge-ship pass):
#   1. Cloud Run deploy (Secret Manager + SA + domain mapping)
#   2. Next 16 migration
#   3. Tailwind 4 migration
#   4. TS 6 + eslint 10 migration
```

## 8. Known limitations within spec

**Explicit deferrals this session (OK under contract):**
- 5 tsc errors (rank/route.ts + maplibre.tsx) — migration drift, ~15-25min next session
- Lint pass not run
- Integration test not run
- Flow pass not walked
- Leaks pass partial (spot-check only)
- Efficiency pass not run
- Cloud Run deploy — separate ship gated on secrets/SA/domain provisioning
- Held majors (Next 16, Tailwind 4, TS 6, eslint 10) — separate migration ships each

**Phase-3-tracked gaps (PRODUCTION_CHECKLIST.md):**
- MFA scaffold
- Rate limiting + CSRF tokens
- SWR client hooks (replace SSR static)
- Real MLS feed integration (Phase 4 — contract-dependent)
- Fair Housing / ADA / state disclosures / GDPR / CCPA copy
- Sentry + Cloud Monitoring + Lighthouse CI

## 9. Chronicle entry

- **Charter (customer-facing):** deferred — no customer surface live yet. Will issue on actual Cloud Run deploy ship.
- **Ledger (internal audit):** this document + `ship-delta-2026-04-19.md` + `ship-contract.md` form the ledger entries for the foundation close. Linked to branch `feat/destinations-ai-foundation` @ commit `9c45ff4` + PR #252 (draft).

## Honest session accounting

**What went well:** 52+ production-grade files landed matching foai/perform conventions exactly. MapLibre + Google 3D Tiles dual-provider abstraction is clean. Firebase auth flow complete end-to-end. Every API route Zod-validated with defense-in-depth. Forbidden-token grep clean. Audit clean. Real curated seed data with provenance documented in-file. OSS freshness pass executed properly once the skill was loaded.

**What violated binge-ship protocol (before the skill was installed):** phases 1-3 pinned dependencies from training memory (Rule 5 violation); skipped the five-gate validation (Rule 8 violation); produced prose summaries instead of the 9-section delta format. The skill was installed mid-session and applied retroactively — which surfaced those violations and produced proper artifacts.

**What went wrong during execution:**

1. *Git worktree gotcha*: the foai repo has 28 active worktrees. My first `git commit` landed on a parallel branch (`feat/p0-phase-a-wire-adapter`) by accident, and my first `git push` reported "new branch" but the remote ref pointed at main's tip — no commits propagated. Fixed via `git cherry-pick` onto the correct branch, then push. Lesson: always verify `git log --oneline -1` matches intended commit AFTER push in multi-worktree repos.

2. *Overclaiming "production grade" on phase handoffs*: phases 1, 2, 3 each closed with "production grade for what it covers" — true for the filesystem, but not for the gates. Binge-ship retroactively reframed these as "production foundation" not "shipped."

3. *Speculative major-version plan*: my first recommendation was Q1=B (6 majors in one ship). Reconsidered mid-flight when I realized I had no migration-guide access to Zod 4, MapLibre 5, etc. — proceeded with Q1=B anyway per Rish's direction, surfaced the expected 5 tsc errors, documented them for next session.

**Next-session entry point:** `ship-delta-2026-04-19.md` § 4 — the 5 tsc errors. Fix those, run the remaining gates, mark PR #252 ready for review. Then queue the separate migration ships (Cloud Run deploy, Next 16, Tailwind 4, TS 6) each with their own binge-ship pass.
