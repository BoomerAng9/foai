"""HMAC service authentication for TTD-DR.

TTD-DR is an internal mesh service; every request must carry a valid
HMAC signature over the raw body using TTD_DR_HMAC_SECRET. No public
surface.
"""

from __future__ import annotations

import hashlib
import hmac as _hmac
import os
import time
from dataclasses import dataclass


HMAC_SECRET = os.getenv("TTD_DR_HMAC_SECRET", "").encode()
HMAC_MAX_SKEW_SECONDS = 60


@dataclass
class AuthResult:
    ok: bool
    reason: str = ""


def verify_signature(
    signature_header: str | None,
    timestamp_header: str | None,
    raw_body: bytes,
) -> AuthResult:
    """Standard HMAC-sha256 over f"{ts}.{body}" with the shared secret."""

    if not HMAC_SECRET:
        return AuthResult(False, "TTD_DR_HMAC_SECRET not configured")
    if not signature_header or not timestamp_header:
        return AuthResult(False, "missing signature or timestamp header")
    try:
        ts = int(timestamp_header)
    except ValueError:
        return AuthResult(False, "timestamp not an integer")
    skew = abs(int(time.time()) - ts)
    if skew > HMAC_MAX_SKEW_SECONDS:
        return AuthResult(False, f"timestamp skew {skew}s exceeds {HMAC_MAX_SKEW_SECONDS}s")

    expected = _hmac.new(
        HMAC_SECRET,
        f"{ts}.{raw_body.decode('utf-8', errors='replace')}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not _hmac.compare_digest(expected, signature_header):
        return AuthResult(False, "signature mismatch")
    return AuthResult(True)
