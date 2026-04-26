"""Canonical Spinner tool surface.

Each tool below is a thin function that dispatches through Chicken Hawk.
ADK agents register these via the `tools=[...]` param on LlmAgent.

Tool naming convention: `<verb>_<noun>` snake_case.
Tools that mutate state always route through `chicken_hawk.dispatch()`.
Tools that only read state (catalog lookup, audit query) call directly.
"""
from __future__ import annotations

from typing import Any, Optional

from . import chicken_hawk, nemoclaw, hermes


# ---------------------------------------------------------------------------
# Sales / Operations PMO tools (Sal_Ang)
# ---------------------------------------------------------------------------

def recommend_bundle(category: str, budget: Optional[float] = None, flavor: Optional[str] = None) -> dict:
    """Suggest a Coastal product bundle to the customer.

    Args:
        category: "coffee" | "tea" | "matcha" | "mixed"
        budget: optional max spend in USD
        flavor: optional flavor preference ("dark", "light", "earthy", etc.)

    Returns the bundle envelope. Read-only — no Hermes receipt.
    """
    return chicken_hawk.dispatch(
        "recommend_bundle",
        {"category": category, "budget": budget, "flavor": flavor},
    )


def add_to_cart(sku: str, qty: int, session_id: Optional[str] = None) -> dict:
    """Add an item to the customer's cart. Routes through Chicken Hawk for receipt."""
    return chicken_hawk.dispatch("add_to_cart", {"sku": sku, "qty": qty, "session_id": session_id})


def apply_discount(percent: float, session_id: str) -> dict:
    """Apply a discount within the published margin floor.

    NemoClaw verdicts:
      - allow: within `suggest_max_deal_discount()` floor
      - escalate: below floor → Telegram approval to Jarrett
      - deny: exceeds 30% absolute cap or violates BLOCKED_ACTIONS
    """
    return chicken_hawk.dispatch("apply_discount", {"percent": percent, "session_id": session_id})


def propose_deal(items: list[dict], discount_pct: float, session_id: str) -> dict:
    """Compose and propose a customer-co-authored offer.

    Calls margin calculator + NemoClaw before returning the offer to the customer.
    Floor-bound by `suggest_max_deal_discount()`.
    """
    return chicken_hawk.dispatch(
        "propose_deal",
        {"items": items, "discount_pct": discount_pct, "session_id": session_id},
    )


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
    """Read the Hermes audit trail for a task_id."""
    return hermes.query_audit(task_id)


def policy_check(action: str, context: dict) -> dict:
    """Ask NemoClaw to verdict an action without executing it."""
    return nemoclaw.check(action, context)
