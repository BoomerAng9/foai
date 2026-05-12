# Meeting Mode (C|Brew Conversation Mode) — PRD rev 2

**Date:** 2026-05-11
**Status:** OWNER-RATIFIED — supersedes the open questions in `coffee-mode-prd-2026-05-11.md` §7
**Renames:** Coffee Mode → Meeting Mode (URL slug + internal name) / C|Brew Conversation Mode (customer-facing brand + app store)

---

## What's locked

### 1. Concierge inclusion in member dues
**INCLUDED.** Members do NOT pay-per-session for Concierge. Coastal absorbs the post-25%-off token cost. Non-members buy Concierge per-session at full token price.

### 2. Translation pricing for non-members
**No free tier.** Trial Mode only:
- 10 minutes per session for anon users
- Requires account creation
- Requires the one-time **$6.54 service initiation fee** on first purchase
- Translation included in trial
- After 10 min → upgrade to full membership or end session

### 3. Voice persona routing — Gemini → Inworld pipeline
**NEW voices via Gemini 3.1 Flash Lite for ACHEEVY + ALL Coastal staff.**

Pipeline (one-time per voice; pre-launch batch):
1. Per-persona script (60-90s read, sourced from `voice-library/dialect-library/cast-environments/coastal-brewing.yaml`)
2. Generate audio sample via **Gemini 3.1 Flash Lite** voice synthesis
3. Upload the resulting WAV to the **Inworld account** as a new IVC (Instant Voice Clone) source
4. Inworld returns a new `voiceId` per persona
5. Pin `voiceId`s in `coastal-brewing/configs/meeting-mode-voices.json` (new file)
6. **Runtime delivery = Inworld.** Meeting Mode Concierge sessions call Inworld with the persona's `voiceId`

**Why hybrid:** Gemini gives better generation quality + fast iteration for new voices; Inworld already has runtime infrastructure + token-budget guarantees. Single runtime billing surface (Inworld), best-of-both generation pipeline.

**Voice list (initial Meeting Mode roster — Phase 1 batch):**
- ACHEEVY (orchestrator / default Concierge voice)
- Sal_Ang (retail bar / Custee Card tier)
- LUC (curation desk / haggle negotiation)
- Melli_Capensi (B2B wholesale / Wood Stork tier)
- Iller_Ang (visuals / Higgsfield render briefs)

**Phase 1.6 follow-up batch** (lower priority — generate after Phase 1 ships):
- Edu_Ang, Scout_Ang, Content_Ang, Ops_Ang, Biz_Ang, TPS_Report_Ang, Code_Ang

**Existing Inworld v2 IVC clones** (per `reference_coastal_voice_v2_ivc_canon_2026_05_09.md`) **stay on the brand-site chat panel only** — Meeting Mode uses the new Gemini-generated set under fresh Inworld `voiceId`s.

### 4. Distribution surface
- URL slug + internal code name: **`meeting-mode`** (not `coffee-mode`, not subdomain)
- PWA path: `brewing.foai.cloud/meeting-mode`
- App store name (Phase 2): **C|Brew Conversation Mode**

### 5. Env canon
Owner-confirmed. In openclaw, MixedCase:
- `Openrouter_API_Key` — OpenAI calls (Translation Mode)
- `Inworld_API_Key` — voice runtime delivery + voice-sample upload
- `Google_API_Key` — Gemini voice generation pipeline

Pipe pattern (canon): openclaw → aims-vps `.env` as UPPERCASE for compose passthrough.

### 6. App-store branding
**C|Brew Conversation Mode** — needs new branding mint.

Higgsfield render queue (Phase 1.5):
- App icon (1024×1024, iOS + Android)
- Splash screen (multiple device sizes)
- In-app mark (used in nav + session card)
- Brand asset: same canon colors as Coastal — cream `#f5efe2`, dark coffee `#1c1814`, brushed gold `#c9b78a`. C|Brew typographic mark on the wordmark.

### 7. Free trial
Covered by #2 — 10-min trial via account + $6.54 first-purchase service initiation fee.

---

## Changes from rev 1

| Section | rev 1 | rev 2 |
|---|---|---|
| Concierge for members | pay-per-session at 25% off (unanswered) | **INCLUDED as tier perk** (we eat the cost) |
| Translation for non-members | open (free w/ cap?) | **No free** — 10-min trial w/ account + $6.54 |
| Voice provider | Inworld Realtime API direct | **Gemini → Inworld pipeline** (Gemini generates, Inworld hosts + serves) |
| URL slug | `/coffee-mode` | `/meeting-mode` |
| App store name | TBD | **C\|Brew Conversation Mode** |
| Env keys | `Openrouter_API_Key` + `Inworld_API_Key` | + `Google_API_Key` for Gemini voice gen |

---

## Approval checklist — RATIFIED ✓

- [x] Architecture: OpenAI via OpenRouter (Translation) + Gemini→Inworld pipeline (Concierge voices)
- [x] Two modes: Translation default + Concierge add-on
- [x] Concierge included for members; non-members pay full token price
- [x] Trial Mode: 10 min, requires account + $6.54 service init
- [x] PWA + RN parallel build
- [x] Phase sequencing: Phase 1 PWA + voice batch → Phase 2 RN → Phase 3 Inworld Model Gateway
- [x] Voice pipeline: Gemini generates → Inworld hosts → runtime calls Inworld
- [x] URL slug `meeting-mode`; app name `C|Brew Conversation Mode`
- [x] Env canon: `Openrouter_API_Key` / `Inworld_API_Key` / `Google_API_Key` MixedCase in openclaw

---

## Phase 1 scaffolding scope (next session)

1. New files in `coastal-brewing/web/`:
   - `app/meeting-mode/page.tsx` — PWA route (two-tile Translation + Concierge toggle)
   - `app/forms/meeting-mode/openai-session/route.ts` — Next.js proxy → runner
   - `app/forms/meeting-mode/inworld-session/route.ts` — Next.js proxy → runner
   - `components/meeting-mode/translation-tile.tsx`
   - `components/meeting-mode/concierge-chat.tsx`
   - `components/meeting-mode/mode-toggle.tsx`
   - `public/manifest.webmanifest` — PWA installable
2. New runner endpoints in `scripts/api_server.py`:
   - `POST /api/meeting-mode/openai-session` — token-gated; mints OpenAI Realtime client secret via OpenRouter
   - `POST /api/meeting-mode/inworld-session` — token-gated; mints Inworld session with persona `voiceId`
   - `GET /api/meeting-mode/pricing` — public; returns current trial limits + member-vs-non-member math
3. New config file `coastal-brewing/configs/meeting-mode-voices.json` (filled after voice batch lands)
4. New voice generation script `coastal-brewing/scripts/generate_meeting_mode_voices.py` — Gemini script → audio → upload to Inworld → record voiceId
5. New React Native + Expo scaffold at `coastal-brewing/mobile/` (parallel track per owner directive)

**Pre-Phase-1 owner-side asks:**
- Drop `Openrouter_API_Key`, `Google_API_Key` into openclaw (Inworld key already there per Coastal voice canon)
- Owner-approval on Phase 1 voice batch script (5 personas) before I fire the Gemini generation

---

## Open items NOT in this rev (deferred)

- Inworld Model Gateway (Phase 3 — when 100+ Concierge sessions/month justify)
- The Phase 1.6 voice batch for remaining Boomer_Angs (Edu / Scout / Content / Ops / Biz / TPS_Report / Code)
- Branding mint via Higgsfield (Phase 1.5 — sequenced after Phase 1 PWA shape is approved)
- Concierge "recipes" knowledge base + "cost estimating" SKU integration + "multi-location stocking" data model — all live in their own subsequent PRDs

🤖 Drafted with Claude Opus 4.7 — locked per owner answers 2026-05-11.
