#!/usr/bin/env bash
# per-substrate-sign.sh
# =====================
# Per-substrate Vault signing per v1.6 §3.1. Each substrate's build
# artifact is signed by a distinct KMS key so compromise of any single
# signing key cannot contaminate the others.
#
# The signing facade lives at runtime/vault-signer/ and wraps GCP
# Cloud KMS behind a Vault-compatible HTTP interface. Workload Identity
# provides the auth token — no static secrets.
#
# Usage (Cloud Build):
#   VAULT_SIGN_ENDPOINT=https://vault-signer-<hash>-uc.a.run.app \
#   bash scripts/per-substrate-sign.sh
#
# Usage (local dev, still exercising the pipeline without a deployed
# sidecar):
#   bash scripts/per-substrate-sign.sh --dry-run
#
# Auth:
#   The script mints a Google ID token via the GCP metadata server
#   (available on Cloud Build, Cloud Run, and local gcloud-authenticated
#   workstations). The token's audience is set to the sidecar URL.
#   Sidecar validates audience + service-account email against its
#   allowlist before touching KMS.

set -eu

cd "$(dirname "$0")/.."   # chicken-hawk/shield-policy

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then DRY_RUN=1; fi

TARGETS=(
    "x86_64-unknown-linux-gnu"
    "aarch64-apple-darwin"
    "wasm32-unknown-unknown"
)

echo "=== Per-substrate Vault signing ==="

# ID token fetch helper. Tries two paths:
#   1. GCP metadata server (Cloud Build / Cloud Run / GCE)
#   2. gcloud auth print-identity-token (local workstations with gcloud ADC)
fetch_id_token() {
    local audience="$1"

    if token=$(curl -sf \
            -H "Metadata-Flavor: Google" \
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${audience}" \
            2>/dev/null); then
        echo "$token"
        return 0
    fi

    if command -v gcloud >/dev/null 2>&1; then
        if token=$(gcloud auth print-identity-token \
                --audiences="${audience}" 2>/dev/null); then
            echo "$token"
            return 0
        fi
    fi

    return 1
}

for t in "${TARGETS[@]}"; do
    artifact=$(find "target/$t/release/" -name "*.rlib" -type f 2>/dev/null | head -1)
    if [ -z "$artifact" ]; then
        echo "  [skip] $t - no release artifact (run cargo build --release --target $t first)"
        continue
    fi
    hash=$(sha256sum "$artifact" 2>/dev/null | cut -d' ' -f1)

    if [ "$DRY_RUN" -eq 1 ]; then
        # Deterministic placeholder signature so CI pipelines can
        # exercise the full flow without the sidecar being live.
        # NEVER used in production paths — gated on --dry-run flag.
        placeholder_sig=$(echo -n "$t:$hash" | sha256sum | cut -d' ' -f1 | head -c 32)
        echo "  $t:"
        echo "    artifact:     $(basename "$artifact")"
        echo "    sha256:       ${hash:0:16}..."
        echo "    signature:    [DRY-RUN] $placeholder_sig..."
        echo "    signer_key:   [DRY-RUN] dryrun-key-for-${t}"
        continue
    fi

    if [ -z "${VAULT_SIGN_ENDPOINT:-}" ]; then
        echo "  [error] VAULT_SIGN_ENDPOINT required in production mode"
        echo "          (Cloud Run service URL of the vault-signer)"
        exit 1
    fi

    id_token=$(fetch_id_token "${VAULT_SIGN_ENDPOINT}") || {
        echo "  [error] could not mint GCP ID token."
        echo "          On Cloud Build: the metadata server should work."
        echo "          Locally: run 'gcloud auth login --update-adc' first."
        exit 1
    }

    resp=$(curl -sf \
        -H "Authorization: Bearer ${id_token}" \
        -H "Content-Type: application/json" \
        -d "{\"substrate\":\"$t\",\"artifact_sha256\":\"$hash\"}" \
        "${VAULT_SIGN_ENDPOINT}/sign")
    echo "  $t: signed"
    echo "    $resp"
done

echo ""
if [ "$DRY_RUN" -eq 1 ]; then
    echo "DRY-RUN complete. Placeholder signatures produced."
    echo "Remove --dry-run and set VAULT_SIGN_ENDPOINT to the deployed"
    echo "vault-signer Cloud Run URL for real signing."
fi
