"""WebSocket message type definitions for the chain-of-command stream."""
from __future__ import annotations
from typing import Any, Dict, Optional
from pydantic import BaseModel


class WsCupMetadata(BaseModel):
    type: str = "cup_metadata"
    employee: str          # sal_ang | luc_ang | melli_capensi | acheevy
    tier: str              # T3 | T2_FINANCE | T2_BULK | T1
    animation_type: str    # espresso_cup | lu_cal_ledger | sett_brief | authority_seal
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


class WsError(BaseModel):
    type: str = "error"
    code: str
    message: str


# Inbound message from frontend
class WsUserMessage(BaseModel):
    type: str = "user_message"
    content: str
    conversation_id: Optional[str] = None
    interrupt_current: bool = False


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
    "sett_brief": {
        "surface_brief":    {"range": (100, 500),    "duration": (5, 8)},
        "funnel_staging":   {"range": (500, 1500),   "duration": (8, 15)},
        "full_sett":        {"range": (1500, 99999), "duration": (15, 30)},
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
