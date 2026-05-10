# Hermes Agent — Operator Runbook (Wave 1 Step C, Path 1)

Hermes Agent runs on aims-vps as the owner's **inbound chat command surface**.
Owner messages Hermes via Telegram → Hermes calls chicken-hawk's `/run`,
`/check`, `/audit/{id}` tools → Hermes replies on the same channel.

This is the operational complement to the chicken-hawk-side notifier
stub (PR #313). Magic-link login stays on direct Telegram and is
unaffected by anything in this runbook.

---

## What's deployed

- **Image:** `hermes-agent:9be83728` (built locally from
  `github.com/NousResearch/hermes-agent` at SHA
  `9be83728a67c794daa20c553919f4869675a2edc`)
- **Container:** `hermes` on `foai-internal` Docker bridge
- **Volumes:** `hermes-data:/opt/data` for persistent state, channel
  credentials, conversation history
- **Ports (host-internal only):**
  - `127.0.0.1:9119` — OpenAI-compatible API server (auth via
    `HERMES_API_SERVER_KEY`)
  - `127.0.0.1:9118` — Dashboard (SSH tunnel only)

---

## Pre-deploy environment vars (aims-vps `~/foai/coastal-brewing/.env`)

```bash
# Required
HERMES_API_SERVER_KEY=<32-byte hex — generate fresh per-deployment>
CHICKEN_HAWK_BEARER=<existing chicken-hawk inter-service bearer>
OPENROUTER_API_KEY=<existing>

# Telegram (already set for Coastal magic-link)
TELEGRAM_BOT_TOKEN=<existing>
TELEGRAM_CHAT_ID=<owner's chat id>
```

Generate the API server key:
```bash
openssl rand -hex 32
```

---

## First-time deploy on aims-vps

```bash
ssh aims-vps
cd ~/foai/coastal-brewing

# Confirm env
grep HERMES_API_SERVER_KEY .env
grep CHICKEN_HAWK_BEARER .env

# Build (pulls upstream at pinned SHA, ~3-5 min)
docker compose build hermes

# Start
docker compose up -d hermes

# Watch startup
docker logs hermes --tail 50 -f
# Look for: "gateway started" and "API server listening on 0.0.0.0:9119"
```

---

## Register Telegram channel (interactive — one-time)

Hermes uses an interactive setup CLI for channel credentials. Run inside
the container:

```bash
docker exec -it hermes hermes gateway setup
```

Follow the prompts:
1. Choose **Telegram** as the platform
2. Paste the existing `TELEGRAM_BOT_TOKEN` value when asked
3. Allowlist the owner's Telegram user ID
4. Confirm — Hermes writes channel config to `/opt/data/config/`

Verify:
```bash
docker exec hermes hermes gateway status
# expect: "telegram: connected" line
```

---

## Register chicken-hawk tools

Hermes' tool registration is also via the setup CLI. Add three tools:

```bash
docker exec -it hermes hermes tools add
```

For each tool:

### Tool 1: chicken-hawk-run
- Name: `chicken_hawk_run`
- Description: `Dispatch an action through Chicken Hawk gateway. Returns 200 on allow, 202 on escalate (owner approval pending), 403 on deny.`
- Method: `POST`
- URL: `${CHICKEN_HAWK_BASE_URL}/run`
- Headers: `Authorization: Bearer ${CHICKEN_HAWK_BEARER}`
- Body schema: `{action: string, payload: object}`

### Tool 2: chicken-hawk-check
- Name: `chicken_hawk_check`
- Description: `Get NemoClaw policy verdict for a proposed action without dispatching.`
- Method: `POST`
- URL: `${CHICKEN_HAWK_BASE_URL}/check`
- Headers: `Authorization: Bearer ${CHICKEN_HAWK_BEARER}`
- Body schema: `{action_type: string, risk_tags: string[]}`

### Tool 3: chicken-hawk-audit
- Name: `chicken_hawk_audit`
- Description: `Fetch the audit ledger entries for a given task_id. Returns receipts in chronological order.`
- Method: `GET`
- URL: `${CHICKEN_HAWK_BASE_URL}/audit/{task_id}`
- Headers: `Authorization: Bearer ${CHICKEN_HAWK_BEARER}`

Verify:
```bash
docker exec hermes hermes tools list
# expect: chicken_hawk_run, chicken_hawk_check, chicken_hawk_audit
```

---

## Verification (V0–V5 from Step C scope)

```bash
# (V0) maturity already verified pre-deploy: 118,058★ MIT, pushed 2026-04-26

# (V1) container healthy
docker compose ps hermes | grep healthy

# (V2) DM the Telegram bot from your phone with "hello"
# expect: reply within 10s

# (V3) DM "what's the audit trail for task abc-123"
# expect: Hermes calls chicken_hawk_audit("abc-123") → reply with receipts

# (V4) DM "run recommend_bundle for coffee"
# expect: Hermes calls chicken_hawk_run({action:"recommend_bundle", payload:{category:"coffee"}})
#   → 200 (allow), 202 (escalate), or 403 (deny). Verdict shown in reply.

# (V5) magic-link login still works (regression sanity)
curl -i -X POST https://hawk.foai.cloud/login -d 'email=asg@achievemor.io'
# expect: 200 + Telegram message arrives via direct path (not through Hermes)
```

---

## nginx route at `hermes.foai.cloud` (optional — for remote API access)

Wave 1 default: localhost-only API access on aims-vps. If you want to
hit the API from outside (e.g. for testing tool calls without going
through Telegram), add an nginx route with mTLS:

```nginx
# /etc/nginx/sites-enabled/hermes.foai.cloud.conf
server {
    listen 443 ssl;
    server_name hermes.foai.cloud;
    ssl_certificate /etc/letsencrypt/live/hermes.foai.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hermes.foai.cloud/privkey.pem;

    # mTLS — only operator client cert allowed
    ssl_client_certificate /etc/nginx/client-ca.crt;
    ssl_verify_client on;

    location / {
        proxy_pass http://127.0.0.1:9119;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

DNS: A-record `hermes.foai.cloud` → aims-vps IP at Hostinger.

---

## Rollback

See `~/foai/chicken-hawk/scripts/rollback-hermes.md` (Path 1: stop the
Hermes container; magic-link login is unaffected).

---

## Adding more channels (Wave 1.5)

Owner re-runs `docker exec -it hermes hermes gateway setup` and adds:
Slack, Discord, WhatsApp, Signal, SMS (Twilio), Email (IMAP/SMTP),
Mattermost, Matrix, etc. Each writes its own credentials to
`/opt/data/config/` — no compose redeploy needed.

The chicken-hawk tools (`chicken_hawk_run`, `_check`, `_audit`) work
across every channel without re-registration. Tools are channel-agnostic.
