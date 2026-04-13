"""
MCP Gateway Authentication — API key validation + tenant tier extraction.

Keys validated against HMAC signature derived from MCP_GATEWAY_SECRET.
"""

import os
import hmac
import hashlib
from typing import Optional
from pydantic import BaseModel

MCP_GATEWAY_SECRET = os.getenv("MCP_GATEWAY_SECRET", "")

VALID_TIERS = frozenset([
    "starter", "growth", "enterprise",
    "plugmein_scout", "plugmein_content", "plugmein_biz",
    "plugmein_edu", "plugmein_ops",
])


class AuthResult(BaseModel):
    valid: bool
    tenant_id: str = ""
    tier: str = ""
    email: str = ""
    error: str = ""


def _verify_key_signature(key: str) -> bool:
    """Verify API key HMAC: foai_TIER_TENANTID_SIGNATURE."""
    if not MCP_GATEWAY_SECRET:
        return False
    parts = key.split("_", 3)
    if len(parts) < 4 or parts[0] != "foai":
        return False
    # Reconstruct payload and verify HMAC
    payload = f"foai_{parts[1]}_{parts[2]}"
    expected = hmac.new(
        MCP_GATEWAY_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:32]
    return hmac.compare_digest(parts[3], expected)


def validate_api_key(authorization: Optional[str]) -> AuthResult:
    """Validate the API key from the Authorization header."""
    if not authorization:
        return AuthResult(valid=False, error="Authorization header required")

    key = authorization.replace("Bearer ", "").strip()
    if not key:
        return AuthResult(valid=False, error="API key required")

    if not MCP_GATEWAY_SECRET:
        return AuthResult(valid=False, error="Gateway not configured")

    # Parse key format: foai_TIER_TENANTID_SIGNATURE
    parts = key.split("_", 3)
    if len(parts) < 4 or parts[0] != "foai":
        return AuthResult(valid=False, error="Invalid API key format")

    tier = parts[1]
    tenant_id = parts[2]

    if tier not in VALID_TIERS:
        return AuthResult(valid=False, error="Invalid tier")

    if not _verify_key_signature(key):
        return AuthResult(valid=False, error="Invalid API key")

    return AuthResult(valid=True, tenant_id=tenant_id, tier=tier)
