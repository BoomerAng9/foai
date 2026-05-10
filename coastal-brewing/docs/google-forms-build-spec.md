# Google Forms — build spec (replaces Paperform)

Owner directive 2026-05-09: GCP-first canon. Forms pivoted from Paperform
to Google Forms. Same coastal-runner endpoints, same webhook payload
shape — only the form host changes.

Note: "Stepper" is the internal name for the escalation flow. There is
no Stepper-the-vendor in the stack. Paperform was the previous proposed
host; Google Forms replaces it. The env var name stays
`STEPPER_ESCALATION_FORM_URL` because that's the *flow* name in code.

**STATUS UPDATE 2026-05-09 (later same day):** Form 1 (Stepper escalation) is **SUPERSEDED by Path A** (`stripe-stepper-deep-dive-2026-05-09.md`). Stripe Checkout Session is the canonical commitment surface; no form needed. Sal/LUC mints a Stripe Checkout URL via `/api/escalation/form-url` (endpoint name kept for caller back-compat — now returns a Stripe URL). `/stripe/webhook` records the commit on `checkout.session.completed`. Section below kept on disk; do NOT build.

Form 2 (Account onboarding) is still applicable as a Google Forms intake option — owner picks vs native Next.js signup.

Forms to consider:

1. ~~**Coastal Stepper escalation (T1 commit)** — SUPERSEDED, do NOT build~~
2. **Coastal account onboarding** — optional, post-launch.

---

## Form 1 — Stepper escalation (T1 commit)

**Purpose.** Custee lands here from Sal/LUC chat after they mint an
escalation token. They confirm volume + cadence + delivery + payment
terms; the form's Apps Script webhook POSTs to
`/api/escalation/commit`; owner approves via Telegram; Stripe charge
fires.

### Build steps (Google Forms UI)

1. Open [Google Forms](https://forms.google.com/) under the
   `coastal@brewing.foai.cloud` Workspace account (or whichever
   Workspace identity owns the form — must match the Apps Script
   project owner).
2. Click **Blank form**.
3. Title: `Lock in your bulk Coastal order`
4. Description:
   > Pull up to the counter. We'll lock your order at the rate Sal
   > walked you through, then send you a confirmation once the owner
   > signs off.
5. Form Settings (gear icon) → **Responses** tab:
   - Toggle **Collect email addresses** OFF (we collect email as a
     question because the form is opened by the custee from a chat
     redirect, not from Workspace SSO).
   - Toggle **Limit to 1 response** OFF.
   - Toggle **Edit after submit** OFF.
6. Form Settings → **Presentation** tab:
   - Toggle **Show progress bar** ON.
   - Confirmation message: "Thanks. The owner gets notified, and you'll
     hear back within the hour. — Sal"

### Questions (in order)

| # | Question type | Question text | Required | Notes |
|---|---|---|---|---|
| 1 | **Short answer** | `Escalation token` | yes | Description: "Auto-filled from your link — leave it as is." Validated as text, no regex. **CRITICAL: this question's `entry.<id>` is what the runner prefills via URL param. Once form is built, capture this question's entry ID** (see "Wire URL prefill" below). |
| 2 | **Short answer** | `Quantity (units)` | yes | Validation: Number → Greater than 0; Number → Less than 5001. Custom error: "Enter a number between 1 and 5000." |
| 3 | **Multiple choice** | `Pickup cadence` | yes | Options: "Pay per unit" / "3-month subscription" / "6-month subscription" / "9-month — pay 9, get 12" / "Quarterly bulk drop". |
| 4 | **Multiple choice** | `Delivery window` | yes | Options: "Standard (5–7 business days)" / "Priority (2–3 business days)" / "Instant (next-day where available)". |
| 5 | **Multiple choice** | `Payment terms` | yes | Options: "Charge now" / "Net 15" / "Net 30". |
| 6 | **Short answer** | `Email for confirmation + receipt` | yes | Validation: Text → Email. |
| 7 | **Short answer** | `Name on the order` | yes | |
| 8 | **Paragraph** | `Anything Sal should pass to the roaster?` | no | |

### Wire URL prefill for the escalation token

Google Forms supports prefilling answers via URL params named
`entry.<question_id>`. The IDs are stable per form but auto-generated.

1. Click ⋮ (top right) → **Get pre-filled link**.
2. In the pre-fill view, type any placeholder text (e.g. `TOKEN_HERE`)
   into the **Escalation token** field.
3. Skip all other questions. Click **Get link** at the bottom.
4. Copy the URL. It looks like:
   ```
   https://docs.google.com/forms/d/e/<FORM_ID>/viewform?usp=pp_url&entry.123456789=TOKEN_HERE
   ```
5. **Capture two values from that URL:**
   - The published form URL (everything before `?usp=pp_url`).
   - The `entry.<id>` parameter for the token field.

### Apps Script webhook (replaces Paperform native webhook)

1. From the form, click ⋮ → **Script editor**. A new Apps Script
   project opens bound to the form.
2. Replace the default `Code.gs` with:

```javascript
// Coastal Stepper escalation — onFormSubmit webhook to coastal-runner.
// Owner directive 2026-05-09: Google Forms + Apps Script in place of
// Paperform native webhook. GCP-first canon.

const WEBHOOK_URL = 'https://brewing.foai.cloud/api/escalation/commit';

// Map form question titles -> runner-side keys. Must match
// EscalationCommitRequest in scripts/api_server.py:1848.
const FIELD_MAP = {
  'Escalation token':                            'escalation_token',
  'Quantity (units)':                            'qty',
  'Pickup cadence':                              'cadence',
  'Delivery window':                             'delivery_window',
  'Payment terms':                               'payment_terms',
  'Email for confirmation + receipt':            'email',
  'Name on the order':                           'name',
  'Anything Sal should pass to the roaster?':    'notes',
};

// Map UI labels back to the canonical runner enum values that
// EscalationCommitRequest pattern-matches on.
const CADENCE_MAP = {
  'Pay per unit':                  'ppu',
  '3-month subscription':          '3-month',
  '6-month subscription':          '6-month',
  '9-month — pay 9, get 12':       '9-month-pay9-get12',
  'Quarterly bulk drop':           'quarterly-bulk',
};
const DELIVERY_MAP = {
  'Standard (5–7 business days)':              'standard',
  'Priority (2–3 business days)':              'priority',
  'Instant (next-day where available)':        'instant',
};
const PAYMENT_MAP = {
  'Charge now':  'now',
  'Net 15':      'net-15',
  'Net 30':      'net-30',
};

function onFormSubmit(e) {
  const responses = e.response.getItemResponses();
  const payload = {};
  for (const r of responses) {
    const title = r.getItem().getTitle();
    const key = FIELD_MAP[title];
    if (!key) continue;
    let value = r.getResponse();
    if (key === 'cadence')        value = CADENCE_MAP[value]  || value;
    if (key === 'delivery_window') value = DELIVERY_MAP[value] || value;
    if (key === 'payment_terms')   value = PAYMENT_MAP[value]  || value;
    if (key === 'qty')             value = parseInt(value, 10);
    payload[key] = value;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const resp = UrlFetchApp.fetch(WEBHOOK_URL, options);
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    // Apps Script errors auto-email the form owner — that's the retry surface.
    throw new Error('coastal-runner webhook ' + code + ': ' +
                    resp.getContentText().slice(0, 300));
  }
}
```

3. **Save** (disk icon).
4. **Triggers** (clock icon, left rail) → **+ Add Trigger**:
   - Function to run: `onFormSubmit`
   - Deployment: `Head`
   - Event source: `From form`
   - Event type: `On form submit`
   - Failure notifications: `Notify me daily` (or immediately).
5. **Authorize** when prompted (Apps Script needs `UrlFetchApp` +
   form-read scopes). Approve under the same Workspace identity that
   owns the form.

### After-submit redirect

Google Forms doesn't natively support custom-URL redirects on submit.
Two options:

- **Option A (simpler):** Leave the default Google Forms thank-you
  message ("Thanks. The owner gets notified..."). Custee closes the tab
  and returns to chat.
- **Option B (better UX):** Build a tiny Apps Script web app that
  serves an HTML page redirecting to
  `https://brewing.foai.cloud/account?escalation=submitted`, and use
  it as the form's destination via Apps Script's `doGet()` handler.
  Adds ~15 min build time.

For launch: ship Option A. File Option B as a polish-pass later.

### Then

1. **Send** (top right) → **Link** tab → **Shorten URL** → copy.
2. SSH aims-vps and add to coastal-runner env (compose env block):
   ```
   STEPPER_ESCALATION_FORM_URL=<the form URL>
   STEPPER_ESCALATION_TOKEN_PARAM=entry.<id from prefill step>
   ```
   The runner builds the redirect URL by appending
   `?<STEPPER_ESCALATION_TOKEN_PARAM>=<escalation_token>` —
   `api_server.py:1962` already does this pattern; needs a one-line
   tweak to use the configurable param name.
3. Recreate the container:
   ```bash
   docker compose -f /docker/coastal-brewing/compose.yml up -d coastal-runner
   ```
4. Smoke-test: ask Sal for a 25%-off bulk discount → response includes
   the Google Forms URL with prefilled token → fill the form → check
   Telegram for owner approval prompt → approve → Stripe charge fires.

---

## Form 2 — Account onboarding (post-launch)

**Purpose.** Layer-1 signup capture for the three-layer account model.
Free signup; Account Assistant tier upsell is downstream.

### Build steps

1. Google Forms → **Blank form**.
2. Title: `Pull up to the counter — open a Coastal account`
3. Description:
   > Real fine. Drop a couple things and we'll have your Coastal
   > account ready by the time you finish your first cup. — Sal
4. Form Settings: same as Form 1 (collect email OFF — we collect via
   question; limit-to-1 OFF; edit-after-submit OFF; progress bar ON).
5. Confirmation message: "Account opened. Check your email for the
   sign-in link. — Sal"

### Questions (in order)

| # | Type | Text | Required |
|---|---|---|---|
| 1 | Short answer | `Your name` | yes |
| 2 | Short answer (validated email) | `Email — we'll send your sign-in link here` | yes |
| 3 | Checkboxes (multi-select) | `What do you reach for first?` Options: Coffee / Tea / Matcha / Single-origin / Flavored / Decaf / Gift cards / Bulk + wholesale | no |
| 4 | Multiple choice | `How often do you brew at home?` Options: Daily / Few times a week / Weekends only / Occasionally | no |
| 5 | Multiple choice | `Bag size that fits your kitchen.` Options: 12 oz / 2 lb / 5 lb / Bulk | no |
| 6 | Paragraph | `Anything Sal should know about your taste?` | no |
| 7 | Checkbox (single) | `Send me Coastal news + early-access drops.` | no |
| 8 | Checkbox (single) | `I agree to the Coastal Brewing Co. Terms of Service + Privacy Policy.` | yes |

### Apps Script webhook

Same pattern as Form 1, with a different `WEBHOOK_URL` and `FIELD_MAP`.
Target endpoint: `POST /api/v1/account/onboard` — does NOT yet exist
in `api_server.py`. Build it before publishing this form. Same shape
as `/api/v1/auth/signup` but no password (magic-link only via the
AppInt email automation).

### Then

1. Publish + copy URL.
2. Add to runner env:
   ```
   COASTAL_ONBOARDING_FORM_URL=<the form URL>
   ```
3. Update CTA buttons on `web/app/page.tsx` + `/auth/signup` to either
   embed the form inline (Google Forms supports `<iframe>`) or link
   out — owner picks UX.

---

## Why Google Forms vs Paperform

Per `feedback_gcp_first_tooling_canon_2026_05_09.md`, GCP-native is the
default. Paperform was specced but never published — pivot is cheap.

Tradeoffs accepted:
- **Brand styling weaker.** Google Forms theme control is basic. Use
  the Coastal cream + dark accent header image to anchor brand
  recognition.
- **Webhook via Apps Script.** Brittler than Paperform native; Apps
  Script has cold-start latency on first daily submit and quota limits
  (~30 min/day execution time on free Workspace, much higher on
  paid). For launch volume this is a non-issue. If submission rate
  grows past ~1k/day, migrate the webhook to a Cloud Function
  triggered by a Pub/Sub topic instead.
- **No native payment field.** Doesn't matter — payment fires
  server-side after owner approval, never on the form.

Saved cost: $30/mo Paperform (no longer needed for Coastal).
