#!/usr/bin/env bash
# Provision the Cloud KMS keyring + per-substrate signing keys.
#
# Idempotent: safe to re-run. Skips creation of resources that already
# exist. Run once per project as part of initial deploy, and re-run if
# a new substrate is added to the shield-policy target list.
#
# Prerequisites:
#   - gcloud authenticated with an account that has cloudkms.admin + iam.admin
#     on foai-aims.
#   - $PROJECT env var (default: foai-aims)
#   - $LOCATION env var (default: us-central1)
#
# Usage:
#   runtime/vault-signer/scripts/provision-kms-keys.sh
#
# What it creates:
#   - KeyRing: shield-policy
#   - CryptoKey: shield-x86-64-linux  (EC_SIGN_P256_SHA256, 90d rotation)
#   - CryptoKey: shield-arm64-darwin  (same algorithm)
#   - CryptoKey: shield-wasm32        (same algorithm)
#   - IAM binding: vault-signer@<project> gets cloudkms.signer on each key.
#
# Per v1.6 §3.1 each substrate has an independent key so compromise of
# one signer cannot cascade. Rotation is automatic every 90 days via
# KMS itself; the facade sidecar always signs against the current
# primary cryptoKeyVersion.

set -euo pipefail

PROJECT="${PROJECT:-foai-aims}"
LOCATION="${LOCATION:-us-central1}"
KEYRING="${KEYRING:-shield-policy}"
SIGNER_SA="vault-signer@${PROJECT}.iam.gserviceaccount.com"

# Canonical substrates must match kms.py::_SUBSTRATE_KEY_NAMES exactly.
declare -A SUBSTRATE_KEYS=(
    ["x86_64-unknown-linux-gnu"]="shield-x86-64-linux"
    ["aarch64-apple-darwin"]="shield-arm64-darwin"
    ["wasm32-unknown-unknown"]="shield-wasm32"
)

echo "Provisioning KMS for project=${PROJECT} location=${LOCATION}"

# ── Step 1: service account ─────────────────────────────────────────
if ! gcloud iam service-accounts describe "${SIGNER_SA}" \
        --project="${PROJECT}" >/dev/null 2>&1; then
    echo "Creating service account ${SIGNER_SA}"
    gcloud iam service-accounts create vault-signer \
        --project="${PROJECT}" \
        --display-name="Vault Signer (shield-policy per-substrate signing)"
else
    echo "Service account ${SIGNER_SA} already exists — skipping create"
fi

# ── Step 2: keyring ─────────────────────────────────────────────────
if ! gcloud kms keyrings describe "${KEYRING}" \
        --project="${PROJECT}" \
        --location="${LOCATION}" >/dev/null 2>&1; then
    echo "Creating keyring ${KEYRING}"
    gcloud kms keyrings create "${KEYRING}" \
        --project="${PROJECT}" \
        --location="${LOCATION}"
else
    echo "Keyring ${KEYRING} already exists — skipping create"
fi

# ── Step 3: per-substrate keys ──────────────────────────────────────
for substrate in "${!SUBSTRATE_KEYS[@]}"; do
    key_name="${SUBSTRATE_KEYS[$substrate]}"
    if ! gcloud kms keys describe "${key_name}" \
            --project="${PROJECT}" \
            --location="${LOCATION}" \
            --keyring="${KEYRING}" >/dev/null 2>&1; then
        echo "Creating key ${key_name} for substrate ${substrate}"
        gcloud kms keys create "${key_name}" \
            --project="${PROJECT}" \
            --location="${LOCATION}" \
            --keyring="${KEYRING}" \
            --purpose=asymmetric-signing \
            --default-algorithm=ec-sign-p256-sha256 \
            --rotation-period=90d \
            --next-rotation-time="$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
                || date -u -v+90d +%Y-%m-%dT%H:%M:%SZ)"
    else
        echo "Key ${key_name} already exists — skipping create"
    fi

    # Grant the sidecar service account signer role on the specific
    # key. Least-privilege: no project-level KMS admin needed.
    gcloud kms keys add-iam-policy-binding "${key_name}" \
        --project="${PROJECT}" \
        --location="${LOCATION}" \
        --keyring="${KEYRING}" \
        --member="serviceAccount:${SIGNER_SA}" \
        --role="roles/cloudkms.signer" \
        --quiet >/dev/null
    echo "  bound roles/cloudkms.signer → ${SIGNER_SA}"
done

echo ""
echo "Provisioning complete. Verify with:"
echo "  gcloud kms keys list --project=${PROJECT} --location=${LOCATION} --keyring=${KEYRING}"
