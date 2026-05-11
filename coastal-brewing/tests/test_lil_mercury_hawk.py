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
    assert result["token_var"] == "MERCURY_API_TOKEN"
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
    assert result["token_var"] == "MERCURY_API_TOKEN"
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
