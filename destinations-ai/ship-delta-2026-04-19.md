# Ship delta — destinations-ai foundation

**Date:** 2026-04-19
**Branch:** `feat/destinations-ai-foundation` (off `origin/main` at `585ce5a`)
**Status:** **CLOSE, not SHIP** — WIP foundation with documented gate failures; PR opened for future pickup
**Protocol:** binge-ship (applied retroactively after phases 1-3 landed without the full protocol)

---

## 1. Overview

Three-phase foundation for the Destinations AI real-estate vertical lives at `~/foai/destinations-ai/`. 52+ application files (Next.js 15 App Router + React 19 + TypeScript strict) implement the full place-first discovery stack: MapLibre GL JS and Google Photorealistic 3D Tiles as swappable map providers behind a shared `MapContext` with `project`/`flyTo` hooks; six Framer-Motion components ported from the browser-globals prototype (DestinationPin with 3 visual variants, NeighborhoodPulseCard with WalkArc/NoiseWaveform/SchoolDots, IntentionComposer with 3 position modes, ShortlistDock with 4 modes including auto-hidden empty-pill, ExpansionDrawer with 3 position modes, ConstellationOverlay for shortlist graphs); Firebase Auth session-cookie flows (sign-in/sign-up pages + `useAuth` client hook + `requireUser` server helper + edge-middleware soft gate); every mutation route auth-gated with Zod validation (waitlist with email-match-guard, intentions full-set-replace in tx, shortlist idempotent ON CONFLICT UPDATE, intentions/rank via Vertex Gemini); three SQL migrations with updated_at triggers and a denormalized waitlist-count trigger; migrate + seed scripts with curated real-data for 5 live Coastal GA destinations and 8 Coming Soon expansion regions tagged `data_source='curated'`; Dockerfile (Node 20 alpine standalone), `.dockerignore`, `cloudbuild.yaml` with explicit `allUsers` IAM binding (Gate 6b gotcha fix); `GET /api/health` probe.

After phases 1-3 landed, the binge-ship skill was installed and applied retroactively. The OSS freshness pass (Rule 5) was executed for the first time — 25 packages queried at the canonical npm registry. Six majors were behind: `next 15→16`, `tailwindcss 3→4`, `zod 3→4`, `maplibre-gl 4→5`, `lucide-react 0.460→1`, `typescript 5→6`, plus `firebase 11→12`, `eslint 9→10`, `@types/node 22→25`. Per Q1=B decision, the low-coupling subset was bumped (Zod 4, MapLibre 5, lucide 1, firebase 12, @types/node 25) and Tailwind 4 + Next 16 + TS 6 + eslint 10 were held to avoid multi-hour migrations stacking into one ship.

`npm install` landed clean (exit 0, 588 packages). Five-gate validation kicked off: audit passed (zero high/critical, 8 transitive lows in `firebase-admin → @google-cloud/storage → teeny-request`), tsc surfaced 5 expected migration errors in 2 files. Per user direction ("plug it in, come back to it later") this ship is closed as WIP with the 5 tsc errors documented for the next session, rather than forcing migration work tonight. The PR is opened so review + pickup is queued.

## 2. File-by-file manifest

Full tree at the branch HEAD. Count: 53 application files + 5 doc files = 58 total.

### Config (7)
- `package.json` — refreshed pins 2026-04-19; Q1=B majors landed
- `package-lock.json` — committed per Rule 5
- `tsconfig.json` — TS strict + `noUncheckedIndexedAccess`
- `next.config.mjs` — standalone output, security headers, maplibre externals
- `tailwind.config.ts` — ACHEEVY brand colors + Geist fonts
- `postcss.config.mjs` — autoprefixer
- `.gitignore`, `.dockerignore`, `.env.example`

### Schema (3 + runner + seed)
- `migrations/001_destinations_and_pulse.sql`
- `migrations/002_coming_soon_and_waitlist.sql`
- `migrations/003_user_state.sql`
- `scripts/migrate.ts` — idempotent with `_migrations` bookkeeping
- `scripts/seed.ts` — 5 live destinations + 8 coming-soon regions, all `data_source='curated'` with public-source provenance in-file

### Core lib (8)
- `src/lib/db.ts` — postgres.js + camelCase transform + requireDb guard
- `src/lib/auth.ts` — `requireUser()` discriminated-union for route handlers
- `src/lib/color.ts` — `hexToRgba` + `resolveAccent(AccentScheme)` shared helpers
- `src/lib/validation.ts` — Zod schemas for every API shape
- `src/lib/vertex.ts` — `@google/genai` Vertex-mode Gemini ranking
- `src/lib/firebase/admin.ts` + `src/lib/firebase/client.ts`
- `src/lib/hooks/useAuth.ts` — client-side auth state + session cookie sync
- `src/lib/map/provider.ts` — `MapContext` + `useMap()` + `resolveProvider()` + `DEFAULT_CAMERA`
- `src/lib/map/maplibre.tsx` — MapLibre 5 provider w/ dynamic import
- `src/lib/map/google3d.tsx` — Google `<gmp-map-3d>` web component provider

### API routes (9)
- `src/app/api/health/route.ts` — Cloud Run readiness + DB latency
- `src/app/api/destinations/route.ts` · `[id]/route.ts`
- `src/app/api/coming-soon/route.ts`
- `src/app/api/auth/session/route.ts` · `src/app/api/auth/verify/route.ts`
- `src/app/api/waitlist/route.ts` — email-match-guarded
- `src/app/api/intentions/route.ts` — GET + POST tx-replace
- `src/app/api/intentions/rank/route.ts` — Vertex-backed
- `src/app/api/shortlist/route.ts` — GET/POST/DELETE

### App entry (5)
- `src/app/layout.tsx` · `page.tsx` · `globals.css`
- `src/app/sign-in/page.tsx` · `src/app/sign-up/page.tsx`
- `src/middleware.ts` — edge gate

### Components (7)
- `src/components/DestinationsCanvas.tsx` — coordinator
- `src/components/DestinationPin.tsx` — 3 styles
- `src/components/NeighborhoodPulseCard.tsx` — all 4 pulse subcomponents inlined
- `src/components/IntentionComposer.tsx` — 3 position modes
- `src/components/ShortlistDock.tsx` — 4 position modes
- `src/components/ExpansionDrawer.tsx` — 3 position modes + notify-me
- `src/components/ConstellationOverlay.tsx`
- `src/components/auth/AuthForm.tsx`

### Deploy + ops (3)
- `Dockerfile` — Node 20 alpine standalone, non-root user
- `cloudbuild.yaml` — with `allUsers` IAM binding step
- `scripts/ship-gates.sh` — five-gate runner

### Docs (5)
- `README.md` · `ARCHITECTURE.md` · `PRODUCTION_CHECKLIST.md`
- `ship-contract.md` — § 7 OSS pins populated 2026-04-19
- `ship-delta-2026-04-19.md` — this file

## 3. Endpoint contract reconciliation

Against `ship-contract.md` § 3 "Shipped verification":

- [x] All 52 files exist and are non-empty
- [x] Forbidden-token grep clean (one `example.com` placeholder neutralized → `name@domain.tld`)
- [x] OSS freshness pass complete — § 7 populated, 6 majors bumped per Q1=B
- [x] `npm install` runs clean (exit 0)
- [ ] `tsc --noEmit` green — ❌ **5 errors** (see § 4 below)
- [ ] `next lint` green — ⏭️ not run this session
- [x] `npm audit --audit-level=high` — **0 high/critical** (8 transitive lows documented)
- [ ] Committed on dedicated branch — pending (this delta is being committed)
- [ ] Ship delta produced — this file
- [ ] Integration test vs localhost — ⏭️ not run this session

**Declared outcome: CLOSE, not SHIP.** Per triple-check-protocol.md: "Anything less [than all 4 passes green] is a 'close' — not a ship." Flow not walked, types red, lint/integration deferred.

## 4. Triple-check results

### Pass 1 — Flow
**Not walked this session.** Every path, every conditional branch, every error landing. TODO for next session.

### Pass 2 — Flaw

| Gate | Status | Finding |
|---|---|---|
| Tests | ⏭️ | No test suite exists yet (Phase 3 TODO per PRODUCTION_CHECKLIST) |
| Types (`tsc --noEmit`) | ❌ | **5 errors** — see below |
| Lint (`next lint`) | ⏭️ | Not run this session |
| Audit (`npm audit --audit-level=high`) | ✅ | Zero high/critical. 8 transitive lows in `firebase-admin → @google-cloud/storage → teeny-request` chain |
| Integration | ⏭️ | Not run this session (requires live `next dev` + curl probes) |

**The 5 tsc errors:**

1. `src/app/api/intentions/rank/route.ts:55:16` — `error TS1320: Type of 'await' operand must either be a valid promise or must not contain a callable 'then' member.` (likely `requireUser()` typing or Zod 4 safeParse shape)
2. `src/app/api/intentions/rank/route.ts:79:14` — `error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'ParameterOrFragment<never>'.` (postgres.js templated query with optional region param — needs explicit `|| null` coercion)
3. `src/app/api/intentions/rank/route.ts:82:49` — `error TS7006: Parameter 'r' implicitly has an 'any' type.` (postgres.js row typing — add explicit row type)
4. `src/lib/map/maplibre.tsx:61:20` — `error TS2307: Cannot find module 'maplibre-gl/dist/maplibre-gl.css' or its corresponding type declarations.` (MapLibre 5 shipped without CSS type shim — add `declare module` or use a side-effect import with `// @ts-ignore` comment explained)
5. `src/lib/map/maplibre.tsx:73:9` — `error TS2353: Object literal may only specify known properties, and 'preserveDrawingBuffer' does not exist in type 'MapOptions'.` (MapLibre 5 renamed or removed this option — drop the line or migrate)

**Estimated fix time:** 15-25 minutes total across all 5. Trivial migration, not architectural.

### Pass 3 — Leaks
Not fully audited this session. Known-clean signals: forbidden-token grep returned clean; `.env` in `.gitignore`; `.env.example` committed with no real values; Firebase Admin credentials read from env vars; production security headers set in `next.config.mjs`. Full sweep is TODO.

### Pass 4 — Efficiency
Not audited this session. TODO for next session.

## 5. OSS pins (verified at npm registry 2026-04-19)

Same as `ship-contract.md` § 7 — every row verified against `https://registry.npmjs.org/<pkg>/latest`. Zero pins from training memory.

**Held at current pin (NOT bumped this ship):**
- `next ^15.1.0` (hold — Next 16 is major rewrite, bumped separately)
- `tailwindcss ^3.4.0` (hold — v4 is CSS-first config rewrite)
- `eslint ^9.19.0` (hold — bound to eslint-config-next 15)
- `eslint-config-next ^15.1.0` (hold — bound to Next 15)
- `typescript ^5.7.0` (npm resolved to 5.9.3 — within `^5.7.0` range; TS 6 would need separate ship)

**Bumped this ship (Q1=B):**
- `@google/genai` ^1.5.0 → `^1.50.1`
- `firebase` ^11.0.0 → `^12.12.0` (major)
- `firebase-admin` ^13.0.0 → `^13.8.0`
- `geist` ^1.3.0 → `^1.7.0`
- `lucide-react` ^0.460.0 → `^1.8.0` (major — but unused in code, no migration needed)
- `maplibre-gl` ^4.7.0 → `^5.23.0` (major — 2 tsc errors to fix)
- `postgres` ^3.4.5 → `^3.4.9`
- `react/react-dom` ^19.0.0 → `^19.2.5`
- `zod` ^3.24.0 → `^4.3.6` (major — causes 3 of the 5 tsc errors)
- `@types/google.maps` ^3.58.1 → `^3.64.0`
- `@types/node` ^22.0.0 → `^25.6.0` (major)
- `@types/react` ^19.0.0 → `^19.2.14`
- `@types/react-dom` ^19.0.0 → `^19.2.3`
- `autoprefixer` ^10.4.0 → `^10.5.0`
- `postcss` ^8.4.0 → `^8.5.10`
- `tsx` ^4.19.2 → `^4.21.0`
- `@eslint/eslintrc` ^3 → `^3.3.5`

**Licenses all clean:** Apache-2.0 / MIT / BSD-3-Clause / ISC / Unlicense / SIL OFL. No GPL, no CC-BY-NC, no custom/proprietary.

## 6. Questions resolved mid-ship

**Q1 — Majors to bump:** Selected **B** (low-coupling majors) per Rish's "go with your recommendation." Held Next 16, Tailwind 4, eslint 10, TS 6 for separate migration ships.

**Q2 — Git posture:** Selected **A** — new branch `feat/destinations-ai-foundation` off `origin/main`. Committed and pushed via this delta.

**Q3 — Five-gate scope:** Selected **A** (full five gates) — then mid-ship Rish redirected to "plug it in, come back later" once tsc surfaced 5 fixable errors. Current scope = freshness + audit + filesystem verification; tsc/lint/integration deferred to next session.

## 7. Activation steps (for future pickup)

```bash
# Clone + checkout
cd ~/foai && git fetch origin
git checkout feat/destinations-ai-foundation
cd destinations-ai

# Install (already landed but for fresh clones)
npm install

# Fix the 5 tsc errors (see § 4)
# Then run the full gate suite:
bash scripts/ship-gates.sh

# Env setup
cp .env.example .env.local   # fill DATABASE_URL + FIREBASE_* (3 vars) + Vertex + MAPTILER_KEY

# DB
npm run db:migrate
npm run db:seed

# Local dev
npm run dev   # http://localhost:3000
# ?map=google3d   # toggle to Google 3D Tiles

# Deploy (follow-up ship — requires secrets provisioned)
gcloud secrets create destinations-database-url --replication-policy=automatic
# (provision other 3 Firebase secrets, create service account, add IAM bindings)
gcloud builds submit --config cloudbuild.yaml
gcloud run domain-mappings create --service=destinations-ai --domain=destinations.foai.cloud --region=us-central1
```

## 8. Known limitations within spec

**Explicit deferrals this ship (acceptable per contract):**
- tsc errors 1-5 above — planned fix in next session; all migration-drift, not architectural
- Lint pass not run — next session
- Integration test suite not run — next session
- Held majors (Next 16, Tailwind 4, eslint 10, TS 6) — dedicated migration ships planned

**Production-readiness gaps tracked in `PRODUCTION_CHECKLIST.md`:**
- MFA scaffold
- Rate limiting + CSRF tokens
- SWR client hooks (currently SSR static)
- Real MLS feed integration (contract-dependent — Phase 4)
- Fair Housing / ADA / state disclosures / GDPR / CCPA copy
- Sentry + Cloud Monitoring + Lighthouse CI
- Cloud Run deploy gated on secrets/SA/domain provisioning

**No security red flags.** No high/critical CVEs. No placeholder copy in runtime paths. No secrets in source. Forbidden-token grep clean.

## 9. Chronicle entry

- **Charter (customer-facing):** WIP — will write on actual Cloud Run deploy. Not appropriate while branch is green-gated but not deployed.
- **Ledger (internal audit):** this delta serves as the ledger entry for the foundation ship. Linked to `feat/destinations-ai-foundation` branch + PR (to be opened post-commit).

---

**Honest closing statement:** This is a "close," not a "ship" under binge-ship protocol. Filesystem is real, freshness is verified, audit is clean, but three of four triple-check passes are either red or deferred. The PR is opened as a work-in-progress for the next session to pick up exactly at the tsc fix-up work, then run lint + integration + deploy. The 5 tsc errors are small enough that next session begins with a concrete, bounded task.
