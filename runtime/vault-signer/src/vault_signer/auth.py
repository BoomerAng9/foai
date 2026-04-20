"""GCP Workload Identity ID-token validation.

The sidecar authenticates callers by validating the Google-signed ID
token in the `Authorization: Bearer` header. The token's audience must
match the sidecar's Cloud Run URL (set via the VAULT_SIGNER_AUDIENCE
env var), and the token's `email` claim must be in an explicit
allowlist (VAULT_SIGNER_ALLOWED_CALLERS, comma-separated).

Typical allowlist: cloud-build@foai-aims.iam.gserviceaccount.com plus
whichever human operator service account runs the manual provisioning
scripts.

No static secrets, no rotation cost. IAM is the source of truth.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

_REQUEST_SESSION = google_requests.Request()


@dataclass(frozen=True)
class CallerIdentity:
    email: str
    issuer: str


class AuthError(Exception):
    """Raised when an inbound request cannot be authenticated."""


def _expected_audience() -> str:
    audience = os.getenv("VAULT_SIGNER_AUDIENCE")
    if not audience:
        raise RuntimeError(
            "VAULT_SIGNER_AUDIENCE env var must be set to the sidecar's "
            "Cloud Run service URL (e.g. "
            "https://vault-signer-<hash>-uc.a.run.app). Cloud Run exposes "
            "this as $K_SERVICE at runtime — wire it into the env at "
            "deploy time."
        )
    return audience


def _allowed_callers() -> frozenset[str]:
    raw = os.getenv("VAULT_SIGNER_ALLOWED_CALLERS", "")
    return frozenset(e.strip() for e in raw.split(",") if e.strip())


def validate_bearer(authorization_header: str | None) -> CallerIdentity:
    """Validate an `Authorization: Bearer <token>` header.

    Raises AuthError on any failure mode:
      - Header absent or wrong prefix.
      - Google rejects the signature / expiry / audience.
      - Caller email is not in the allowlist.
    """
    if not authorization_header:
        raise AuthError("missing Authorization header")
    parts = authorization_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Authorization header must start with 'Bearer '")
    token = parts[1].strip()
    if not token:
        raise AuthError("empty bearer token")

    expected_audience = _expected_audience()
    try:
        claims = id_token.verify_oauth2_token(
            token, _REQUEST_SESSION, audience=expected_audience
        )
    except ValueError as exc:
        raise AuthError(f"token verification failed: {exc}") from exc

    email = claims.get("email")
    if not email:
        raise AuthError("id_token missing 'email' claim")

    allowed = _allowed_callers()
    if allowed and email not in allowed:
        raise AuthError(
            f"caller {email!r} is not in VAULT_SIGNER_ALLOWED_CALLERS"
        )

    issuer = claims.get("iss", "")
    if issuer not in ("https://accounts.google.com", "accounts.google.com"):
        raise AuthError(f"unexpected issuer {issuer!r}")

    return CallerIdentity(email=email, issuer=issuer)
