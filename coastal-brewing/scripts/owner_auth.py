"""Owner-only auth primitives — cookie HMAC sign/verify, allowlist
parsing, and per-email lockout tracking.

The WebAuthn ceremony lives in this module too (added in Task 8).
This file is the single source of truth for "is this caller the
owner" across the FastAPI router."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Optional

log = logging.getLogger("coastal.owner_auth")

# Tunable constants — overridable by env for ops.
DEFAULT_TTL_SEC = int(os.environ.get("COASTAL_OWNER_COOKIE_TTL_SEC", "86400"))  # 24h
LOCKOUT_THRESHOLD = int(os.environ.get("COASTAL_OWNER_LOCKOUT_THRESHOLD", "3"))
LOCKOUT_WINDOW_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_WINDOW_SEC", "300"))   # 5min
LOCKOUT_COOLDOWN_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_COOLDOWN_SEC", "1800"))  # 30min

# In-memory failure tracking — email → list[failure_unix]
_LOCKOUT: dict[str, list[float]] = {}


def parse_allowlist(env_value: Optional[str]) -> set[str]:
    """Parse COASTAL_OWNER_EMAILS into a normalised set (lowercased,
    whitespace-stripped). Empty env → empty set."""
    if not env_value:
        return set()
    return {e.strip().lower() for e in env_value.split(",") if e.strip()}


def is_owner_email(email: str, allowlist: set[str]) -> bool:
    return (email or "").strip().lower() in allowlist


def sign_owner_cookie(email: str, secret: str, *, ttl_sec: int = DEFAULT_TTL_SEC) -> str:
    """Mint a coastal_owner cookie value: <email>.<exp_unix>.<hmac8>"""
    expires = int(time.time()) + ttl_sec
    payload = f"{email.lower()}.{expires}"
    mac = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}.{mac}"


def verify_owner_cookie(raw: Optional[str], secret: str) -> Optional[dict]:
    """Verify a coastal_owner cookie. Returns {email, expires} on success,
    None on tamper / expiry / malformed."""
    if not raw or not isinstance(raw, str):
        return None
    parts = raw.rsplit(".", 2)
    if len(parts) != 3:
        return None
    email, expires_str, mac = parts
    payload = f"{email}.{expires_str}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(mac, expected):
        return None
    try:
        expires = int(expires_str)
    except ValueError:
        return None
    if expires < int(time.time()):
        return None
    return {"email": email, "expires": expires}


def _prune_old(failures: list[float], now: float) -> list[float]:
    cutoff = now - LOCKOUT_WINDOW_SEC
    return [t for t in failures if t >= cutoff]


def record_failure(email: str) -> None:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    bucket.append(now)
    _LOCKOUT[email] = bucket
    if len(bucket) >= LOCKOUT_THRESHOLD:
        log.warning("owner_auth: lockout triggered for %s (failures=%d)", email, len(bucket))


def is_locked(email: str) -> bool:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    _LOCKOUT[email] = bucket
    return len(bucket) >= LOCKOUT_THRESHOLD


def clear_failures(email: str) -> None:
    """Call on successful auth to reset the lockout counter."""
    _LOCKOUT.pop(email, None)


# ----------------------------------------------------------------------------
# WebAuthn ceremony (FIDO2 passkey)
#
# Library: `webauthn` (Duo Labs reference impl).
# Storage: audit_ledger.owner_passkeys table — one row per owner email.
# Challenges are stored in an in-memory dict keyed by email; the
# challenge is single-use and times out after 5 min.
# ----------------------------------------------------------------------------
import base64
import json
import secrets as _secrets
from typing import Any

# Stored challenges: email → (challenge_bytes, expires_unix)
_PENDING_CHALLENGES: dict[str, tuple[bytes, float]] = {}
CHALLENGE_TTL_SEC = 300


def _new_challenge() -> bytes:
    return _secrets.token_bytes(32)


def _store_challenge(email: str, challenge: bytes) -> None:
    _PENDING_CHALLENGES[email] = (challenge, time.time() + CHALLENGE_TTL_SEC)


def _consume_challenge(email: str) -> Optional[bytes]:
    entry = _PENDING_CHALLENGES.pop(email, None)
    if entry is None:
        return None
    challenge, exp = entry
    if exp < time.time():
        return None
    return challenge


def start_registration(*, email: str, rp_id: str, rp_name: str) -> dict[str, Any]:
    """Build options for navigator.credentials.create(). Returns a
    JSON-serialisable dict the frontend forwards to the browser."""
    from webauthn import generate_registration_options
    from webauthn.helpers.structs import (
        AuthenticatorSelectionCriteria, ResidentKeyRequirement,
        UserVerificationRequirement,
    )
    from webauthn.helpers import options_to_json
    challenge = _new_challenge()
    _store_challenge(email, challenge)
    opts = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_name=email,
        user_display_name=email,
        challenge=challenge,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    return json.loads(options_to_json(opts))


def finish_registration(*, email: str, credential_json: dict[str, Any], rp_id: str, expected_origin: str) -> bool:
    """Verify the navigator.credentials.create() response and persist the
    credential to audit_ledger.owner_passkeys. Returns True on success."""
    import audit_ledger
    from webauthn import verify_registration_response
    challenge = _consume_challenge(email)
    if challenge is None:
        log.warning("owner_auth: registration without pending challenge for %s", email)
        return False
    try:
        # webauthn>=2.0 accepts dict directly — no parse_raw needed
        verification = verify_registration_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
        )
    except Exception as exc:
        log.warning("owner_auth: registration verify failed for %s: %s", email, exc)
        return False
    audit_ledger.register_owner_passkey(
        email=email,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
    )
    return True


def start_authentication(*, email: str, rp_id: str) -> Optional[dict[str, Any]]:
    """Build options for navigator.credentials.get(). Returns None if
    the email has no enrolled passkey (caller should redirect to enroll)."""
    import audit_ledger
    row = audit_ledger.fetch_owner_passkey(email)
    if row is None:
        return None
    from webauthn import generate_authentication_options
    from webauthn.helpers.structs import (
        PublicKeyCredentialDescriptor, UserVerificationRequirement,
    )
    from webauthn.helpers import options_to_json
    challenge = _new_challenge()
    _store_challenge(email, challenge)
    opts = generate_authentication_options(
        rp_id=rp_id,
        challenge=challenge,
        allow_credentials=[PublicKeyCredentialDescriptor(id=row["credential_id"])],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    return json.loads(options_to_json(opts))


def finish_authentication(*, email: str, credential_json: dict[str, Any], rp_id: str, expected_origin: str) -> bool:
    """Verify the navigator.credentials.get() response, bump the
    sign_count, and clear the lockout counter on success."""
    import audit_ledger
    from webauthn import verify_authentication_response
    row = audit_ledger.fetch_owner_passkey(email)
    if row is None:
        record_failure(email)
        return False
    challenge = _consume_challenge(email)
    if challenge is None:
        record_failure(email)
        return False
    try:
        # webauthn>=2.0 accepts dict directly — no parse_raw needed
        verification = verify_authentication_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
            credential_public_key=row["public_key"],
            credential_current_sign_count=row["sign_count"],
        )
    except Exception as exc:
        log.warning("owner_auth: authentication verify failed for %s: %s", email, exc)
        record_failure(email)
        return False
    audit_ledger.bump_owner_passkey_sign_count(email, verification.new_sign_count)
    clear_failures(email)
    return True
