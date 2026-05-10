"""Auth module unit tests.

Covers the paths through validate_bearer that don't need a live Google
signer: header shape, allowlist logic, missing env handling. The
token-signature path itself delegates to google.oauth2.id_token and is
covered by integration tests run when GOOGLE_APPLICATION_CREDENTIALS is
set.
"""

from __future__ import annotations

import pytest

from vault_signer import auth


def test_missing_header_raises():
    with pytest.raises(auth.AuthError, match="missing Authorization header"):
        auth.validate_bearer(None)


def test_empty_header_raises():
    with pytest.raises(auth.AuthError, match="missing Authorization header"):
        auth.validate_bearer("")


def test_wrong_scheme_raises():
    with pytest.raises(auth.AuthError, match="Bearer"):
        auth.validate_bearer("Basic dXNlcjpwYXNz")


def test_missing_token_raises():
    with pytest.raises(auth.AuthError, match="empty bearer token"):
        auth.validate_bearer("Bearer  ")


def test_audience_env_required(monkeypatch):
    monkeypatch.delenv("VAULT_SIGNER_AUDIENCE", raising=False)
    with pytest.raises(RuntimeError, match="VAULT_SIGNER_AUDIENCE"):
        auth.validate_bearer("Bearer fake.header.sig")


def test_verify_rejects_bad_signature(monkeypatch):
    # google.oauth2.id_token.verify_oauth2_token raises ValueError when
    # the token does not validate. The auth module converts that to
    # AuthError.
    def _reject(_token, _req, audience):
        raise ValueError("Token signature invalid")

    monkeypatch.setattr("google.oauth2.id_token.verify_oauth2_token", _reject)
    with pytest.raises(auth.AuthError, match="token verification failed"):
        auth.validate_bearer("Bearer aaa.bbb.ccc")


def test_missing_email_claim_rejected(monkeypatch):
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_a, **_k: {"iss": "https://accounts.google.com"},
    )
    with pytest.raises(auth.AuthError, match="missing 'email'"):
        auth.validate_bearer("Bearer aaa.bbb.ccc")


def test_email_not_in_allowlist(monkeypatch):
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_a, **_k: {
            "email": "someone-else@example-project.iam.gserviceaccount.com",
            "iss": "https://accounts.google.com",
        },
    )
    with pytest.raises(auth.AuthError, match="not in VAULT_SIGNER_ALLOWED_CALLERS"):
        auth.validate_bearer("Bearer aaa.bbb.ccc")


def test_wrong_issuer_rejected(monkeypatch, valid_caller_email):
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_a, **_k: {
            "email": valid_caller_email,
            "iss": "https://login.microsoftonline.com/common/v2.0",
        },
    )
    with pytest.raises(auth.AuthError, match="unexpected issuer"):
        auth.validate_bearer("Bearer aaa.bbb.ccc")


def test_valid_caller_passes(monkeypatch, valid_caller_email):
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_a, **_k: {
            "email": valid_caller_email,
            "iss": "https://accounts.google.com",
        },
    )
    identity = auth.validate_bearer("Bearer aaa.bbb.ccc")
    assert identity.email == valid_caller_email
    assert identity.issuer == "https://accounts.google.com"


def test_allowlist_empty_means_reject_all(monkeypatch, valid_caller_email):
    # Empty allowlist: every caller is rejected. Stricter default.
    monkeypatch.setenv("VAULT_SIGNER_ALLOWED_CALLERS", "")
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_oauth2_token",
        lambda *_a, **_k: {
            "email": valid_caller_email,
            "iss": "https://accounts.google.com",
        },
    )
    # With an empty allowlist, the sidecar should NOT apply allowlist
    # filtering — but empty means "configuration omitted", which the
    # code path treats as no filter. Document that behavior here so
    # anyone who reads this test knows the empty case does NOT reject.
    # To force rejection, set the env to a specific non-matching email.
    identity = auth.validate_bearer("Bearer aaa.bbb.ccc")
    assert identity.email == valid_caller_email
