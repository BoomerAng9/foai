"""Pytest for `scripts/service_initiation.py`.

The $6.54 service-initiation fee fires once per Custee on either:
  (a) Meeting Mode trial start, OR
  (b) first standard-prices (à la carte) retail order.

Audit-ledger gated — once paid, future attempts return already_paid=True
without minting a second Stripe Checkout Session.

Pure logic — no Stripe, no DB, no HTTP. The api_server layer wraps this.

Run: `python -m pytest tests/test_service_initiation.py -v`
"""
from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


# ────────────────────────── canon ──────────────────────────


def test_amount_cents_is_654():
    """Owner-ratified canon 2026-05-11: $6.54 per Custee, once."""
    import service_initiation  # noqa: PLC0415

    assert service_initiation.SERVICE_INIT_AMOUNT_CENTS == 654


def test_allowed_triggers_are_trial_and_retail_first_purchase():
    """Two surfaces fire the fee — no others."""
    import service_initiation  # noqa: PLC0415

    assert "trial" in service_initiation.ALLOWED_TRIGGERS
    assert "retail_first_purchase" in service_initiation.ALLOWED_TRIGGERS
    assert len(service_initiation.ALLOWED_TRIGGERS) == 2


def test_make_intent_id_is_deterministic_per_email_day():
    """Same (email, day) → same intent id. Idempotency anchor."""
    import service_initiation  # noqa: PLC0415

    a = service_initiation.make_service_init_intent_id(
        email="custee@example.com", day_iso="2026-05-11",
    )
    b = service_initiation.make_service_init_intent_id(
        email="custee@example.com", day_iso="2026-05-11",
    )
    assert a == b
    assert a.startswith("sii_")


def test_make_intent_id_differs_by_email():
    import service_initiation  # noqa: PLC0415

    a = service_initiation.make_service_init_intent_id(
        email="custee@example.com", day_iso="2026-05-11",
    )
    b = service_initiation.make_service_init_intent_id(
        email="other@example.com", day_iso="2026-05-11",
    )
    assert a != b


# ────────────────────────── idempotency via ledger ──────────────────────────


def test_has_paid_false_for_unknown_email():
    """Empty ledger → not paid."""
    import service_initiation  # noqa: PLC0415

    assert service_initiation.has_paid_service_init("custee@example.com", ledger={}) is False


def test_has_paid_true_after_record():
    """Recording a paid entry → has_paid_service_init returns True."""
    import service_initiation  # noqa: PLC0415

    ledger: dict = {}
    service_initiation.record_service_init_paid(
        email="custee@example.com",
        ledger=ledger,
        intent_id="sii_abc123",
        trigger="trial",
        stripe_session_id="cs_test_xyz",
        paid_at_iso="2026-05-11T14:30:00Z",
    )

    assert service_initiation.has_paid_service_init("custee@example.com", ledger=ledger) is True


def test_record_returns_entry_with_canon_fields():
    """Recording returns the ledger entry shape for downstream consumers
    (audit telegram, success page)."""
    import service_initiation  # noqa: PLC0415

    ledger: dict = {}
    entry = service_initiation.record_service_init_paid(
        email="custee@example.com",
        ledger=ledger,
        intent_id="sii_abc123",
        trigger="retail_first_purchase",
        stripe_session_id="cs_test_xyz",
        paid_at_iso="2026-05-11T14:30:00Z",
    )

    assert entry["paid_at"] == "2026-05-11T14:30:00Z"
    assert entry["intent_id"] == "sii_abc123"
    assert entry["trigger"] == "retail_first_purchase"
    assert entry["stripe_session_id"] == "cs_test_xyz"
    # Ledger keyed by lowercase email for case-insensitive idempotency
    assert "custee@example.com" in ledger


def test_record_is_case_insensitive_on_email():
    """Idempotency must be case-insensitive — Custee@Example.COM and
    custee@example.com are the same person."""
    import service_initiation  # noqa: PLC0415

    ledger: dict = {}
    service_initiation.record_service_init_paid(
        email="Custee@Example.COM",
        ledger=ledger,
        intent_id="sii_abc",
        trigger="trial",
        stripe_session_id="cs_test_a",
        paid_at_iso="2026-05-11T14:30:00Z",
    )

    assert service_initiation.has_paid_service_init("custee@example.com", ledger=ledger) is True
    assert service_initiation.has_paid_service_init("CUSTEE@example.com", ledger=ledger) is True


def test_record_rejects_unknown_trigger():
    """Bad trigger → ValueError."""
    import service_initiation  # noqa: PLC0415

    with pytest.raises(ValueError, match="trigger"):
        service_initiation.record_service_init_paid(
            email="custee@example.com",
            ledger={},
            intent_id="sii_abc",
            trigger="random",
            stripe_session_id="cs_test_a",
            paid_at_iso="2026-05-11T14:30:00Z",
        )


def test_record_does_not_overwrite_existing_entry():
    """If a Custee somehow gets a second record call, the original entry
    must be preserved — first payment wins. Caller-side should check
    has_paid_service_init first."""
    import service_initiation  # noqa: PLC0415

    ledger: dict = {}
    first = service_initiation.record_service_init_paid(
        email="custee@example.com",
        ledger=ledger,
        intent_id="sii_first",
        trigger="trial",
        stripe_session_id="cs_test_first",
        paid_at_iso="2026-05-11T14:30:00Z",
    )

    second = service_initiation.record_service_init_paid(
        email="custee@example.com",
        ledger=ledger,
        intent_id="sii_second",
        trigger="retail_first_purchase",
        stripe_session_id="cs_test_second",
        paid_at_iso="2026-06-01T14:30:00Z",
    )

    assert ledger["custee@example.com"]["intent_id"] == "sii_first"
    assert ledger["custee@example.com"]["trigger"] == "trial"
    # second call returns the original entry, not a new one
    assert second["intent_id"] == "sii_first"
    assert first == second


# ────────────────────────── Stripe Checkout params builder ──────────────────────────


def test_build_checkout_params_one_time_payment_mode():
    """The service-init Stripe Checkout Session is a one-time charge —
    NOT a subscription. Distinct from the tier subscription checkouts."""
    import service_initiation  # noqa: PLC0415

    params = service_initiation.build_checkout_params(
        customer_email="custee@example.com",
        intent_id="sii_abc",
        trigger="trial",
        public_url="https://brewing.foai.cloud",
    )

    assert params["mode"] == "payment"
    assert params["customer_email"] == "custee@example.com"
    line_items = params["line_items"]
    assert len(line_items) == 1
    assert line_items[0]["price_data"]["unit_amount"] == 654
    assert line_items[0]["price_data"]["currency"] == "usd"
    assert "initiation" in line_items[0]["price_data"]["product_data"]["name"].lower()
    assert params["metadata"]["intent_id"] == "sii_abc"
    assert params["metadata"]["trigger"] == "trial"
    assert params["metadata"]["flow"] == "service_initiation"
    assert "service-initiation/thank-you" in params["success_url"]
