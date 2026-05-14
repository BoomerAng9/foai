"""Stripe Checkout + Customer Portal helpers for the Companion paid tier."""
from __future__ import annotations

import os
from typing import Any


def companion_price_id() -> str:
    pid = os.environ.get("COASTAL_STRIPE_COMPANION_PRICE_ID", "").strip()
    if not pid:
        raise RuntimeError("COASTAL_STRIPE_COMPANION_PRICE_ID not configured")
    return pid


def public_url() -> str:
    return os.environ.get("COASTAL_PUBLIC_URL", "https://brewing.foai.cloud")


def build_checkout_params(*, customer_email: str, coastal_uid: str) -> dict[str, Any]:
    """Stripe Checkout Session params for the Companion paid tier."""
    metadata = {
        "product": "cbrew-communication-companion",
        "flow": "companion_paid_tier",
        "coastal_uid": coastal_uid,
    }
    return {
        "mode": "subscription",
        "customer_email": customer_email,
        "line_items": [{"price": companion_price_id(), "quantity": 1}],
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "success_url": f"{public_url()}/companion?welcome=1",
        "cancel_url": f"{public_url()}/companion?canceled=1",
    }
