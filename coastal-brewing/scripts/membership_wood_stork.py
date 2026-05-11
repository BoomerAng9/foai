"""Coastal Brewing Co. — Wood Stork tier pure logic.

No Stripe SDK calls, no DB, no HTTP. The api_server layer wraps this.

Owner-ratified mechanics 2026-05-10 + 3-6-9 cadence pivot 2026-05-11:
  - Wood Stork Standard / Reserve, priced per 3-6-9 cadence canon
    (`cbrew-369-pricing-canon-2026-05-11.md`)
  - Annual headlines (canon): Standard $499, Reserve $999
  - Monthly retail is DERIVED so the 9-mo cadence lands EXACTLY on the
    round annual headline (Standard ≈ $73.93/mo, Reserve = $148.00/mo)
  - 4 cadences per tier: monthly / 3mo (15% off) / 6mo (20%) / 9mo (25%, deliver 12)
  - Referral discount is a TIERED PERCENT on member's own product orders:
      0      → 18% (base Wood Stork)
      1-5    → 25%
      5-10   → 35%
      10-20  → 45%
      20+    → 50% (caps here)
  - Referral discount applies to PRODUCT orders only, NOT membership renewals
    (membership renewals get the 3-6-9 cadence discount instead)
"""
from __future__ import annotations

from typing import Literal

import cadence


# Annual headline anchors (canon): the round number a customer sees as
# "the price for the year". Monthly retail is derived backward so the
# 9-mo cadence lands EXACTLY on this headline.
WOOD_STORK_STANDARD_ANNUAL = 499.0
WOOD_STORK_RESERVE_ANNUAL = 999.0
WOOD_STORK_STANDARD_MONTHLY_RETAIL = cadence.monthly_retail_from_annual(WOOD_STORK_STANDARD_ANNUAL)
WOOD_STORK_RESERVE_MONTHLY_RETAIL = cadence.monthly_retail_from_annual(WOOD_STORK_RESERVE_ANNUAL)

# Stripe product ID prefixes — full ID is `<prefix>_<cadence>` per the
# 4-cadence schedule (e.g. `coastal_membership_wood_stork_standard_9mo`)
WOOD_STORK_STANDARD_PRODUCT_PREFIX = "coastal_membership_wood_stork_standard"
WOOD_STORK_RESERVE_PRODUCT_PREFIX = "coastal_membership_wood_stork_reserve"

WoodStorkTier = Literal["standard", "reserve"]


def monthly_retail_for_tier(tier: WoodStorkTier) -> float:
    """Resolve the monthly retail anchor for a Wood Stork tier."""
    if tier == "standard":
        return WOOD_STORK_STANDARD_MONTHLY_RETAIL
    if tier == "reserve":
        return WOOD_STORK_RESERVE_MONTHLY_RETAIL
    raise ValueError(f"unknown Wood Stork tier: {tier!r}")


def cadence_pricing(tier: WoodStorkTier) -> list[dict]:
    """Return the 4-cadence pricing table for the given Wood Stork tier."""
    return cadence.cadence_pricing_table(monthly_retail_for_tier(tier))


def stripe_product_id(tier: WoodStorkTier, cadence_id: str) -> str:
    """Resolve the Stripe product ID for a tier × cadence combination.

    Format: `coastal_membership_wood_stork_{standard|reserve}_{monthly|3mo|6mo|9mo}`
    """
    if not cadence.is_valid_cadence(cadence_id):
        raise ValueError(f"unknown cadence: {cadence_id!r}")
    prefix = (
        WOOD_STORK_STANDARD_PRODUCT_PREFIX if tier == "standard"
        else WOOD_STORK_RESERVE_PRODUCT_PREFIX
    )
    return f"{prefix}_{cadence_id}"


# Stripe coupon IDs (mint these in dashboard before backend goes live).
COUPON_BASE = "WSTORK_BASE"   # 18% — 0 referrals
COUPON_T1 = "WSTORK_T1"       # 25% — 1-5 referrals
COUPON_T2 = "WSTORK_T2"       # 35% — 5-10 referrals
COUPON_T3 = "WSTORK_T3"       # 45% — 10-20 referrals
COUPON_MAX = "WSTORK_MAX"     # 50% — 20+ referrals (cap)


def discount_for_referral_count(count: int) -> tuple[int, str]:
    """Return (percent_discount, stripe_coupon_id) for a Wood Stork member's
    cumulative successful referral count.

    Per `cbrew-tier-mechanics-spec-2026-05-10.md`:
      0           → 18% / WSTORK_BASE
      1-5 (incl)  → 25% / WSTORK_T1
      6-10 (incl) → 35% / WSTORK_T2
      11-20 (incl)→ 45% / WSTORK_T3
      21+         → 50% / WSTORK_MAX (cap)

    Note: spec language reads "1-5", "5-10", "10-20" with bandedge values
    ambiguous. Per spec §1 "Tier-band edges" clause: edges are inclusive
    of the lower bound; the 6th referral promotes to next band (35%);
    11th promotes to 45%; 21st promotes to 50% cap.
    """
    if count < 0:
        raise ValueError(f"referral count cannot be negative: {count}")
    if count == 0:
        return (18, COUPON_BASE)
    if count <= 5:
        return (25, COUPON_T1)
    if count <= 10:
        return (35, COUPON_T2)
    if count <= 20:
        return (45, COUPON_T3)
    return (50, COUPON_MAX)


def tier_name_from_count(count: int) -> str:
    """Friendly tier name for the email/Telegram congratulations message."""
    if count == 0:
        return "Base Wood Stork"
    if count <= 5:
        return "First wave"
    if count <= 10:
        return "Pollinator"
    if count <= 20:
        return "Power referrer"
    return "Max"


def tier_promoted(old_count: int, new_count: int) -> bool:
    """True if incrementing from old_count to new_count crosses a band edge.

    Used by the api_server layer to fire the ACHEEVY-voiced
    congratulations email + Telegram alert ONLY when the discount
    actually went up.
    """
    old_pct = discount_for_referral_count(old_count)[0]
    new_pct = discount_for_referral_count(new_count)[0]
    return new_pct > old_pct


def is_at_cap(count: int) -> bool:
    """True if the member is at or past the 50% discount cap (20+ refs)."""
    return count >= 21


def build_checkout_params(
    *,
    customer_email: str,
    business_name: str,
    tier: WoodStorkTier,
    cadence_id: str,
    price_id: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for a Wood Stork subscription
    at the given 3-6-9 cadence.

    Pure dict — no SDK call. Caller passes this to
    `stripe.checkout.Session.create(**params)`. The price_id must already
    correspond to the right tier × cadence (caller resolves via env var
    map).
    """
    if tier not in ("standard", "reserve"):
        raise ValueError(f"unknown Wood Stork tier: {tier!r}")
    if not cadence.is_valid_cadence(cadence_id):
        raise ValueError(f"unknown cadence: {cadence_id!r}")
    cadence_spec = cadence.CADENCES[cadence_id]
    return {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "customer_email": customer_email,
        "success_url": (
            f"{public_url}/wood-stork/welcome?session_id={{CHECKOUT_SESSION_ID}}"
        ),
        "cancel_url": f"{public_url}/wood-stork",
        "metadata": {
            "customer_email": customer_email,
            "business_name": business_name,
            "membership_tier": f"wood_stork_{tier}",
            "cadence": cadence_id,
            "months_paid": str(cadence_spec["months_paid"]),
            "months_delivered": str(cadence_spec["months_delivered"]),
            "flow": "wood_stork_signup",
            "vertical": "coastal-brewing",
        },
    }


def format_promotion_telegram(
    *,
    business_name: str,
    customer_email: str,
    new_count: int,
) -> str:
    """Build the Telegram message owner sees when a Wood Stork member
    promotes into a new discount band.

    Customer-facing fields stay customer-facing (business name, email,
    new count). Internal fields (Stripe IDs, coupon names) live in the
    audit ledger, not the owner-channel ping.
    """
    pct, _ = discount_for_referral_count(new_count)
    tier_label = tier_name_from_count(new_count)
    cap_note = "  AT CAP — referrals from here hold at 50%.\n" if is_at_cap(new_count) else ""
    return (
        f"[Coastal Brewing Co.] Wood Stork promotion — {business_name}\n"
        f"  email:           {customer_email}\n"
        f"  new ref count:   {new_count}\n"
        f"  new discount:    {pct}% on product orders\n"
        f"  band:            {tier_label}\n"
        f"{cap_note}"
        f"  action:          ACHEEVY-voiced congratulations email queued."
    )


def format_signup_telegram(
    *,
    business_name: str,
    customer_email: str,
    tier: WoodStorkTier,
    cadence_id: str = "9mo",
) -> str:
    """Telegram ping for a fresh Wood Stork signup."""
    label = "Standard" if tier == "standard" else "Reserve"
    monthly_retail = monthly_retail_for_tier(tier)
    cad_total = cadence.cadence_total(monthly_retail, cadence_id)  # type: ignore[arg-type]
    cad_spec = cadence.CADENCES[cadence_id]
    cad_label = cad_spec["label"]
    return (
        f"[Coastal Brewing Co.] new Wood Stork {label} member — {business_name}\n"
        f"  email:     {customer_email}\n"
        f"  tier:      Wood Stork {label}\n"
        f"  cadence:   {cad_label} (${cad_total:.2f} charged, "
        f"{cad_spec['months_delivered']}mo access)\n"
        f"  action:    account flagged with WSTORK_BASE coupon (18%) on product orders; "
        f"discount tiers up automatically with each successful referral."
    )
