"""
Escalation trigger detection — canonical authority_tiers.py tier system.

Sal_Ang (T3) → ACHEEVY (T1):    discount request above ≤10/15% ceiling
Sal_Ang (T3) → LUC_Ang (T2-F):  billing / coupon request (delegate-not-ask)
Any          → Melli Capensi (T2-B): bulk / corporate / catering (100+ units)
Any          → ACHEEVY (T1):    white-label / override / explicit escalation
"""
from __future__ import annotations
import re
from typing import Optional, Tuple

# Employee → animation type mapping
EMPLOYEE_ANIMATION = {
    "sal_ang":        "espresso_cup",
    "luc_ang":        "lu_cal_ledger",
    "melli_capensi":  "sett_brief",
    "acheevy":        "authority_seal",
}

EMPLOYEE_TIER = {
    "sal_ang":        "T3",
    "luc_ang":        "T2_FINANCE",
    "melli_capensi":  "T2_BULK",
    "acheevy":        "T1",
}

# Keyword patterns — order matters (more specific first)
_COUPON_PATTERNS = re.compile(
    r"\b(coupon|promo|promo.?code|discount.?code|welcome10|brew20|freeship|try.?me|free.?sample|sample)\b",
    re.IGNORECASE,
)
_BULK_PATTERNS = re.compile(
    r"\b(bulk|wholesale|catering|corporate|enterprise|office.?order|100\+?\s*units?|"
    r"large.?order|team.?order|restaurant|hotel|cafe.?supply)\b",
    re.IGNORECASE,
)
_DISCOUNT_PATTERNS = re.compile(
    r"\b(discount|deal|off|cheaper|price.?drop|negotiate|haggle|lower.?price|"
    r"best.?price|can.?you.?do.?better|any.?deals?|save.?money|reduce)\b",
    re.IGNORECASE,
)
_PARTNER_PATTERNS = re.compile(
    r"\b(white.?label|resell|partner.?program|api.?integrat|custom.?brand|"
    r"my.?own.?brand|launch.?my|build.?a.?brand)\b",
    re.IGNORECASE,
)
_OVERRIDE_PATTERNS = re.compile(
    r"\b(speak.?to|manager|supervisor|someone.?else|escalat|override|human|"
    r"real.?person|owner)\b",
    re.IGNORECASE,
)


def detect_escalation(
    content: str,
    current_employee: str,
) -> Optional[Tuple[str, str, str, Optional[str]]]:
    """
    Returns (to_employee, reason, delegation_language_or_None, new_anim_type)
    or None if no escalation needed.
    """
    text = content.lower()

    # White-label / partner → ACHEEVY always (any employee)
    if _PARTNER_PATTERNS.search(text):
        return ("acheevy", "white_label_inquiry", None, "authority_seal")

    # Explicit escalation request → ACHEEVY always
    if _OVERRIDE_PATTERNS.search(text):
        return ("acheevy", "final_override", None, "authority_seal")

    # Bulk / corporate / catering → Melli Capensi (if not already there)
    if _BULK_PATTERNS.search(text) and current_employee not in ("melli_capensi", "acheevy"):
        return ("melli_capensi", "bulk_order_inquiry", None, "sett_brief")

    # Coupon / billing request from Sal_Ang → delegate to LUC_Ang
    if current_employee == "sal_ang" and _COUPON_PATTERNS.search(text):
        return (
            "luc_ang",
            "coupon_or_billing_request",
            "LUC_Ang, drop a TRY-ME on this Custee.",
            "lu_cal_ledger",
        )

    # Discount request from Sal_Ang (non-coupon) → ACHEEVY
    if current_employee == "sal_ang" and _DISCOUNT_PATTERNS.search(text):
        return ("acheevy", "discount_above_t3_ceiling", None, "authority_seal")

    # LUC_Ang can't do margin discount → escalate to ACHEEVY
    if current_employee == "luc_ang" and _DISCOUNT_PATTERNS.search(text):
        return ("acheevy", "luc_coupon_insufficient", None, "authority_seal")

    # Melli above ceiling → ACHEEVY
    if current_employee == "melli_capensi" and _OVERRIDE_PATTERNS.search(text):
        return ("acheevy", "bulk_above_melli_ceiling", None, "authority_seal")

    return None
