"""Centralized configuration — all secrets from GCP Secret Manager."""

import os

from google.cloud import secretmanager

GCP_PROJECT = os.getenv("GCP_PROJECT", "foai-aims")
DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "cti")
GUARDANG_URL = os.getenv(
    "GUARDANG_URL",
    "https://nemoclaw-service-939270059361.us-central1.run.app",
)
PORT = int(os.getenv("PORT", "8080"))


def get_secret(secret_id: str, version: str = "latest") -> str:
    """Fetch a secret from GCP Secret Manager. Never hardcode secrets."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{GCP_PROJECT}/secrets/{secret_id}/versions/{version}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
