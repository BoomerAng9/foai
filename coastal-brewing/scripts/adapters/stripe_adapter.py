"""Stripe adapter for Coastal Brewing — Option C: runner handles checkout directly.

Coastal customers are coffee buyers, not Deploy Platform users. They never need
a developer-platform account. Customer email + tier choice → Stripe checkout
session → success/cancel URLs back at brewing.foai.cloud.

api_server.py wires this adapter behind /checkout and /stripe/webhook.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import stripe

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_API_VERSION = "2026-02-25.clover"

PRICE_ID_ENV = {
    "coffee_monthly": "STRIPE_COASTAL_COFFEE_SUB_PRICE_ID",
    "tea_monthly": "STRIPE_COASTAL_TEA_SUB_PRICE_ID",
    "combo_monthly": "STRIPE_COASTAL_COMBO_SUB_PRICE_ID",
}


def is_configured() -> bool:
    return bool(STRIPE_SECRET_KEY)


def get_price_id(tier: str) -> Optional[str]:
    env_name = PRICE_ID_ENV.get(tier)
    if not env_name:
        return None
    return os.environ.get(env_name) or None


def create_checkout_session(
    tier: str,
    customer_email: str,
    success_url: str,
    cancel_url: str,
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY not configured")
    price_id = get_price_id(tier)
    if not price_id:
        raise ValueError(f"Stripe price ID not configured for tier '{tier}'")

    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_version = STRIPE_API_VERSION

    md = {"product": "coastal-brewing", "tier": tier}
    if metadata:
        md.update({k: str(v) for k, v in metadata.items()})

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=customer_email,
        line_items=[{"price": price_id, "quantity": 1}],
        metadata=md,
        subscription_data={"metadata": md},
        success_url=success_url,
        cancel_url=cancel_url,
    )

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "tier": tier,
        "product": "coastal-brewing",
    }


def verify_webhook(payload: bytes, sig_header: str) -> dict[str, Any]:
    if not STRIPE_WEBHOOK_SECRET:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
