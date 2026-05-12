"""WebSocket message type definitions for the chain-of-command stream."""
from __future__ import annotations
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class WsCupMetadata(BaseModel):
    type: str = "cup_metadata"
    employee: str          # sal_ang | luc_ang | melli_capensi | acheevy
    tier: str              # T3 | T2_FINANCE | T2_BULK | T1
    animation_type: str    # espresso_cup | lu_cal_ledger | coffee_pot | authority_seal
    animation_size: str    # espresso_1_shot | americano_2 | etc.
    estimated_thinking_tokens: int
    estimated_duration_sec: float
    input_tokens: int


class WsThinkingToken(BaseModel):
    type: str = "thinking_token"
    content: str
    token_index: int
    employee: str


class WsThinkingComplete(BaseModel):
    type: str = "thinking_complete"
    total_thinking_tokens: int
    duration_ms: int
    employee: str


class WsResponseToken(BaseModel):
    type: str = "response_token"
    content: str
    token_index: int


class WsEscalationEvent(BaseModel):
    type: str = "escalation_event"
    from_employee: str
    from_tier: str
    to_employee: str
    to_tier: str
    reason: str            # discount_above_t3_ceiling | coupon_request | bulk | override | white_label
    new_animation_type: str
    delegation_language: Optional[str] = None  # e.g. "LUC_Ang, drop a TRY-ME on this Custee."


class WsResponseComplete(BaseModel):
    type: str = "response_complete"
    total_response_tokens: int
    total_thinking_tokens: int
    cost_usd_estimate: float
    employee: str
    tier: str
    next_employee: Optional[str] = None  # set when Sal's reply signals a handoff


class WsError(BaseModel):
    type: str = "error"
    code: str
    message: str


# Inbound message from frontend
class WsUserMessage(BaseModel):
    type: str = "user_message"
    # max_length=2000 matches the cap on the HTTP /api/chat/send endpoint
    # and the Inworld TTS per-request character cap (api_server.py:6208).
    # Without the cap, an open WS with arbitrarily long messages bills
    # an arbitrarily large LLM call per turn.
    content: str = Field(default="", max_length=2000)
    conversation_id: Optional[str] = None
    interrupt_current: bool = False
    # Frontend can hint a specific agent for this turn (e.g. user typed
    # "let me talk to Melli" → desired_employee="melli_capensi"). Backend
    # respects it when valid. Falls back to current handler-state employee.
    desired_employee: Optional[str] = None


# Animation size → token range table (mirrors litellm_config_CORRECTED.yaml)
ANIMATION_SIZING: Dict[str, Dict[str, Any]] = {
    "espresso_cup": {
        "espresso_1_shot":  {"range": (50, 150),    "duration": (2, 4)},
        "espresso_2_shots": {"range": (150, 300),   "duration": (4, 6)},
        "americano_2":      {"range": (300, 600),   "duration": (4, 6)},
        "americano_4":      {"range": (600, 1200),  "duration": (6, 10)},
        "long_format_6":    {"range": (1200, 99999),"duration": (10, 20)},
    },
    "lu_cal_ledger": {
        "quick_calc":           {"range": (50, 300),   "duration": (3, 5)},
        "bundle_calculation":   {"range": (300, 800),  "duration": (5, 10)},
        "deep_coupon":          {"range": (800, 99999),"duration": (10, 20)},
    },
    "coffee_pot": {
        # Bulk / B2B carafe — same drip/pour mechanic as the espresso cup,
        # bigger vessel. Token bands roughly 2x the cup so the animation
        # stays visually proportional to the larger contract / bulk-order
        # reasoning Melli does.
        "carafe_4u":     {"range": (100, 500),     "duration": (4, 7)},
        "carafe_12u":    {"range": (500, 1500),    "duration": (7, 14)},
        "carafe_50u":    {"range": (1500, 99999),  "duration": (14, 28)},
    },
    "authority_seal": {
        "standard_approval":{"range": (100, 500),   "duration": (3, 6)},
        "strategic_review": {"range": (500, 2000),  "duration": (6, 12)},
        "full_t1_override": {"range": (2000, 99999),"duration": (12, 25)},
    },
}


def get_animation_size(animation_type: str, input_tokens: int) -> tuple[str, float]:
    """Return (size_name, midpoint_duration_sec) for given token count."""
    sizes = ANIMATION_SIZING.get(animation_type, {})
    for size_name, spec in sizes.items():
        lo, hi = spec["range"]
        if lo <= input_tokens < hi:
            d_lo, d_hi = spec["duration"]
            return size_name, (d_lo + d_hi) / 2
    # Fallback to largest size
    last_name = list(sizes)[-1] if sizes else "default"
    last_spec = list(sizes.values())[-1] if sizes else {"duration": (5, 10)}
    d_lo, d_hi = last_spec["duration"]
    return last_name, (d_lo + d_hi) / 2


# Internal employee → animation-type + tier maps. Imported by api_server.py
# at the WS streaming endpoint to pick the right cup animation per lieutenant
# routing target. Customer-visible label = Sal per owner directive
# 2026-05-03 17:30 (sal_ang_customer_facing canon); ACHEEVY = internal
# escalation only. Animation type still drives the per-cup visual.
EMPLOYEE_ANIMATION: Dict[str, str] = {
    "sal_ang":       "espresso_cup",
    "luc_ang":       "lu_cal_ledger",
    "melli_capensi": "coffee_pot",
    "acheevy":       "authority_seal",
    # Loss Prevention floor team — Marcus. Reuses the espresso_cup
    # animation for now; dedicated LP-team motion (button-down silhouette)
    # ships with the cinematic-explainer Iller_Ang batch.
    "lp_ang":        "espresso_cup",
}

EMPLOYEE_TIER: Dict[str, str] = {
    "sal_ang":       "T3",
    "luc_ang":       "T2_FINANCE",
    "melli_capensi": "T2_BULK",
    "acheevy":       "T1",
    "lp_ang":        "T2_LP",
}
