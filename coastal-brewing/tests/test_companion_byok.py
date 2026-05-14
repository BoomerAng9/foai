"""Fernet round-trip + key-rotation safety for BYOK storage."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import companion_byok as byok  # noqa: E402


SECRET = "z+gRO7t-3z5y6Yk8w0qFvB9JzLnNbC2H4XwYxVrTuM0="


def test_encrypt_then_decrypt_round_trip():
    enc = byok.encrypt_key(SECRET, "sk-test-abc123")
    assert isinstance(enc, bytes)
    assert byok.decrypt_key(SECRET, enc) == "sk-test-abc123"


def test_decrypt_with_wrong_secret_returns_none():
    enc = byok.encrypt_key(SECRET, "sk-test-abc123")
    other = "OTHERkey9OO0Y8nL5kW3aHvB9JzLnNbC2H4XwYxVrTuM="
    assert byok.decrypt_key(other, enc) is None


def test_decrypt_malformed_returns_none():
    assert byok.decrypt_key(SECRET, b"not-fernet") is None


def test_encrypt_produces_different_ciphertext_per_call():
    a = byok.encrypt_key(SECRET, "sk-abc")
    b = byok.encrypt_key(SECRET, "sk-abc")
    assert a != b
