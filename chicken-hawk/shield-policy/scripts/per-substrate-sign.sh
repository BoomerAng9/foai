#!/usr/bin/env bash
# per-substrate-sign.sh
# =====================
# Scaffold for v1.6 §3.1 per-substrate Vault signing. Vault (Lil_Salt_Hawk)
# signs each substrate's build artifact independently so a compromise
# of any single substrate-specific signing key cannot contaminate the
# others.
#
# Current state: SCAFFOLD ONLY. The actual Vault sidecar that exposes
# the HSM-backed signing endpoint is pending. This script documents
# the interface the sidecar will need to expose and provides a
# dry-run mode that produces fake signatures for dev testing.
#
# Production usage (once Vault sidecar lands):
#   VAULT_SIGN_ENDPOINT=https://vault.foai-aims.internal/sign \
#   VAULT_TOKEN=$(cat ~/.vault_token) \
#   bash scripts/per-substrate-sign.sh
#
# Dry-run usage (today):
#   bash scripts/per-substrate-sign.sh --dry-run
#
# Interface the Vault sidecar needs:
#   POST {VAULT_SIGN_ENDPOINT}/sign
#   Headers: X-Vault-Token: <token>
#   Body: { "substrate": "<triple>", "artifact_sha256": "<hex>" }
#   Returns: { "signature": "<base64>", "signer_key_id": "<uuid>",
#             "signed_at_unix": <u64> }
#
# Each substrate gets a distinct signer_key_id so rotation +
# compromise-recovery can be scoped per target.

set -eu

cd "$(dirname "$0")/.."   # chicken-hawk/shield-policy

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then DRY_RUN=1; fi

TARGETS=(
    "x86_64-unknown-linux-gnu"
    "aarch64-apple-darwin"
    "wasm32-unknown-unknown"
)

echo "═══ Per-substrate Vault signing (scaffold) ═══"

for t in "${TARGETS[@]}"; do
    artifact=$(find "target/$t/release/" -name "*.rlib" -type f 2>/dev/null | head -1)
    if [ -z "$artifact" ]; then
        echo "  [skip] $t — no release artifact (run cargo build --release --target $t first)"
        continue
    fi
    hash=$(sha256sum "$artifact" 2>/dev/null | cut -d' ' -f1)

    if [ "$DRY_RUN" -eq 1 ]; then
        # Produce a deterministic fake signature so CI tests can
        # exercise the pipeline without Vault being available.
        fake_sig=$(echo -n "$t:$hash" | sha256sum | cut -d' ' -f1 | head -c 32)
        echo "  $t:"
        echo "    artifact:     $(basename "$artifact")"
        echo "    sha256:       ${hash:0:16}..."
        echo "    signature:    [DRY-RUN] $fake_sig..."
        echo "    signer_key:   [DRY-RUN] stub-key-for-${t}"
    else
        if [ -z "${VAULT_SIGN_ENDPOINT:-}" ] || [ -z "${VAULT_TOKEN:-}" ]; then
            echo "  [error] VAULT_SIGN_ENDPOINT and VAULT_TOKEN required in production mode"
            exit 1
        fi
        resp=$(curl -sf \
            -H "X-Vault-Token: $VAULT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"substrate\":\"$t\",\"artifact_sha256\":\"$hash\"}" \
            "$VAULT_SIGN_ENDPOINT/sign")
        echo "  $t: signed by Vault"
        echo "    $resp"
    fi
done

echo ""
if [ "$DRY_RUN" -eq 1 ]; then
    echo "DRY-RUN complete. Fake signatures produced. Set "
    echo "VAULT_SIGN_ENDPOINT + VAULT_TOKEN and re-run without --dry-run"
    echo "once Vault sidecar is live."
fi
