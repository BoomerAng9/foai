"""Pytest matrix for `agents/shared/spinner_tools.py:issue_coupon`.

Owner directive 2026-04-30: ship only what's real, with the cross-check
abuse-defeat layer fully tested. The Stripe Coupon creation lives in
Chicken Hawk; the runner-side surface is the authority gate +
rate-limit cross-check + audit-ledger emit. This suite tests those.

Run from repo root: `python -m pytest tests/test_coupon_issuance.py -v`.
"""
from __future__ import annotations

import os
import pathlib
import sys
from unittest import mock

os.environ.setdefault("COASTAL_APPROVE_SECRET", "test-secret-do-not-use-in-prod")

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from agents.shared import spinner_tools  # noqa: E402


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def _hawk_ok(stripe_coupon_id: str = "co_test_abc123",
             promotion_code: str = "TRY-ME-XYZ",
             redemption_url: str = "https://buy.stripe.com/test_abc") -> dict:
    """Standard successful Chicken Hawk envelope shape."""
    return {
        "ok": True,
        "verdict": "issued",
        "stripe_coupon_id": stripe_coupon_id,
        "promotion_code": promotion_code,
        "redemption_url": redemption_url,
    }


def _hawk_unreachable() -> dict:
    return {
        "ok": False,
        "verdict": "unreachable",
        "message": "Chicken Hawk unreachable.",
        "detail": "Connection refused",
    }


# ---------------------------------------------------------------------------
# 1. Authority gate
# ---------------------------------------------------------------------------

def test_luc_can_issue_try_me_for_fresh_custee():
    """LUC at T2_FINANCE issuing TRY-ME for a Custee with no prior history."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch", return_value=_hawk_ok()), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts", return_value=[]), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.insert_action_receipt") as mock_emit:
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_test_001",
            actor="luc",
            custee_email="alice@example.com",
            shipping_address="123 Marsh Lane, Bluffton, SC 29910",
        )
        assert result["ok"] is True
        assert result["stripe_coupon_id"] == "co_test_abc123"
        # Audit-ledger emit fired with cross-check signals in summary
        mock_emit.assert_called_once()
        call_kwargs = mock_emit.call_args.kwargs
        assert call_kwargs["action_type"] == "coupon_issuance"
        assert "email_hash=" in call_kwargs["result_summary"]
        assert "address_hash=" in call_kwargs["result_summary"]
        assert "coupon=TRY-ME" in call_kwargs["result_summary"]


def test_sal_cannot_issue_try_me():
    """T3 (Sal_Ang) has zero coupon authority — refused before dispatch."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch:
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_test_002",
            actor="sal_ang",
            custee_email="bob@example.com",
            shipping_address="456 Pluff Ave",
        )
        assert result["ok"] is False
        assert result["verdict"] == "denied"
        assert "outside_authority" in result["reason"]
        assert "T3" in result["reason"]
        # Dispatch never called when authority gate refuses
        mock_dispatch.assert_not_called()


def test_melli_cannot_issue_try_me():
    """T2_BULK (Melli) also has zero coupon authority — only LUC + ACHEEVY."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch:
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_test_003",
            actor="melli",
            custee_email="bulk@office.example.com",
            shipping_address="789 Corp Plaza",
        )
        assert result["ok"] is False
        assert result["verdict"] == "denied"
        mock_dispatch.assert_not_called()


def test_acheevy_can_issue_any_coupon_including_invented():
    """T1 (ACHEEVY) has unrestricted coupon authority — even codes not on
    the fixed list. Owner can issue ad-hoc codes if a deal calls for it."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch", return_value=_hawk_ok()), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts", return_value=[]), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.insert_action_receipt"):
        result = spinner_tools.issue_coupon(
            coupon_code="ACHEEVY-ADHOC-2026",  # not in LUC_COUPON_CODES
            custee_id="custee_test_004",
            actor="acheevy",
            custee_email="vip@example.com",
            shipping_address="VIP suite",
        )
        assert result["ok"] is True


def test_luc_cannot_issue_invented_coupon():
    """LUC restricted to LUC_COUPON_CODES — invented codes refused."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch:
        result = spinner_tools.issue_coupon(
            coupon_code="FAKE99",
            custee_id="custee_test_005",
            actor="luc",
            custee_email="someone@example.com",
            shipping_address="elsewhere",
        )
        assert result["ok"] is False
        assert result["verdict"] == "denied"
        assert "FAKE99" in result["reason"]
        mock_dispatch.assert_not_called()


def test_unknown_actor_fails_closed():
    """Unknown actor slug → fail closed, no dispatch."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch:
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_test_006",
            actor="rogue_agent",
            custee_email="x@y.z",
            shipping_address="nowhere",
        )
        assert result["ok"] is False
        assert "unknown_actor" in result["reason"]
        mock_dispatch.assert_not_called()


# ---------------------------------------------------------------------------
# 2. Cross-check rate-limit (the abuse-defeat layer)
# ---------------------------------------------------------------------------

def test_try_me_rate_limited_by_custee_id():
    """Same custee_id within 30 days → rate_limited, no dispatch."""
    prior_row = [{
        "action_id": "act_1",
        "task_id": "coupon_co_test_xyz",
        "executor": "luc:T2_FINANCE",
        "action_type": "coupon_issuance",
        "destination": "co_test_xyz",
        "status": "issued",
        "created_at": "2026-04-15T10:00:00+00:00",  # 15 days ago, within 30d window
        "result_summary": "coupon=TRY-ME custee_id=custee_repeat email_hash=foo address_hash=bar",
    }]
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch, \
         mock.patch("agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts",
                    return_value=prior_row):
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_repeat",
            actor="luc",
            custee_email="alice@example.com",
            shipping_address="123 Marsh Lane",
        )
        assert result["ok"] is False
        assert result["verdict"] == "rate_limited"
        assert "retry_after" in result
        mock_dispatch.assert_not_called()


def test_try_me_rate_limited_by_address_hash_with_different_email():
    """The abuse-defeat case: same shipping address, different email →
    cross-check matches on address_hash → rate_limited.

    Implementation note: the runner queries the audit ledger with each
    cross-check key separately. We mock to return [] for custee_id and
    email_hash queries, but a row for the address_hash query.
    """
    address = "123 Marsh Lane, Bluffton SC"
    address_hash_expected = spinner_tools._hash_signal(address)
    address_match_row = [{
        "action_id": "act_prior",
        "task_id": "coupon_prior",
        "executor": "luc:T2_FINANCE",
        "action_type": "coupon_issuance",
        "destination": "co_prior",
        "status": "issued",
        "created_at": "2026-04-25T10:00:00+00:00",
        "result_summary": (
            f"coupon=TRY-ME custee_id=different_custee "
            f"email_hash=different_email_hash address_hash={address_hash_expected}"
        ),
    }]

    def fake_query(action_type, since_iso, summary_substr=None, **_kwargs):
        # Only return the prior row when the query is scanning for the
        # address_hash signal — this reproduces the actual runner behavior
        # where the cross-check walks each signal key in turn.
        if summary_substr and f"address_hash={address_hash_expected}" in summary_substr:
            return address_match_row
        return []

    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch") as mock_dispatch, \
         mock.patch(
            "agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts",
            side_effect=fake_query,
        ):
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="brand_new_custee_id",          # different custee
            actor="luc",
            custee_email="totally-different@example.com",  # different email
            shipping_address=address,                  # SAME address
        )
        assert result["ok"] is False
        assert result["verdict"] == "rate_limited"
        assert "match_address_hash" in result["reason"]
        mock_dispatch.assert_not_called()


def test_welcome10_no_rate_limit_uses_no_query():
    """Coupons without `rate_limit_days` skip the cross-check entirely.
    `WELCOME10` is `single_use_per_email:True` but Stripe enforces that
    on the redemption side (Promotion Code metadata). Runner-side has
    no rate-limit work to do."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch", return_value=_hawk_ok(stripe_coupon_id="co_welcome")), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts") as mock_query, \
         mock.patch("agents.shared.spinner_tools._audit_ledger.insert_action_receipt"):
        result = spinner_tools.issue_coupon(
            coupon_code="WELCOME10",
            custee_id="custee_first_order",
            actor="luc",
            custee_email="firsttimer@example.com",
            shipping_address="anywhere",
        )
        assert result["ok"] is True
        # No rate-limit query ran — WELCOME10 has no `rate_limit_days`
        mock_query.assert_not_called()


# ---------------------------------------------------------------------------
# 3. Hash-signal stability
# ---------------------------------------------------------------------------

def test_hash_signal_normalizes_case_and_whitespace():
    """The cross-check is meaningless if `Alice@Example.com` and
    `alice@example.com` produce different hashes."""
    a = spinner_tools._hash_signal("Alice@Example.com  ")
    b = spinner_tools._hash_signal("alice@example.com")
    c = spinner_tools._hash_signal("ALICE@EXAMPLE.COM")
    assert a == b == c
    # Different emails do produce different hashes
    d = spinner_tools._hash_signal("bob@example.com")
    assert d != a


def test_hash_signal_handles_empty():
    """Empty/None signal → predictable empty-string hash; the cross-check
    skips empty signals (per `_check_coupon_rate_limit` `if not sig`)."""
    h_empty = spinner_tools._hash_signal("")
    h_whitespace = spinner_tools._hash_signal("   ")
    assert h_empty == h_whitespace


# ---------------------------------------------------------------------------
# 4. Hawk-side failure surfacing
# ---------------------------------------------------------------------------

def test_hawk_unreachable_surfaces_envelope_no_audit_emit():
    """When Chicken Hawk is unreachable, the runner returns the dispatch
    envelope verbatim AND does NOT emit an audit-ledger row (issuance
    didn't happen). Critical for the rate-limit cross-check correctness:
    a failed dispatch must not falsely block future issuances."""
    with mock.patch("agents.shared.spinner_tools.chicken_hawk.dispatch", return_value=_hawk_unreachable()), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.query_recent_action_receipts", return_value=[]), \
         mock.patch("agents.shared.spinner_tools._audit_ledger.insert_action_receipt") as mock_emit:
        result = spinner_tools.issue_coupon(
            coupon_code="TRY-ME",
            custee_id="custee_recovery_test",
            actor="luc",
            custee_email="recovery@example.com",
            shipping_address="recovery street",
        )
        assert result["ok"] is False
        assert result["verdict"] == "unreachable"
        # No audit emit when dispatch fails — issuance didn't happen
        mock_emit.assert_not_called()
