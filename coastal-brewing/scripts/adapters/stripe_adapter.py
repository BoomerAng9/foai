"""Stripe adapter for Coastal Brewing — Option C: runner handles checkout directly.

Two checkout paths:
- Subscriptions (coffee_monthly / tea_monthly / combo_monthly) — uses pre-created
  Stripe products via STRIPE_COASTAL_*_SUB_PRICE_ID envs.
- One-time orders — uses inline price_data so any catalog SKU can check out
  without owner-side Stripe Dashboard setup. The product name + amount come
  from the catalog; owner creates dashboard products later for analytics.

Both paths stash the full intake (customer + shipping + product) into the
session metadata. /stripe/webhook reads it on checkout.session.completed
and auto-fires /run for the order — closing the round trip without a
second API call from the storefront.
"""
from __future__ import annotations

import json
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


def _init_stripe() -> None:
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_version = STRIPE_API_VERSION


def create_checkout_session(
    tier: str,
    customer_email: str,
    success_url: str,
    cancel_url: str,
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Subscription checkout. Requires STRIPE_COASTAL_*_SUB_PRICE_ID set up
    in Stripe Dashboard first."""
    _init_stripe()
    price_id = get_price_id(tier)
    if not price_id:
        raise ValueError(f"Stripe price ID not configured for tier '{tier}'")

    md = {"product": "coastal-brewing", "tier": tier, "mode": "subscription"}
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
        "mode": "subscription",
        "product": "coastal-brewing",
    }


def create_one_time_checkout_session(
    sku: str,
    product_name: str,
    amount_cents: int,
    quantity: int,
    customer_email: str,
    success_url: str,
    cancel_url: str,
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """One-time checkout for catalog SKUs. Uses inline price_data so any
    SKU works without pre-creating a Stripe Dashboard product. amount_cents
    is the per-unit price; line_items scales by quantity."""
    _init_stripe()

    if amount_cents <= 0:
        raise ValueError(f"amount_cents must be positive, got {amount_cents}")
    if quantity < 1 or quantity > 99:
        raise ValueError(f"quantity must be between 1 and 99, got {quantity}")

    md = {"product": "coastal-brewing", "sku": sku, "mode": "one_time"}
    if metadata:
        md.update({k: str(v) for k, v in metadata.items()})

    session = stripe.checkout.Session.create(
        mode="payment",
        customer_email=customer_email,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": product_name,
                        "metadata": {"sku": sku},
                    },
                },
                "quantity": quantity,
            }
        ],
        metadata=md,
        payment_intent_data={"metadata": md},
        success_url=success_url,
        cancel_url=cancel_url,
        # Capture shipping at Stripe Checkout (we already have it but Stripe's
        # form is a useful safety net + tax / shipping rate calc later).
        billing_address_collection="auto",
    )

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "sku": sku,
        "mode": "one_time",
        "product": "coastal-brewing",
    }


def verify_webhook(payload: bytes, sig_header: str) -> dict[str, Any]:
    """Verify the Stripe webhook signature and return the event as a
    plain dict.

    Stripe SDK v15 dropped `.get()` from `StripeObject`, so the typed
    `stripe.Event` returned by `construct_event` no longer supports
    `event.get("type")` patterns — those raise AttributeError. We
    therefore use `construct_event` purely for signature verification
    (it raises on tamper / bad sig) and return the parsed-JSON payload
    so callers can use ordinary dict access. The declared return type
    has always been `dict[str, Any]`; this just makes the runtime
    behavior match the contract.
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    return json.loads(payload.decode("utf-8"))
