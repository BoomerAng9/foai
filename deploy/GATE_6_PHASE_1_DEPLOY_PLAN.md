# Gate 6 — Phase-1 Production Deploy Plan

Operational runbook for shipping the Gate 1a/1b fixes into production
Cloud Run on `foai-aims`. Read top-to-bottom before executing.

## Scope

Phase-1 deploys two services whose code already landed on `main`:

| Service | PR | What changed |
|---------|----|--------------|
| `voice-gateway` | #210 | JWT-mint ephemeral Inworld credentials (replaces the root-key leak stub) |
| `ttd-dr` | #195 | FastAPI deep-research service with HMAC auth |

**Explicitly deferred to Phase-2** (configs NOT shipped here):
- `spinner` service — only `rate_limit.py` is in-repo; the rest of the
  service (`main.py` / `auth.py` / `auth_verify.py` / `mesh_auth.py` /
  `policy.py` / `audit.py` / `classifier.py`) is still on myclaw-vps
  per `runtime/spinner/README.md`. Deploy config will land with the
  full service migration.

## Pre-flight

### 1. Verify the three unblocking PRs are on main

```bash
git log --oneline origin/main | grep -E '#(210|212|213)'
# Expected: #210 voice-gateway JWT, #212 spinner Redis, #213 Stripe carveout
```

### 2. Required GCP Secret Manager entries

Create any missing secrets before running the deploy script. The
script fails fast if a secret is absent.

| Secret | Purpose | How to create |
|--------|---------|---------------|
| `voice-gateway-inworld-jwt-secret` | Signs ephemeral JWTs for Inworld Realtime WS | `gcloud secrets create ... --replication-policy=automatic; gcloud secrets versions add ...` |
| `voice-gateway-inworld-workspace-id` | Inworld workspace the JWTs are bound to | same pattern |
| `voice-gateway-groq-key` | Groq Whisper STT API key | same pattern |
| `ttd-dr-hmac-secret` | Shared HMAC between TTD-DR callers and the service | `openssl rand -hex 32 \| gcloud secrets versions add ttd-dr-hmac-secret --data-file=-` |

### 3. Required Artifact Registry repos

```bash
gcloud artifacts repositories create voice-gateway \
  --repository-format=docker --location=us-central1 --project=foai-aims
gcloud artifacts repositories create ttd-dr \
  --repository-format=docker --location=us-central1 --project=foai-aims
```

### 4. Upstash Redis provisioned (for Spinner Phase-2 pre-req)

Phase-2 Spinner deploy will expect `REDIS_URL` wired via Secret Manager.
Create the Upstash database now so it's ready when Spinner service code
lands. The rate-limit behavior falls back to in-process dict if
`REDIS_URL` is absent, so *Phase-1 is not blocked by this*.

## Deploy order + commands

The deploy is split into two Cloud Run services. Order does not matter
technically (they're independent), but the wrapper script deploys
`voice-gateway` first because it's the more-exercised surface.

```bash
# Dry-run first — prints every gcloud call without executing:
./deploy/phase-1-deploy.sh --dry-run

# Real run (prompts for confirmation between each service):
./deploy/phase-1-deploy.sh

# Single service:
./deploy/phase-1-deploy.sh --service=voice-gateway
./deploy/phase-1-deploy.sh --service=ttd-dr
```

Each step prints the underlying `gcloud builds submit` so nothing is
hidden. The script never runs unattended — every service gates on a
`y/N` prompt.

## Post-deploy verification

### voice-gateway (public `--allow-unauthenticated`)

```bash
URL=$(gcloud run services describe voice-gateway \
  --region=us-central1 --project=foai-aims --format='value(status.url)')
curl --fail "$URL/health"
# Expected: 200 OK { "status": "healthy", ... }
```

### ttd-dr (auth-required `--no-allow-unauthenticated`)

```bash
URL=$(gcloud run services describe ttd-dr \
  --region=us-central1 --project=foai-aims --format='value(status.url)')
curl -o /dev/null -w '%{http_code}\n' "$URL/health"
# Expected: 401 (service is up, auth is enforced)
```

## Rollback

Cloud Run retains prior revisions indefinitely. Rollback is a traffic
shift, not a redeploy.

```bash
# List revisions:
gcloud run revisions list --service=voice-gateway \
  --region=us-central1 --project=foai-aims

# Shift 100% traffic back to the previous revision:
gcloud run services update-traffic voice-gateway \
  --to-revisions=<previous-revision>=100 \
  --region=us-central1 --project=foai-aims
```

The wrapper script does NOT auto-rollback on health-check failure —
that decision belongs to the operator, because a 401 from ttd-dr is
*correct* and a 503 from voice-gateway might be a cold-start warmup
rather than a real failure.

## Blast-radius + risk summary

| Concern | Assessment |
|---------|-----------|
| User-facing downtime | Zero. Cloud Run uses revision cutover — new revision must pass health checks before traffic shifts. |
| Secret exposure | None. Secrets stay in Secret Manager; only attached at container boot. |
| Cost | Two Cloud Run services at `--min-instances=0` — scale-to-zero between requests. |
| Reversibility | Full. Any bad revision rolls back with one traffic-shift command. |

## Outstanding items (not in Phase-1)

- [ ] Spinner service deploy (Phase-2 — blocked on service code migration)
- [ ] Upstash Redis provisioning + `REDIS_URL` secret wiring (Phase-2)
- [ ] Hermes V1.0 deploy config (`runtime/hermes/Dockerfile` exists, cloudbuild TBD)
- [ ] Health-probe lifecycle hook wiring to `chicken-hawk/guard/scan` NemoClaw path
- [ ] Update `INFRASTRUCTURE.md` once services are live (post-deploy)

## Closing Gate 6

Phase-1 closes when:

- [ ] `voice-gateway` Cloud Run service is `Ready: True` on a revision
      built from the Gate 1a commit
- [ ] `ttd-dr` Cloud Run service is `Ready: True`
- [ ] `/health` smoke passes for both (200 for voice-gateway, 401 for ttd-dr)
- [ ] No rollback triggered within the first 10 minutes post-cutover

Phase-2 (Spinner + Hermes + NemoClaw wiring) has its own gate.
