"""Canonical Spinner tool surface.

Each tool below is a thin function that dispatches through Chicken Hawk.
ADK agents register these via the `tools=[...]` param on LlmAgent.

Tool naming convention: `<verb>_<noun>` snake_case.
Tools that mutate state always route through `chicken_hawk.dispatch()`.
Tools that only read state (catalog lookup, audit query) call directly.

Layered authority enforcement (workstream B/C of the 2026-04-30 rework):
Spinner is the SERVER-SIDE enforcement boundary for tier ceilings. Even if
an LLM agent ignores its INSTRUCTION block and tries to apply a discount
above its tier authority, `apply_discount` and `propose_deal` short-circuit
locally via `authority_tiers.is_within_authority()` BEFORE dispatching to
Chicken Hawk, returning an escalation envelope with an HMAC-signed Stepper
token instead. The Chicken Hawk dispatch + NemoClaw policy gate provide a
second line of defense. Cost data NEVER leaves the server — `equation.quote`
returns a Quote dict that gets stripped via `equation.strip_internal_fields`
before any HTTP serialization.
"""
from __future__ import annotations

from typing import Any, Optional

from . import chicken_hawk, nemoclaw, audit_ledger, authority_tiers


# ---------------------------------------------------------------------------
# Sales / Operations PMO tools (Sal_Ang)
# ---------------------------------------------------------------------------

def recommend_bundle(category: str, budget: Optional[float] = None, flavor: Optional[str] = None) -> dict:
    """Suggest a Coastal product bundle to the customer.

    Args:
        category: "coffee" | "tea" | "matcha" | "mixed"
        budget: optional max spend in USD
        flavor: optional flavor preference ("dark", "light", "earthy", etc.)

    Returns the bundle envelope. Read-only — no AuditLedger receipt.
    """
    return chicken_hawk.dispatch(
        "recommend_bundle",
        {"category": category, "budget": budget, "flavor": flavor},
    )


def add_to_cart(sku: str, qty: int, session_id: Optional[str] = None) -> dict:
    """Add an item to the customer's cart. Routes through Chicken Hawk for receipt."""
    return chicken_hawk.dispatch("add_to_cart", {"sku": sku, "qty": qty, "session_id": session_id})


def apply_discount(
    percent: float,
    session_id: str,
    actor: str = "sal_ang",
    qty: int = 1,
    is_bundle: bool = False,
    custee_id: str = "anon",
) -> dict:
    """Apply a discount, enforced by the layered authority schema.

    The `actor` parameter declares which tier-authorized agent is requesting
    the discount. Spinner first checks `authority_tiers.is_within_authority()`
    locally; if the request exceeds the actor's tier ceiling, returns an
    escalation envelope with an HMAC-signed Stepper token rather than
    dispatching to Chicken Hawk.

    Tier ceilings (per `agents/shared/authority_tiers.py`):
      - T1 (acheevy): uncapped at the tier layer; bound only by the global floor
      - T2_BULK (melli): 12u→15%, 50u→25%, 100u+→35%
      - T2_FINANCE (luc): 0% (coupons-only, no margin discount)
      - T3 (sal_ang): ≤10% PPU, ≤15% bundles

    On the wire, the gateway envelope returned has shape:
      `{ok, verdict, ...}` per chicken_hawk.dispatch when allowed, OR
      `{ok=False, verdict="tier_escalation", stepper_token, ...}` when the
      ceiling was breached locally.
    """
    decision = authority_tiers.is_within_authority(
        actor=actor,
        requested_pct=percent,
        qty=qty,
        is_bundle=is_bundle,
    )
    if not decision["allowed"]:
        token = authority_tiers.make_stepper_escalation_token(
            actor=actor,
            sku="",  # caller didn't pass a SKU on this surface; quote_sku has it
            qty=qty,
            requested_pct=percent,
            custee_id=custee_id,
        )
        return {
            "ok": False,
            "verdict": "tier_escalation",
            "actor_tier": decision["actor_tier"],
            "binding_ceiling_pct": decision["binding_ceiling_pct"],
            "reason": decision["reason"],
            "stepper_token": token,
            "message": (
                "This discount exceeds the active agent's tier ceiling. "
                "A Stepper escalation token has been issued; route the Custee "
                "through the T1 commitment-confirmation form before ACHEEVY "
                "can override the ceiling."
            ),
        }
    return chicken_hawk.dispatch(
        "apply_discount",
        {
            "percent": percent,
            "session_id": session_id,
            "actor": actor,
            "actor_tier": decision["actor_tier"],
            "qty": qty,
            "is_bundle": is_bundle,
        },
    )


def propose_deal(
    items: list[dict],
    discount_pct: float,
    session_id: str,
    actor: str = "sal_ang",
    custee_id: str = "anon",
) -> dict:
    """Compose and propose a customer-co-authored offer.

    Goes through `equation.quote()` for the canonical matrix Equation +
    floor + tier-cap decision. If any line item would exceed the actor's
    tier ceiling, returns an escalation envelope with the Stepper token.
    Otherwise dispatches to Chicken Hawk for the receipt + side effects.

    Cost data NEVER leaves this layer — only `equation.strip_internal_fields`
    output is included in the gateway dispatch payload.
    """
    # Lazy import to avoid runtime cycle at agent-construction time.
    import sys as _sys
    if "equation" not in _sys.modules:
        import importlib as _importlib
        _importlib.import_module("equation")
    import equation  # type: ignore[import-not-found]

    is_bundle = len(items) > 1
    total_qty = sum(int(it.get("qty", 1)) for it in items)
    # Quote the FIRST line for the tier-cap decision; multi-SKU bundles get
    # treated as a single deal-shape for ceiling purposes (the BUNDLE flag
    # plus aggregate qty captures the relevant authority semantics).
    primary = items[0] if items else {"product_id": "", "qty": 1}
    q = equation.quote(
        sku_id=primary.get("product_id", ""),
        qty=total_qty,
        vibe=primary.get("vibe", "individual"),
        pillars=primary.get("pillars", []),
        frequency=primary.get("frequency", "ppu"),
        actor=actor,
        requested_discount_pct=discount_pct,
        is_bundle=is_bundle,
        custee_id=custee_id,
    )
    public_quote = equation.strip_internal_fields(q)
    if q["escalation_required"]:
        return {
            "ok": False,
            "verdict": "tier_escalation",
            "actor_tier": q["actor_tier"],
            "binding_ceiling_pct": q["tier_ceiling_pct"],
            "stepper_token": q["stepper_token"],
            "quote": public_quote,
            "message": (
                "This deal exceeds the active agent's tier ceiling. The Custee "
                "must complete the T1 commitment-confirmation form (qty + "
                "cadence + delivery + payment terms) before ACHEEVY can override."
            ),
        }
    return chicken_hawk.dispatch(
        "propose_deal",
        {
            "items": items,
            "discount_pct": discount_pct,
            "session_id": session_id,
            "actor": actor,
            "actor_tier": q["actor_tier"],
            "quote": public_quote,
        },
    )


def quote_sku(
    sku: str,
    qty: int = 1,
    vibe: str = "individual",
    pillars: Optional[list[str]] = None,
    frequency: str = "ppu",
    actor: str = "acheevy",
    is_bundle: bool = False,
    custee_id: str = "anon",
) -> dict:
    """Compute the canonical matrix-billing Equation price for a SKU.

    Read-only. Agents call this to surface a transparent line-item quote
    to the Custee (frequency × V.I.B.E. × pillar uplifts). NEVER returns
    cost or floor — `equation.strip_internal_fields` is applied before
    return so cost data never reaches the LLM context (which can leak
    via prompt injection). Discount path is separate: `apply_discount`
    or `propose_deal` for actual margin asks.
    """
    import sys as _sys
    if "equation" not in _sys.modules:
        import importlib as _importlib
        _importlib.import_module("equation")
    import equation  # type: ignore[import-not-found]
    q = equation.quote(
        sku_id=sku,
        qty=qty,
        vibe=vibe,
        pillars=pillars or [],
        frequency=frequency,
        actor=actor,
        requested_discount_pct=0.0,
        is_bundle=is_bundle,
        custee_id=custee_id,
    )
    return equation.strip_internal_fields(q)


# NOTE: `issue_coupon` Spinner tool was REMOVED 2026-04-30 per owner
# decision. The local authority check was real (refused unauthorized
# actors), but the dispatch went to a Chicken Hawk action handler that
# does not exist yet — runtime calls would have returned an error
# envelope. Per AIMS doctrine: ship only what's real. The fixed-list
# coupon canon (`WELCOME10`, `BREW20`, `FREESHIP`, `TRY-ME`) stays in
# `agents/shared/authority_tiers.py:LUC_COUPON_CODES` and
# `is_coupon_within_authority()` for the future PR that adds the
# Chicken Hawk-side `issue_coupon` handler + Stripe coupon application.


def start_checkout(session_id: str, customer_email: str) -> dict:
    """Open a Stripe Checkout session for the current cart."""
    return chicken_hawk.dispatch(
        "start_checkout",
        {"session_id": session_id, "customer_email": customer_email},
    )


def escalate_to_owner(reason: str, context: dict, urgency: str = "normal") -> dict:
    """Route a question / decision to Jarrett via Telegram.

    Use this for: refunds above floor, legal/threat/fraud, unusual customer asks,
    anything outside the published policy floor.
    """
    return chicken_hawk.dispatch(
        "escalate_to_owner",
        {"reason": reason, "context": context, "urgency": urgency},
    )


def handoff_to_marketing(question: str, context: dict, session_id: str) -> dict:
    """Hand off a marketing-shaped question to the Marketing PMO (Melli)."""
    return chicken_hawk.dispatch(
        "handoff",
        {"to": "marketing_pmo", "question": question, "context": context, "session_id": session_id},
    )


# ---------------------------------------------------------------------------
# Marketing PMO tools (Melli + Sett BG'z)
# ---------------------------------------------------------------------------

def draft_campaign_brief(intent_bars: str, audience: str, channels: list[str]) -> dict:
    """Draft a campaign brief in BARS notation (per Sett charter §9).

    Args:
        intent_bars: a 4-stanza BARS draft of the campaign intent (Kick / Snare / Hi-Hat / Crash)
        audience: target audience description
        channels: list of channel surfaces (e.g. ["meta", "tiktok", "podcast"])

    Returns the resolved Technical Schema after Entandra dictionary expansion.
    """
    return chicken_hawk.dispatch(
        "draft_campaign_brief",
        {"intent_bars": intent_bars, "audience": audience, "channels": channels},
    )


def funnel_design(stages: list[str], assets: list[dict]) -> dict:
    """Design a 7-stage Sett funnel (Surface → Entrance → Tunnel → Sett-Chamber → Exit → Home Chamber → Clan).

    Owned by Meles Mehli (Funnel Architect).
    """
    return chicken_hawk.dispatch("funnel_design", {"stages": stages, "assets": assets})


def forecast_funnel(funnel_id: str, horizon_days: int = 30) -> dict:
    """Pre-launch funnel forecast across all 7 stages.

    Owned by Java Nessa (Forecasting & Attribution).
    """
    return chicken_hawk.dispatch(
        "forecast_funnel",
        {"funnel_id": funnel_id, "horizon_days": horizon_days},
    )


def sign_for_culture_attribution(asset_id: str) -> dict:
    """Final brand-attribution gate before any public-facing asset publishes.

    Owned by Melli Capensi. Verifies the BARS Cultural Attribution header is
    present on the asset (per charter Appendix C).
    """
    return chicken_hawk.dispatch("sign_for_culture_attribution", {"asset_id": asset_id})


def publish_signoff(asset_id: str, channel: str) -> dict:
    """Request owner signoff to publish a public-facing marketing asset.

    Always routes to Telegram for HITL approval. Never auto-fires.
    """
    return chicken_hawk.dispatch(
        "publish_signoff",
        {"asset_id": asset_id, "channel": channel},
    )


def dispatch_bg(bg_name: str, brief: dict) -> dict:
    """Melli-only: dispatch a brief to a specific BG.

    Args:
        bg_name: one of meles_mehli, taxi_dea, arcto_nyx, ana_kuma, leu_kurus,
                 moscha_tah, persona_tah, orien_talis, eve_retti, cuc_phuong,
                 java_nessa, mar_che
        brief: the assignment payload
    """
    return chicken_hawk.dispatch("dispatch_bg", {"bg_name": bg_name, "brief": brief})


def escalate_to_acheevy(reason: str, context: dict) -> dict:
    """Sett-charter §3: marketing escalations route up to ACHEEVY (Digital CEO)."""
    return chicken_hawk.dispatch(
        "escalate_to_acheevy",
        {"reason": reason, "context": context},
    )


# ---------------------------------------------------------------------------
# Read-only / utility tools (any agent can use)
# ---------------------------------------------------------------------------

def query_catalog(category: Optional[str] = None) -> dict:
    """Read the current Coastal product catalog. No receipt."""
    return chicken_hawk.dispatch("query_catalog", {"category": category})


def query_audit_trail(task_id: str) -> dict:
    """Read the AuditLedger trail for a task_id."""
    return audit_ledger.query_audit(task_id)


def policy_check(action: str, context: dict) -> dict:
    """Ask NemoClaw to verdict an action without executing it."""
    return nemoclaw.check(action, context)
