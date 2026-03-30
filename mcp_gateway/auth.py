"""
MCP Gateway Authentication — API key validation + tenant tier extraction.

API keys are stored in the database (or env for dev mode).
Format: foai_TIER_TENANTID_SECRET
"""

import os
import hashlib
from typing import Optional
from pydantic import BaseModel

# Dev mode: single owner key
DEV_API_KEY = os.getenv("MCP_DEV_API_KEY", "foai_enterprise_owner_dev")
OWNER_EMAILS = ["bpo@achievemor.io", "jarrett.risher@gmail.com"]


class AuthResult(BaseModel):
    valid: bool
    tenant_id: str = ""
    tier: str = ""
    email: str = ""
    error: str = ""


def validate_api_key(authorization: Optional[str]) -> AuthResult:
    """Validate the API key from the Authorization header."""
    if not authorization:
        return AuthResult(valid=False, error="Authorization header required")

    # Strip 'Bearer ' prefix
    key = authorization.replace("Bearer ", "").strip()
    if not key:
        return AuthResult(valid=False, error="API key required")

    # Dev mode: accept dev key
    if key == DEV_API_KEY:
        return AuthResult(
            valid=True,
            tenant_id="owner",
            tier="enterprise",
            email="bpo@achievemor.io",
        )

    # Parse key format: foai_TIER_TENANTID_SECRET
    parts = key.split("_")
    if len(parts) < 4 or parts[0] != "foai":
        return AuthResult(valid=False, error="Invalid API key format")

    tier = parts[1]
    tenant_id = parts[2]

    # TODO: In production, validate against database
    # For now, accept any well-formatted key
    valid_tiers = ["starter", "growth", "enterprise", "plugmein_scout",
                   "plugmein_content", "plugmein_biz", "plugmein_edu", "plugmein_ops"]

    if tier not in valid_tiers:
        return AuthResult(valid=False, error=f"Invalid tier: {tier}")

    return AuthResult(
        valid=True,
        tenant_id=tenant_id,
        tier=tier,
        email="",
    )
