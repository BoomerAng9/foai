# Coastal Account Assistant — build spec (parked until account layer kicks off)

Owner directive 2026-05-05. Captured before the account-layer build to prevent drift.

## Premise

Coastal is **not just a beverage retailer** — the brand sells a relationship to the cup. The account layer is the surface where that relationship becomes ongoing. It has three layers:

1. **Auth + identity** (the gap the owner flagged) — sign-up / login / `/account` page wired through **Stepper + Paperform** (Stripe under the hood) per the Coastal payments canon. *Not* NextAuth / Clerk / Supabase — those proposals were wrong.
2. **Introduction layer** — the first experience after account creation. A *thank-you card* welcoming the customer to the experience: "Coffee can change your day. Some people love the vibe of drinking coffee with friends, alone, with family. We are more than a hot-beverage company." Owner-canon hero framing.
3. **Account Assistant** (paid opt-in service) — a persistent agent the customer opts into for ordering supplies, gift planning, recipe suggestions, and (for catering / B2B) event design + campaign planning routed through Melli + Iller_Ang.

## Pricing model

- **Cost basis**: total per-user marginal cost to deploy (LLM tokens + TTS minutes + STT minutes + image-gen if used). Track per-tenant via Inworld Runtime usage telemetry.
- **Charge to user = 2 × cost-to-deploy**. Margin is the upcharge service fee.
- **Tier discounts**: discount scales with order frequency. Higher-frequency customers (weekly subscribers, monthly subscribers, multi-bag bundles) pay less for the assistant; one-shot retail buyers pay full freight.
- The actual tier table needs to be set when we have real cost numbers — placeholder structure:
  | Customer tier | Order cadence | Assistant fee multiplier |
  |---|---|---|
  | Retail (one-shot) | rare | 2.0× cost |
  | Engaged | 2-4 orders/yr | 1.6× cost |
  | Loyalist | monthly subscription | 1.2× cost |
  | Heavy / B2B | weekly or 12+ bags/yr | 1.0× cost (at-cost) |
- **Bundling**: B2B / wholesale accounts may get the catering+campaign module bundled into their Melli relationship at zero marginal fee since the LTV of a bulk buyer covers the assistant cost.

## Stack components

All routed through **Inworld Runtime SDK** to stay aligned with the production voice stack already shipped (Inworld TTS-2 + STT, IVC clones for the four personas).

| Component | Tool | Inworld template seed | Cost basis to track |
|---|---|---|---|
| Onboarding "thank-you card" | Inworld TTS + voice cloning + Anthropic Claude (message gen) + Google Gemini (cover art) | [`greeting-card-node`](https://github.com/inworld-ai/greeting-card-node.git) | TTS minutes + Claude/Gemini tokens, one-time per signup |
| Account assistant chat | Inworld Runtime LLM→TTS pipeline (`@inworld/runtime`, `@inworld/nodejs-sdk`) | [`llm-to-tts-node`](https://github.com/inworld-ai/inworld-runtime-templates-node) (CLI: `inworld init --template llm-to-tts-node`) | LLM tokens + TTS minutes per turn |
| Recipe suggestions | Same chat pipeline + recipe DB grounding (RAG over `coastal-brewing/web/app/recipes/[slug]/`) | n/a — extends chat pipeline | LLM tokens, no extra TTS cost beyond chat |
| Voice agent (persistent voice UI for assistant) | Inworld Runtime + AssemblyAI STT (per template) | [`voice-agent-node`](https://github.com/inworld-ai/voice-agent-node) | LLM + STT + TTS minutes |
| Catering / event design (Melli expansion) | Multimodal Companion — image+text→LLM→TTS | [`multimodal-companion-node`](https://github.com/inworld-ai/multimodal-companion-node) | LLM (multimodal) + TTS minutes per session |
| Campaign / visual generation (Iller_Ang routing) | Iller_Ang's existing 4-step pipeline: GPT Image 2.0 → Seedance 2.0 → FFmpeg → Remotion | n/a — already canon | Image-gen + video-gen credits per asset |

**Hard exclusion**: the Voice Agent Avatar template uses **HeyGen** for live avatar lipsync. HeyGen is struck from the FOAI ecosystem per `feedback_strike_heygen_completely_2026_04_30.md`. Replace with the existing Iller_Ang stack when avatar visualization is needed (or skip avatars entirely for v1 — the four IVC voices already give each persona identity without needing a face).

## Persona routing inside the assistant

The four production personas (Sal / LUC / Melli / ACHEEVY) keep their roles. The account assistant defaults to **Sal** for warm conversational support, with the existing escalation chain:

- Recipe / supply / general → **Sal**
- Discount math beyond Sal's standing authority → **LUC** (the math-sayer)
- Catering / B2B / event design / campaign → **Melli** (with Iller_Ang as the visual/creative tool; Melli is the conversation layer)
- Final approval on above-ceiling discount or bespoke request → **ACHEEVY**

The Melli expansion (catering room arrangement from photos, event design, campaign generation) is the most novel piece — this is where the Iller_Ang skill plus the Multimodal Companion template plug into the account assistant. Per Iller_Ang canon, the visual outputs follow the 4-step pipeline (no Seedance→Veo swap, no HeyGen).

## Cost-to-deploy worksheet (estimate, refine when real)

**Per-session marginal** (one customer, one assistant interaction — say a recipe ask):
- LLM: ~2k tokens in + ~500 out via Anthropic Sonnet 4.6 ≈ $0.014
- TTS: ~30s output × $0.0001/sec (Inworld TTS-2) ≈ $0.003
- STT: ~30s input × $0.0001/sec (Inworld STT) ≈ $0.003
- **Total ≈ $0.02 / session**

**Monthly per active user** (30 sessions/mo): ≈ $0.60
**At 2×**: Coastal charges ≈ $1.20/mo. Bundle into a $4.99/mo or $9.99/mo plan with the tier discount table for headroom.

**Multimodal session** (Melli catering — image upload + LLM analysis + design output):
- LLM (multimodal Sonnet/Gemini): ~5k in + 1k out ≈ $0.04
- Image gen (campaign asset): $0.05 / image (Kie.ai gpt-image-2 canon)
- Video gen (campaign asset, optional): Seedance 2.0 ≈ $0.30 / clip
- **Total ≈ $0.10-0.40 / session**

**Monthly per B2B buyer** with 4 catering assists: $0.40-1.60. At 2×: $0.80-3.20.

These are placeholders — actual numbers come from Inworld Runtime's billing telemetry once instrumented.

## Open decisions before build

1. **Tier definition**: who counts as "Engaged" / "Loyalist" / "Heavy"? Owner needs to set the cadence thresholds.
2. **Free-tier scope**: does *every* account get the onboarding thank-you card free? (Yes by implication — it's the welcome experience.) Does the persistent assistant have any free quota or is it strictly opt-in-paid?
3. **Recipe DB**: Coastal has `app/recipes/[slug]` with 6 named recipes (Saudi Cahwa, Turkish Coffee, Ethiopian Buna, etc). Is the recipe assistant scoped to those + variations, or open-ended ("recommend a chai recipe with these ingredients")?
4. **Auth provider**: confirmed Stepper + Paperform (Stripe under the hood) per `reference_coastal_payments_via_stepper_paperform.md`. The account creation flow needs to plug into Stepper's customer-identity model — the `/checkout` route is suspect-legacy and must NOT be the entry point.
5. **Avatar question**: ship v1 without avatars (voice + UI only), revisit avatars later via Iller_Ang? Or skip avatars permanently and lean on the persona voice as identity?
6. **Service-fee billing surface**: charged via Stripe subscription separate from coffee subs? Bundled into a tier? Owner choice.

## Build sequencing (when greenlit)

1. Auth layer through Stepper + Paperform — `/auth/signup`, `/auth/login`, `/account` pages, link Stripe customer ID to Coastal user_id, migrate the existing anonymous `coastal_uid` cookie data onto the authenticated user.
2. Onboarding "thank-you card" — clone `greeting-card-node`, swap the message-gen LLM to whatever the FOAI canon LLM router picks (Sonnet 4.6 or Gemini 3.1 Pro Preview), use the existing Sal IVC clone for narration. Lands on the new `/account/welcome` page after first signup.
3. Account assistant chat (text + voice) — `inworld init --template llm-to-tts-node`, route through the existing four-persona registry, deploy alongside the chat-panel surface. Free-tier limits + paid-tier upgrade.
4. Multimodal companion expansion (Melli catering / event / campaign) — `multimodal-companion-node` template, pair with Iller_Ang's image + video pipeline for asset generation.
5. Tier-discount logic in the billing surface — once cost telemetry is real, set the multipliers in code.

## How this should interact with existing canon

- **Voice stack stays Inworld**. Per `feedback_inworld_stays_gemini_only_seeds_clones_2026_05_05.md` — the four v2 IVC clones (Sal/LUC/Melli/ACHEEVY) are the production voices. Don't propose Gemini Live or any other realtime voice as a replacement.
- **No HeyGen**. Per `feedback_strike_heygen_completely_2026_04_30.md` — strike the Voice-Agent-Avatar HeyGen path entirely.
- **Seedance 2.0 stays for image-to-video**. Per `Iller_Ang` skill canon — no Veo swap.
- **Stepper + Paperform = customer-facing payment**. Per `reference_coastal_payments_via_stepper_paperform.md` — direct Stripe Checkout / NextAuth / Clerk are NOT the path.
- **Only the routed responding agent speaks** with their own voice — the chat-panel routing fix shipped 2026-05-05 (commit `bcd6aef8`) already handles this. Account assistant inherits the same model.
