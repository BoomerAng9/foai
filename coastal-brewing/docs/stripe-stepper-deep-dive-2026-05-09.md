# Stripe + Stepper deep dive — Coastal Brewing Co.

Owner directive 2026-05-09: do a deep investigation. "Stepper is our
Stripe integration. Now that you have this understood, we should be
able to properly integrate Stripe. That was a huge reason we built the
Shopify integration."

This document captures actual current state, the Stepper+Paperform+Stripe
canon as built in AIMS, the gap between intent and reality on Coastal,
and three legitimate paths forward for ratification.

## Verified current state on Coastal (2026-05-09)

### What Stripe is doing today

- **`coastal-runner` calls Stripe SDK directly.** `_stripe_customer_create()` at `scripts/api_server.py:3550-3566` fires on signup. Creates a `stripe.Customer` per Coastal user.
- **Subscription price IDs wired:** `STRIPE_COASTAL_COFFEE_SUB_PRICE_ID`, `_TEA_SUB_PRICE_ID`, `_COMBO_SUB_PRICE_ID` all set on aims-vps coastal-runner env.
- **`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`** set on aims-vps coastal-runner.
- **No Stripe Checkout sessions or Payment Links are minted from coastal-runner today.** Stripe is connected as a customer-management surface only — no actual charges fire from the runner.

### What Shopify is doing today

- **Shopify is the live retail checkout.** `web/public` storefront → Shopify checkout (handles its own Stripe integration) → TCR drop-ship for fulfillment per `reference_temecula_canon_q1_2026_2026_05_05.md`.
- **`/shopify/webhook` handler at `api_server.py:4520`** receives owner-side product-edit syncs from Shopify Admin (price / cost / inventory / tags).
- **`shopify_adapter` module** at `scripts/adapters/shopify_adapter.py` does the API plumbing.
- **Why Shopify exists:** retail checkout had to ship before Paperform+Stepper was built. Shopify was the workaround that became the production retail path.

### What's NOT live

- **Paperform** — zero forms published for Coastal. The escalation-form spec was drafted (now superseded) but never built.
- **Stepper.io** — zero API integration in coastal-runner. No env var for stepper.io. AIMS has forward-looking schemas in `backend/uef-gateway/src/forms/stepper-library.ts` (10 workflows defined) but none execute against stepper.io yet.
- **Escalation flow** — `/api/escalation/commit` endpoint exists (`api_server.py:1868`) with HMAC verification, but the form that webhooks into it doesn't exist. Sales agents (Sal/LUC) cannot mint above-cap discounts because the redirect target is unset (`STEPPER_ESCALATION_FORM_URL` env not set on aims-vps).
- **Bulk / wholesale / B2B Stripe charges** — no path. Shopify covers retail product purchases (consumer); large-volume orders have no payment surface yet.

### What "Stepper" actually is in the codebase

Two distinct things that I conflated previously:

1. **Stepper.io** — third-party AI-native workflow automation tool. Built by Paperform's founders. Comparable to Zapier / Make / n8n / Pipedream. Per `AIMS/aims-skills/tools/paperform.tool.md:73-77`: "a separate AI-native workflow automation platform... a standalone Zapier/Make competitor. Use Stepper to automate what happens AFTER a form submission."

2. **`verify_stepper_escalation_token()` in `agents/shared/authority_tiers.py`** — local HMAC token verifier. The `_stepper_` prefix here is just naming for "step-of-escalation token" — it has nothing to do with stepper.io.

Owner correction was about meaning #1 — Stepper.io as the workflow primitive, comparable to how Spinner is the function-calling primitive and Grammar is the NLP-filter primitive.

### The Paperform + Stripe relationship

Per `reference_coastal_payments_via_stepper_paperform.md` (2026-05-01) and `paperform.tool.md`, the intended canonical flow was:

1. **Paperform form** with a built-in Payment field (Paperform has native Stripe integration on Pro+ plans).
2. **Custee fills form + pays via Stripe** inside the form. Paperform calls `stripe.Charge.create` under its hood.
3. **Paperform webhook** fires on submit to coastal-runner.
4. **coastal-runner** validates, records, then either runs the post-payment chain inline OR webhooks to **stepper.io** for orchestration.
5. **stepper.io workflow** runs: send receipt → store in Firestore/Notion → notify Telegram → activate service → notify ACHEEVY.

So when owner says "Stepper is our Stripe integration," the operative meaning is the **Paperform-form-with-Stripe-payment-field → Stepper-post-payment-workflow** combo. Paperform processes the charge; Stepper handles after-payment. Stripe is the settlement vendor; Paperform is the payment-form-host; Stepper is the workflow engine.

## The architecture decision Coastal needs

Now that the GCP-first canon is in (`feedback_gcp_first_tooling_canon_2026_05_09.md`), and now that Paperform was specced but not built (so the pivot is cheap), the question is:

**For Coastal's full payment flow (retail + bulk + escalation + subscription), which architecture do we ship?**

Three legitimate paths. Each is internally consistent:

---

### Path A — Stripe-direct, no third-party form or workflow tool

**What it is:**
- **Retail product checkout:** stays on Shopify (live, working, don't touch).
- **Subscriptions:** Stripe Subscriptions via the 3 wired price IDs. coastal-runner mints `stripe.Subscription` directly when custee chooses a sub plan.
- **Bulk / wholesale / escalation orders:** **Stripe Payment Links** (or Stripe Checkout Sessions). Sal/LUC mint a Payment Link with metadata (escalation_token, qty, cadence) → custee clicks → Stripe collects payment → Stripe webhook fires to coastal-runner → runner records + activates + notifies owner via Telegram.
- **Post-payment workflow:** runs inline in coastal-runner (current architecture).
- **Forms (non-payment):** Google Forms per the GCP-first canon (account onboarding, surveys, feedback).

**Vendor count:** Stripe (canon) + Shopify (canon for retail) + Google Forms. Zero new third parties.

**Pros:**
- Cleanest GCP-first stance.
- Shipped fastest (Payment Links can be created from Stripe Dashboard or programmatically via Stripe API in <1 hour).
- No Paperform, no Stepper.io subscriptions to pay for.
- Coastal escalation chain is small enough that inline orchestration is fine.
- Stripe is the canon payment vendor; this just uses more of Stripe's surface.

**Cons:**
- Owner has to edit any post-payment chain in coastal-runner code (no visual workflow editor).
- Less reusable for other AIMS verticals — each vertical builds its own inline post-payment.
- AIMS's forward-looking `stepper-library.ts` workflows stay theoretical.

**Effort:** ~1 day.

---

### Path B — Stripe Payment Links + Stepper.io for the workflow layer

**What it is:**
- **Retail / subscription / bulk:** same as Path A — Shopify (retail), Stripe Subscriptions (sub), Stripe Payment Links (bulk).
- **Post-payment workflow:** Stripe Webhook → Stepper.io workflow → cross-vendor chain (Telegram + Firestore + Notion + email + ACHEEVY notify).
- **AIMS workflows:** activate the 10 schemas in `stepper-library.ts` for Coastal-relevant ones (`stepper-payment-receipt`, `stepper-onboarding-pipeline`).
- **Forms:** Google Forms per GCP-first canon. Stepper triggers off webhooks, not forms.

**Vendor count:** Stripe + Shopify + Google Forms + Stepper.io.

**Pros:**
- Owner can re-edit post-payment chains visually in stepper.io UI.
- Reusable across AIMS verticals — Stepper workflows defined once, run for any vertical.
- Stepper.io covers cross-vendor chains better than Cloud Workflows (built-in Notion / Slack / Telegram apps).
- AIMS investment in `stepper-library.ts` becomes live.

**Cons:**
- Adds Stepper.io as a third-party canon-vendor (need to document the exemption in the GCP-first canon).
- Stepper.io subscription cost (need to verify their pricing tier vs needs).
- More moving parts than Path A for Coastal's small chain.
- Owner has to author Stepper workflows in their UI (one-time setup per workflow).

**Effort:** ~3-5 days (set up Stepper.io account + author workflows + wire Stripe webhook to Stepper).

---

### Path C — Stepper + Paperform as originally designed

**What it is:**
- **Retail / subscription:** Shopify + Stripe Subscriptions (Path A).
- **Bulk / wholesale / escalation:** Paperform form with built-in Stripe payment field. Custee fills + pays in form. Paperform webhook → Stepper.io.
- **Post-payment workflow:** Stepper.io.
- **Forms:** Paperform (revert GCP-first canon for money-touching forms specifically).

**Vendor count:** Stripe + Shopify + Paperform + Stepper.io.

**Pros:**
- Matches the originally-planned architecture from `reference_coastal_payments_via_stepper_paperform.md`.
- Paperform has the most polished form-with-payment UX — branded, conditional logic, calculated fields.
- Stepper integrates natively with Paperform (same founders, designed to pair).
- AIMS already documents the Paperform + Stepper combo.

**Cons:**
- Two new third-party vendors against GCP-first canon (Paperform + Stepper.io).
- Paperform subscription cost (~$30/mo Pro plan minimum).
- Most surface area to maintain.
- Largest non-GCP footprint of the three paths.

**Effort:** ~5-7 days (Paperform forms + Stepper workflows + 2 new vendor accounts + wiring).

---

## My recommendation (with reasoning, not advocacy)

**Path A for Coastal launch.** Reasons:

1. **Coastal is one vertical.** Stepper.io's value compounds across many verticals (AIMS B2B, NURDSCODE, plugmein.cloud licensees). For one vertical the workflow chain is small enough that inline orchestration in coastal-runner is fine.

2. **GCP-first canon is fresh and worth honoring.** Path A keeps Coastal's vendor count at the canon-list. Reverting to Paperform two days after pivoting away would set bad precedent.

3. **Stripe Payment Links cover the use case cleanly.** Sal/LUC can mint a Payment Link per escalation with `metadata: {escalation_token, qty, cadence, delivery_window}`. Custee gets a polished Stripe-hosted checkout. Stripe webhook fires to runner. Same outcome as Paperform-with-Stripe-field, fewer vendors.

4. **AIMS gets Stepper.io when the second vertical lands.** When NURDSCODE or another AIMS-licensed product needs cross-vendor post-payment workflows, that's the moment Stepper.io earns its slot — at the AIMS layer, not at the Coastal layer.

5. **Shopify stays.** It works, retail customers use it, fulfillment is wired. Don't touch it as part of this decision.

**Path B becomes attractive when:** AIMS launches a 2nd retail vertical AND Coastal's post-payment chains exceed ~10 steps AND owner wants visual workflow editing.

**Path C becomes right when:** owner specifically wants Paperform's branded form-with-Stripe-field UX for wholesale intake (the "Sal walked you through this rate, fill this form to lock it in" experience). Defensible if owner values form polish over GCP-purity.

---

## What changes per path (concrete file delta)

### If Path A wins

1. **`coastal-runner` adds Stripe Payment Link creation:** new helper `_stripe_payment_link_create(escalation_token, line_items, metadata)`. Called from `mint_stepper_escalation_token` flow — instead of returning a Paperform URL, return a Stripe Payment Link URL.
2. **`/api/escalation/commit`** changes from "Paperform webhook" to "Stripe webhook handler for `payment_intent.succeeded` with metadata.escalation_token present". HMAC verification of escalation_token stays identical.
3. **Stripe webhook endpoint** `/stripe/webhook` (already exists in api_server.py via `STRIPE_WEBHOOK_SECRET`) gains an `escalation_completed` branch.
4. **Telegram approval flow stays** — `_at.escalate_to_owner()` still fires.
5. **Drop:** the `STEPPER_ESCALATION_FORM_URL` env requirement. Replace with Stripe Payment Link minting.
6. **Delete:** `docs/google-forms-build-spec.md` Form 1 (Stepper escalation) — not needed. Form 2 (account onboarding) survives if owner wants Google Forms onboarding.

### If Path B wins

1. Owner signs up for Stepper.io.
2. Owner authors the 4 Coastal-relevant workflows in stepper.io UI: `coastal-escalation-receipt`, `coastal-subscription-activated`, `coastal-bulk-shipped`, `coastal-onboarding-welcome`.
3. coastal-runner Stripe webhook handler POSTs to Stepper.io webhook URLs (one per event type) instead of running chains inline.
4. New env: `STEPPER_IO_API_KEY`, `STEPPER_IO_WEBHOOK_BASE`.
5. Same Stripe Payment Link minting as Path A for the actual charging.

### If Path C wins

1. Owner publishes the Paperform escalation form per the superseded spec (`paperform-build-spec.SUPERSEDED-2026-05-09.md` — un-supersede + use as-is).
2. Configure Paperform's Stripe payment field on the form.
3. Same Stepper.io setup as Path B for the post-payment workflow.
4. Two new vendor envs: `PAPERFORM_*` already in vault; add `STEPPER_IO_*`.
5. Revert the GCP-first canon to carve out money-touching forms as a Paperform exemption.

---

## Pending owner decision

The question is which path. Once chosen, I can ship the full delta in the same session:

- Path A: ~1 day, no new vendors, fits launch timeline.
- Path B: ~3-5 days, 1 new vendor (Stepper.io), defensible AIMS-wide investment.
- Path C: ~5-7 days, 2 new vendors (Paperform + Stepper.io), most flexibility.
