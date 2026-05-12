"""Coastal Brewing Co. — $6.54 service-initiation fee pure logic.

Owner-ratified canon 2026-05-11: the $6.54 service-initiation fee is
NOT bundled into tier subscription checkouts. It fires once per Custee
on the FIRST of either:
  (a) Meeting Mode trial start, OR
  (b) First standard-prices (à la carte) retail order.

Audit-ledger gated — once paid, future attempts return the existing
entry and no second Stripe Checkout Session is minted.

Pure logic — no Stripe SDK calls, no DB, no HTTP. The api_server layer
wraps this with persistence and Stripe Checkout Session minting.
"""
from __future__ import annotations

import hashlib


SERVICE_INIT_AMOUNT_CENTS = 654

ALLOWED_TRIGGERS = frozenset({"trial", "retail_first_purchase"})


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def make_service_init_intent_id(*, email: str, day_iso: str) -> str:
    """Mint a deterministic intent id from (email, day). Same inputs →
    same id, used as the Stripe Checkout metadata anchor and the
    ledger entry key for idempotency."""
    normalized = _normalize_email(email)
    payload = f"{normalized}|{day_iso}".encode()
    digest = hashlib.sha256(payload).hexdigest()[:16]
    return f"sii_{digest}"


def has_paid_service_init(email: str, *, ledger: dict) -> bool:
    """True if a confirmed-paid entry exists for this email.

    A "pending" sentinel (Stripe Checkout Session minted but webhook
    not yet delivered) returns False so the caller treats it as
    unpaid — but the caller-side double-charge guard at
    `/api/service-initiation/charge` still short-circuits on pending
    so the same Session is reused instead of a new one being minted.
    """
    key = _normalize_email(email)
    entry = ledger.get(key)
    if not entry:
        return False
    # Legacy entries without a `status` field are paid by default
    # (status was introduced 2026-05-12 PM in the double-charge fix).
    return entry.get("status", "paid") == "paid"


def record_service_init_paid(
    *,
    email: str,
    ledger: dict,
    intent_id: str,
    trigger: str,
    stripe_session_id: str,
    paid_at_iso: str,
) -> dict:
    """Record a paid service-initiation entry. Idempotent — if an entry
    is already marked `paid`, return it unchanged (first payment wins).
    If the existing entry is a `pending` sentinel (minted by /charge
    but webhook hadn't landed yet), this promotes it to `paid` and
    keeps the original intent_id + stripe_session_id.
    """
    if trigger not in ALLOWED_TRIGGERS:
        raise ValueError(
            f"unknown trigger: {trigger!r} (allowed: {sorted(ALLOWED_TRIGGERS)})"
        )

    key = _normalize_email(email)
    existing = ledger.get(key)
    if existing and existing.get("status", "paid") == "paid":
        return dict(existing)

    entry = {
        "status": "paid",
        "paid_at": paid_at_iso,
        "intent_id": intent_id,
        "trigger": trigger,
        "stripe_session_id": stripe_session_id,
    }
    ledger[key] = entry
    return dict(entry)


def build_checkout_params(
    *,
    customer_email: str,
    intent_id: str,
    trigger: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for the $6.54
    service-initiation one-time charge. Pure dict — caller passes to
    `stripe.checkout.Session.create(**params)`.

    mode="payment" (NOT subscription) — one-time charge, distinct from
    the tier subscription checkouts.
    """
    if trigger not in ALLOWED_TRIGGERS:
        raise ValueError(
            f"unknown trigger: {trigger!r} (allowed: {sorted(ALLOWED_TRIGGERS)})"
        )
    metadata = {
        "product": "coastal-brewing",
        "flow": "service_initiation",
        "intent_id": intent_id,
        "trigger": trigger,
        "customer_email": _normalize_email(customer_email),
    }
    return {
        "mode": "payment",
        "customer_email": customer_email,
        "line_items": [{
            "price_data": {
                "currency": "usd",
                "unit_amount": SERVICE_INIT_AMOUNT_CENTS,
                "product_data": {
                    "name": "Coastal Brewing Co. — Service Initiation",
                    "description": (
                        "One-time onboarding fee. Covers Custee setup, "
                        "first-shipment label minting, and welcome materials."
                    ),
                    "metadata": {"intent_id": intent_id, "trigger": trigger},
                },
            },
            "quantity": 1,
        }],
        "metadata": metadata,
        "payment_intent_data": {"metadata": metadata},
        "success_url": f"{public_url}/service-initiation/thank-you?intent={intent_id}",
        "cancel_url": f"{public_url}/service-initiation?canceled=1",
    }
