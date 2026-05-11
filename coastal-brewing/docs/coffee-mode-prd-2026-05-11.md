# Coffee Mode — Product Requirements Document

**Date:** 2026-05-11
**Status:** DRAFT — awaiting owner ratification before implementation
**Owner directive:** "Coffee Mode is a Conversation Translation First mode for multiple members. Add the Concierge Option for Members as an add-on at 25% off token cost. Full price for users who don't have a membership. Concierge mode supports users with Recipes, estimating costs and helping with real-time corporate planning for large and multiple location stocking."
**Parallel build path:** PWA on `coastal-brewing/web` + React Native + Expo on `coastal-brewing/mobile`
**Provider stack:** OpenAI GPT-Realtime-Translate via OpenRouter + Inworld direct API → future Inworld Model Gateway

---

## 1. The two modes

### 1.1 Translation Mode (primary — "Conversation Translation First")

Real-time spoken conversation translation. Two or more people at a table (literal or virtual), each speaking their language, each hearing/seeing the other's words in theirs.

- **Default mode** when a Custee opens Coffee Mode
- **Powered by:** OpenAI GPT-Realtime-Translate (purpose-built for interpretation; dynamic voice adaptation — translated speech carries the source speaker's tone)
- **Latency target:** sub-300ms first-chunk
- **Languages:** 70+ input, 13 output (OpenAI's current matrix; widen via Inworld when Inworld translation-mode is GA)
- **Audience:** members + non-members alike
- **Cost basis:** $0.034 / OpenAI minute. A 30-min session = $1.02.
- **Unit economics line item:** "translation_minutes" on the audit-ledger session row

### 1.2 Concierge Mode (members add-on, others full price)

Layered intelligence on top of (or alternative to) translation. Custee toggles into Concierge mode for:

- **Recipes** — Sal-style brew guides, food pairings, ratios, ingredient swaps for what they ordered
- **Cost estimating** — quote a multi-bag order, a wholesale ramp, or a household-month restock with line-item math
- **Real-time corporate planning** — multi-location B2B stocking decisions for Wood Stork tier customers (case quantities, delivery rotations, regional preference forecasts)
- **Pricing:**
  - Members (any tier): **25% off OpenAI token cost** for Concierge sessions
  - Non-members: **full price** (still accessible; signals membership upgrade path)
- **Powered by:** Inworld Realtime API direct (full speech-to-speech + agent routing + voice persona) — Concierge speaks as ACHEEVY or a tier-appropriate Boomer_Ang (Melli for Wood Stork B2B, Sal for retail, etc.)
- **Cost basis:** Inworld's metered audio time, pay-as-you-go

### 1.3 Mode switching

Single inline toggle inside the Coffee Mode UI. User can flip mid-session. Audit ledger records the mode-toggle event so the per-mode minute counters stay accurate (for billing + the 25% member discount).

---

## 2. Architecture

```
Custee (mobile or browser)
  ├── Translation Mode
  │     └── WebRTC ←→ coastal-runner /api/coffee-mode/openai-session
  │                       └── mints short-lived client secret via OpenRouter
  │                       └── records mode_start with member_status + tier
  │                       └── client opens direct OpenAI Realtime WebRTC
  └── Concierge Mode
        └── WebSocket ←→ coastal-runner /api/coffee-mode/inworld-session
                          └── mints Inworld direct API session
                          └── applies 25% member discount on metered cost
                          └── routes to Boomer_Ang persona per Custee's tier
                          └── client opens direct Inworld WebSocket
```

### 2.1 Why short-lived client secrets (not bearer tokens on the client)

OpenAI Realtime API exposes a "create client secret" pattern (~60s TTL) precisely so the long-lived API key never reaches the browser. Coastal-runner mints the short secret server-side after auth + tier resolution; client uses it for the WebRTC handshake only.

Inworld follows the same pattern — server mints session-scoped token, client uses it for WebSocket only.

### 2.2 OpenRouter for OpenAI (per owner directive)

OpenAI calls flow through OpenRouter, not OpenAI direct:
- Single API key + billing surface across all OpenAI usage in the FOAI ecosystem
- Provider failover (OpenAI outage → OpenRouter routes to Azure OpenAI fallback)
- Per-model rate-limit + quota management

OpenRouter does NOT currently proxy WebRTC Realtime sessions natively. Two paths:
1. **OpenRouter mints client secret, client connects direct to OpenAI Realtime endpoint.** Simplest; OpenRouter handles billing/auth, the WebRTC transport stays direct.
2. **OpenRouter proxies WebRTC.** Requires OpenRouter's Realtime-transport support; check their docs at build time — may not be GA yet.

Default to (1) for Phase 1; revisit (2) when OpenRouter's Realtime transport is available.

### 2.3 Inworld direct for Concierge (per owner directive)

No proxy layer yet. Coastal-runner authenticates with `Inworld_API_Key` (already partially wired in earlier ACHEEVY voice work), mints a session-scoped token, client connects direct to Inworld's WebSocket.

**Future:** Inworld Model Gateway (per owner) — Coastal hosts its own gateway in front of Inworld for token discipline, persona routing, and pricing math centralization. Phase 3.

### 2.4 ACHEEVY / Chicken_Hawk / Hermes / OpenClaw integration

Following the agent-hierarchy canon (per `~/foai/AGENTS.md` + the earlier Coffee Mode brief):

| Agent | Coffee Mode role |
|---|---|
| **ACHEEVY** | Routes the session-start request. Resolves Custee's tier (Pooler / Custee Card / Wood Stork) from session cookies + audit-ledger. |
| **Chicken_Hawk** | Risk-gates the session. Translation is always allowed (no PII storage risk). Concierge is allowed for members at 25% off, allowed for non-members at full price + payment-flow gate. |
| **Hermes** | Writes the session receipt row: start_ts, end_ts, mode, language_pair, member_status, tier, tokens_used, cost_basis_cents, member_discount_applied_cents. NO audio content stored; transcript stays client-side unless Custee explicitly saves. |
| **OpenClaw** | Executes the actual API call (OpenAI client-secret mint OR Inworld session mint). Holds the upstream API keys; the client never sees them. |
| **Boomer_CX** | Owner-side Telegram + email digest of daily Coffee Mode usage. |

---

## 3. Pricing math (owner directive)

### Translation Mode
- Members: full token cost (no discount; baked into membership value)
- Non-members: full token cost
- (Future toggle: member-free as a perk, configurable per tier)

### Concierge Mode
- Members: **25% off OpenAI/Inworld token cost** at session-end billing
- Non-members: full token cost
- Charged to Stripe payment method on file (members) or at session-start (non-members via Stripe Checkout link)

### Unit economics (illustrative — replace with measured data after Phase 1)

| Scenario | Mode | Provider | Raw token cost | Member discount | Net cost | Net margin (assuming $X session-fee) |
|---|---|---|---|---|---|---|
| 30-min Translation | Translate | OpenAI via OpenRouter | $1.02 | 0% | $1.02 | depends on session pricing |
| 30-min Concierge — member | Concierge | Inworld direct | ~$1.50 (est) | -$0.375 | $1.125 | depends |
| 30-min Concierge — non-member | Concierge | Inworld direct | ~$1.50 (est) | 0% | $1.50 | depends |

**Open math question for owner:** Do members pay PER-SESSION for Concierge after the 25% discount, or is Concierge included in their tier dues (we eat the discounted cost)? PRD assumes pay-per-session post-discount until owner answers.

---

## 4. UX (brand-first, per Coffee Mode brief)

### 4.1 Translation Mode layout (two-tile)

```
┌───────────────────────────────┐
│  THEIR LANGUAGE (top half)    │
│  Live transcript (their words)│
│  ───────────────              │
│  Live translation (your lang) │
│  [🎤 push-to-talk]            │
├───────────────────────────────┤
│  YOUR LANGUAGE (bottom half)  │
│  Live transcript (your words) │
│  ───────────────              │
│  Live translation (their lang)│
│  [🎤 push-to-talk]            │
└───────────────────────────────┘
   [▼ Concierge Mode]
   [End session]
```

### 4.2 Concierge Mode layout (chat-style)

```
┌───────────────────────────────┐
│  ACHEEVY · CONCIERGE          │
│  Member · 25% off tokens      │
├───────────────────────────────┤
│  [voice waveform / chat log]  │
│                               │
│  [🎤 hold to speak]           │
│  or type:                     │
│  [_______________________]    │
└───────────────────────────────┘
   [▲ Translation Mode]
   [End session]
```

### 4.3 Branded copy

- **Loading state:** "Pulling up your interpreter. Sip while you wait."
- **Session-end card:** "You spoke with Marcelo in Portuguese for 18 minutes. Save this conversation?"
- **Privacy promise:** "We don't store audio. Transcripts stay on your device unless you save them."
- **Member discount banner:** "Members get 25% off Concierge tokens — applied automatically."
- **Non-member upsell:** "Become a Coastal member to save 25% on Concierge."

### 4.4 Brand canon enforcement

- Palette: cream `#f5efe2`, dark coffee `#1c1814`, brushed gold `#c9b78a`
- Type: display-serif headers, mono uppercase tracking-widest for labels
- Sacred Separation: NEVER show "OpenAI", "OpenRouter", "Inworld", "GPT-Realtime-Translate", model names, or pricing-stack details to the customer. Customer-facing copy = "your interpreter" / "your concierge" / "real-time translation".

---

## 5. File map

### Phase 1 — PWA (coastal-brewing/web)

**New files:**
```
web/app/coffee-mode/page.tsx                          Coffee Mode landing
web/components/coffee-mode/translation-tile.tsx       Two-tile UI
web/components/coffee-mode/concierge-chat.tsx         Concierge layout
web/components/coffee-mode/mode-toggle.tsx            Translation ⇄ Concierge
web/components/coffee-mode/session-card.tsx           End-of-session card
web/app/forms/coffee-mode/openai-session/route.ts     Next.js proxy → runner
web/app/forms/coffee-mode/inworld-session/route.ts    Next.js proxy → runner
web/lib/coffee-mode/openai-client.ts                  WebRTC handshake helper
web/lib/coffee-mode/inworld-client.ts                 WebSocket handshake helper
web/public/manifest.webmanifest                       PWA manifest (Add to Home Screen)
web/public/coffee-mode-icon.png                       PWA icon (Higgsfield mint)
```

**Runner additions (scripts/api_server.py):**
```
GET  /api/coffee-mode/pricing                         Public — current rates + member discount
POST /api/membership/coffee-mode/openai-session       Token-gated; mints client secret + records intent
POST /api/membership/coffee-mode/inworld-session      Token-gated; mints Inworld token + applies discount
POST /api/coffee-mode/session-end                     Records session_end with measured token usage
```

### Phase 2 — React Native + Expo (coastal-brewing/mobile/)

**Scaffold:**
```
mobile/
├── app.json                                          Expo config
├── package.json                                      RN + Expo deps
├── App.tsx                                           Entry
├── src/
│   ├── screens/CoffeeMode.tsx                        Screen wrapper
│   ├── components/translation-tile.tsx               Mirror PWA shape
│   ├── components/concierge-chat.tsx                 Mirror PWA shape
│   ├── lib/openai-realtime.ts                        react-native-webrtc adapter
│   ├── lib/inworld-client.ts                         WebSocket adapter
│   └── lib/coastal-api.ts                            Coastal runner client
├── eas.json                                          EAS Build config
└── README.md                                         Owner setup + store-submit guide
```

### Phase 3 — Inworld Model Gateway (foai/inworld-gateway/)

Owner-directive future build. Coastal hosts a thin gateway in front of Inworld that:
- Normalizes Concierge sessions across personas (ACHEEVY / Sal / Melli / etc.)
- Centralizes 25% member-discount math
- Provides failover routing (Inworld → OpenAI Realtime fallback)

---

## 6. Phase sequencing

| Phase | What | Duration estimate | Trigger to start |
|---|---|---|---|
| **Phase 0** | This PRD ratified | — | Owner OK on this doc |
| **Phase 1** | PWA Coffee Mode + endpoint stubs + OpenAI Realtime via OpenRouter wired | ~1 week | Phase 0 OK + `Openrouter_API_Key` + `Inworld_API_Key` in openclaw |
| **Phase 2** | React Native + Expo scaffold + parity with PWA | ~2 weeks parallel | Phase 1 PWA live; usage data validates feature |
| **Phase 3** | Inworld Model Gateway | ~1 week | Phase 1 + 2 stable + 100+ Concierge sessions/mo |

Phase 1 + Phase 2 run **in parallel** per owner directive. Phase 2 doesn't block on Phase 1 traction; it tracks the same wire-spec.

---

## 7. Open questions (need owner answer before Phase 1 begins)

1. **Concierge inclusion in tier dues?** Members pay-per-session at 25% off, OR Concierge is unlimited as a tier perk (we eat the discounted cost)?
2. **Translation pricing for non-members?** Free with 15-min cap per session (brand-moment), free unlimited (loss-leader), or paid per minute?
3. **Voice persona routing in Concierge?** ACHEEVY default, OR auto-route by tier (Pooler → Sal, Custee Card → ACHEEVY, Wood Stork → Melli)?
4. **PWA distribution surface — `/coffee-mode` on brewing.foai.cloud, or a dedicated `coffee.foai.cloud` subdomain?**
5. **OpenRouter key naming canon in openclaw?** I'll default to `Openrouter_API_Key` (MixedCase, matches `Mercury_API_Token` / `Stripe_Secret_Key` patterns). Same for `Inworld_API_Key`.
6. **App store branding?** "Coastal Coffee Mode" / "Coastal Brewing" / "Coastal Concierge" — single app or two?
7. **Free trial window for Concierge?** "Your first Concierge session is on us" → frictionless adoption, or full price from session 1?

---

## 8. Receipt schema (Hermes audit ledger row)

```
{
  "session_id":            "cm_<sha256_short>",
  "started_at":            "2026-05-11T19:42:00Z",
  "ended_at":              "2026-05-11T20:00:00Z",
  "duration_seconds":      1080,
  "mode_segments": [
    {"mode": "translation", "seconds": 720, "tokens_used": 14400, "cost_cents": 80, "provider": "openai_via_openrouter"},
    {"mode": "concierge",   "seconds": 360, "tokens_used": 7200,  "cost_cents": 120, "provider": "inworld_direct"}
  ],
  "language_pairs":        [["en", "pt"], ["en", "es"]],
  "custee_email":          "buyer@example.com",
  "tier":                  "custee-card",
  "member_status":         "active",
  "member_discount_pct":   25,
  "member_discount_cents": 30,
  "net_cost_cents":        170,
  "billed_to":             "stripe_customer_<id>",
  "audio_stored":          false,
  "transcript_stored":     false
}
```

No PII beyond email + tier. No audio bytes. Transcript stays client-side per privacy promise.

---

## 9. Definition of "Phase 1 done"

- ✅ `/coffee-mode` page renders on brewing.foai.cloud + is installable as PWA
- ✅ Mic permission works in Chrome + Safari (iOS) + Android
- ✅ Translation Mode: live cs_live_* equivalent client-secret minted; WebRTC handshake to OpenAI Realtime succeeds; audio in/out works in two-tile UI
- ✅ Concierge Mode: Inworld session token minted; WebSocket connection succeeds; voice agent responds in ACHEEVY persona; member-discount applied
- ✅ Session-end Hermes receipt written; owner Telegram fires with daily digest
- ✅ Playwright e2e: load /coffee-mode → mic permission prompt → mode-toggle works → both endpoints return tokens (don't smoke the live API in test; just verify our session-mint surface)
- ✅ React Native + Expo scaffold parallel to PWA; same endpoints; basic Translation Mode mirror

---

## 10. Risks + mitigations

| Risk | Mitigation |
|---|---|
| OpenRouter doesn't proxy Realtime WebRTC | OpenRouter mints client secret; client connects direct to OpenAI Realtime endpoint. Revisit when OpenRouter adds Realtime transport. |
| Inworld Realtime API rate-limit during launch | Pre-mint a fixed token pool per minute; queue requests on overflow. |
| Sacred Separation leak in customer copy | Lint pass: grep `OpenAI / OpenRouter / Inworld / GPT-Realtime-Translate / Anthropic / Realtime / Whisper` in all customer-facing strings before merge. |
| iOS PWA mic background mode quirks | Document the iOS-Safari-specific gotchas in `/coffee-mode/faq` page. Phase 2 native app removes the quirk entirely. |
| Concierge hallucinations on cost-quotes | Server-side validator on Concierge cost outputs — reject any numeric estimate that exceeds owner-set ceiling per SKU; route those back through Sal/LUC for human review. |
| Token cost runaway from abusive sessions | 60-min hard cap per session; 5 sessions/day/non-member cap; member cap configurable per tier. |

---

## 11. Approval checklist (for owner)

- [ ] Architecture (OpenAI via OpenRouter + Inworld direct) — OK
- [ ] Two modes (Translation default + Concierge add-on) — OK
- [ ] 25% off Concierge tokens for members — OK
- [ ] PWA + RN parallel build — OK
- [ ] Phase sequencing (1 / 2 / 3) — OK
- [ ] File map — OK
- [ ] Open questions §7 — answered
- [ ] OK to scaffold Phase 1 PWA + RN

Once these boxes are checked I'll start Phase 1 + Phase 2 scaffolding in parallel.

🤖 Drafted with Claude Opus 4.7 — review before code work begins.
