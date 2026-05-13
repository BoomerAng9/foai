"""Coastal Brewing Co. — 3-6-9 cadence pricing helper.

Single source of truth for the C|Brew cadence schedule. Owner-ratified
2026-05-11 (mirrors A.I.M.S. Tesla 3-6-9 + existing Coastal billing
matrix Dimension 1).

Every C|Brew tier publishes a single monthly retail price. From that,
four cadence options derive deterministically:
    monthly : 0% off,  pay 1, deliver 1
    3mo     : 15% off, pay 3, deliver 3
    6mo     : 20% off, pay 6, deliver 6
    9mo     : 25% off, pay 9, deliver 12  ← the "pay 9, get 12" headline

No Stripe SDK calls, no DB, no HTTP. The api_server layer wraps this.
"""
from __future__ import annotations

import time as _time
from typing import Literal


CadenceId = Literal["monthly", "3mo", "6mo", "9mo"]


# Cadence definitions — DO NOT EDIT without updating
# `cbrew-369-pricing-canon-2026-05-11.md` first.
CADENCES: dict[CadenceId, dict] = {
    "monthly": {
        "label": "Month-to-month",
        "discount": 0.00,
        "months_paid": 1,
        "months_delivered": 1,
        "stripe_interval": "month",
        "stripe_interval_count": 1,
        "framing": "Standard. No commitment.",
    },
    "3mo": {
        "label": "3-month plan",
        "discount": 0.15,
        "months_paid": 3,
        "months_delivered": 3,
        "stripe_interval": "month",
        "stripe_interval_count": 3,
        "framing": "First commitment — supporting us.",
    },
    "6mo": {
        "label": "6-month plan",
        "discount": 0.20,
        "months_paid": 6,
        "months_delivered": 6,
        "stripe_interval": "month",
        "stripe_interval_count": 6,
        "framing": "Balance — buying into the mission.",
    },
    "9mo": {
        "label": "9-month plan (pay 9, get 12)",
        "discount": 0.25,
        "months_paid": 9,
        "months_delivered": 12,
        "stripe_interval": "month",
        "stripe_interval_count": 12,
        "framing": "Full support — pay 9, get 12.",
    },
}


def is_valid_cadence(cadence: str) -> bool:
    """True if cadence is one of the four canon C|Brew cadences."""
    return cadence in CADENCES


def cadence_total(monthly_retail: float, cadence: CadenceId) -> float:
    """Return the at-cadence total payment for a tier with the given
    monthly retail price.

    Examples (Coastal Custee Card, annual headline $199 ⇒ derived monthly $29.48):
        cadence_total(29.48, "monthly") → 29.48
        cadence_total(29.48, "3mo")     → 75.17  (3 * 29.48 * 0.85)
        cadence_total(29.48, "6mo")     → 141.50 (6 * 29.48 * 0.80)
        cadence_total(29.48, "9mo")     → 198.99 (9 * 29.48 * 0.75 ≈ round headline $199)
    """
    if not is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")
    spec = CADENCES[cadence]
    return spec["months_paid"] * monthly_retail * (1 - spec["discount"])


def cadence_total_cents(monthly_retail: float, cadence: CadenceId) -> int:
    """Same as cadence_total but rounded to integer cents — for Stripe."""
    return round(cadence_total(monthly_retail, cadence) * 100)


def cadence_monthly_billing_cents(monthly_retail: float, cadence: CadenceId) -> int:
    """Customer-facing per-month billing amount in cents for the chosen
    cadence.

    Owner directive 2026-05-11: 3/6/9 plans are INSTALLMENTS — Stripe bills
    this amount monthly for `months_paid` months. Equals
    `monthly_retail * (1 - cadence.discount)` rounded to integer cents.

    Distinct from `monthly_equivalent` in `cadence_pricing_table()` which
    spreads total over `months_delivered` (marketing comparison only).
    """
    if not is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")
    spec = CADENCES[cadence]
    return round(monthly_retail * (1 - spec["discount"]) * 100)


def months_delivered(cadence: CadenceId) -> int:
    """How many months of access this cadence delivers (9mo → 12)."""
    if not is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")
    return CADENCES[cadence]["months_delivered"]


def equivalent_yearly_cost(monthly_retail: float, cadence: CadenceId) -> float:
    """Annualized cost when the customer renews at this cadence enough
    times to cover 12 months of delivery.

    monthly: 12 renewals / yr  → 12 * monthly_retail
    3mo:     4 renewals / yr   → 4 * cadence_total
    6mo:     2 renewals / yr   → 2 * cadence_total
    9mo:     1 renewal / yr    → 1 * cadence_total (delivers full 12 mo)
    """
    if not is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")
    delivered = months_delivered(cadence)
    renewals_per_year = 12 / delivered
    return cadence_total(monthly_retail, cadence) * renewals_per_year


def yearly_savings_pct(monthly_retail: float, cadence: CadenceId) -> float:
    """Percent saved per year vs straight-monthly billing."""
    if not is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")
    if cadence == "monthly":
        return 0.0
    baseline = 12 * monthly_retail
    actual = equivalent_yearly_cost(monthly_retail, cadence)
    return (baseline - actual) / baseline


def monthly_retail_from_annual(annual_headline: float) -> float:
    """Derive the monthly-retail anchor BACKWARD from a round annual headline
    so that the 9-mo cadence lands EXACTLY on `annual_headline`.

    The annual headline is the customer-facing canonical number ($49 / $99 /
    $199 / $499 / $999). Monthly retail is a derived figure — fine to carry
    extra decimal places internally; display rounds to 2dp.

    9mo total = 9 * monthly * (1 - 0.25) = 6.75 * monthly
    ⇒ monthly = annual_headline / 6.75
    """
    spec = CADENCES["9mo"]
    divisor = spec["months_paid"] * (1 - spec["discount"])
    return annual_headline / divisor


def subscription_data_for_cadence(
    cadence_id: str,
    metadata: dict,
    *,
    now_unix: int | None = None,
) -> dict:
    """Build the `subscription_data` dict for
    `stripe.checkout.Session.create(mode="subscription", ...)` that
    encodes the cadence's cancel horizon.

    Owner-canon: 3mo / 6mo / 9mo are INSTALLMENT plans — the customer
    pays N months at the discounted rate and Stripe stops billing.
    Without a cancel horizon, Stripe interprets `{interval: month}`
    as a perpetual month-to-month subscription at the discounted
    rate, which would (a) bill past the intended term forever and
    (b) let a 9mo signup cancel after one cycle and walk away with
    the 25% discount for one month. Both bad.

    Stripe's Checkout Session API REJECTS `cancel_at` inside
    `subscription_data` (it's a Subscription-level field, not a
    Checkout-Session-level one). So we embed the horizon as
    `cancel_at_unix` in subscription metadata at mint time; the
    /stripe/webhook handler reads it on `checkout.session.completed`
    and applies it via `stripe.Subscription.modify(sub_id,
    cancel_at=...)` after the Subscription exists. The brief race
    window between Subscription creation and the Modify call is
    harmless — cancel_at affects future renewals, not the first
    invoice.

    monthly cadence has no horizon — perpetual month-to-month is the
    intended behavior there.

    `now_unix` is injected for deterministic testing; production
    callers omit it and the function uses `time.time()`.
    """
    md = dict(metadata)
    if cadence_id != "monthly":
        spec = CADENCES.get(cadence_id)  # type: ignore[arg-type]
        if spec:
            months_paid = int(spec.get("months_paid", 0))
            if months_paid > 0:
                # Use 30.5-day months (mean calendar month) so a 9-
                # month plan signed up Jan 1 cancels around Oct 7,
                # not Sep 27. First charge is immediate, so the
                # horizon = now + months_paid * mean_month_seconds
                # lines the final charge up roughly on the
                # anniversary. Stored as string because Stripe
                # metadata values are strings.
                seconds_per_month = int(30.5 * 86400)
                now = _time.time() if now_unix is None else now_unix
                md["cancel_at_unix"] = str(
                    int(now) + months_paid * seconds_per_month
                )
    return {"metadata": md}


def cadence_pricing_table(monthly_retail: float) -> list[dict]:
    """Build a JSON-friendly cadence pricing table for the frontend
    cadence picker. Each row is a single cadence option with all the
    numbers needed for display.
    """
    rows: list[dict] = []
    for cadence_id in ("monthly", "3mo", "6mo", "9mo"):
        spec = CADENCES[cadence_id]
        total = cadence_total(monthly_retail, cadence_id)  # type: ignore[arg-type]
        delivered = spec["months_delivered"]
        rows.append({
            "cadence_id": cadence_id,
            "label": spec["label"],
            "framing": spec["framing"],
            "discount_pct": int(spec["discount"] * 100),
            "months_paid": spec["months_paid"],
            "months_delivered": delivered,
            "total_charge": round(total, 2),
            # Customer's actual monthly Stripe bill — total / months_paid.
            # Owner-ratified 2026-05-11: 3/6/9 plans are INSTALLMENTS;
            # this is the per-month figure the Custee sees on their card.
            "monthly_billing": round(total / spec["months_paid"], 2),
            # Marketing comparison figure — total spread over months_delivered
            # (e.g., 9mo plan over 12 months of delivery). Lower than
            # monthly_billing on the 9mo plan; equal otherwise.
            "monthly_equivalent": round(total / delivered, 2),
            "yearly_savings_pct": round(
                yearly_savings_pct(monthly_retail, cadence_id) * 100, 1  # type: ignore[arg-type]
            ),
        })
    return rows
