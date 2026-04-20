"""Vault-compatible signing facade over GCP Cloud KMS.

Exposes the same HTTP interface that `chicken-hawk/shield-policy/scripts/
per-substrate-sign.sh` expects:

    POST /sign
    Header:  Authorization: Bearer <GCP ID token>
    Body:    {"substrate": "<triple>", "artifact_sha256": "<hex>"}
    Returns: {"signature": "<base64>",
              "signer_key_id": "<KMS resource name>",
              "signed_at_unix": <epoch seconds>}

Per v1.6 §3.1 each of the three substrates gets a distinct KMS key
(x86_64-unknown-linux-gnu / aarch64-apple-darwin / wasm32-unknown-unknown)
so compromise of one signer cannot cascade.
"""

__version__ = "0.1.0"
