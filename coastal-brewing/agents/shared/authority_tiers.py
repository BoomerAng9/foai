"""Coastal layered-authority schema — tier ceilings, coupon authority, HMAC
escalation tokens.

Owner directive 2026-04-30: Coastal's discount/escalation logic is rebuilt
around a four-tier authority hierarchy mirroring a real retail-and-service
sales team. Each customer-facing agent has a server-enforced discount cap;
bigger discounts gate on a Stepper-mediated volume commitment from the
Custee, escalated invisibly to ACHEEVY (T1).

Tiers
-----
- T1 (acheevy)        — owner-grade, uncapped (bound only by the global floor)
- T2_BULK (melli)     — bulk ladder: 12u → 15%, 50u → 25%, 100u+ → 35%
                        + specialization-matched BG'z dispatch under Melli
- T2_FINANCE (luc)    — coupons-only (no margin discount); fixed-list codes
- T3 (sal_ang)        — retail floor: ≤10% PPU, ≤15% bundles

Cross-cutting hack-proof rules
------------------------------
- All ceilings are computed server-side; the LLM cannot bypass them by
  asking nicely. `is_within_authority()` is the single decision point.
- Escalation tokens are HMAC-signed (same pattern as the existing
  `_make_approve_token` in `scripts/api_server.py:63`). They carry the full
  engagement context (actor, tier, sku, qty, requested_pct, custee_id) and
  expire on a TTL (24h default). Custee cannot fabricate a token client-side.
- COST never appears here. The floor calculation lives in
  `scripts/equation.py` (server-internal); this module enforces the *tier*
  ceiling, which is a percentage cap on the *effective* price (post-Equation).

References
----------
- `~/.claude/plans/kind-noodling-aurora.md` rev 2 — canonical plan
- `iCloudDrive/.../Claude Code/coastal-business-plan/coastal-matrix-billing-spec.md`
  § "Layered Authority — discount math on top of the matrix"
- `iCloudDrive/.../Claude Code/coastal-business-plan/business-plan 2.md` §3
- `feedback_luc_is_own_entity.md` + `project_luc_boomer_ang_character.md`
  (LUC ecosystem canon)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Literal, Optional, TypedDict


# ---------------------------------------------------------------------------
# Tier identifiers
# ---------------------------------------------------------------------------
Tier = Literal["T1", "T2_BULK", "T2_FINANCE", "T3"]

# Agent slug → tier. Slugs match `agents/operations_pmo/<name>/agent.py`
# directory names + the runner's lane keys. ACHEEVY is the customer-facing
# default; the underlying lane keys (`sales`, `marketing`) collapse into
# whichever named tier the routing layer dispatches to.
AGENT_TIER: dict[str, Tier] = {
    "acheevy": "T1",
    "melli": "T2_BULK",
    "melli_capensi": "T2_BULK",
    "luc": "T2_FINANCE",
    "luc_ang": "T2_FINANCE",
    "sal_ang": "T3",
    "sal": "T3",
}

# BG'z under Melli are back-office by default; they only engage Custeez when
# Melli routes the brief to them. For tier purposes, when a BG engages a
# Custee they speak with Melli's T2_BULK authority. The map below lets the
# runner record *which* BG handled the touch for audit-ledger granularity.
BGZ_DISPATCH_AUTHORITY: dict[str, Tier] = {
    name: "T2_BULK"
    for name in (
        "meles_mehli", "taxi_dea", "arcto_nyx", "ana_kuma", "leu_kurus",
        "moscha_tah", "persona_tah", "orien_talis", "eve_retti", "cuc_phuong",
        "java_nessa", "mar_che",
    )
}


def get_tier(actor: str) -> Optional[Tier]:
    """Resolve an actor slug to a Tier. Returns None for unknown actors."""
    actor = (actor or "").strip().lower()
    return AGENT_TIER.get(actor) or BGZ_DISPATCH_AUTHORITY.get(actor)


# ---------------------------------------------------------------------------
# Discount ceiling tables
# ---------------------------------------------------------------------------
# Sal_Ang (T3) caps differ by transaction shape — single PPU bag has a tighter
# cap than a multi-SKU bundle, since the bundle math has more giveable margin.
T3_PPU_CAP_PCT = 10.0
T3_BUNDLE_CAP_PCT = 15.0

# Melli (T2_BULK) ladder by qty bracket. Above 100u the cap is 35%; the global
# floor still applies on top, so the *binding* cap is min(tier_pct, max_giveable).
T2_BULK_LADDER: list[tuple[int, float]] = [
    (12, 15.0),    # ≥12 units → up to 15%
    (50, 25.0),    # ≥50 units → up to 25%
    (100, 35.0),   # ≥100 units → up to 35%
]

# LUC (T2_FINANCE) cannot apply a margin discount — coupons only. Code list
# is fixed; LUC cannot invent a new coupon mid-conversation. Owner manages
# the active list via env or via the matrix-billing migration tool.
LUC_COUPON_CODES = frozenset({
    "WELCOME10",   # 10% first order, single use per email
    "BREW20",      # 20% subscriber loyalty (3+ months in)
    "FREESHIP",    # waive shipping fee (used only when shipping is a friction)
    "TRY-ME",      # cost-recovery sample SKU dispatch (see equation.py for pricing)
})

# T1 (ACHEEVY) ceiling is None — uncapped at the tier layer; only the global
# floor binds. The *floor* lives in `scripts/equation.py:compute_floor_internal`.


def get_discount_ceiling_pct(
    actor_tier: Tier,
    qty: int = 1,
    is_bundle: bool = False,
) -> Optional[float]:
    """Return the per-tier discount cap in percent, or None if uncapped.

    Args:
        actor_tier: the tier of the agent attempting the discount
        qty: total units in the engagement (for T2_BULK ladder lookup)
        is_bundle: True for multi-SKU bundles (relaxes T3 cap from 10% → 15%)

    Returns:
        float percent (e.g. 15.0), or None if the tier has no cap (T1).
        Returns 0.0 for T2_FINANCE — LUC has zero margin-discount authority.
    """
    if actor_tier == "T1":
        return None
    if actor_tier == "T3":
        return T3_BUNDLE_CAP_PCT if is_bundle else T3_PPU_CAP_PCT
    if actor_tier == "T2_FINANCE":
        return 0.0
    if actor_tier == "T2_BULK":
        # Walk the ladder from highest qty bracket down; first match wins.
        cap = 0.0
        for threshold, pct in T2_BULK_LADDER:
            if qty >= threshold:
                cap = pct
        return cap
    # Unknown tier — fail closed (no discount allowed).
    return 0.0


def is_coupon_within_authority(actor_tier: Tier, coupon_code: str) -> bool:
    """LUC owns the fixed coupon-code list. T1 (ACHEEVY) can also issue any
    code. Other tiers cannot issue coupons.
    """
    code = (coupon_code or "").strip().upper()
    if actor_tier == "T1":
        return True
    if actor_tier == "T2_FINANCE":
        return code in LUC_COUPON_CODES
    return False


# ---------------------------------------------------------------------------
# Authority decision — the single integration point for Spinner
# ---------------------------------------------------------------------------
class AuthorityDecision(TypedDict):
    """Shape returned by `is_within_authority()`. Spinner consumes this to
    decide whether to apply, escalate, or refuse.
    """
    allowed: bool
    reason: str
    binding_ceiling_pct: Optional[float]
    actor_tier: Tier
    requires_escalation: bool


def is_within_authority(
    actor: str,
    requested_pct: float,
    qty: int = 1,
    is_bundle: bool = False,
    max_giveable_pct: Optional[float] = None,
) -> AuthorityDecision:
    """Single decision point: can this agent apply this discount?

    Args:
        actor: agent slug (acheevy, melli, luc, sal_ang, or a BG slug)
        requested_pct: discount the agent is trying to apply, in percent
        qty: units in the engagement (for T2_BULK ladder lookup)
        is_bundle: True for multi-SKU (relaxes T3 cap)
        max_giveable_pct: ceiling derived from the global floor, computed
            upstream by `scripts/equation.py`. If provided, the binding
            ceiling is min(tier_pct, max_giveable_pct). If None, only the
            tier ceiling binds.

    Returns:
        AuthorityDecision dict. If `allowed=False`, the caller should emit
        a stepper_escalation_token (via `make_stepper_escalation_token()`)
        OR refuse the action entirely (for tiers that lack discount auth).
    """
    tier = get_tier(actor)
    if tier is None:
        return {
            "allowed": False,
            "reason": f"unknown_actor:{actor}",
            "binding_ceiling_pct": 0.0,
            "actor_tier": "T3",  # safest default
            "requires_escalation": True,
        }

    tier_pct = get_discount_ceiling_pct(tier, qty=qty, is_bundle=is_bundle)
    # Compute the binding ceiling: lower of tier ceiling and max-giveable.
    if tier_pct is None and max_giveable_pct is None:
        binding = None  # T1 with no floor info — caller must verify upstream
    elif tier_pct is None:
        binding = max_giveable_pct
    elif max_giveable_pct is None:
        binding = tier_pct
    else:
        binding = min(tier_pct, max_giveable_pct)

    # Decision: requested ≤ binding ceiling → allowed; else escalation.
    if binding is None:
        # T1 with no floor info — defer to the caller. Spinner will
        # also pass the floor; this branch should be rare.
        allowed = True
        requires_escalation = False
        reason = "t1_uncapped_pending_floor_check"
    elif requested_pct <= binding + 1e-9:  # epsilon for float compare
        allowed = True
        requires_escalation = False
        reason = "within_tier_ceiling"
    else:
        allowed = False
        requires_escalation = True
        reason = (
            f"requested_{requested_pct:.1f}_exceeds_binding_{binding:.1f}"
            f"_at_tier_{tier}"
        )

    return {
        "allowed": allowed,
        "reason": reason,
        "binding_ceiling_pct": binding,
        "actor_tier": tier,
        "requires_escalation": requires_escalation,
    }


# ---------------------------------------------------------------------------
# HMAC-signed Stepper escalation tokens
# ---------------------------------------------------------------------------
# Mirrors the pattern in `scripts/api_server.py:_make_approve_token` for
# consistency. A single env secret (`COASTAL_APPROVE_SECRET`) signs both
# the approval tokens and the escalation tokens; the `kind` field on the
# payload distinguishes them at verification time.

_ESCALATION_SECRET = os.environ.get("COASTAL_APPROVE_SECRET", "")
_ESCALATION_TTL_SEC = 24 * 3600  # 24 hours; Custee has a day to commit


class EscalationPayload(TypedDict):
    """Shape of the HMAC-signed escalation token's decoded payload."""
    kind: str  # always "stepper_escalation"
    escalation_id: str
    actor: str
    tier: Tier
    sku: str
    qty: int
    requested_pct: float
    custee_id: str
    exp: int


def make_stepper_escalation_token(
    actor: str,
    sku: str,
    qty: int,
    requested_pct: float,
    custee_id: str,
    ttl_sec: int = _ESCALATION_TTL_SEC,
) -> str:
    """Mint an HMAC-signed escalation token.

    Returns the encoded token (`<payload_b64>.<sig>`) ready to embed in a
    Stepper / Paperform URL. Returns "" if `COASTAL_APPROVE_SECRET` is unset.
    """
    if not _ESCALATION_SECRET:
        return ""
    tier = get_tier(actor) or "T3"
    payload: EscalationPayload = {
        "kind": "stepper_escalation",
        "escalation_id": f"esc_{secrets.token_hex(8)}",
        "actor": actor,
        "tier": tier,
        "sku": sku,
        "qty": int(qty),
        "requested_pct": float(requested_pct),
        "custee_id": custee_id,
        "exp": int(time.time()) + ttl_sec,
    }
    payload_b64 = (
        base64.urlsafe_b64encode(
            json.dumps(payload, sort_keys=True).encode("utf-8")
        )
        .rstrip(b"=")
        .decode("ascii")
    )
    sig = hmac.new(
        _ESCALATION_SECRET.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_stepper_escalation_token(token: str) -> Optional[EscalationPayload]:
    """Verify + decode an escalation token. Returns the payload dict on
    success, None on signature mismatch / expired / malformed.

    Constant-time comparison via `hmac.compare_digest` to prevent timing
    side-channels.
    """
    if not _ESCALATION_SECRET or not token or "." not in token:
        return None
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(
            _ESCALATION_SECRET.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(
            base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        )
        if payload.get("kind") != "stepper_escalation":
            return None
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload  # type: ignore[return-value]
    except Exception:
        return None
