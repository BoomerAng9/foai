"""Coastal Brewing Co. — tier envelope + cost-floor pure logic.

Gates the 3 tier checkout endpoints (Pooler Pass / Custee Card / Wood
Stork) before Stripe Checkout Session mint. Basket within tier
envelope AND every item above its cost-floor → ok. Otherwise the
endpoint returns 400 with an upgrade-tier upsell.

Owner-ratified 2026-05-11: tier signals BOTH audience (local /
national / B2B) AND envelope size (monthly product retail cap).
Within the envelope, Custees mix-and-match products freely via the
existing ProductMatrixPicker UX.

Pure logic — no Stripe, no DB, no HTTP. The api_server layer wraps
this module.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import owner_config_loader as _loader


PER_ITEM_FLOOR_OVER_COST_CENTS = 150  # $1.50 floor over cost per item per month

# Hard-coded fallback — used when pricing-config.json is missing or the tier
# key is absent.  Values are intentionally kept in sync with the JSON seed.
_TIER_ENVELOPES_CENTS_FALLBACK: dict[str, int] = {
    "pooler-pass-standard": 1500,
    "pooler-pass-plus": 3000,
    "custee-card": 6000,
    "wood-stork-standard": 15000,
    "wood-stork-reserve": 30000,
}


def _config_dir() -> Path:
    return Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config"))


def _envelope_cents() -> dict[str, int]:
    """Return the tier-envelope-max dict from pricing-config.json.

    Falls back to the hard-coded dict if the config file is missing or
    ``tier_envelope_max_cents`` is absent — preserving the canon-anchor
    pattern documented in memory feedback_coastal_tier_monthly_retail_is_canon_anchor.
    The loader uses mtime-based caching so per-request overhead is one
    os.stat() call only.
    """
    cfg = _loader.load_json(_config_dir() / "pricing-config.json")
    loaded: dict[str, int] = cfg.get("tier_envelope_max_cents", {})
    return loaded if loaded else _TIER_ENVELOPES_CENTS_FALLBACK


_TIER_UPGRADE_CHAIN: dict[str, str | None] = {
    "pooler-pass-standard": "pooler-pass-plus",
    "pooler-pass-plus": "custee-card",
    "custee-card": "wood-stork-standard",
    "wood-stork-standard": "wood-stork-reserve",
    "wood-stork-reserve": None,
}


def tier_envelope_cents(tier: str) -> int:
    """Return the monthly product retail cap for a tier, in cents."""
    envelopes = _envelope_cents()
    if tier not in envelopes:
        raise ValueError(f"unknown tier: {tier!r}")
    return envelopes[tier]


def next_tier(tier: str) -> str | None:
    """Return the next tier up the upgrade ladder, or None for the top tier."""
    if tier not in _TIER_UPGRADE_CHAIN:
        raise ValueError(f"unknown tier: {tier!r}")
    return _TIER_UPGRADE_CHAIN[tier]


@dataclass(frozen=True)
class EnvelopeResult:
    """Outcome of running a basket through tier envelope + floor checks."""

    ok: bool
    tier: str
    basket_retail_cents: int
    envelope_max_cents: int
    floor_cents: int
    exceeds_envelope: bool
    below_floor: bool
    upgrade_to: str | None
    reason: str | None


def check_envelope(*, tier: str, basket: list[dict]) -> EnvelopeResult:
    """Run a basket through the tier envelope and per-item cost-floor checks.

    basket items shape: {"product_id": str, "monthly_retail_cents": int,
    "monthly_cost_cents": int}. monthly_cost_cents is optional only for
    informational purposes; if absent the per-item floor check is skipped.
    """
    envelope_max = tier_envelope_cents(tier)  # raises ValueError on unknown tier

    basket_retail_cents = sum(int(it.get("monthly_retail_cents", 0)) for it in basket)

    floor_cents = 0
    below_floor = False
    for item in basket:
        cost = item.get("monthly_cost_cents")
        retail = int(item.get("monthly_retail_cents", 0))
        if cost is None:
            continue
        item_floor = int(cost) + PER_ITEM_FLOOR_OVER_COST_CENTS
        floor_cents += item_floor
        if retail < item_floor:
            below_floor = True

    exceeds_envelope = basket_retail_cents > envelope_max

    reason: str | None = None
    upgrade_to: str | None = None

    if below_floor:
        reason = (
            "one or more items below the cost-floor "
            f"(retail must be ≥ cost + ${PER_ITEM_FLOOR_OVER_COST_CENTS/100:.2f})"
        )

    if exceeds_envelope:
        upgrade_to = next_tier(tier)
        if upgrade_to:
            reason = (
                f"basket retail ${basket_retail_cents/100:.2f} exceeds "
                f"{tier} envelope ${envelope_max/100:.2f} — upgrade to {upgrade_to}"
            )
        else:
            reason = (
                f"basket retail ${basket_retail_cents/100:.2f} exceeds "
                f"{tier} envelope ${envelope_max/100:.2f} — contact sales for custom enterprise pricing"
            )

    ok = not (exceeds_envelope or below_floor)

    return EnvelopeResult(
        ok=ok,
        tier=tier,
        basket_retail_cents=basket_retail_cents,
        envelope_max_cents=envelope_max,
        floor_cents=floor_cents,
        exceeds_envelope=exceeds_envelope,
        below_floor=below_floor,
        upgrade_to=upgrade_to,
        reason=reason,
    )
