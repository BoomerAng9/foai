"""BYOK key encryption helpers for the C|Brew Communication Companion.

Customer-supplied API keys (Inworld / OpenAI) are stored at rest in
audit_ledger.companion_byok as Fernet-encrypted blobs. The encryption
key (`COASTAL_BYOK_ENCRYPTION_KEY` env) is a 32-byte url-safe-base64
value generated once via Fernet.generate_key() and held only on the
runner.
"""
from __future__ import annotations

import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger("coastal.companion.byok")


def encrypt_key(fernet_secret: str, plaintext: str) -> bytes:
    """Encrypt a customer API key for at-rest storage. `fernet_secret`
    is the 44-char url-safe-base64 Fernet key from
    COASTAL_BYOK_ENCRYPTION_KEY env."""
    return Fernet(fernet_secret.encode()).encrypt(plaintext.encode())


def decrypt_key(fernet_secret: str, ciphertext: bytes) -> Optional[str]:
    """Decrypt a stored BYOK blob. Returns None on bad secret or
    tampered ciphertext — fail closed; never raise (caller treats
    None as 'no key, fall back to FOAI-provisioned path')."""
    try:
        return Fernet(fernet_secret.encode()).decrypt(ciphertext).decode()
    except (InvalidToken, ValueError) as exc:
        log.warning("byok decrypt failed: %s", exc)
        return None
