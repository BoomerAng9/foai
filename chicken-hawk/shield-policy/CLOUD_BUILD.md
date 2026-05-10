# shield-policy — Cloud Build CI

FOAI ecosystem CI/CD standard is Cloud Build → Cloud Run (per
`~/foai/deploy/cloudbuild.yaml` as the reference pattern). This crate
follows the same convention: Cloud Build runs the verify pipeline on
every commit; Cloud Run is a future deployment target when
shield-policy graduates to an HTTP sidecar (Option B in
`runtime/spinner/shield_policy_integration.md`).

## What runs

`cloudbuild.yaml` in this directory defines 5 steps:

1. **drift-gate** — `compile-shield-policy.py --check` ensures the
   committed `generated/*.rs` matches what the YAML would produce.
2. **cargo check** — compilation across library + test + Kani targets
3. **cargo test** — 11 runtime tests
4. **scene-audit** — `build_scene_plan.py --audit-only` runs the 7
   governance-as-architecture invariants on `deployment_bay.yml`
   when the scene script is present
5. **kani-discharge** — optional, gated on `_RUN_KANI=yes`
   substitution. Installs Kani + discharges 24 proof harnesses
   (~5-7 min incremental).

Steps 1 runs first, 2-4 run in parallel after 1, 5 depends on 2.

## Trigger setup

One-time, at GCP console or via gcloud:

```bash
# Main-branch trigger (runs verify on every push to main)
gcloud builds triggers create github \
  --name=shield-policy-verify-main \
  --project=foai-aims \
  --region=us-central1 \
  --repo-name=foai \
  --repo-owner=BoomerAng9 \
  --branch-pattern="^main$" \
  --build-config=chicken-hawk/shield-policy/cloudbuild.yaml \
  --included-files="chicken-hawk/shield-policy/**,chicken-hawk/config/shield/**,chicken-hawk/config/shield_personas.yml,chicken-hawk/scripts/compile-shield-policy.py,runtime/live-look-in/scene/**"

# Pull-request trigger (runs verify on PRs that touch shield-policy)
gcloud builds triggers create github \
  --name=shield-policy-verify-pr \
  --project=foai-aims \
  --region=us-central1 \
  --repo-name=foai \
  --repo-owner=BoomerAng9 \
  --pull-request-pattern=".*" \
  --build-config=chicken-hawk/shield-policy/cloudbuild.yaml \
  --included-files="chicken-hawk/shield-policy/**,chicken-hawk/config/shield/**,chicken-hawk/config/shield_personas.yml,chicken-hawk/scripts/compile-shield-policy.py,runtime/live-look-in/scene/**"
```

## Why Cloud Build instead of GitHub Actions

The previous CI was `.github/workflows/shield-policy.yml` (landed in
#230, now deprecated). Three reasons for the switch:

1. **FOAI ecosystem standard.** Every other GCP-targeted deploy in the
   monorepo uses Cloud Build (`deploy/cloudbuild.yaml`). Consistency >
   per-surface choice.

2. **No Windows-runner drift.** PR #232 got stuck on a Windows→Linux
   line-ending subtlety on GitHub-hosted runners. Cloud Build is
   always Linux (Debian bookworm for Rust, python:3.12-slim for Python),
   so the generator's output is stable across local Windows dev and CI
   simultaneously.

3. **Tighter Cloud Run graduation path.** When shield-policy eventually
   deploys as an HTTP sidecar (per integration-doc Option B), the same
   Cloud Build pipeline extends to a `gcloud run deploy` step mirroring
   `deploy/cloudbuild.yaml`. One pipeline verifies AND deploys.

## Running locally

The Cloud Build steps are ordinary shell commands. Reproduce locally:

```bash
# drift gate
cd chicken-hawk && python scripts/compile-shield-policy.py --check

# cargo check + test
cd chicken-hawk/shield-policy && cargo check --all-targets && cargo test --lib

# scene audit
python runtime/live-look-in/scene/build_scene_plan.py --audit-only

# kani (optional, requires Kani toolchain)
cd chicken-hawk/shield-policy && cargo kani --features kani
```

No Cloud Build-specific magic — the YAML is a thin wrapper around
these commands.

## Migrating from GitHub Actions

`.github/workflows/shield-policy.yml` is removed in the same PR that
lands this `cloudbuild.yaml`. Any PRs that were testing against GHA
(notably #232, which tried to fix a line-ending drift in GHA) are
closed as superseded — Cloud Build sidesteps the problem entirely.
