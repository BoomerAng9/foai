# Ship contract — destinations-ai foundation

**Protocol:** binge-ship (loaded 2026-04-19, session-opened after phases 1-3 landed)
**Contract authored by:** Claude (Opus 4.7) executing binge-ship protocol
**Contract target date:** 2026-04-19
**Status:** DRAFT — 3 open questions blocking lock

---

## 1. Ship target

- **Surface type:** branch + PR-ready codebase (NOT live production deploy this ship)
- **Exact address:** `~/foai/destinations-ai/` → branch `feat/destinations-ai-foundation` → PR into `main` of `BoomerAng9/foai`
- **Environment:** local + branch, not yet staging/prod
- **Runtime owner:** ACHEEVY (customer-facing agent at `destinations.foai.cloud` post-deploy)
- **Deployment target:** GCP Cloud Run in `ai-managed-services` project, region `us-central1` (configs committed this ship; actual deploy is a follow-up ship gated on secrets provisioning)
- **Repository:** `BoomerAng9/foai`
- **Branch at ship:** `feat/destinations-ai-foundation` (TBD — see Q2)
- **Merge target:** `main`

**This ship is NOT the Cloud Run deploy.** This ship is a branch that passes OSS freshness, forbidden-token grep, tsc, lint, and npm audit. Deploy-to-Cloud-Run is a follow-up ship gated on: secrets provisioned in Secret Manager, service account created, domain mapping configured.

## 2. User at ship time

Not applicable for this ship — the ship target is a branch, not a live surface. User at ship time applies to the eventual Cloud Run deploy:

- **Auth state** (at deploy): anonymous (browse) → authenticated (shortlist/waitlist/intentions)
- **Platform tier:** public browsing + customer-tier mutations
- **Entry point:** `destinations.foai.cloud` (future) / `localhost:3000` (dev)

## 3. "Shipped" verification (for this ship)

- [x] All 52 files exist and are non-empty
- [x] Forbidden-token grep clean (1 `example.com` placeholder in AuthForm — being neutralized)
- [ ] OSS freshness pass complete **(drift documented in § 7)**
- [ ] `npm install` runs clean (no peer-dep conflicts after freshness resolution)
- [ ] `tsc --noEmit` green (zero errors)
- [ ] `next lint` green (zero errors, warnings triaged)
- [ ] `npm audit --audit-level=high` zero high/critical
- [ ] Code committed on a dedicated branch
- [ ] Ship delta doc produced and saved
- [ ] Integration test against `localhost:3000` — map loads, API routes respond

## 4. File manifest

Already exists from phases 1-3 (52 files). Verified via `find . -type f`. Full list in `PRODUCTION_CHECKLIST.md`.

## 5. Exit criteria

- Every file exists and is non-empty ✅ (verified)
- Zero forbidden tokens ✅ (verified — one neutralization pending)
- All imports resolve (`tsc --noEmit` green) — pending
- All env vars documented in `.env.example` ✅
- Branch committed + PR-ready — pending user decision Q2
- Ship delta produced — pending completion

## 6. Non-goals (this ship)

- Cloud Run deploy — follow-up ship
- Secret Manager provisioning — follow-up ship
- Domain mapping `destinations.foai.cloud` — follow-up ship
- Real MLS feed integration — Phase 4 per PRODUCTION_CHECKLIST.md
- Fair Housing / ADA / GDPR copy — Phase 4
- Sentry / Cloud Monitoring — Phase 4
- MFA scaffold — deferred in Phase 2 checklist
- Rate limiting + CSRF — deferred

## 7. OSS pins — freshness pass results 2026-04-19

### Runtime deps

| Package | Pinned | Latest stable | License | Supply-chain | Action |
|---|---|---|---|---|---|
| @google/genai | ^1.5.0 | **1.50.1** | Apache-2.0 | clean | **ESCALATE** — 45 minor versions behind |
| firebase | ^11.0.0 | **12.12.0** | Apache-2.0 | clean | **ESCALATE** — major bump |
| firebase-admin | ^13.0.0 | 13.8.0 | Apache-2.0 | clean | bump to 13.8.0 (safe) |
| framer-motion | ^12.38.0 | 12.38.0 | MIT | clean | current ✓ |
| geist | ^1.3.0 | 1.7.0 | SIL OFL | clean | bump to 1.7.0 (safe) |
| google-auth-library | ^10.6.2 | 10.6.2 | Apache-2.0 | clean | current ✓ |
| lucide-react | ^0.460.0 | **1.8.0** | ISC | clean | **ESCALATE** — v1 released |
| maplibre-gl | ^4.7.0 | **5.23.0** | BSD-3-Clause | clean | **ESCALATE** — v5 major |
| next | ^15.1.0 | **16.2.4** | MIT | clean | **ESCALATE** — v16 major |
| postgres | ^3.4.5 | 3.4.9 | Unlicense | clean | bump to 3.4.9 (safe) |
| react | ^19.0.0 | 19.2.5 | MIT | clean | bump range satisfies ✓ |
| react-dom | ^19.0.0 | 19.2.5 | MIT | clean | bump range satisfies ✓ |
| zod | ^3.24.0 | **4.3.6** | MIT | clean | **ESCALATE** — v4 major |

### Dev deps

| Package | Pinned | Latest stable | License | Supply-chain | Action |
|---|---|---|---|---|---|
| @eslint/eslintrc | ^3 | 3.3.5 | MIT | clean | current range ✓ |
| @types/google.maps | ^3.58.1 | 3.64.0 | MIT | clean | bump (safe) |
| @types/node | ^22.0.0 | **25.6.0** | MIT | clean | **ESCALATE** — 3 majors behind |
| @types/react | ^19.0.0 | 19.2.14 | MIT | clean | range satisfies ✓ |
| @types/react-dom | ^19.0.0 | 19.2.3 | MIT | clean | range satisfies ✓ |
| autoprefixer | ^10.4.0 | 10.5.0 | MIT | clean | bump (safe) |
| eslint | ^9 | **10.2.1** | MIT | clean | **ESCALATE** — major |
| eslint-config-next | ^15.1.0 | **16.2.4** | MIT | clean | **ESCALATE** — bound to Next 16 |
| postcss | ^8.4.0 | 8.5.10 | MIT | clean | bump (safe) |
| tailwindcss | ^3.4.0 | **4.2.2** | MIT | clean | **ESCALATE** — v4 rewrite |
| tsx | ^4.19.2 | 4.21.0 | MIT | clean | bump (safe) |
| typescript | ^5.7.0 | **6.0.3** | Apache-2.0 | clean | **ESCALATE** — v6 major |

**Rule:** Every entry verified at npm registry (`https://registry.npmjs.org/<pkg>/latest`) on 2026-04-19. No row filled from training memory.

## 8. Open questions (blocking ship lock)

**Q1 — Which majors to bump this ship?**
- A) All majors (Next 16, Tailwind 4, Zod 4, MapLibre 5, lucide 1, TS 6, firebase 12, eslint 10 + eslint-config-next 16, @types/node 25) — full-refresh, likely 4–6hr of migration work across schema files + components + config
- B) Low-coupling majors only (Zod 4, MapLibre 5, lucide-react 1, @types/node 25, TS 6, firebase 12) — skip the two biggest rewrites (Next 16 + Tailwind 4 + eslint-config-next 16); ~1–2hr of work
- C) Freshness-fix minimum (@google/genai 1.50 for Vertex reliability, firebase 12 for Admin SDK match, safe minors only) — ~20min
- D) Stay on current pins, bumps become a follow-up ship (document drift in § "Known limitations within spec")

**Q2 — Git posture for the 52 files?**
- A) New branch `feat/destinations-ai-foundation` off `main`, commit there, push, open PR
- B) Commit on current branch `feat/p0-phase-a-wire-format-lock` (mixes unrelated scope — not recommended)
- C) New branch, commit locally, don't push until triple-check passes
- D) Hold git entirely, commit after follow-up ship (loss: no review, no history)

**Q3 — Five-gate validation scope for this ship?**
- A) Full five gates now (`npm install`, `tsc --noEmit`, `next lint`, `npm audit --audit-level=high`, integration test vs. localhost) — ~30–45min
- B) Freshness-fix + `tsc --noEmit` only; defer lint/audit/integration to next session (honest "close" vs full ship)
- C) Skip entirely; accept as-is (violates binge-ship Rule 8; turns ship into "close")

## 9. Sign-off

- **Contract authored by:** Claude (Opus 4.7) via binge-ship protocol
- **Contract reviewed:** pending Rish answers on Q1/Q2/Q3
- **Contract locked at:** TBD once Q1/Q2/Q3 resolved
- **Contract amendments during ship:** [ledger appended below as they occur]
