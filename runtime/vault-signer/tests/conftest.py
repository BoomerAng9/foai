"""Shared fixtures for vault-signer tests."""

import os

import pytest

# Required env vars for the auth module to import without error.
# Set before tests import the app.
os.environ.setdefault(
    "VAULT_SIGNER_AUDIENCE", "https://vault-signer-test.a.run.app"
)
os.environ.setdefault(
    "VAULT_SIGNER_ALLOWED_CALLERS",
    "cloud-build@foai-aims.iam.gserviceaccount.com",
)
os.environ.setdefault("VAULT_SIGNER_GCP_PROJECT", "foai-aims")
os.environ.setdefault("VAULT_SIGNER_GCP_LOCATION", "us-central1")
os.environ.setdefault("VAULT_SIGNER_GCP_KEYRING", "shield-policy")


@pytest.fixture
def valid_caller_email() -> str:
    return "cloud-build@foai-aims.iam.gserviceaccount.com"


@pytest.fixture
def canonical_sha256() -> str:
    # 32-byte all-zero SHA-256 (length-correct, semantically harmless).
    return "0" * 64


@pytest.fixture
def substrate_linux() -> str:
    return "x86_64-unknown-linux-gnu"
