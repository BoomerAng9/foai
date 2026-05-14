# C|Brew Communication Companion — Design Spec

**Date:** 2026-05-13
**Owner of build:** Iller_Ang (visual + brand) + Code_Ang (engineering) — ACHEEVY routes; Human-in-the-Loop is final approver
**Surface family:** Coastal Brewing Co. (C|Brew internal shorthand)
**Status:** drafted, AWAITING OWNER APPROVAL (per FDR-2026-05-12 §5 + §6 risk tags)
**Supersedes:** FDR-2026-05-12-cbrew-mobile-rn-from-web-canon.md (the C|Brew Coffee Conversation App scope is paused; this is a different product in the same family)

---

## 0. Sacred Separation + canon

Customer-facing copy NEVER names:
- **OpenAI** (the translation engine — "realtime translation, calibrated for natural conversation" is the canonical phrasing)
- **Inworld Model Gateway** (the model proxy — "secure model gateway" is the public-facing phrase)
- **Taskade** (the storage backend — "your private workspace" / "your second brain" is the public language)
- **OpenRouter, Gemini, Anthropic, Stripe, Resend, Google Workspace, AWS, GCP** (any infra vendor)
- Roastery supplier (anonymized as "our verified roastery partner" if Coastal cross-references appear)

This is internal-only. Every customer-facing asset shipped from this product passes a Sacred-Separation lint before release.

---

## 1. Purpose

> "Live translation while having a Coffee or in a Meeting. If Notes are activated, every account gets a dedicated, secured backend workspace that mind-maps notes and acts as a CRM." — owner directive, 2026-05-13

Two simultaneous use cases:
1. **Coffee chat translation** — two people at a Coastal counter / cafe table speak different languages. The phone listens, translates in real time, both hear/read the other side.
2. **Meeting translation + minutes** — team meetings where one or more participants need real-time translation; optional paid notes layer captures the meeting, summarises, mind-maps, and routes to a personal knowledge graph.

**The differentiator:** real-time translation is FREE (BYOK gateway model). Notes + persistent workspace is the PAID hook. The Coastal Brewing Co. brand frames it as the "communication companion" you carry alongside the coffee.

---

## 2. Target users (Phase 1)

- **Phase 1 — Internal FOAI fleet:** ACHEEVY-led team meetings + Boomer_Ang ops calls + cross-language ops with vendors / contractors. Dogfood instance. Validates the loop before external launch.
- **Phase 2 — External:** every Coastal Custee + small-business teams (sales, hospitality, contracting, trade) who run multi-language meetings. App Store + Play Store presence. B2C with B2B-team upgrade path.

Phase 1 architecture is built for Phase 2 from day one (per-user workspace provisioning, Stripe-ready billing surface, App-Store-ready RN packaging) — no internal-only shortcuts that would block external launch later.

---

## 3. Three surfaces (Phase 1 = mobile + web; Meet deferred)

### 3.1 Mobile (Phase 1)
**Stack:** Expo Router + React Native + TypeScript. EAS Build for iOS + Android. Distribution: TestFlight (internal) + Play Console internal track for Phase 1; App Store + Play Store public submission gated by owner Telegram approval per FDR-2026-05-12 §5.

**Why mobile-first:** the "Coffee chat" use case is phone-in-pocket. A laptop doesn't help when you're standing at a counter trying to order in a language you don't speak.

### 3.2 Web companion (Phase 1)
**Stack:** Next.js 14 App Router under `communication.brewing.foai.cloud` (subdomain of the existing Coastal frontend). Reuses the existing Coastal auth + Tailwind / framer-motion theme.

**Why web companion:** desktop-bound reviewers need to read / edit transcripts, share minutes with non-mobile-app team members, and access the per-user Taskade dashboard from a real keyboard.

### 3.3 Google Meet add-on (Phase 2 — deferred)
Owner explicitly deferred. Phase 2 trigger: Phase 1 product loop validates AND Google Workspace add-on developer account is registered.

---

## 4. Architecture

```
                                    ┌─────────────────────────────────┐
                                    │  Phone (Expo Router RN)         │
                                    │  · Mic capture                  │
                                    │  · Live caption overlay         │
                                    │  · Push-to-talk + auto modes    │
                                    └──────────────┬──────────────────┘
                                                   │ WebSocket
                                                   ▼
                                    ┌─────────────────────────────────┐
                                    │ coastal-runner /api/v1/companion│
                                    │  · /session/start               │
                                    │  · /session/<id>/stream  (WS)   │
                                    │  · /session/<id>/end            │
                                    │  · /workspace/me                │
                                    │  · /notes/<meeting_id>          │
                                    │  · /billing/portal              │
                                    └──┬──────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────────────┐
              │                        │                                │
              ▼                        ▼                                ▼
   ┌─────────────────────┐  ┌─────────────────────┐         ┌─────────────────────┐
   │ Inworld Model       │  │ Taskade API         │         │ Stripe billing      │
   │ Gateway             │  │ (per-user workspace,│         │ (paid tier gate)    │
   │  · OpenAI Realtime  │  │  notes, mind-map,   │         │  · subscription     │
   │    proxy (WS)       │  │  CRM, second-brain) │         │  · BYOK pass-through│
   │  · BYOK pass-through│  │                     │         │    is FREE          │
   └─────────────────────┘  └─────────────────────┘         └─────────────────────┘

   ┌─────────────────────────────────┐
   │  Web (Next.js)                  │
   │  communication.brewing.foai.cloud
   │  · Sign-in (magic-link)         │
   │  · Per-user Taskade dashboard   │
   │  · Transcript browse/edit/share │
   │  · BYOK key management UI       │
   └─────────────────────────────────┘
```

### Backend extension (coastal-runner)

Reuses the existing FastAPI runner. New module: `coastal-brewing/scripts/companion.py` with router prefix `/api/v1/companion`. Endpoints:

- `POST /session/start` → mint a session_id, return WS endpoint
- `WS /session/<id>/stream` → WebSocket proxying audio frames to Inworld Model Gateway → OpenAI Realtime; sends back text captions + (optionally) translated TTS audio
- `POST /session/<id>/end` → close session, trigger note-generation if paid tier
- `GET /workspace/me` → return current user's Taskade workspace_id + OAuth bounce URL for direct dashboard access
- `POST /notes/<meeting_id>` → generate summary + mind-map nodes, push to user's Taskade workspace
- `POST /billing/portal` → Stripe Customer Portal redirect (subscription management)
- `POST /byok/key` + `DELETE /byok/key` → store / revoke user's Inworld API key (encrypted at rest with `COASTAL_BYOK_ENCRYPTION_KEY`)

### Voice path (Inworld Model Gateway → OpenAI Realtime)

Per owner directive: never direct-to-OpenAI. Always proxied via Inworld Model Gateway for FOAI canon discipline. BYOK = user's Inworld key (or — if they have only an OpenAI key — they paste it into our UI and we mint a derived Inworld pass-through key on their behalf via Inworld's gateway-credential API).

The OpenAI Realtime model (`gpt-4o-realtime-preview-2024-10-01` or successor) supports:
- Multi-language audio input (auto-detect source language)
- Streaming text translation
- Streaming TTS in target language (voice TBD per persona register)

We never name OpenAI on the customer surface. The user knob is "Source language" and "Target language" — that's it.

### Taskade per-user workspace

Each C|Brew Communication Companion activation provisions a dedicated, isolated Taskade workspace via Taskade's API. Flow:

1. User signs up via magic-link (existing Coastal auth)
2. On first companion activation: backend calls `taskade.create_workspace(name="<user_email>'s C|Brew Notes", owner=<our_service_account>)`
3. Workspace ID stored on user's profile (`coastal_user_profiles.taskade_workspace_id`)
4. User's web dashboard at `/workspace` deep-links into their Taskade workspace via OAuth bounce
5. Every meeting note + mind-map + action-item writes to that workspace (Taskade tasks + mind-map nodes)
6. Data isolation: only the user's coastal_uid can read/write to their workspace; we keep a master service account that owns workspace metadata for billing + recovery

Taskade integration scope:
- Auto-provision workspace ✓
- Push transcript as Taskade doc ✓
- Push action items as Taskade tasks ✓
- Push mind-map as Taskade native node tree ✓
- Read-side: web dashboard renders a slim view of recent workspace contents; deep clicks bounce to Taskade UI

### Billing (Stripe)

- **Free tier:** Live translation. BYOK — user pays Inworld + OpenAI directly. We charge $0.
- **Paid tier:** Notes activation. ~$X/mo per user (owner-set; see Open Questions §10). Unlocks:
  - Persistent transcript storage on FOAI VPS (encrypted at rest)
  - Taskade workspace provisioning + sync
  - Summary + mind-map generation (uses a separate model — TBD which; could be Gemini 3.1 Flash on Vertex per FOAI canon, with cost ~$0.001/summary)
  - Web dashboard access

Stripe Checkout Session flow mirrors the existing Coastal tier checkouts but mode=subscription with a single price point. Customer Portal for self-serve cancellation. Webhook fulfillment hooks into `companion.activate_user_taskade_workspace(user_id)`.

### Auth

Reuses the existing Coastal auth (`/api/v1/auth/signup`, `/auth/login`, `/auth/verify`). Extends:
- `coastal_uid` cookie is the primary identity
- New profile field: `taskade_workspace_id`
- New profile field: `byok_inworld_key` (encrypted)
- Magic-link deep-link scheme: `cbrew://verify?token=...` (custom URL scheme for the RN app; web stays HTTPS)
- Universal Link path deferred to Phase 2 (apple-app-site-association overhead)

---

## 5. Two-tier product

| Tier | Live translation | Notes | Taskade workspace | Cost (us → user) | Cost (user → vendors) |
|---|---|---|---|---|---|
| **Free** | ✓ | ✗ | ✗ | $0 | ~$0.30 / 5-min translated chat (Inworld + OpenAI Realtime via BYOK) |
| **Paid** | ✓ | ✓ | ✓ | TBD $/mo (owner sets) | Same Inworld/OpenAI Realtime cost (user BYOK) + our paid tier covers Taskade hosting + summary generation |

**Why this model:** the free tier proves the loop and drives adoption (no friction); the paid tier is the value moat (Taskade-as-second-brain + persistent notes + mind-map + CRM). BYOK is the cost-shift that keeps us cash-flow-positive from day one — we never pay the translation bill.

---

## 6. Tech stack

| Layer | Tech | Why |
|---|---|---|
| Mobile | Expo Router + RN + TypeScript | Iller_Ang canon for mobile; matches FDR-2026-05-12 stack choice; EAS Build for iOS + Android in one workflow |
| Mobile audio | `expo-av` for playback; `expo-audio` for capture (newer expo audio module); WebSocket via `react-native-websocket` | Replaces HTMLAudioElement gesture-gate from web; native iOS/Android mic permissions |
| Web | Next.js 14 App Router | Reuses existing Coastal frontend stack; reuses Tailwind + framer-motion + brand tokens |
| Web audio | Browser `MediaRecorder` + `AudioContext` | Standard browser primitives |
| Backend | FastAPI (extension of coastal-runner) | Reuses existing runner + auth + Stripe + audit_ledger plumbing |
| Voice path | Inworld Model Gateway proxying OpenAI Realtime (WebSocket) | Owner directive — FOAI canon |
| Notes / summary | Gemini 3.1 Flash on Vertex (FOAI canon) — separate from translation path | Cheap + already wired in FOAI infra |
| Storage (transcripts) | SQLite extension of `audit_ledger.db` for Phase 1 (small scale); migrate to Postgres on Neon when external launch ramps | Reuses existing |
| Workspace storage | Taskade API per-user workspace | Owner directive |
| Auth | Coastal magic-link (existing) | Reuses |
| Billing | Stripe Checkout Session + Customer Portal | Reuses Coastal billing infra |
| Push | Expo Push (per Q&A 2026-05-13) | Single push API for iOS + Android |
| Deep-link | `cbrew://verify?token=...` custom scheme (Phase 1); Universal Link Phase 2 | Faster ship for Phase 1 |

---

## 7. Phase 1 build sequence (high-level — full plan in `docs/superpowers/plans/`)

1. **Backend extension first** (~2 weeks of focused engineering):
   - `companion.py` FastAPI router (8 endpoints)
   - Inworld Model Gateway WebSocket proxy
   - Taskade workspace provisioning helper
   - Stripe subscription product + webhook handler
   - BYOK key encryption + storage
2. **Web companion** (~1 week):
   - `web/app/companion/` route group
   - Sign-in via existing magic-link
   - BYOK key management UI
   - Per-user Taskade dashboard (deep-link bounce)
   - Transcript browser + share UI
3. **Mobile RN scaffold + core flow** (~2 weeks):
   - `coastal-brewing-mobile/` Expo Router scaffold
   - Auth + magic-link deep-link return
   - Translation session screen (mic + live caption + audio playback)
   - Settings + BYOK + paid tier gate
4. **Paid tier + Taskade sync** (~1 week):
   - Stripe Checkout in-app + web purchase flow
   - On webhook: provision Taskade workspace + flip user to paid tier
   - End-of-session: generate summary via Gemini Flash, push to Taskade
5. **Internal dogfood + iteration** (~1 week):
   - TestFlight + Play Console internal track distribution to FOAI fleet
   - Daily standup translation use, ACHEEVY-led meeting use
   - Bug bash + UX polish
6. **External launch decision gate**:
   - Owner Telegram ack of: App Store / Play Store account credentials, ad-spend posture, brand-canon screenshots, supply-chain implications
   - If green: public submission. If red: hold at internal-only indefinitely.

Total Phase 1 critical path: ~6-7 weeks of focused work. Could compress if multiple agents run in parallel on backend / web / mobile.

---

## 8. Out of scope (Phase 1 — YAGNI)

- Google Meet add-on (Phase 2 per owner directive)
- iOS / Android native widgets (lock-screen / Apple Watch / Wear OS)
- Multi-participant translation (Phase 1 = 1-to-1 / 1-to-many one-language-at-a-time; Phase 2 = simultaneous per-participant language streams)
- Speaker diarization (who said what) — Phase 2; OpenAI Realtime supports it natively when we wire it
- Custom translation glossaries (legal / medical / technical jargon dictionaries) — defer
- Video-call screen-share OCR (translate slides + screen text) — defer
- Multi-user Taskade workspace sharing — Phase 1 = per-user only; Phase 2 = team workspaces
- API for third-party integrations into the C|Brew workspace
- White-label / vertical-skin for licensees (per FDR-2026-05-12 anti-pattern guard, defer until a named licensee exists)
- Self-hosted Whisper / local-only mode for privacy-paranoid customers

---

## 9. Risk tags (per FDR-2026-05-12 §6)

All four still apply:
- **`money`** — Stripe subscription mint endpoints port to mobile; real customer charges
- **`ad_spend`** — App Store + Play Store presence implies marketing spend
- **`brand_canon`** — App Store + Play Store icon + screenshots are brand-canon-affecting surfaces
- **`supply_chain`** — if mobile surfaces enable in-app push-to-buy (e.g., upsell physical coffee in the Companion app), supplier contract may need revisit

**Owner Telegram approval required before:**
- Public App Store / Play Store submission (Phase 1 end)
- First paid customer Stripe charge in production
- Any change to the BYOK key handling (escrow, sharing, vendor swap)

Phase 1 internal dogfood (TestFlight + internal track) is below the gate — owner ack of THIS spec is sufficient.

---

## 10. Open questions (owner input before plan stage)

1. **Paid tier monthly price.** What's the $/mo for the paid (Notes + Taskade) tier? Reasonable anchors:
   - $9/mo (matches mid-market note-taker pricing)
   - $14.99/mo (matches Coastal pooler-pass-plus tier register)
   - $29.99/mo (matches Coastal custee-card register)
   - Other (owner-set)
2. **Free-tier abuse cap.** Without BYOK enforcement, free tier could be abused. Cap proposal: 30 minutes/day/user of translation through our gateway (we still charge $0 — they pay vendors via their key). Cap above this requires either paid upgrade OR direct user-to-vendor key (no proxy).
3. **App Store / Play Store developer accounts.** Owner already has Apple Developer + Google Play Console? Or need to register? If register, ~$99/yr Apple + $25 lifetime Google.
4. **Universal Link domain.** Owner-canon domain is `brewing.foai.cloud` — confirm we use `communication.brewing.foai.cloud` for the web companion and the universal-link host? Or a separate domain like `cbrew.app`?
5. **Mobile app icon + screenshots design.** Iller_Ang produces; owner approves before store submission. Defer to post-Phase-1 dogfood.
6. **Phase 1 dogfood roster.** Who in the FOAI fleet gets TestFlight access first? Owner, plus...? (proposed: owner + 2 trusted ops contacts who run multi-language calls)
7. **Recording consent UX (Phase 2 external launch only).** Internal dogfood doesn't need this; external customers will. Defer the implementation but flag for the plan.
8. **Inworld Gateway pricing.** Owner's current Inworld contract — does it cover OpenAI Realtime proxy charges + a markup, or pass-through? Needs confirmation before Phase 1 starts so the BYOK math is honest.

---

## Closing

This spec captures: a free-tier translation product with a paid notes tier hooked into a per-user Taskade workspace, three surfaces (mobile RN + web companion + Meet add-on with Meet deferred), Inworld Model Gateway as the FOAI-canon voice path, and a 6-7 week Phase 1 critical path with owner Telegram gates at public submission + first paid charge.

Sacred Separation discipline is non-negotiable. Every customer-facing string in this product passes a lint pass for vendor names + supplier names + compliance prohibitions before it ships.

**Next step on owner approval:** invoke `superpowers:writing-plans` skill to decompose into commit-sized tasks, then `superpowers:subagent-driven-development` to execute. Per the brainstorming-skill HARD-GATE, no code or scaffold work begins until this spec is explicitly approved.
