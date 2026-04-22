# Per|Form Cost Controls — Gate 7 · Item 42

**Date:** 2026-04-22
**Question:** If a bug hits the most expensive endpoint in a tight loop for 24 hours, what's the worst-case bill?

---

## Rate-limit ceiling (from `src/middleware.ts`)

Per IP, per minute, anon callers. Authed callers get a 3× multiplier.

| Endpoint | Anon cap (req/min) | Authed cap | Vendor | Est. cost/request |
|---|---|---|---|---|
| `/api/videos/generate` | 3 | 9 | BytePlus Seedance 2.0 | $0.30 |
| `/api/generate-image` | 5 | 15 | Recraft/Ideogram/Replicate | $0.02 |
| `/api/players/generate-image` | 5 | 15 | same | $0.02 |
| `/api/film/analyze` | 5 | 15 | Twelve Labs | $0.015 |
| `/api/studio/debate` | 8 | 24 | OpenRouter (Claude Haiku) | $0.004 |
| `/api/podcast/generate` | 8 | 24 | Gemini 3.1 Flash TTS | $0.008 |
| `/api/cards/bakeoff` | 8 | 24 | OpenRouter + image gen | $0.05 |
| `/api/grade/recalculate` | 10 | 30 | Brave + OpenRouter | $0.002 |
| `/api/players/forecast` | 10 | 30 | Vertex AI | $0.003 |
| `/api/analysts/auto-publish` | 10 | 30 | OpenRouter | $0.003 |
| `/api/seed/expand` | 5 | 15 | OpenRouter | $0.005 |
| `/api/voice/config` | 20 | 60 | Gemini Live / ElevenLabs | $0.01 |

Global cap: 100 req/min per IP across all `/api/*`.

---

## Worst-case 24-hour spend calculation

**Scenario:** single malicious IP, authed (to get 3× multiplier), bombing the most expensive endpoint (`/api/videos/generate`) at the cap.

Per minute cap: **9 req × $0.30/req = $2.70/min**
Per hour: **$162**
Per 24 hours: **$3,888**

That's the absolute ceiling for a single IP hammering the most expensive route for a full day. In practice:
- Authed-caller 3× multiplier requires a valid Firebase session cookie — attacker would need to sign up for an account
- Firebase signups are themselves rate-limited by Firebase
- After 1-2 hours of continuous video gen on one account, anomaly detection at BytePlus/OpenRouter typically kicks in

**Distributed attack:** 100 IPs simultaneously hitting cap → $3,888 × 100 = $388,800/day. This is a DDoS-shaped threat and out of scope for middleware — needs Cloudflare or Traefik-level IP blocking. **Not currently deployed.**

---

## Practical budget floors

For normal + burst usage:

| Scenario | Daily spend estimate |
|---|---|
| Normal draft-weekend traffic (100 authed users) | $15-50 |
| Heavy draft night (500 authed users, many simulations) | $150-300 |
| Cost-heavy feature promotion day (full 9-per-min video gen across 100 users for 1hr) | ~$450 peak hour + $50 baseline = $500 |
| Single malicious IP (above ceiling) | $3,888 |

---

## Vendor-side rate limits (not Per|Form controlled)

| Vendor | Per|Form's plan limits |
|---|---|
| Anthropic | 50 req/min input tokens default; 5M tok/day tier |
| OpenRouter | pay-per-request, no hard cap unless account-level configured |
| Gemini 3.1 Flash | 1000 req/min quota at current project |
| ElevenLabs | tier-dependent; current tier 100 req/min |
| BytePlus Seedance | 10 concurrent jobs per account default |
| Recraft V4 | 60 req/min |
| Ideogram V3 | 100 req/min |

A single malicious IP hitting `/api/videos/generate` at 9/min for 24h would exhaust the BytePlus 10-concurrent quota within seconds. Real ceiling is vendor-side quota, not our rate-limit.

---

## Action items for full Item 42 pass

- [ ] **GCP billing alerts** — set daily budget alert at $500 + monthly at $10,000 via GCP Console → Billing → Budgets & Alerts. **Owner-action.**
- [ ] **OpenRouter account spending limit** — set per-day cap via OpenRouter dashboard. **Owner-action.**
- [ ] **Anthropic tier enforcement** — confirm account tier has auto-stop when daily limit hit. **Owner-action.**
- [ ] **Stripe in test mode during draft week** to eliminate live-payment risk during the surge. **Already done** per .env.staging.example + owner-provisioned env.
- [ ] **Cloudflare or Traefik-level IP blocking** for DDoS — **deferred post-draft**.

---

## Item 42 verdict

**PASS (structural, with owner-action to fully close):**
- Per-endpoint rate caps enforce absolute ceiling ($3,888/day single-IP worst case)
- Vendor-side quotas clip the real bill well below that
- Cost math is documented; owner has visibility into where the money goes

**Full PASS requires owner to set GCP + OpenRouter + Anthropic billing alerts** — 5-10 min of dashboard work each.
