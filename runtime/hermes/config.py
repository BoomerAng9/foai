"""Hermes LearnAng configuration — all secrets from GCP Secret Manager."""

import os

from google.cloud import secretmanager

GCP_PROJECT = os.getenv("GCP_PROJECT", "foai-aims")
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")

MONEY_ENGINE_URL = os.getenv(
    "MONEY_ENGINE_URL",
    "https://money-engine-api-939270059361.us-central1.run.app",
)
GUARDANG_URL = os.getenv(
    "GUARDANG_URL",
    "https://nemoclaw-service-939270059361.us-central1.run.app",
)
OPENCLAW_URL = os.getenv(
    "OPENCLAW_URL",
    "https://openclaw-service-939270059361.us-central1.run.app",
)

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

PORT = int(os.getenv("PORT", "8080"))

_sm_client: secretmanager.SecretManagerServiceClient | None = None


def get_secret(secret_id: str, version: str = "latest") -> str:
    """Fetch a secret from GCP Secret Manager. Never hardcode secrets."""
    global _sm_client
    if _sm_client is None:
        _sm_client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{GCP_PROJECT}/secrets/{secret_id}/versions/{version}"
    response = _sm_client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
