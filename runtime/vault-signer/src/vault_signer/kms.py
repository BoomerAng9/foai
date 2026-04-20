"""GCP Cloud KMS signing wrapper.

Maps each shield-policy substrate to a distinct KMS key so compromise
of any single signer cannot cascade across substrates. Keys are:

    x86_64-unknown-linux-gnu  →  ${keyring}/shield-x86-64-linux
    aarch64-apple-darwin      →  ${keyring}/shield-arm64-darwin
    wasm32-unknown-unknown    →  ${keyring}/shield-wasm32

All three use the EC_SIGN_P256_SHA256 algorithm. Rotation is 90 days;
each rotation spawns a new cryptoKeyVersion and the facade always signs
against the primary version (KMS default).

The provisioning script at scripts/provision-kms-keys.sh creates these
idempotently. The facade assumes they exist and surfaces a clear error
if a substrate is unmapped.
"""

from __future__ import annotations

import base64
import os
import time
from dataclasses import dataclass
from typing import Protocol


# Canonical substrate list — matches chicken-hawk/shield-policy v1.6 §3.1
# and the TARGETS array in per-substrate-sign.sh.
_SUBSTRATE_KEY_NAMES: dict[str, str] = {
    "x86_64-unknown-linux-gnu": "shield-x86-64-linux",
    "aarch64-apple-darwin": "shield-arm64-darwin",
    "wasm32-unknown-unknown": "shield-wasm32",
}


class UnknownSubstrate(Exception):
    """Raised when the request's substrate field is not in the canonical list."""


@dataclass(frozen=True)
class SignResult:
    signature: str           # base64-encoded
    signer_key_id: str       # full KMS cryptoKeyVersion resource name
    signed_at_unix: int      # epoch seconds


class KmsSigner(Protocol):
    """Protocol the FastAPI app depends on. Tests substitute an implementation."""

    def sign(self, substrate: str, artifact_sha256_hex: str) -> SignResult: ...


@dataclass
class _KmsConfig:
    project: str
    location: str
    keyring: str

    @classmethod
    def from_env(cls) -> "_KmsConfig":
        def _req(key: str) -> str:
            v = os.getenv(key)
            if not v:
                raise RuntimeError(
                    f"{key} env var required for KMS signing. Set at "
                    "deploy time via service.yaml or a shared config."
                )
            return v

        return cls(
            project=_req("VAULT_SIGNER_GCP_PROJECT"),
            location=_req("VAULT_SIGNER_GCP_LOCATION"),
            keyring=_req("VAULT_SIGNER_GCP_KEYRING"),
        )


def _key_resource(cfg: _KmsConfig, substrate: str) -> str:
    if substrate not in _SUBSTRATE_KEY_NAMES:
        raise UnknownSubstrate(
            f"substrate {substrate!r} is not one of "
            f"{sorted(_SUBSTRATE_KEY_NAMES)}"
        )
    key_name = _SUBSTRATE_KEY_NAMES[substrate]
    return (
        f"projects/{cfg.project}"
        f"/locations/{cfg.location}"
        f"/keyRings/{cfg.keyring}"
        f"/cryptoKeys/{key_name}"
    )


class CloudKmsSigner:
    """Production KMS signer. Uses the caller's default GCP ADC.

    On Cloud Run, Application Default Credentials resolve to the service
    account binding on the Cloud Run service — no key files, no tokens.
    """

    def __init__(self, cfg: _KmsConfig | None = None, client=None):
        self._cfg = cfg or _KmsConfig.from_env()
        if client is None:
            from google.cloud import kms  # type: ignore[import-untyped]

            client = kms.KeyManagementServiceClient()
        self._client = client

    def sign(self, substrate: str, artifact_sha256_hex: str) -> SignResult:
        from google.cloud import kms  # type: ignore[import-untyped]

        key_name = _key_resource(self._cfg, substrate)

        # KMS expects the raw SHA-256 digest bytes, not hex.
        digest_bytes = bytes.fromhex(artifact_sha256_hex)
        if len(digest_bytes) != 32:
            raise ValueError(
                "artifact_sha256 must be a 64-char hex string "
                "(got length %d)" % len(digest_bytes) * 2
            )

        # Resolve the primary cryptoKeyVersion. We sign against the
        # current primary; if rotation has moved it forward since the
        # artifact was hashed, that's fine — the signature still verifies
        # and the returned signer_key_id captures which version signed.
        parent = self._client.list_crypto_key_versions(
            request={"parent": key_name, "filter": "state=ENABLED"}
        )
        enabled_state = kms.CryptoKeyVersion.CryptoKeyVersionState.ENABLED
        enabled_versions = [v for v in parent if v.state == enabled_state]
        if not enabled_versions:
            raise RuntimeError(
                f"no ENABLED cryptoKeyVersion under {key_name}; "
                "run scripts/provision-kms-keys.sh"
            )
        # Highest-numbered enabled version is the newest post-rotation.
        version = max(enabled_versions, key=lambda v: v.name)

        response = self._client.asymmetric_sign(
            request={
                "name": version.name,
                "digest": {"sha256": digest_bytes},
            }
        )
        return SignResult(
            signature=base64.b64encode(response.signature).decode("ascii"),
            signer_key_id=version.name,
            signed_at_unix=int(time.time()),
        )


def substrate_key_name(substrate: str) -> str:
    """Expose the short key name for provisioning scripts and tests."""
    if substrate not in _SUBSTRATE_KEY_NAMES:
        raise UnknownSubstrate(substrate)
    return _SUBSTRATE_KEY_NAMES[substrate]


def all_substrates() -> list[str]:
    return list(_SUBSTRATE_KEY_NAMES.keys())
