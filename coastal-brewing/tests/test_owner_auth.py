"""Owner cookie sign/verify + allowlist parsing + lockout state."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import owner_auth  # noqa: E402


SECRET = "test-owner-session-secret-12345"


def test_sign_then_verify_round_trip():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    parsed = owner_auth.verify_owner_cookie(cookie, SECRET)
    assert parsed is not None
    assert parsed["email"] == "asg@achievemor.io"


def test_verify_rejects_tampered_email():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    parts = cookie.split(".")
    tampered = "evil@example.com" + "." + ".".join(parts[1:])
    assert owner_auth.verify_owner_cookie(tampered, SECRET) is None


def test_verify_rejects_expired_cookie():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=-1)
    assert owner_auth.verify_owner_cookie(cookie, SECRET) is None


def test_verify_rejects_wrong_secret():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    assert owner_auth.verify_owner_cookie(cookie, "different-secret") is None


def test_parse_allowlist_strips_whitespace():
    out = owner_auth.parse_allowlist("a@x.com, b@x.com ,  c@x.com")
    assert out == {"a@x.com", "b@x.com", "c@x.com"}


def test_parse_allowlist_empty_env_returns_empty_set():
    assert owner_auth.parse_allowlist("") == set()
    assert owner_auth.parse_allowlist(None) == set()


def test_is_owner_email_matches_allowlist_case_insensitive():
    allow = {"asg@achievemor.io"}
    assert owner_auth.is_owner_email("ASG@Achievemor.IO", allow) is True
    assert owner_auth.is_owner_email("not-owner@example.com", allow) is False


def test_lockout_records_failures_and_blocks():
    owner_auth._LOCKOUT.clear()
    email = "asg@achievemor.io"
    assert owner_auth.is_locked(email) is False
    owner_auth.record_failure(email)
    owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is False
    owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is True


def test_lockout_clears_after_window(monkeypatch):
    owner_auth._LOCKOUT.clear()
    email = "asg@achievemor.io"
    for _ in range(3):
        owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is True
    fake_now = time.time() + owner_auth.LOCKOUT_WINDOW_SEC + 1
    monkeypatch.setattr(owner_auth.time, "time", lambda: fake_now)
    assert owner_auth.is_locked(email) is False


def test_webauthn_registration_options_includes_email_as_user_id():
    """start_registration returns a JSON-serialisable dict containing the
    user identity + a fresh challenge. The browser uses this dict as
    input to `navigator.credentials.create({publicKey: <opts>})`."""
    opts = owner_auth.start_registration(
        email="asg@achievemor.io",
        rp_id="brewing.foai.cloud",
        rp_name="Coastal Brewing Co.",
    )
    assert opts["user"]["name"] == "asg@achievemor.io"
    assert opts["rp"]["id"] == "brewing.foai.cloud"
    assert "challenge" in opts
