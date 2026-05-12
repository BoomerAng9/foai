"""Coastal Brewing Co. — Pooler Pass tier pure logic.

No Stripe SDK calls, no DB, no HTTP. The api_server layer wraps this.

Owner-ratified mechanics 2026-05-10 + 3-6-9 cadence pivot 2026-05-11:
  - Pooler Pass Standard / Plus, priced per 3-6-9 cadence canon
    (`cbrew-369-pricing-canon-2026-05-11.md`)
  - Canon monthly retail anchors (§2): Standard $7.49, Plus $14.99
  - The 9-mo cadence total ($50.56 / $101.18) intentionally drifts ABOVE
    the legacy $49 / $99 annual anchors — Sal/LUC/ACHEEVY haggle DOWN
    to those round legacy numbers as built-in negotiation theater.
  - 4 cadences per tier: monthly / 3mo (15% off) / 6mo (20%) / 9mo (25%, deliver 12)
  - Geographic gate: 50-100 mile radius from 31322 (Pooler, GA)
  - Re-verify ZIP at each renewal
  - Out-of-radius signups upsell to Coastal Custee Card (which also runs 3-6-9)

NOTE 2026-05-11 PM: prior implementation used
`cadence.monthly_retail_from_annual()` to force the 9-mo total to land
EXACTLY on the legacy $49 / $99 — that contradicted canon §2 which
specifies clean monthly retail anchors with intentional drift. Constants
are now direct (canon-compliant). See `pricing-canon-correction-2026-05-11.md`.
"""
from __future__ import annotations

from typing import Literal

import cadence  # noqa: F401 — kept for is_valid_cadence + table imports below
from geo import eligibility_band, eligibility_response


# Canon monthly retail anchors per cbrew-369-pricing-canon-2026-05-11.md §2.
# DO NOT derive these from the legacy annual headlines — canon says they
# are the source of truth and the 9-mo total drifts above the legacy
# annual on purpose.
POOLER_PASS_STANDARD_MONTHLY_RETAIL = 7.49
POOLER_PASS_PLUS_MONTHLY_RETAIL = 14.99

POOLER_PASS_STANDARD_PRODUCT_PREFIX = "coastal_membership_pooler_pass_standard"
POOLER_PASS_PLUS_PRODUCT_PREFIX = "coastal_membership_pooler_pass_plus"

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


def monthly_retail_for_tier(tier: PoolerPassTier) -> float:
    """Resolve the monthly retail anchor for a Pooler Pass tier."""
    if tier == "standard":
        return POOLER_PASS_STANDARD_MONTHLY_RETAIL
    if tier == "plus":
        return POOLER_PASS_PLUS_MONTHLY_RETAIL
    raise ValueError(f"unknown Pooler Pass tier: {tier!r}")


def cadence_pricing(tier: PoolerPassTier) -> list[dict]:
    """Return the 4-cadence pricing table for the given Pooler Pass tier."""
    return cadence.cadence_pricing_table(monthly_retail_for_tier(tier))


def stripe_product_id(tier: PoolerPassTier, cadence_id: str) -> str:
    """Resolve the Stripe product ID for a tier × cadence combination.

    Format: `coastal_membership_pooler_pass_{standard|plus}_{monthly|3mo|6mo|9mo}`
    """
    if not cadence.is_valid_cadence(cadence_id):
        raise ValueError(f"unknown cadence: {cadence_id!r}")
    prefix = (
        POOLER_PASS_STANDARD_PRODUCT_PREFIX if tier == "standard"
        else POOLER_PASS_PLUS_PRODUCT_PREFIX
    )
    return f"{prefix}_{cadence_id}"


def build_checkout_params(
    *,
    customer_email: str,
    zip_code: str,
    tier: PoolerPassTier,
    cadence_id: str,
    price_id: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for a Pooler Pass subscription
    at the given 3-6-9 cadence.

    Caller must verify ZIP eligibility BEFORE calling this — the function
    does NOT re-check (api_server layer enforces the gate to avoid double
    network calls / double-validation drift).
    """
    if tier not in ("standard", "plus"):
        raise ValueError(f"unknown Pooler Pass tier: {tier!r}")
    if not cadence.is_valid_cadence(cadence_id):
        raise ValueError(f"unknown cadence: {cadence_id!r}")
    cadence_spec = cadence.CADENCES[cadence_id]
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
            "cadence": cadence_id,
            "months_paid": str(cadence_spec["months_paid"]),
            "months_delivered": str(cadence_spec["months_delivered"]),
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
    cadence_id: str = "9mo",
) -> str:
    """Telegram ping when a new Pooler Pass member signs up."""
    label = "Standard" if tier == "standard" else "Plus"
    band, _ = eligibility_band(zip_code)
    band_label = "Local" if band == "local" else "Extended Local"
    distance_str = f"{distance_mi:.1f} mi" if distance_mi is not None else "(unknown)"
    monthly_retail = monthly_retail_for_tier(tier)
    cad_total = cadence.cadence_total(monthly_retail, cadence_id)  # type: ignore[arg-type]
    cad_spec = cadence.CADENCES[cadence_id]
    cad_label = cad_spec["label"]
    return (
        f"[Coastal Brewing Co.] new Pooler Pass {label} member\n"
        f"  email:     {customer_email}\n"
        f"  zip:       {zip_code} ({distance_str} from Pooler · {band_label})\n"
        f"  tier:      Pooler Pass {label}\n"
        f"  cadence:   {cad_label} (${cad_total:.2f} charged, "
        f"{cad_spec['months_delivered']}mo access)\n"
        f"  action:    add to Pooler events list; storefront knows your name."
    )
