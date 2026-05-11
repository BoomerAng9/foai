"""Pytest matrix for `scripts/lil_mercury_hawk.py`.

These tests run without an actual Mercury token — they exercise the
no-token / mis-configured paths + the slim-projection shape. The live
Mercury API call is tested via the runtime self_test() endpoint on
aims-vps, never in CI.

Run from coastal-brewing root: `python -m pytest tests/test_lil_mercury_hawk.py -v`.
"""
from __future__ import annotations

import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def test_self_test_without_token_returns_not_configured(monkeypatch):
    """When no MERCURY_API_* env var is set, self_test must return
    {ok: False} and surface a clear reason — without raising."""
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.TOKEN_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)

    result = lil_mercury_hawk.self_test()

    assert result["ok"] is False
    assert "not set" in result["reason"].lower() or "mercury_api_token" in result["reason"].lower()
    assert result["token_var"] is None


def test_self_test_picks_first_set_token_var(monkeypatch):
    """If MERCURY_API_TOKEN is set, self_test reports that var name even
    if the API call itself fails (network / invalid token). Owner can see
    WHICH env var the integration is reading from."""
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.TOKEN_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("MERCURY_API_TOKEN", "test-fake-token-not-real-12345")

    def fake_request(method, path, body=None, timeout=15):
        # Simulate the API rejecting the fake token
        raise lil_mercury_hawk.MercuryAPIError(401, "Unauthorized")

    monkeypatch.setattr(lil_mercury_hawk, "_request", fake_request)
    result = lil_mercury_hawk.self_test()

    assert result["ok"] is False
    assert result["token_var"] == "Mercury_API_Token"
    assert "401" in result["reason"]


def test_self_test_success_returns_account_count_only(monkeypatch):
    """A successful self-test surfaces account COUNT and the env var NAME —
    never the token, never account ids/balances/names."""
    import lil_mercury_hawk  # noqa: PLC0415

    monkeypatch.setenv("MERCURY_API_TOKEN", "fake-but-mock-passes")

    def fake_request(method, path, body=None, timeout=15):
        return {
            "accounts": [
                {"id": "acct_sensitive_1", "nickname": "operating", "balance": 123456},
                {"id": "acct_sensitive_2", "nickname": "savings", "balance": 999},
            ]
        }

    monkeypatch.setattr(lil_mercury_hawk, "_request", fake_request)
    result = lil_mercury_hawk.self_test()

    assert result["ok"] is True
    assert result["account_count"] == 2
    assert result["token_var"] == "Mercury_API_Token"
    # Critical: no sensitive details leaked into the result
    assert "acct_sensitive_1" not in str(result)
    assert "balance" not in str(result)
    assert "123456" not in str(result)


def test_token_is_never_in_result_dict(monkeypatch):
    """No code path may put the token string into a result dict."""
    import lil_mercury_hawk  # noqa: PLC0415

    token_value = "fake-secret-must-never-leak-mNiCw7qJ"
    monkeypatch.setenv("MERCURY_API_TOKEN", token_value)

    def fake_request(method, path, body=None, timeout=15):
        return {"accounts": []}

    monkeypatch.setattr(lil_mercury_hawk, "_request", fake_request)
    result = lil_mercury_hawk.self_test()

    assert token_value not in str(result)


def test_list_accounts_summary_strips_sensitive_fields(monkeypatch):
    """list_accounts_summary returns id + nickname + kind ONLY."""
    import lil_mercury_hawk  # noqa: PLC0415

    monkeypatch.setenv("MERCURY_API_TOKEN", "fake")

    def fake_request(method, path, body=None, timeout=15):
        return {
            "accounts": [
                {
                    "id": "a1",
                    "nickname": "ops",
                    "kind": "checking",
                    "balance": 50000,
                    "routing_number": "121000358",
                    "account_number": "0123456789",
                },
            ]
        }

    monkeypatch.setattr(lil_mercury_hawk, "_request", fake_request)
    result = lil_mercury_hawk.list_accounts_summary()

    assert len(result) == 1
    assert result[0] == {"id": "a1", "nickname": "ops", "kind": "checking"}
    # No leakage of balance / routing / account number
    serialized = str(result)
    assert "balance" not in serialized
    assert "50000" not in serialized
    assert "121000358" not in serialized
    assert "0123456789" not in serialized


def test_resolve_token_preserves_secret_token_prefix(monkeypatch):
    """Per Mercury OpenAPI spec, `secret-token:` is part of the bearer value
    and must STAY in the Authorization header. Resolver preserves it; auto-
    adds it if the user pasted the raw token without it.
    """
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.TOKEN_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)

    # Test value uses a fake placeholder pattern, NOT a real token format
    monkeypatch.setenv("Mercury_API_Token", "secret-token:fake-mer-placeholder-aaa111")
    assert lil_mercury_hawk._resolve_token() == "secret-token:fake-mer-placeholder-aaa111"

    # Raw values (no prefix) get the prefix auto-added
    monkeypatch.setenv("Mercury_API_Token", "fake-mer-placeholder-bbb222")
    assert lil_mercury_hawk._resolve_token() == "secret-token:fake-mer-placeholder-bbb222"

    # "Bearer " header form: strip Bearer, keep/add secret-token:
    monkeypatch.setenv("Mercury_API_Token", "Bearer secret-token:fake-mer-placeholder-ccc333")
    assert lil_mercury_hawk._resolve_token() == "secret-token:fake-mer-placeholder-ccc333"


def test_verify_webhook_accepts_valid_signature(monkeypatch):
    """Valid HMAC-SHA256 hex of raw payload using the configured secret
    must verify True. Mercury signs webhook deliveries this way (per
    Mercury docs); the secret is per-endpoint and rotated independently
    of the API token.
    """
    import hashlib  # noqa: PLC0415
    import hmac  # noqa: PLC0415
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.WEBHOOK_SECRET_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("Mercury_Webhook_Secret", "whsec_fake_test_aaa111")

    payload = b'{"type":"invoice.paid","data":{"id":"inv_001"}}'
    sig = hmac.new(b"whsec_fake_test_aaa111", payload, hashlib.sha256).hexdigest()

    assert lil_mercury_hawk.verify_webhook(payload, sig) is True


def test_verify_webhook_rejects_invalid_signature(monkeypatch):
    """A signature that does not match the payload+secret must verify False —
    not raise. Webhook endpoint will translate False → 400."""
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.WEBHOOK_SECRET_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("Mercury_Webhook_Secret", "whsec_fake_test_aaa111")

    payload = b'{"type":"invoice.paid","data":{"id":"inv_001"}}'
    bad_sig = "deadbeef" * 8  # 64 hex chars but wrong

    assert lil_mercury_hawk.verify_webhook(payload, bad_sig) is False


def test_verify_webhook_no_secret_returns_false(monkeypatch):
    """When no webhook secret env var is set, verify returns False — does
    NOT raise (endpoint translates False → 503/400; never crashes the
    process on unconfigured runner)."""
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.WEBHOOK_SECRET_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)

    assert lil_mercury_hawk.verify_webhook(b"anything", "sig") is False


def test_verify_webhook_accepts_signature_with_sha256_prefix(monkeypatch):
    """Mercury's signature header may arrive as `sha256=<hex>` or just `<hex>`.
    Accept both forms — strip the algorithm prefix if present."""
    import hashlib  # noqa: PLC0415
    import hmac  # noqa: PLC0415
    import lil_mercury_hawk  # noqa: PLC0415

    for name in lil_mercury_hawk.WEBHOOK_SECRET_ENV_CANDIDATES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("Mercury_Webhook_Secret", "whsec_fake_test_bbb222")

    payload = b'{"type":"invoice.failed"}'
    raw_hex = hmac.new(b"whsec_fake_test_bbb222", payload, hashlib.sha256).hexdigest()

    assert lil_mercury_hawk.verify_webhook(payload, raw_hex) is True
    assert lil_mercury_hawk.verify_webhook(payload, f"sha256={raw_hex}") is True


def test_verify_webhook_uses_constant_time_compare(monkeypatch):
    """Signature comparison must use hmac.compare_digest, not == . Guards
    against timing attacks on the webhook endpoint."""
    import lil_mercury_hawk  # noqa: PLC0415
    import inspect  # noqa: PLC0415

    src = inspect.getsource(lil_mercury_hawk.verify_webhook)
    assert "compare_digest" in src, (
        "verify_webhook must use hmac.compare_digest for constant-time "
        "comparison to prevent signature-timing attacks"
    )


def test_parse_webhook_event_slim_projection_invoice_paid(monkeypatch):
    """parse_event extracts a slim, owner-facing projection from a Mercury
    webhook envelope — type / event_id / invoice_id / amount / paid_at —
    NEVER the full raw payload (which may carry routing/account numbers)."""
    import lil_mercury_hawk  # noqa: PLC0415

    raw = {
        "id": "evt_001",
        "type": "invoice.paid",
        "created": "2026-05-11T12:00:00Z",
        "data": {
            "id": "inv_abc123",
            "status": "paid",
            "total_cents": 3353,
            "paid_at": "2026-05-11T12:00:00Z",
            "customer_email": "buyer@example.com",
            "account_routing_number": "121000358",  # MUST NOT leak
            "account_number": "0123456789",          # MUST NOT leak
        },
    }
    import json as _json  # noqa: PLC0415
    payload = _json.dumps(raw).encode("utf-8")

    proj = lil_mercury_hawk.parse_event(payload)

    assert proj["event_id"] == "evt_001"
    assert proj["type"] == "invoice.paid"
    assert proj["invoice_id"] == "inv_abc123"
    assert proj["status"] == "paid"
    assert proj["total_cents"] == 3353
    assert proj["paid_at"] == "2026-05-11T12:00:00Z"
    assert proj["customer_email"] == "buyer@example.com"
    # Critical: bank routing details must not appear anywhere in projection
    serialized = str(proj)
    assert "121000358" not in serialized
    assert "0123456789" not in serialized


def test_parse_webhook_event_unknown_type_still_returns_slim(monkeypatch):
    """Unknown event types still produce a valid slim projection so the
    endpoint can log + ack without crashing. Mercury may add event types
    we don't recognize yet."""
    import lil_mercury_hawk  # noqa: PLC0415
    import json as _json  # noqa: PLC0415

    raw = {"id": "evt_999", "type": "treasury.something_new", "data": {}}
    proj = lil_mercury_hawk.parse_event(_json.dumps(raw).encode("utf-8"))

    assert proj["event_id"] == "evt_999"
    assert proj["type"] == "treasury.something_new"
    assert proj["invoice_id"] is None


def test_is_bootstrap_mode_off_by_default(monkeypatch):
    """Bootstrap mode (which accepts unsigned webhook probes) must be OFF
    unless an explicit env flag is set. Default-deny posture."""
    import lil_mercury_hawk  # noqa: PLC0415

    for name in ("MERCURY_WEBHOOK_BOOTSTRAP", "Mercury_Webhook_Bootstrap"):
        monkeypatch.delenv(name, raising=False)

    assert lil_mercury_hawk.is_bootstrap_mode() is False


def test_is_bootstrap_mode_on_when_env_truthy(monkeypatch):
    """When operator sets MERCURY_WEBHOOK_BOOTSTRAP=1, mode is on. Accepts
    "1" / "true" / "yes" (case-insensitive). Anything else = off."""
    import lil_mercury_hawk  # noqa: PLC0415

    for truthy in ("1", "true", "TRUE", "yes", "YES", "on"):
        monkeypatch.setenv("MERCURY_WEBHOOK_BOOTSTRAP", truthy)
        assert lil_mercury_hawk.is_bootstrap_mode() is True, f"truthy '{truthy}' should enable bootstrap"

    for falsy in ("0", "false", "no", "off", ""):
        monkeypatch.setenv("MERCURY_WEBHOOK_BOOTSTRAP", falsy)
        assert lil_mercury_hawk.is_bootstrap_mode() is False, f"falsy '{falsy}' should NOT enable bootstrap"


def test_mint_invoice_returns_slim_projection(monkeypatch):
    """mint_invoice returns only id / pay_link / status / total — never the
    Mercury raw payload (which may include account routing details)."""
    import lil_mercury_hawk  # noqa: PLC0415

    monkeypatch.setenv("MERCURY_API_TOKEN", "fake")

    def fake_request(method, path, body=None, timeout=15):
        assert method == "POST"
        assert path == "/invoicing/invoice"
        return {
            "id": "inv_test_001",
            "pay_link": "https://pay.mercury.com/inv_test_001",
            "status": "open",
            "total_cents": 3353,
            "raw_internal_field_we_dont_want_exposed": "sensitive",
            "account_routing_number": "121000358",
        }

    monkeypatch.setattr(lil_mercury_hawk, "_request", fake_request)
    result = lil_mercury_hawk.mint_invoice(
        customer_email="test@example.com",
        line_items=[
            {"description": "Tea Monthly subscription · first month", "quantity": 1, "unit_price_cents": 2699},
            {"description": "Service initiation (one-time)", "quantity": 1, "unit_price_cents": 654},
        ],
    )

    assert result["invoice_id"] == "inv_test_001"
    assert result["pay_link"] == "https://pay.mercury.com/inv_test_001"
    assert result["status"] == "open"
    assert result["total_cents"] == 3353
    # Critical: no internal/sensitive raw fields leaked
    serialized = str(result)
    assert "raw_internal_field" not in serialized
    assert "121000358" not in serialized
