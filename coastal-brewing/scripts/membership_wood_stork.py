"""Coastal Brewing Co. — Wood Stork tier pure logic.

No Stripe SDK calls, no DB, no HTTP. The api_server layer wraps this.

Owner-ratified mechanics 2026-05-10:
  - Wood Stork Standard $499/yr · Reserve $999/yr
  - Referral discount is a TIERED PERCENT on member's own product orders:
      0      → 18% (base Wood Stork)
      1-5    → 25%
      5-10   → 35%
      10-20  → 45%
      20+    → 50% (caps here)
  - Discount applies to PRODUCT orders only, not membership renewals,
    not wholesale-pricing tiers
"""
from __future__ import annotations

from typing import Literal


WOOD_STORK_STANDARD_PRODUCT_ID = "coastal_membership_wood_stork_standard_annual"
WOOD_STORK_RESERVE_PRODUCT_ID = "coastal_membership_wood_stork_reserve_annual"

WoodStorkTier = Literal["standard", "reserve"]


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


def product_id_for_tier(tier: WoodStorkTier) -> str:
    """Resolve the Stripe product ID for the given Wood Stork tier."""
    if tier == "standard":
        return WOOD_STORK_STANDARD_PRODUCT_ID
    if tier == "reserve":
        return WOOD_STORK_RESERVE_PRODUCT_ID
    raise ValueError(f"unknown Wood Stork tier: {tier!r}")


def build_checkout_params(
    *,
    customer_email: str,
    business_name: str,
    tier: WoodStorkTier,
    price_id: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for a Wood Stork subscription.

    Pure dict — no SDK call. Caller passes this to
    `stripe.checkout.Session.create(**params)`.
    """
    if tier not in ("standard", "reserve"):
        raise ValueError(f"unknown Wood Stork tier: {tier!r}")
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
) -> str:
    """Telegram ping for a fresh Wood Stork signup."""
    price = "$499/yr" if tier == "standard" else "$999/yr"
    label = "Standard" if tier == "standard" else "Reserve"
    return (
        f"[Coastal Brewing Co.] new Wood Stork {label} member — {business_name}\n"
        f"  email:    {customer_email}\n"
        f"  tier:     Wood Stork {label} ({price})\n"
        f"  action:   account flagged with WSTORK_BASE coupon (18%); "
        f"discount tiers up automatically with each successful referral."
    )
