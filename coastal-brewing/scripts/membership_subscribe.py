"""Coastal Brewing Co. — Mercury-backed subscription line-item builder.

Pure logic. No Mercury, no Stripe, no DB, no HTTP. Maps the 4 /pricing-page
subscription SKUs to Mercury invoice line items at the chosen 3-6-9 cadence,
including the one-time $6.54 service initiation fee on the first invoice
only.

The api_server layer wraps this + `lil_mercury_hawk.mint_invoice()` to
fire actual invoices.

Owner canon (2026-05-11):
    coastal-tea-monthly                $26.99 / mo
    coastal-coffee-monthly             $34.99 / mo
    coastal-functional-coffee-monthly  $44.99 / mo
    coastal-combo-monthly              $59.99 / mo
Service initiation (first invoice only): $6.54
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

# Co-locate import for cadence.py — both modules live in scripts/.
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
import cadence as _cadence  # noqa: E402 — aliased so endpoint kwarg can be `cadence`


SERVICE_INITIATION_CENTS = 654  # $6.54 — transparent one-time line on first invoice


SKU_CATALOG: dict[str, dict] = {
    "coastal-tea-monthly": {
        "name": "Tea Monthly",
        "monthly_retail_cents": 2699,
    },
    "coastal-coffee-monthly": {
        "name": "Coffee Monthly",
        "monthly_retail_cents": 3499,
    },
    "coastal-functional-coffee-monthly": {
        "name": "Functional Coffee Monthly",
        "monthly_retail_cents": 4499,
    },
    "coastal-combo-monthly": {
        "name": "Combo Monthly",
        "monthly_retail_cents": 5999,
    },
}


def is_valid_sku(sku: str) -> bool:
    """True if sku is one of the 4 canon /pricing subscription SKUs."""
    return sku in SKU_CATALOG


def sku_monthly_retail_cents(sku: str) -> int:
    """Monthly retail price in cents. Raises KeyError for unknown SKUs;
    callers should check is_valid_sku first if they want a graceful 400."""
    return SKU_CATALOG[sku]["monthly_retail_cents"]


def sku_display_name(sku: str) -> str:
    """Human-readable label for invoice line items + owner Telegram."""
    return SKU_CATALOG[sku]["name"]


def build_invoice_line_items(
    *,
    sku: str,
    cadence: str,
    is_first_invoice: bool,
) -> list[dict]:
    """Return Mercury-invoice line items for a subscription mint.

    First invoice: [subscription line, service_initiation_line]
    Renewal:       [subscription line]

    Subscription line price reflects the cadence discount (3mo=15%, 6mo=20%,
    9mo=25%). The Mercury invoice charges the customer the cadence total
    up-front; Print Press cron schedules the NEXT invoice at the cadence
    interval.

    Raises:
        ValueError: on unknown sku or unknown cadence
    """
    if not is_valid_sku(sku):
        raise ValueError(f"unknown sku: {sku!r}")
    if not _cadence.is_valid_cadence(cadence):
        raise ValueError(f"unknown cadence: {cadence!r}")

    monthly_cents = sku_monthly_retail_cents(sku)
    monthly_retail_dollars = monthly_cents / 100.0
    total_cents = _cadence.cadence_total_cents(monthly_retail_dollars, cadence)  # type: ignore[arg-type]

    cadence_label = _cadence.CADENCES[cadence]["label"]  # type: ignore[index]
    sub_description = (
        f"{sku_display_name(sku)} subscription · first month"
        if cadence == "monthly"
        else f"{sku_display_name(sku)} subscription · {cadence_label}"
    )

    items: list[dict] = [{
        "description": sub_description,
        "quantity": 1,
        "unit_price_cents": total_cents,
    }]

    if is_first_invoice:
        items.append({
            "description": "Service initiation (one-time)",
            "quantity": 1,
            "unit_price_cents": SERVICE_INITIATION_CENTS,
        })

    return items


def make_subscription_intent_id(
    *, email: str, sku: str, cadence: str, day_iso: str,
) -> str:
    """Deterministic intent id for idempotency. Same (email, sku, cadence,
    day) → same id. Lets the endpoint dedupe a Custee double-click without
    minting two Mercury invoices.
    """
    digest = hashlib.sha256(
        f"{email.lower()}|{sku}|{cadence}|{day_iso}".encode("utf-8"),
    ).hexdigest()[:16]
    return f"sub_{digest}"
