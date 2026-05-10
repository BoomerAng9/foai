"""The Equation — Coastal canonical matrix billing math.

3-6-9 Tesla Vortex × V.I.B.E. group × Three Pillars (additive uplift,
capped +130%). Same Equation that prices A.I.M.S. plans prices Coastal
coffee. See:

  - `iCloudDrive/.../Claude Code/coastal-business-plan/coastal-matrix-billing-spec.md`
  - `~/.claude/projects/.../memory/feedback_billing_correction.md`
  - `~/.claude/plans/kind-noodling-aurora.md` rev 2 — canonical plan

Public surface (server-internal layer):
  - `compute_effective_price(...)` — applies Frequency × V.I.B.E. × Pillars
  - `compute_floor_internal(...)` — server-only, uses cost data
  - `quote(...)` — master integration: applies Equation, computes floor,
    checks tier authority via `authority_tiers.is_within_authority()`,
    issues an HMAC escalation token if the tier ceiling is breached,
    returns a Quote dict with public + internal fields separated.
  - `strip_internal_fields(quote)` — used by `/api/quote` and other HTTP
    routes BEFORE serialization to remove server-only fields (cost,
    margin, floor) per the cost-protection canon.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional, TypedDict

from agents.shared import authority_tiers


# ---------------------------------------------------------------------------
# Canonical multipliers (immutable — owner edits via spec doc, not code)
# ---------------------------------------------------------------------------

# V.I.B.E. group multiplier per `feedback_billing_correction.md`. Enterprise
# is custom-quoted (returns None) so callers branch into a different code path.
VIBE_MULTIPLIERS: dict[str, Optional[Decimal]] = {
    "individual": Decimal("1.0"),
    "family": Decimal("1.5"),
    "team": Decimal("2.5"),       # also used for Cafe per spec lock
    "cafe": Decimal("2.5"),       # alias
    "enterprise": None,           # custom quote — caller bypasses Equation
}

# Frequency factor — multiplied on top of `effective_unit × qty` when
# the engagement is a subscription (NOT PPU). Per locked answer in
# `coastal-matrix-billing-spec.md` § Locked decisions:
#   - PPU: per-bag, no commitment, no discount
#   - 3-mo: 3 monthly charges → 3 shipments, factor 1.0 (no per-bag discount)
#   - 6-mo: 6 monthly charges → 6 shipments, ~10% off per bag
#   - 9-mo: pay 9 monthly charges → receive 12 shipments, ~25% off per bag
#     (distributed-discount model — Custee pays effective_monthly × 12 in
#     total, billed as 9 charges + 3 free months)
FREQUENCY_FACTORS: dict[str, Decimal] = {
    "ppu": Decimal("1.0"),
    "3-month": Decimal("1.0"),
    "6-month": Decimal("0.90"),
    "9-month-pay9-get12": Decimal("0.75"),
}

# Three Pillar uplifts (additive). Each pillar has 3 levels: Standard (no
# uplift), Verified/Priority/Professional, Guaranteed/Instant/Fortress.
# Spec doc uses customer-facing names (Sourcing/Delivery/Quality); code
# uses canonical AIMS symbols (Confidence/Convenience/Security) for parity
# with `aims-tools/aims-pricing-matrix/`.
PILLAR_UPLIFTS: dict[str, dict[str, Decimal]] = {
    # AIMS canonical symbols (internal/code path)
    "confidence": {
        "standard": Decimal("0.0"),
        "verified": Decimal("0.15"),
        "guaranteed": Decimal("0.35"),
    },
    "convenience": {
        "standard": Decimal("0.0"),
        "priority": Decimal("0.20"),
        "instant": Decimal("0.45"),
    },
    "security": {
        "standard": Decimal("0.0"),
        "professional": Decimal("0.25"),
        "fortress": Decimal("0.50"),
    },
    # Coastal-flavor aliases (customer-facing surface — same uplifts)
    "sourcing": {
        "standard": Decimal("0.0"),
        "verified": Decimal("0.15"),
        "guaranteed": Decimal("0.35"),
    },
    "delivery": {
        "standard": Decimal("0.0"),
        "priority": Decimal("0.20"),
        "instant": Decimal("0.45"),
    },
    "quality": {
        "standard": Decimal("0.0"),
        "professional": Decimal("0.25"),
        "fortress": Decimal("0.50"),
    },
}

# Maximum stacked pillar uplift. Even all-three-pillars-at-top
# (15+45+50 = 110%) won't exceed +130% per AIMS canon.
MAX_STACKED_UPLIFT = Decimal("1.30")

# Global floor: minimum profit-per-deal required to make the deal worth
# doing at all. Owner-tunable in `agents/shared/config.py` once that lands;
# for now it lives here as the canonical default.
MIN_DEAL_VALUE = Decimal("5.00")


# ---------------------------------------------------------------------------
# Quote data shape
# ---------------------------------------------------------------------------
class Quote(TypedDict, total=False):
    # Inputs (always present)
    sku: str
    qty: int
    vibe: str
    pillars: list[str]
    frequency: str
    actor: str
    actor_tier: str
    requested_discount_pct: float
    is_bundle: bool

    # Customer-visible outputs (always present)
    msrp_unit: float
    effective_unit: float
    effective_total: float
    discount_applied_pct: float
    discount_amount: float
    quoted_total: float
    quoted_per_unit: float
    pillar_breakdown: list[dict]

    # Decision metadata (always present)
    escalation_required: bool
    stepper_token: Optional[str]
    tier_ceiling_pct: Optional[float]

    # Server-internal — STRIPPED before HTTP serialization
    _internal_unit_cost: float
    _internal_unit_floor: float
    _internal_order_floor: float
    _internal_max_giveable_pct: float
    _internal_margin: float


_INTERNAL_QUOTE_FIELDS = frozenset({
    "_internal_unit_cost",
    "_internal_unit_floor",
    "_internal_order_floor",
    "_internal_max_giveable_pct",
    "_internal_margin",
})


def strip_internal_fields(quote: Quote) -> dict[str, Any]:
    """Return a copy of `quote` with internal `_internal_*` fields removed.

    `/api/quote` and any other HTTP route MUST call this before serializing
    a Quote to the customer. Server-internal callers (audit-ledger emits,
    margin checks, NemoClaw policy gate) read the full shape directly.
    """
    return {k: v for k, v in quote.items() if k not in _INTERNAL_QUOTE_FIELDS}


# ---------------------------------------------------------------------------
# Equation core
# ---------------------------------------------------------------------------

def _round_money(d: Decimal) -> Decimal:
    """Quantize to 2 decimal places, banker-rounded."""
    return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _resolve_pillar_uplifts(pillars: list[str]) -> tuple[Decimal, list[dict]]:
    """Sum the uplifts for the chosen pillar levels.

    `pillars` is a list of strings like `["sourcing-verified",
    "delivery-priority", "quality-professional"]` — the format that comes
    from the matrix-billing spec docs and the `/api/quote` request body.

    Returns:
        (total_uplift, breakdown) where breakdown is a list of dicts
        suitable for surfacing as line-items on a Custee-facing quote.
    """
    total = Decimal("0.0")
    breakdown: list[dict] = []
    for pillar_token in pillars:
        if "-" not in pillar_token:
            continue  # malformed — skip silently rather than crash the quote
        pillar, level = pillar_token.split("-", 1)
        pillar = pillar.lower()
        level = level.lower()
        if pillar not in PILLAR_UPLIFTS:
            continue
        if level not in PILLAR_UPLIFTS[pillar]:
            continue
        uplift = PILLAR_UPLIFTS[pillar][level]
        total += uplift
        breakdown.append({
            "pillar": pillar,
            "level": level,
            "uplift_pct": float(uplift * 100),
        })
    # Cap at the maximum stacked uplift
    if total > MAX_STACKED_UPLIFT:
        total = MAX_STACKED_UPLIFT
    return total, breakdown


def compute_effective_price(
    msrp: Decimal,
    qty: int,
    vibe: str,
    pillars: list[str],
    frequency: str,
) -> dict[str, Any]:
    """Apply the canonical matrix Equation.

    `effective_unit = msrp × vibe_multiplier × (1 + Σ pillar_uplifts)`
    `effective_total = effective_unit × qty × frequency_factor`

    Returns a dict with the breakdown so callers can show line items.
    """
    msrp = Decimal(str(msrp))
    vibe_mult = VIBE_MULTIPLIERS.get(vibe.lower())
    if vibe_mult is None:
        # Enterprise / unknown — fall back to 1.0 (caller should detect
        # 'enterprise' upstream and route to a custom-quote flow).
        vibe_mult = Decimal("1.0")

    pillar_total, pillar_breakdown = _resolve_pillar_uplifts(pillars)
    freq_factor = FREQUENCY_FACTORS.get(frequency.lower(), Decimal("1.0"))

    effective_unit = msrp * vibe_mult * (Decimal("1.0") + pillar_total)
    effective_total = effective_unit * Decimal(qty) * freq_factor

    return {
        "msrp_unit": float(_round_money(msrp)),
        "vibe_multiplier": float(vibe_mult),
        "pillar_uplift_total": float(pillar_total),
        "pillar_breakdown": pillar_breakdown,
        "frequency_factor": float(freq_factor),
        "effective_unit": float(_round_money(effective_unit)),
        "effective_total": float(_round_money(effective_total)),
        # Decimal versions for internal callers that need exact arithmetic
        "_dec_effective_unit": effective_unit,
        "_dec_effective_total": effective_total,
    }


def compute_floor_internal(sku_id: str, qty: int) -> Optional[dict[str, Any]]:
    """Server-internal floor calculation. Reads cost data via
    `catalog.get_product_internal()` (which preserves cost fields).

    Returns the floor breakdown, or None if the SKU isn't found.
    NEVER serialize this dict directly to a customer response — it carries
    `wholesale_cost`, `fulfillment_cost`, `unit_cost`, `unit_floor`,
    `order_floor` which are all server-only.
    """
    # Import lazily to avoid circular import (catalog imports nothing from
    # equation, but equation calls into catalog).
    import catalog  # type: ignore[import-not-found]
    p = catalog.get_product_internal(sku_id)
    if not p:
        return None

    wholesale = Decimal(str(p["wholesale_cost"]))
    fulfillment = Decimal(str(p["fulfillment_cost"]))
    min_margin = Decimal(str(p["min_margin_floor"]))

    unit_cost = wholesale + fulfillment
    unit_floor = unit_cost + min_margin
    order_floor = (unit_floor * Decimal(qty)) + MIN_DEAL_VALUE

    return {
        "wholesale_cost": float(_round_money(wholesale)),
        "fulfillment_cost": float(_round_money(fulfillment)),
        "min_margin_floor": float(_round_money(min_margin)),
        "unit_cost": float(_round_money(unit_cost)),
        "unit_floor": float(_round_money(unit_floor)),
        "order_floor": float(_round_money(order_floor)),
        "_dec_unit_cost": unit_cost,
        "_dec_unit_floor": unit_floor,
        "_dec_order_floor": order_floor,
    }


def quote(
    sku_id: str,
    qty: int,
    vibe: str = "individual",
    pillars: Optional[list[str]] = None,
    frequency: str = "ppu",
    actor: str = "acheevy",
    requested_discount_pct: float = 0.0,
    is_bundle: bool = False,
    custee_id: str = "anon",
) -> Quote:
    """Master integration — applies Equation, computes floor, checks tier
    authority, issues escalation token if ceiling breached.

    Args:
        sku_id: catalog SKU
        qty: total units
        vibe: V.I.B.E. group ("individual" | "family" | "team" | "cafe" | "enterprise")
        pillars: list of pillar-level tokens (e.g., ["sourcing-verified", "delivery-priority"])
        frequency: "ppu" | "3-month" | "6-month" | "9-month-pay9-get12"
        actor: agent slug ("acheevy", "melli", "luc", "sal_ang", or BG slug)
        requested_discount_pct: discount the agent is trying to apply
        is_bundle: True if multi-SKU bundle (relaxes T3 ceiling 10% → 15%)
        custee_id: opaque customer identifier for the audit ledger and
                   escalation token; default "anon" for unauthenticated chat

    Returns:
        Quote dict. Caller routes to the Custee response after
        `strip_internal_fields()`. Server-internal callers (audit-ledger,
        NemoClaw, margin checks) read the full shape.
    """
    pillars = pillars or []

    # 1. Equation — effective price
    import catalog  # type: ignore[import-not-found]
    p = catalog.get_product_internal(sku_id)
    if not p:
        # Fall back to a structured error Quote — same shape, different
        # escalation_required semantics. Caller can detect via msrp=0.
        return {
            "sku": sku_id,
            "qty": qty,
            "vibe": vibe,
            "pillars": pillars,
            "frequency": frequency,
            "actor": actor,
            "actor_tier": "T3",
            "requested_discount_pct": requested_discount_pct,
            "is_bundle": is_bundle,
            "msrp_unit": 0.0,
            "effective_unit": 0.0,
            "effective_total": 0.0,
            "discount_applied_pct": 0.0,
            "discount_amount": 0.0,
            "quoted_total": 0.0,
            "quoted_per_unit": 0.0,
            "pillar_breakdown": [],
            "escalation_required": True,
            "stepper_token": None,
            "tier_ceiling_pct": 0.0,
        }  # type: ignore[typeddict-item]

    eff = compute_effective_price(
        msrp=Decimal(str(p["msrp"])),
        qty=qty,
        vibe=vibe,
        pillars=pillars,
        frequency=frequency,
    )

    # 2. Floor (server-internal)
    floor = compute_floor_internal(sku_id, qty)
    assert floor is not None, "floor must exist when SKU exists"

    eff_total_dec: Decimal = eff["_dec_effective_total"]
    order_floor_dec: Decimal = floor["_dec_order_floor"]

    # 3. Max-giveable: largest discount that still keeps effective_total ≥ floor
    if eff_total_dec > 0:
        max_giveable_dec = (
            (eff_total_dec - order_floor_dec) / eff_total_dec * Decimal("100")
        )
    else:
        max_giveable_dec = Decimal("0")
    if max_giveable_dec < 0:
        max_giveable_dec = Decimal("0")  # floor exceeds price → no discount possible

    max_giveable_pct = float(max_giveable_dec)

    # 4. Tier authority check
    decision = authority_tiers.is_within_authority(
        actor=actor,
        requested_pct=requested_discount_pct,
        qty=qty,
        is_bundle=is_bundle,
        max_giveable_pct=max_giveable_pct,
    )

    # 5. Apply or escalate
    stepper_token: Optional[str] = None
    discount_applied_pct = 0.0
    if decision["allowed"]:
        discount_applied_pct = requested_discount_pct
    else:
        # Mint escalation token. Will return "" if COASTAL_APPROVE_SECRET
        # isn't set; caller surfaces that as a deferred-to-owner notice.
        stepper_token = authority_tiers.make_stepper_escalation_token(
            actor=actor,
            sku=sku_id,
            qty=qty,
            requested_pct=requested_discount_pct,
            custee_id=custee_id,
        ) or None

    # 6. Final pricing
    discount_dec = (
        eff_total_dec * Decimal(str(discount_applied_pct)) / Decimal("100")
    )
    quoted_total_dec = eff_total_dec - discount_dec
    quoted_per_unit_dec = (
        quoted_total_dec / Decimal(qty) if qty > 0 else Decimal("0")
    )
    margin_dec = quoted_total_dec - (floor["_dec_unit_cost"] * Decimal(qty))

    return {
        "sku": sku_id,
        "qty": qty,
        "vibe": vibe,
        "pillars": pillars,
        "frequency": frequency,
        "actor": actor,
        "actor_tier": decision["actor_tier"],
        "requested_discount_pct": requested_discount_pct,
        "is_bundle": is_bundle,
        "msrp_unit": eff["msrp_unit"],
        "effective_unit": eff["effective_unit"],
        "effective_total": eff["effective_total"],
        "discount_applied_pct": discount_applied_pct,
        "discount_amount": float(_round_money(discount_dec)),
        "quoted_total": float(_round_money(quoted_total_dec)),
        "quoted_per_unit": float(_round_money(quoted_per_unit_dec)),
        "pillar_breakdown": eff["pillar_breakdown"],
        "escalation_required": decision["requires_escalation"],
        "stepper_token": stepper_token,
        "tier_ceiling_pct": decision["binding_ceiling_pct"],
        # Server-internal — strip via `strip_internal_fields()` before HTTP
        "_internal_unit_cost": floor["unit_cost"],
        "_internal_unit_floor": floor["unit_floor"],
        "_internal_order_floor": floor["order_floor"],
        "_internal_max_giveable_pct": max_giveable_pct,
        "_internal_margin": float(_round_money(margin_dec)),
    }
