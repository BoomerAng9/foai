# vault-signer

GCP Cloud KMS signing facade for ACHIEVEMOR `shield-policy` per-substrate attestation. Exposes the Vault-compatible HTTP interface that `chicken-hawk/shield-policy/scripts/per-substrate-sign.sh` expects, backed by GCP Cloud KMS + Workload Identity auth (no static secrets).

## Why this exists

Per v1.6 §3.1 the Shield Division policy kernel ships across three substrates (x86_64-linux, arm64-darwin, wasm32). Each substrate's build artifact must be signed by an **independent** key so a single-signer compromise cannot cascade across substrates — that's the Byzantine resilience argument. `shield-policy` cannot trust its own build pipeline to sign itself, so the signing step is offloaded to a minimal sidecar (this service) that runs under an isolated IAM identity and only exposes a narrow `/sign` endpoint.

## Architecture

```
Cloud Build  ──POST /sign──>  vault-signer (Cloud Run)  ──KMS AsymmetricSign──>  GCP KMS
  │             (ID token                                                          │
  │              Bearer)                                                           │
  │                                                                                │
  └────────────────── metadata.google.internal/identity?audience=<sidecar-url> ────┘
```

- **Auth**: caller's Google-signed ID token validated against the sidecar's Cloud Run URL audience + an explicit email allowlist.
- **Keys**: one `EC_SIGN_P256_SHA256` key per substrate (`shield-x86-64-linux`, `shield-arm64-darwin`, `shield-wasm32`) in the `shield-policy` keyring.
- **Rotation**: automatic every 90 days. The sidecar always signs against the current primary `cryptoKeyVersion`.
- **Ingress**: `internal-and-cloud-load-balancing` — no public internet reach.

## Files

```
runtime/vault-signer/
├── pyproject.toml            # deps pinned to 2026-04-19 freshness pass
├── Dockerfile                # multi-stage python:3.12-slim, non-root
├── service.yaml              # Cloud Run service definition
├── cloudbuild.yaml           # verify-only by default; _DEPLOY=yes to push
├── scripts/
│   └── provision-kms-keys.sh # idempotent gcloud — keyring + 3 keys + IAM
├── src/vault_signer/
│   ├── main.py               # FastAPI app + Pydantic models
│   ├── auth.py               # Workload Identity ID-token validator
│   └── kms.py                # Cloud KMS signing wrapper
└── tests/
    ├── test_auth.py          # 11 tests — every auth failure mode
    └── test_sign.py          # 13 tests — endpoint happy path + edge cases
```

## HTTP interface

### `POST /sign`

**Request**
```http
POST /sign HTTP/1.1
Authorization: Bearer <Google ID token>
Content-Type: application/json

{
  "substrate": "x86_64-unknown-linux-gnu",
  "artifact_sha256": "a1b2c3...64chars"
}
```

**Response (200)**
```json
{
  "signature": "<base64-encoded signature bytes>",
  "signer_key_id": "projects/foai-aims/locations/us-central1/keyRings/shield-policy/cryptoKeys/shield-x86-64-linux/cryptoKeyVersions/1",
  "signed_at_unix": 1745073600
}
```

**Error codes**
- `400` — unknown substrate or malformed `artifact_sha256` (not 64 lowercase hex).
- `401` — missing / invalid / unauthorized caller token.
- `500` — KMS upstream failure (visible in logs, opaque to caller).

### `GET /health`

Returns `{"status": "ok"}`. Used by Cloud Run startup + liveness probes.

## Deploy

**Prerequisites (one-time, owner action)**

1. [Install the Cloud Build GitHub App](https://github.com/apps/google-cloud-build/installations/new) for `BoomerAng9/foai` — same app as [#248 CLOUD_BUILD.md](../../chicken-hawk/shield-policy/CLOUD_BUILD.md). This is **Priority 2** from the session handoff and blocks every CI-gated deploy.

2. Run the provisioning script (creates keyring, keys, service account, IAM bindings):
   ```bash
   runtime/vault-signer/scripts/provision-kms-keys.sh
   ```

3. Create the Artifact Registry repo:
   ```bash
   gcloud artifacts repositories create vault-signer \
     --project=foai-aims --location=us-central1 --repository-format=docker
   ```

4. Create the Cloud Build triggers:
   ```bash
   gcloud builds triggers create github \
     --name=vault-signer-verify \
     --project=foai-aims --region=us-central1 \
     --repo-name=foai --repo-owner=BoomerAng9 \
     --pull-request-pattern=".*" \
     --build-config=runtime/vault-signer/cloudbuild.yaml \
     --included-files="runtime/vault-signer/**"

   gcloud builds triggers create github \
     --name=vault-signer-deploy \
     --project=foai-aims --region=us-central1 \
     --repo-name=foai --repo-owner=BoomerAng9 \
     --branch-pattern="^main$" \
     --build-config=runtime/vault-signer/cloudbuild.yaml \
     --included-files="runtime/vault-signer/**" \
     --substitutions=_DEPLOY=yes
   ```

5. First deploy hydrates the `VAULT_SIGNER_AUDIENCE` env var. After the Cloud Run service exists, update `service.yaml` with the real URL and redeploy:
   ```bash
   URL=$(gcloud run services describe vault-signer \
     --region=us-central1 --project=foai-aims --format='value(status.url)')
   sed -i "s|https://vault-signer-REPLACE-WITH-HASH-uc.a.run.app|${URL}|" \
     runtime/vault-signer/service.yaml
   ```

## Local development

```bash
cd runtime/vault-signer
pip install -e .[dev]
pytest -v                     # 23 passing + 1 skipped (live GCP)

# Run the service locally (uses real GCP ADC for KMS):
export VAULT_SIGNER_AUDIENCE=http://localhost:8080
export VAULT_SIGNER_ALLOWED_CALLERS=$(gcloud config get-value account)
export VAULT_SIGNER_GCP_PROJECT=foai-aims
export VAULT_SIGNER_GCP_LOCATION=us-central1
export VAULT_SIGNER_GCP_KEYRING=shield-policy
uvicorn vault_signer.main:app --reload
```

The integration test `test_live_kms_signing` runs against real KMS when `GOOGLE_APPLICATION_CREDENTIALS` is set — use it to sanity-check provisioning before the Cloud Build trigger fires for the first time.

## Security posture

- **No static secrets in the repo or the container**. All auth is via Google-signed ID tokens validated at request time.
- **Non-root container**. `vault:10001` user in a stripped `python:3.12-slim` base.
- **Narrow IAM**: the `vault-signer` service account gets `roles/cloudkms.signer` on three specific keys, nothing else. No project-wide KMS admin.
- **Internal ingress only**. Cloud Run `internal-and-cloud-load-balancing` blocks public internet access.
- **Cloud Run invoker IAM** is the outer gate; the in-band ID-token check is defense-in-depth.

## Relationship to other components

- **shield-policy kernel** (`chicken-hawk/shield-policy/`): the artifact whose `.rlib` is signed.
- **per-substrate-sign.sh** (`chicken-hawk/shield-policy/scripts/`): caller of this sidecar. Mints ID tokens via the GCP metadata server.
- **shield-policy-wire** ([#255](https://github.com/BoomerAng9/foai/pull/255)): unrelated — that's protobuf wire-format for runtime policy enforcement; this is build-time artifact signing.
- **Phoenix Protocol** (`shield-policy/src/phoenix.rs`): v1.6 §5 references "Vault" as Lil_Salt_Hawk and depends on the signed golden-image attestation this sidecar produces.

## Not included in this PR

- Actual Cloud Run deployment (gated on Priority 2 — Cloud Build GitHub App install).
- Cosign / Sigstore equivalents for signature distribution (separate effort).
- Key rotation automation beyond KMS's built-in 90-day rotation (adequate for v1 posture).
- Cross-region replication (single-region foai-aims/us-central1 is sufficient at launch scale).
