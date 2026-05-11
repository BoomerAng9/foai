"""Coastal Brewing Co. — Pooler Pass tier pure logic.

No Stripe SDK calls, no DB, no HTTP. The api_server layer wraps this.

Owner-ratified mechanics 2026-05-10:
  - Pooler Pass Standard $49/yr · Plus $99/yr
  - Geographic gate: 50-100 mile radius from 31322 (Pooler, GA)
  - Re-verify ZIP at each annual renewal
  - Out-of-radius signups upsell to Coastal Custee Card ($199/yr)
"""
from __future__ import annotations

from typing import Literal

from geo import eligibility_band, eligibility_response


POOLER_PASS_STANDARD_PRODUCT_ID = "coastal_membership_pooler_pass_standard_annual"
POOLER_PASS_PLUS_PRODUCT_ID = "coastal_membership_pooler_pass_plus_annual"

PoolerPassTier = Literal["standard", "plus"]


def is_zip_eligible(zip_code: str) -> bool:
    """True if the ZIP is in the local or extended local band."""
    band, _ = eligibility_band(zip_code)
    return band in ("local", "extended")


def check_eligibility(zip_code: str) -> dict:
    """Build the JSON-shaped eligibility response.

    Thin wrapper over geo.eligibility_response — kept here so the
    api_server layer imports membership_pooler_pass for both eligibility
    and checkout paths (one module per tier, mirrors membership.py).
    """
    return eligibility_response(zip_code)


def product_id_for_tier(tier: PoolerPassTier) -> str:
    """Resolve the Stripe product ID for the given Pooler Pass tier."""
    if tier == "standard":
        return POOLER_PASS_STANDARD_PRODUCT_ID
    if tier == "plus":
        return POOLER_PASS_PLUS_PRODUCT_ID
    raise ValueError(f"unknown Pooler Pass tier: {tier!r}")


def build_checkout_params(
    *,
    customer_email: str,
    zip_code: str,
    tier: PoolerPassTier,
    price_id: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for a Pooler Pass subscription.

    Caller must verify ZIP eligibility BEFORE calling this — the function
    does NOT re-check (api_server layer enforces the gate to avoid double
    network calls / double-validation drift).
    """
    if tier not in ("standard", "plus"):
        raise ValueError(f"unknown Pooler Pass tier: {tier!r}")
    return {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "customer_email": customer_email,
        "success_url": (
            f"{public_url}/pooler-pass/welcome?session_id={{CHECKOUT_SESSION_ID}}"
        ),
        "cancel_url": f"{public_url}/pooler-pass",
        "metadata": {
            "customer_email": customer_email,
            "zip_code": zip_code,
            "membership_tier": f"pooler_pass_{tier}",
            "flow": "pooler_pass_signup",
            "vertical": "coastal-brewing",
        },
    }


def format_signup_telegram(
    *,
    customer_email: str,
    zip_code: str,
    tier: PoolerPassTier,
    distance_mi: float | None,
) -> str:
    """Telegram ping when a new Pooler Pass member signs up."""
    price = "$49/yr" if tier == "standard" else "$99/yr"
    label = "Standard" if tier == "standard" else "Plus"
    band, _ = eligibility_band(zip_code)
    band_label = "Local" if band == "local" else "Extended Local"
    distance_str = f"{distance_mi:.1f} mi" if distance_mi is not None else "(unknown)"
    return (
        f"[Coastal Brewing Co.] new Pooler Pass {label} member\n"
        f"  email:    {customer_email}\n"
        f"  zip:      {zip_code} ({distance_str} from Pooler · {band_label})\n"
        f"  tier:     Pooler Pass {label} ({price})\n"
        f"  action:   add to Pooler events list; storefront knows your name."
    )
