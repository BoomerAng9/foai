# Paperform forms — build spec

Owner-side build (Paperform v1 API doesn't support form creation; verified
2026-05-09 with `POST /v1/forms` → 405). Build in the UI; the runner already
has webhook handlers wired.

Two forms to build, in this order:

1. **Stepper escalation (T1 commit)** — launch blocker. Wires Sal/LUC's
   above-cap discounts → Stripe charges via owner approval.
2. **New-account onboarding** — post-launch. Layer-1 of the three-layer
   account model from the Account Assistant spec.

---

## Form 1 — Stepper escalation (T1 commit)

**Purpose:** Custee lands here from Sal/LUC chat after they mint a
Stepper escalation token. They confirm volume + cadence + delivery, the
form POSTs to `/api/escalation/commit`, owner approves via Telegram,
Stripe charge fires.

### UI build steps

1. Paperform → **+ New form** → start blank.
2. **Title:** `Lock in your bulk Coastal order`
3. **Custom slug** (under Form Settings → Sharing): `coastal-stepper-commit`
   → final URL becomes `https://coastal-stepper-commit.paperform.co`.
4. **Cover image:** `web/public/brand/storefront-canon.png` (or skip —
   form is short, hero image isn't required).
5. **Welcome text** (optional):
   > Pull up to the counter. We'll lock your order at the rate Sal walked
   > you through, then send you a confirmation once the owner signs off.

### Fields (in order)

| # | Field type | Field key (custom name) | Required | Notes |
|---|---|---|---|---|
| 1 | **Hidden field** | `escalation_token` | yes | Prefilled from URL parameter `escalation_token`. Paperform: → Field settings → "Use a URL parameter" → param name = `escalation_token`. |
| 2 | **Number** | `qty` | yes | Label: "Quantity (units)". Min: 1. Max: 5000. |
| 3 | **Multiple choice (radio, single-select)** | `cadence` | yes | Label: "Pickup cadence". Options (use these EXACT values, the runner pattern-matches): `ppu` / `3-month` / `6-month` / `9-month-pay9-get12` / `quarterly-bulk`. Display labels: "Pay per unit" / "3-month subscription" / "6-month subscription" / "9-month — pay 9, get 12" / "Quarterly bulk drop". |
| 4 | **Multiple choice (radio, single-select)** | `delivery_window` | yes | Label: "Delivery window". Values: `standard` / `priority` / `instant`. Display labels: "Standard (5–7 business days)" / "Priority (2–3 business days)" / "Instant (next-day where available)". |
| 5 | **Multiple choice (radio, single-select)** | `payment_terms` | yes | Label: "Payment terms". Values: `now` / `net-15` / `net-30`. Display labels: "Charge now" / "Net 15" / "Net 30". |
| 6 | **Email** | `email` | yes | Label: "Email for confirmation + receipt". |
| 7 | **Single line text** | `name` | yes | Label: "Name on the order". |
| 8 | **Long text** | `notes` | no | Label: "Anything Sal should pass to the roaster?" Optional. |

### Webhook (after submit)

Form Settings → **After Submission** → **Send Webhook**:

- **URL:** `https://brewing.foai.cloud/api/escalation/commit`
- **Method:** `POST`
- **Format:** JSON
- **Custom payload:**

```json
{
  "escalation_token": "{{escalation_token}}",
  "qty": {{qty}},
  "cadence": "{{cadence}}",
  "delivery_window": "{{delivery_window}}",
  "payment_terms": "{{payment_terms}}",
  "email": "{{email}}",
  "name": "{{name}}",
  "notes": "{{notes}}"
}
```

(Paperform mustache syntax — replace each `{{x}}` with the actual field
key from the build above using the Paperform "Insert variable" picker.
Don't hand-type the curly braces; the picker writes the correct
internal IDs.)

**Webhook auth:** the runner's `/api/escalation/commit` validates the
HMAC `escalation_token` payload — that's the auth, not a separate
webhook signature. Paperform doesn't need to sign the request.

### After-submit redirect

Form Settings → **After Submission** → **Redirect URL:**

```
https://brewing.foai.cloud/account?escalation=submitted
```

(Custee lands on their account page with a banner confirming the
commitment is awaiting owner approval.)

### Then

1. **Publish** the form.
2. **Copy the live URL** (`https://coastal-stepper-commit.paperform.co`
   if you used the slug above).
3. SSH aims-vps and add to coastal-runner env:
   ```
   STEPPER_ESCALATION_FORM_URL=https://coastal-stepper-commit.paperform.co
   ```
4. Recreate the container:
   ```bash
   docker compose -f /docker/coastal-brewing/compose.yml up -d coastal-runner
   ```
5. Smoke-test from chat: ask Sal for a 25%-off bulk discount → should
   redirect you to the Paperform → fill it → check Telegram for owner
   approval prompt → approve → Stripe charge fires → confirmation email
   (once AppInt email integration is published).

---

## Form 2 — New-account onboarding (post-launch)

**Purpose:** Layer-1 signup capture for the three-layer account model.
Free signup; Account Assistant tier upsell is downstream.

### UI build steps

1. Paperform → **+ New form**. Or duplicate the existing
   `achvmronboarding.paperform.co` form (slug `xh9a8bbl`) via
   `https://paperform.co/create?slug=xh9a8bbl&space_id=2707` and edit
   for Coastal voice.
2. **Title:** `Pull up to the counter — open a Coastal account`
3. **Custom slug:** `coastal-account-open`
4. **Cover image:** `web/public/brand/storefront-canon.png`.

### Fields (in order)

| # | Field type | Field key | Required | Notes |
|---|---|---|---|---|
| 1 | **Single line text** | `name` | yes | Label: "Your name". |
| 2 | **Email** | `email` | yes | Label: "Email — we'll send your sign-in link here". |
| 3 | **Multiple choice (checkboxes, multi-select)** | `interests` | no | Label: "What do you reach for first?" Options: `coffee` / `tea` / `matcha` / `single-origin` / `flavored` / `decaf` / `gift-cards` / `bulk-wholesale`. |
| 4 | **Multiple choice (radio)** | `cadence_preference` | no | Label: "How often do you brew at home?" Options: `daily` / `few-times-week` / `weekends-only` / `occasional`. |
| 5 | **Multiple choice (radio)** | `volume_preference` | no | Label: "Bag size that fits your kitchen." Options: `12oz` / `2lb` / `5lb` / `bulk`. |
| 6 | **Long text** | `palate_notes` | no | Label: "Anything Sal should know about your taste?" Optional. |
| 7 | **Checkbox** | `marketing_opt_in` | no | Label: "Send me Coastal news + early-access drops." |
| 8 | **Checkbox** | `tos_agree` | yes | Label: "I agree to the Coastal Brewing Co. Terms of Service + Privacy Policy." |

### Webhook

Form Settings → **After Submission** → **Send Webhook**:

- **URL:** `https://brewing.foai.cloud/api/v1/account/onboard`
  *(NOTE: this endpoint does NOT yet exist in `api_server.py`. Build it
  before publishing the onboarding form. Same shape as
  `/api/v1/auth/signup` but no password — magic-link only, fires the
  AppInt email automation.)*
- **Method:** `POST`
- **Format:** JSON
- **Custom payload:**

```json
{
  "name": "{{name}}",
  "email": "{{email}}",
  "interests": {{interests}},
  "cadence_preference": "{{cadence_preference}}",
  "volume_preference": "{{volume_preference}}",
  "palate_notes": "{{palate_notes}}",
  "marketing_opt_in": {{marketing_opt_in}},
  "tos_agree": {{tos_agree}}
}
```

### After-submit redirect

```
https://brewing.foai.cloud/account/welcome?source=paperform
```

### Then

1. Publish.
2. Copy URL.
3. Add to runner env:
   ```
   COASTAL_ONBOARDING_FORM_URL=https://coastal-account-open.paperform.co
   ```
4. Update CTA buttons on `web/app/page.tsx` + `/auth/signup` to either
   embed the Paperform inline or link out to the URL — owner picks the
   UX (inline embed = better brand control; link-out = faster build).

---

## Why no API form-creation

Paperform v1 API surface is read-only for forms (verified `POST /v1/forms`
→ HTTP 405 "method not supported"). The API supports list / get / submit
data / fetch submissions / manage subscribers — not create / edit form
schema. Form authoring is UI-only.

The runner already uses the Paperform API for everything it needs
post-build — webhooks fire to coastal-runner endpoints; runner doesn't
need to call back into Paperform for any of the launch flows.

## API token

`Paperform_Access_Token` is in the openclaw-sop5 vault on myclaw-vps.
Verified working 2026-05-09 (`GET /v1/forms` returned 27 existing
forms, HTTP 200). No new token needed.
