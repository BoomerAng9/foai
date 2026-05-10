# spinner-policy

Cloud Run Rust sidecar wrapping `shield_policy::validate()` behind a Vault-compatible HTTP interface. Phase B of the P0 rewrite plan ([`runtime/spinner/RUST_REWRITE_PLAN.md`](../spinner/RUST_REWRITE_PLAN.md)).

## What it does

```
Python Spinner  ──POST /validate──>  spinner-policy (Cloud Run)
                   wire bytes ↓
                               prost decode
                               OwnedInvocation::try_from_wire
                               shield_policy::validate(&inv.as_borrowed())
                   wire bytes ↑
                   Decision { Pass | Deny }
```

Stateless. No database, no external dependencies beyond the kernel + wire crate. One `validate()` call per HTTP request.

Quorum logic (2-of-3 substrate consensus per v1.6 §3.1) **lives in the dispatcher, not here**. This sidecar is one of three independent validators; the Python Spinner fires 3 parallel requests and aggregates.

## HTTP interface

### `POST /validate`

**Request**
- Content-Type: `application/octet-stream`
- Body: prost-encoded `deploy.spinner.shield.v1.Invocation`
- Max body: 16 KB

**Response**
- **200** — body is prost-encoded `Decision` (either `Pass {}` or `Deny { Denial }`).
- **400** — malformed prost bytes OR wire conversion error (Unspecified enum, missing required field).
- **413** — body exceeds 16 KB.

### `GET /health`

Returns `ok\n`. Cloud Run startup + liveness probes.

## Layout

```
runtime/spinner-policy/
├── Cargo.toml           # prost + axum + tokio + tower, all exact-pinned
├── Dockerfile           # rust:1-bookworm build → distroless/cc-debian12:nonroot runtime
├── service.yaml         # Cloud Run: minScale=1 (warm instance per tool-call cadence)
├── cloudbuild.yaml      # verify on PR; _DEPLOY=yes pushes + replaces on main
├── src/
│   ├── lib.rs           # Router construction + handle_validate
│   └── main.rs          # Cloud Run entry point + tracing setup + graceful shutdown
└── tests/
    └── http.rs          # 7 integration tests via tower::ServiceExt (no network)
```

## Per-substrate deploy (v1.6 §3.1)

Three Cloud Run services will run this codebase, one per substrate, with independent IAM identities + Vault-signed image attestations (#257):

| Substrate | Cloud Run service | Dockerfile args |
|---|---|---|
| `x86_64-unknown-linux-gnu` | `spinner-policy` (this yaml) | default |
| `aarch64-apple-darwin` | `spinner-policy-arm64` | `docker buildx --platform linux/arm64` |
| `wasm32-unknown-unknown` | deferred | wasmtime runtime layer needed |

The Python dispatcher (Spinner) fires 3 parallel POST /validate calls, one per substrate, and requires 2-of-3 agreement before dispatching a tool call. Single-substrate PR to start; the arm64 + wasm32 services are deferred follow-ups.

## Deploy (gated on Priority 2)

1. Install [Cloud Build GitHub App](https://github.com/apps/google-cloud-build/installations/new) for `BoomerAng9/foai`.
2. Create Artifact Registry repo:
   ```bash
   gcloud artifacts repositories create spinner-policy \
     --project=foai-aims --location=us-central1 --repository-format=docker
   ```
3. Create service account with no extra IAM (sidecar needs nothing beyond the default runtime service account):
   ```bash
   gcloud iam service-accounts create spinner-policy \
     --project=foai-aims \
     --display-name="Spinner Policy sidecar"
   ```
4. Create triggers:
   ```bash
   gcloud builds triggers create github \
     --name=spinner-policy-verify \
     --project=foai-aims --region=us-central1 \
     --repo-name=foai --repo-owner=BoomerAng9 \
     --pull-request-pattern=".*" \
     --build-config=runtime/spinner-policy/cloudbuild.yaml \
     --included-files="runtime/spinner-policy/**,chicken-hawk/shield-policy/**,chicken-hawk/shield-policy-wire/**,runtime/spinner/schema/**"

   gcloud builds triggers create github \
     --name=spinner-policy-deploy \
     --project=foai-aims --region=us-central1 \
     --repo-name=foai --repo-owner=BoomerAng9 \
     --branch-pattern="^main$" \
     --build-config=runtime/spinner-policy/cloudbuild.yaml \
     --included-files="runtime/spinner-policy/**,chicken-hawk/shield-policy/**,chicken-hawk/shield-policy-wire/**,runtime/spinner/schema/**" \
     --substitutions=_DEPLOY=yes
   ```
5. After first deploy, grant `roles/run.invoker` to the Spinner caller:
   ```bash
   gcloud run services add-iam-policy-binding spinner-policy \
     --region=us-central1 --project=foai-aims \
     --member=serviceAccount:<spinner-caller-sa> \
     --role=roles/run.invoker
   ```

## Local development

```bash
cd runtime/spinner-policy
cargo test --all-targets     # 7 HTTP tests (needs Linux or MinGW on Windows)
cargo check --all-targets    # type-checks anywhere including bare Windows
cargo run                    # binds 127.0.0.1:8080, reads RUST_LOG env

# From another shell:
cargo install prost-codec-cli   # or use shield-policy-wire's test fixtures
curl -X POST -H "Content-Type: application/octet-stream" \
  --data-binary @../spinner/tests/fixtures/invocation.bin \
  http://localhost:8080/validate | xxd
```

## What's NOT in this PR

- Python Spinner wired to call the sidecar. Spinner's Python FastAPI code is not in this repo today (stashed on myclaw-vps per the P0 plan); wiring happens when that consolidates.
- arm64-darwin + wasm32 Cloud Run services. Single-substrate first; multi-substrate in a follow-up.
- 2-of-3 quorum dispatcher logic. Lives in Spinner (next phase) or the Rust replacement (Phase C).
- Actual Cloud Run deploy. Gated on Priority 2 (GitHub App install).
- Vault-signed image attestation integration. The sidecar container image should be signed by vault-signer (#257) before production deploy — add a cloudbuild step once both PRs merge.

## Relationship to other components

- **`chicken-hawk/shield-policy/`** — the kernel crate this sidecar wraps. Depends on it via path dep.
- **`chicken-hawk/shield-policy-wire/`** ([#255](https://github.com/BoomerAng9/foai/pull/255)) — wire format + OwnedInvocation conversion. Required for this PR; stacked.
- **`runtime/vault-signer/`** ([#257](https://github.com/BoomerAng9/foai/pull/257)) — signs this sidecar's container image per substrate. Independent but collaborates at deploy time.
- **`runtime/spinner/`** — the Python Spinner dispatcher that will call this sidecar. Wiring deferred.
