# 2026-04-06 · Deploy Realm MVP + Owner Bypass — Design Spec

> **SUPERSEDED 2026-04-06** by the canonical Three-Surface Integration Architecture and the Phase 0 Implementation Plan:
> - `2026-04-06-three-surface-integration-architecture.md`
> - `2026-04-06-phase0-owner-bypass-implementation-plan.md`
>
> Those two documents are the authoritative source. This file is kept for reference only. Notable deltas in the superseding docs: Phase 0 adds the `useAccessLevel` hook + `access-helpers.ts` + `server-access-level.ts` alongside the bypass; cycle numbering expands to 10 cycles to cover the CTI HUB 5-zone layout shell and tool integrations (Agent HQ, Operations Floor, Scenarios, Workbench, NURD Registry, Smelt Engine, Per|Form monitors). The 5-level access model (OWNER / ENTERPRISE / GROWTH / STARTER / PUBLIC) replaces the owner/non-owner binary used here.
>
> **One recon finding for the executing agent:** `usePlatformMode` does NOT currently exist in the cti-hub repo (verified 2026-04-06 — existing hooks are `useAgentFleet`, `useAuth`, `useSystemStatus`, `useWhiteLabel`). Phase 0 Section 4.3 "Migration from usePlatformMode" becomes a no-op — `useAccessLevel` can land as a clean first-time addition instead of a migration.

**Status:** SUPERSEDED — see header note above
**Scope (as originally drafted):** Cycle 0 (Owner Paywall Bypass) + Cycle 1 (Deploy Platform Realm MVP)
**Parent brainstorm:** Three-surface redesign of foai.cloud / deploy.foai.cloud / cti.foai.cloud applying the `open-mind` creation harness and the Book of V.I.B.E. universe canon.

---

## 1. Overview

Rebrand `deploy.foai.cloud` from its current yellow-marker "The Deploy Platform" landing into the **Celestine Cargo Yard** — a diegetic, in-world Realm reached through the Celestine Portal Dock on `foai.cloud`. The visitor doesn't browse a product page; they walk through a working port facility staffed by ACHEEVY, Chicken Hawk, and the Boomer_Angs, where containers are cracked open to reveal customer use cases.

Before any visual work ships, every paywall gate must short-circuit for owner emails via the existing `isOwner()` function. This is a 1-hour cleanup that unblocks every subsequent cycle.

The two cycles in this spec are independent and sequential: Cycle 0 (owner bypass, no visual work) and Cycle 1 (Deploy Realm MVP, four modules). Both land on the existing cti-hub codebase via middleware domain rewriting. No new containers, no new repos, no myclaw-vps SSH work.

---

## 2. Universe canon (compressed reference)

The design draws on the **Book of V.I.B.E.** worldbuilding bible and the memory file `project_foai_universe_canon.md`. Key reference points:

- **Planet Mor / Achievmor / A-C-H-V-M-R** — the source world. Afrofuturist + cyberpunk + techno-mystical.
- **Celestine** — coastal arts/mystics city in Achievmor, the in-world counterpart of Pooler, GA.
- **ACHEEVY** — Aether Vos in ACHIEEVY helmet armor. Customer-facing brand spelling is single-E "ACHEEVY".
- **Chicken Hawk** — 2IC / COO in mech form.
- **Boomer_Angs (ARG, ANG, ANQ)** — tactical port crew, each owns a department (Ops, Content, Scout, Biz, Edu).
- **Lil_Hawks** — scout/courier birds under Chicken Hawk.
- **Clouded Nebula** — a canon tribe. Copper-brown skin; head transforms into a luminous nebula cloud upon awakening. NOT generic smoke-heads.
- **Wood Storks + Herons** — the only birds that appear in FOAI surfaces. Never pelicans.
- **Portal** — canon scientific tech. No occult framing anywhere.
- **Footer mark:** "MADE IN PLR · POOLER, GA" with the green palm-trees + wood-storks logo, present on every FOAI surface.

**Banned vocabulary:** tarot, reading, spread, dealer, sigil, ceremony, mystical, dark magic, occult, pelicans.

**IP protection (per cti-hub CLAUDE.md):** NEVER surface model names, tool names, or internal service names in any visible text.

---

## 3. Non-goals

1. No rebuild of `foai.cloud` (Cycle 3, separate spec, requires myclaw-vps SSH).
2. No rebuild of `cti.foai.cloud` / `src/app/page.tsx` (Cycle 2, separate spec).
3. No new Crew / Kinetic Tower / Berth Fee modules for Deploy (Cycle 4).
4. No competitor pricing research for the Berth Fee clipboard (Cycle 4).
5. No changes to Firebase Auth flow, NextAuth, or OAuth providers.
6. No changes to `src/app/api/*` beyond the checkout bypass lines in Cycle 0.
7. No changes to existing Agent HQ, Plug Bin, Operations Floor, or any other authed dashboard surface.
8. No Thesys C1 rendering on this surface (C1 is reserved for Per|Form).

---

## 4. Cycle 0 — Owner Paywall Bypass (summary)

Audit every paywall, tier limit, budget check, and Stripe checkout call site in cti-hub. Ensure every gate short-circuits via `isOwner(email)` before any external call.

**Current state (verified 2026-04-06):**
- `src/lib/allowlist.ts` exports `isOwner(email)` — foundation exists ✅
- `src/lib/auth-guard.ts:67` — already calls `isOwner` ✅
- `src/lib/budget.ts:123` — already calls `isOwner` ✅
- `src/app/api/stripe/checkout/route.ts` — does NOT call `isOwner` ❌ GAP
- `src/app/api/stripe/sqwaadrun/checkout/route.ts` — does NOT call `isOwner` ❌ GAP
- `src/app/(dashboard)/pricing/page.tsx` — client-side check missing ❌ GAP
- `src/app/(dashboard)/billing/page.tsx` — client-side check missing ❌ GAP

**Implementation (see Phase 0 plan for line-level detail):**
- Wire `isOwner` short-circuit into both Stripe checkout routes
- Create `/api/auth/owner-check` route for UI personalization
- Replace tier grid on pricing + billing with "UNLIMITED BERTH · OWNER CLEARANCE" stamp
- Write `docs/OWNER_BYPASS.md` gate inventory

**Test criteria:** 6-row checklist — owner sees stamp on /pricing and /billing, non-owner sees normal tier grid, direct POST to `/api/stripe/checkout` as owner returns `{ owner_bypass: true }`, budget enforcement still skips for owner.

---

## 5. Cycle 1 — Deploy Realm MVP (Celestine Cargo Yard)

Replace `src/app/deploy-landing/page.tsx` with a four-module diegetic landing: **Manifest · Yard · Customs Booth · Plaque**. Use the AGENTIC DESIGN SYSTEM typography stack (Outfit + Geist + IBM Plex Mono) already loaded in the repo.

**Module 1 — The Manifest (above the fold):**
- Two-column 60/40 split
- Left: holographic manifest ticker held by a Clouded Nebula systems lead (Recraft plate + HTML overlay)
- Right: wordmark + value prop + "CLEAR CUSTOMS → BOARD" stencil CTA
- Ticker rows cycle every 3s with Ang names (OPS_ANG, CONTENT_ANG, SCOUT_ANG, BIZ_ANG, EDU_ANG)

**Module 2 — The Yard:**
- Scroll-driven crane mechanics
- Three use case containers in MVP: RUN YOUR BUSINESS WITHOUT HIRING (OPS_ANG), AUTONOMOUS CONTENT THAT LEARNS (CONTENT_ANG), RESEARCH THAT REMEMBERS (SCOUT_ANG)
- Each container: Outfit 700 headline + Geist body + IBM Plex Mono Ang voice quote + ledger of capabilities
- BIZ_ANG + EDU_ANG containers land in Cycle 4

**Module 6 — The Customs Booth:**
- Full-viewport auth section skinned over existing Firebase flow
- "NAME ON MANIFEST" email input + "CTI KEY (if issued)" access key input
- "STAMP & BOARD" submit in Outfit Black 900
- In-world error messages, no "Access Denied" language
- Owner gets stamped through with "OWNER CLEARANCE" overlay

**Module 7 — The Plaque (footer):**
- "MADE IN PLR · POOLER, GA" with green palm-trees + wood-storks logo
- "THE DEPLOY PLATFORM · AN AIMS-CLASS FACILITY · AIMANAGEDSOLUTION.CLOUD"
- Legal strip as tiny manifest entries

**Color tokens (CSS custom properties):**
```
--deploy-ink: #0A1628       /* sky navy / base */
--deploy-cyan: #00D4FF      /* Boomer_Ang blue visor accents */
--deploy-orange: #FF8C1A    /* ACHEEVY / Boomer_Ang orange visor */
--deploy-gold: #F5A623      /* container glow, lamp glow */
--deploy-cream: #F2EAD3     /* weathered concrete text, stencils */
--deploy-amber: #E8A020     /* container interior deeper tone */
```

**Performance budget:**
- Hero first paint ≤ 180KB
- Total page transferred ≤ 800KB on cold load
- Lighthouse Performance ≥ 85 mobile, ≥ 95 desktop
- Lighthouse Accessibility = 100

**Accessibility:**
- All motion gated behind `prefers-reduced-motion: no-preference`
- Semantic HTML for all diegetic text
- Gold-on-cream contrast ≥ 4.5:1
- Keyboard navigation on every clickable

---

## 6. Recraft V4 asset plan (Cycle 1 only)

| # | Filename | Composition |
|---|---|---|
| 5 | `nebula-lead.webp` | Clouded Nebula systems lead, holographic manifest tablet, Celestine dock backdrop |
| 10 | `yard-wide.webp` | Celestine Cargo Yard wide establishing shot at blue hour |
| 11 | `container-lift.webp` | Single AIMS container mid-lift by crane, gold interior glow |
| 12a | `boomer-ops.webp` | Boomer_Ang with orange visor, arms crossed, mid-shift pose |
| 12b | `boomer-content.webp` | Boomer_Ang with blue visor, holding manifest tablet |
| 12c | `boomer-scout.webp` | Boomer_Ang with orange visor, scouting pose |
| 14 | `customs-booth.webp` | Interior of dockside customs booth, warm lamp, Boomer_Ang on duty |
| 15 | `plaque.webp` | Weathered stone plaque with Made-In-PLR logo carved on left |

**Total: 8 assets · ~$0.32 via Recraft V4**

Prompts saved to `public/realms/_prompts.md` with Recraft V4 parameters for reproducibility.

---

## 7. Sequencing (original draft)

```
Day 0 (1 hour)  — Cycle 0: Owner bypass wiring + OWNER_BYPASS.md
Day 1 AM        — Cycle 1: Recraft asset generation (8 assets, parallel)
Day 1 PM        — Module 1 (Manifest) + Module 7 (Plaque) components
Day 2 AM        — Module 2 (Yard) + UseCaseContainer component + 3 use cases
Day 2 PM        — Module 6 (Customs Booth) + Firebase re-skin
Day 3 AM        — deploy-landing/page.tsx full rewrite, wire modules
Day 3 PM        — reduced motion paths, Lighthouse perf tuning, test criteria run
```

Total estimated effort: ~2.5 days of focused work.

---

## 8. Follow-on cycles (original draft — now superseded by the 10-cycle plan in the three-surface architecture doc)

- Cycle 2: CTI Coastal Watch
- Cycle 3: foai.cloud Dock (myclaw-vps SSH)
- Cycle 4: Deploy Realm expansion (Crew + Tower + Berths)
- Cycle 5: Per|Form Realm (Vibe Field)
- Cycle 6: MindEdge Realm (Hall of Vibes)

---

**End of superseded draft.** Refer to the two canonical docs listed in the header for the authoritative plan.
