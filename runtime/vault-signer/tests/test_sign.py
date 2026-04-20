"""Signing endpoint unit tests.

Uses an in-memory KmsSigner double that records calls and returns
deterministic fabricated signatures. The real CloudKmsSigner is
covered by the live-GCP integration test below, which is skipped
unless GOOGLE_APPLICATION_CREDENTIALS is set.
"""

from __future__ import annotations

import base64
import os
import time
from dataclasses import dataclass
from typing import List

import pytest
from fastapi.testclient import TestClient

from vault_signer import auth, kms
from vault_signer.main import _caller, _signer, app


@dataclass
class _RecordedCall:
    substrate: str
    artifact_sha256: str


class _InMemorySigner:
    """Test double that records substrate/digest pairs and returns a
    deterministic response. Not a mock of an external system — it
    satisfies the KmsSigner Protocol directly.
    """

    def __init__(self) -> None:
        self.calls: List[_RecordedCall] = []

    def sign(self, substrate: str, artifact_sha256_hex: str) -> kms.SignResult:
        if substrate not in kms.all_substrates():
            raise kms.UnknownSubstrate(substrate)
        self.calls.append(_RecordedCall(substrate, artifact_sha256_hex))
        payload = f"{substrate}:{artifact_sha256_hex}".encode("utf-8")
        return kms.SignResult(
            signature=base64.b64encode(payload).decode("ascii"),
            signer_key_id=(
                f"projects/foai-aims/locations/us-central1/"
                f"keyRings/shield-policy/cryptoKeys/"
                f"{kms.substrate_key_name(substrate)}/cryptoKeyVersions/1"
            ),
            signed_at_unix=int(time.time()),
        )


@pytest.fixture
def signer() -> _InMemorySigner:
    return _InMemorySigner()


@pytest.fixture
def client(signer, valid_caller_email) -> TestClient:
    def _override_caller():
        return auth.CallerIdentity(
            email=valid_caller_email, issuer="https://accounts.google.com"
        )

    def _override_signer():
        return signer

    app.dependency_overrides[_caller] = _override_caller
    app.dependency_overrides[_signer] = _override_signer
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_health_endpoint():
    with TestClient(app) as c:
        response = c.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_sign_happy_path(client, signer, substrate_linux, canonical_sha256):
    response = client.post(
        "/sign",
        json={
            "substrate": substrate_linux,
            "artifact_sha256": canonical_sha256,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["signature"]
    assert body["signer_key_id"].endswith(
        "/cryptoKeys/shield-x86-64-linux/cryptoKeyVersions/1"
    )
    assert isinstance(body["signed_at_unix"], int)
    assert len(signer.calls) == 1
    assert signer.calls[0].substrate == substrate_linux
    assert signer.calls[0].artifact_sha256 == canonical_sha256


def test_sign_rejects_unknown_substrate(client, canonical_sha256):
    response = client.post(
        "/sign",
        json={
            "substrate": "riscv64-unknown-linux-gnu",
            "artifact_sha256": canonical_sha256,
        },
    )
    assert response.status_code == 400
    assert "unknown substrate" in response.json()["detail"]


@pytest.mark.parametrize(
    "bad_digest",
    [
        "0",                                          # too short
        "0" * 63,                                     # off by one
        "0" * 65,                                     # off by one the other way
        "Z" * 64,                                     # wrong alphabet
        "0123456789ABCDEF" * 4,                       # uppercase
    ],
)
def test_sign_rejects_malformed_digest(client, substrate_linux, bad_digest):
    response = client.post(
        "/sign",
        json={"substrate": substrate_linux, "artifact_sha256": bad_digest},
    )
    assert response.status_code == 400 or response.status_code == 422


def test_sign_per_substrate_key_mapping(client, canonical_sha256):
    for substrate in kms.all_substrates():
        response = client.post(
            "/sign",
            json={"substrate": substrate, "artifact_sha256": canonical_sha256},
        )
        assert response.status_code == 200, response.text
        expected_key = kms.substrate_key_name(substrate)
        assert f"/cryptoKeys/{expected_key}/" in response.json()["signer_key_id"]


def test_unauthenticated_rejected(substrate_linux, canonical_sha256):
    # No dependency overrides this time — real auth path.
    with TestClient(app) as c:
        response = c.post(
            "/sign",
            json={
                "substrate": substrate_linux,
                "artifact_sha256": canonical_sha256,
            },
        )
        assert response.status_code == 401


def test_kms_unknown_substrate_exception_direct():
    # Direct unit test on the kms module — belt & braces for the
    # mapping logic the endpoint relies on.
    with pytest.raises(kms.UnknownSubstrate):
        kms.substrate_key_name("not-a-real-triple")


def test_kms_canonical_substrate_set():
    assert set(kms.all_substrates()) == {
        "x86_64-unknown-linux-gnu",
        "aarch64-apple-darwin",
        "wasm32-unknown-unknown",
    }


@pytest.mark.skipif(
    not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
    reason="integration test requires GCP credentials + a provisioned keyring",
)
def test_live_kms_signing(substrate_linux, canonical_sha256):
    """Only runs locally against real GCP KMS; production gate.

    Uses the same env vars as production and signs a throwaway digest.
    Verifies the CloudKmsSigner happy path end-to-end.
    """
    signer = kms.CloudKmsSigner()
    result = signer.sign(substrate_linux, canonical_sha256)
    assert result.signature
    assert result.signer_key_id.startswith("projects/")
    assert result.signed_at_unix > 0
