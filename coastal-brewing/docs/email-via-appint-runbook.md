# Email delivery via GCP Application Integration — runbook

Owner directive 2026-05-09: replace the Firebase Function + SendGrid
path with an Application Integration "Send Email" task in the
`ai-managed-services` GCP project. No third-party email vendor.

## What ships in code

- `scripts/adapters/email_adapter.py` — POSTs plaintext subject + body
  to the AppInt executeIntegration URL. Plaintext-only (AppInt Send
  Email constraint).
- `scripts/api_server.py` `/api/v1/auth/login` — calls the adapter
  with a brand-voice plaintext magic-link body.
- `scripts/adapters/email_adapter.py::magic_link_email_body` — returns
  plaintext only (HTML branch removed; AppInt does not support HTML).

The Firebase Function path (`firebase-functions/send-email/`) is
sidelined per `SIDELINED-2026-05-09.md`. Code preserved on disk; not
called.

## Owner steps to publish the integration

### 1. Create the integration

1. Open the [Application Integration page](https://console.cloud.google.com/integrations) in `ai-managed-services`.
2. Click **Integrations** → **Create integration**.
   - Name: `coastal-send-email`
   - Description: `Coastal Brewing Co. transactional email sender`
   - Region: pick the same region as coastal-runner (us-central1
     recommended for parity with the canonical FOAI Cloud Run footprint)
   - Service account: select / create one with the role
     `roles/integrations.integrationInvoker` (used to mint the bearer
     token the runner sends — see step 3).
3. Click **Create**. The integration editor opens.

### 2. Wire the integration

Add three integration variables (left rail → **Variables** → **+**):

| Variable | Type | Schema |
|---|---|---|
| `recipient_email` | String | input |
| `email_subject`   | String | input |
| `email_body`      | String | input |

Add an **API Trigger** (Triggers → API Trigger). Note the
trigger ID it generates (looks like `api_trigger/coastal-send-email_API_1`).

Drop a **Send Email** task on the canvas and wire:

- `Recipients` → `$recipient_email$`
- `Subject` → `$email_subject$`
- `Body` → `$email_body$`

Connect the API Trigger → Send Email task with an edge.

Click **Publish**.

### 3. Get the executeIntegration URL + auth

After publish, the integration's API trigger is callable at:

```
https://<REGION>-integrations.googleapis.com/v2/projects/ai-managed-services/locations/<REGION>/integrations/coastal-send-email:execute
```

(Replace `<REGION>` with the region picked in step 1.)

For auth, the simplest path from coastal-runner (off-GCP, on aims-vps):

1. In GCP IAM, create a service account (e.g. `coastal-runner-emailer@ai-managed-services.iam.gserviceaccount.com`).
2. Grant it `roles/integrations.integrationInvoker` on the project.
3. Download a JSON key for the service account.
4. On aims-vps, mint a short-lived OAuth access token from the JSON
   key (a small sidecar script using `google-auth` library can refresh
   this hourly into the runner's env, or the runner library itself
   can refresh on call).

Owner picks one:
- **Sidecar token refresh**: simpler, runs hourly cron on aims-vps,
  writes refreshed token to a file the runner reads.
- **In-process refresh**: pull `google-auth` into the runner image,
  read the JSON key from a mounted secret, refresh on-demand.

Either way, the resulting bearer token lands in the env var
`COASTAL_APPINT_AUTH_TOKEN` the runner adapter expects.

### 4. Set runner env on aims-vps

Add to `/docker/coastal-brewing/.env` (or compose env block):

```
COASTAL_APPINT_EMAIL_URL=https://<REGION>-integrations.googleapis.com/v2/projects/ai-managed-services/locations/<REGION>/integrations/coastal-send-email:execute
COASTAL_APPINT_AUTH_TOKEN=<bearer token from step 3>
COASTAL_EMAIL_FROM=Coastal Brewing Co. <coastal@brewing.foai.cloud>
```

Recreate the container:

```bash
ssh aims-vps
docker compose -f /docker/coastal-brewing/compose.yml up -d coastal-runner
docker exec coastal-runner sh -c 'echo $COASTAL_APPINT_EMAIL_URL'
```

### 5. Smoke test

```
POST /api/v1/auth/login   {"email":"<a real address you can read>"}
```

Expected: `{ok:true, sent:true}` (no inline `magic_link` field — that
only appears when the env is unset). Email lands in inbox within
seconds with subject "Pull up to the counter — your Coastal sign-in
link" and a plaintext body containing the link.

If the email doesn't arrive: check **Integration execution logs** in
the AppInt console (left rail → **Execution logs**) for the failed run.

## Constraints inherited from AppInt Send Email

- **Plaintext only.** No HTML body. Branded HTML emails (welcome card
  share, order confirmation, ship notification) need a layered path
  later — candidates: Workspace SMTP relay, Gmail API service
  account.
- **30 recipients max per call.** Not relevant to magic-link
  (1-to-1), but a constraint if we ever add a digest broadcast.
- **AppInt pricing per execution.** Free tier covers launch volume;
  watch this if signups exceed ~10k/month.

## Future: HTML-templated email

When ready, layer Gmail API service-account send (or Workspace SMTP
relay) for HTML templates. Keep the AppInt path for plaintext flows
(magic-link, security alerts, internal owner pings). Don't replace it.
