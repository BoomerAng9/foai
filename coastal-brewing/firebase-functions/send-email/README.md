# Coastal Brewing Co. — `sendEmail` Firebase Cloud Function

Transactional email gateway. Owner directive 2026-05-06: email automation
routes through GCP / Firebase, not direct third-party API calls from
coastal-runner.

## What it does

Receives an HMAC-signed POST from `coastal-runner` with `{from, to, subject,
html, text, template_id, issued_at}`, verifies the signature, and forwards
the body to SendGrid's v3 mail-send API. Returns `{ok, message_id}` on
202 from SendGrid.

## Deploy (one-time)

Prereqs: Firebase CLI authenticated, on the `ai-managed-services` Firebase project.

```bash
cd coastal-brewing/firebase-functions/send-email
npm install
npm run build

# Set the SendGrid API key as a Firebase secret
firebase functions:secrets:set SENDGRID_API_KEY --project ai-managed-services

# Set the HMAC secret (must match COASTAL_EMAIL_FUNCTION_SECRET in coastal-runner)
firebase functions:secrets:set COASTAL_EMAIL_FUNCTION_SECRET --project ai-managed-services

npm run deploy
```

After deploy, Firebase prints the function URL (e.g.
`https://us-central1-ai-managed-services.cloudfunctions.net/sendEmail`).

## Wire to coastal-runner

Add to `/docker/coastal-brewing/.env`:

```
COASTAL_EMAIL_FUNCTION_URL=https://us-central1-ai-managed-services.cloudfunctions.net/sendEmail
COASTAL_EMAIL_FUNCTION_SECRET=<same hex value set as Firebase secret>
COASTAL_EMAIL_FROM=Coastal Brewing Co. <coastal@brewing.foai.cloud>
```

Add the same three keys to the `coastal-runner` env block in
`docker-compose.yml` and recreate the container. Verify with:

```bash
docker exec coastal-runner sh -c 'echo $COASTAL_EMAIL_FUNCTION_URL'
```

## Test

Once deployed + wired, hit `POST /api/v1/auth/login` with a real email
on file. The login endpoint returns `{ok: true, sent: true}` (no
inline `magic_link` field — that only appears in dev mode), and the
email lands in the inbox within seconds.

## Why Firebase Function and not direct SendGrid from coastal-runner

- **Vendor abstraction.** Swap SendGrid → Mailgun → SES later by
  updating only this function. Runner code stays unchanged.
- **Centralized template registry.** When we add ship notifications,
  order confirmations, subscription renewals, the function maps
  `template_id` to the right SendGrid dynamic template.
- **Webhook termination.** Future delivery webhooks (open / click /
  bounce) land here and can write to Firestore for ops visibility.
- **Vendor-error containment.** SendGrid 5xx responses don't leak to
  coastal-runner logs — they show up in Firebase Functions logs only.
- **Domain reputation.** SendGrid manages SPF/DKIM/DMARC for the
  brewing.foai.cloud sender. Adding more email use cases later (welcome
  card MP4 share, gift-card invite, etc) all use the same function.

## Future flows in this same function (template_id)

- `auth_magic_link` — current
- `welcome_thank_you` — post-signup welcome card link (when shareable)
- `order_confirmation`
- `ship_notification`
- `subscription_renewal_reminder`
- `cart_abandoned_24h`
- `bulk_order_quote` — Melli's catering deals
