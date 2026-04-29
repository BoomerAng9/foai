"""NemoClaw policy module — pure, no I/O.

Returns a verdict for a proposed action. Mirrors openclaw/action_policy.yaml
but enforced in code so callers (chicken-hawk, coastal-runner, etc.) get a
deterministic verdict for every action.

Verdicts:
  - allow    : OpenClaw may execute
  - deny     : refuse regardless of approval; record risk_event
  - escalate : owner approval required; refuse until approval_id is supplied
"""
from typing import Any, Optional

# Always-blocked. No approval can override. Record as a risk_event.
BLOCKED_ACTIONS: set[str] = {
    "fabricate_certification",
    "claim_organic_without_proof",
    "claim_fair_trade_without_proof",
    "claim_mold_free_without_proof",
    "make_medical_or_health_claim",
    "claim_fda_approval",
    "store_raw_payment_credentials",
    "bypass_owner_approval",
    "bypass_acheevy",
    "execute_real_money_movement_without_approval",
    "modify_legal_documents_without_approval",
    "publish_unverified_claim",
}

# Need an approval_id in the proposal. Without it, escalate.
REQUIRES_OWNER_APPROVAL: set[str] = {
    "publish_public_content",
    "publish_public_page",
    "send_email_externally",
    "send_sms_externally",
    "change_product_price",
    "submit_supplier_order",
    "issue_refund",
    "issue_refund_above_threshold",
    "change_subscription_billing",
    "change_supplier",
    "make_legal_or_certification_claim",
    "approve_certification_language",
    "change_ad_budget",
    "access_customer_payment_data",
    "access_payment_data",
    "launch_campaign",
    "place_wholesale_order",
    "sign_contract",
    "file_legal_document",
    "spend_money",
    "update_live_product_claims",
}

# Risk tags that auto-escalate even on otherwise-allowed actions.
ESCALATING_RISK_TAGS: set[str] = {
    "legal",
    "money",
    "certification",
    "health",
    "fda",
    "final_public",
    "supplier_change",
    "ad_spend",
    "contract",
    "customer_payment_data",
}

# Allowed without owner approval — verdict allow.
ALLOWED_WITHOUT_APPROVAL: set[str] = {
    # NemoClaw canonical action names
    "create_internal_draft",
    "classify_message",
    "write_internal_summary",
    "create_research_ticket",
    "write_receipt",
    "prepare_owner_approval_request",
    "create_draft",
    "summarize",
    "classify",
    "generate_internal_report",
    "prepare_supplier_email_draft",
    "prepare_customer_support_draft",
    "prepare_shopify_product_draft",
    "create_receipt",
    "file_anomaly_event",
    "generate_daily_digest",
    # Coastal Brewing kit v3 task_types — NVIDIA lane
    "draft_caption",
    "draft_email",
    "classify_support",
    "summarize_daily_ops",
    "cluster_reviews",
    "draft_faq",
    "draft_product_copy",
    "draft_outreach",
    "draft_order_confirmation",
    # Coastal Brewing kit v3 task_types — Feynman/research lane
    # (Research itself is allowed; the high-risk action happens AFTER publication)
    "supplier_due_diligence",
    "claim_verification",
    "market_watch",
    "competitor_research",
    "product_evidence",
    "copy_evidence_review",
    "supplier_order_transmit",
}


def evaluate(
    action_type: str,
    risk_tags: Optional[list[str]] = None,
    approval_id: Optional[str] = None,
    actor: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Pure verdict function. Returns {verdict, reason, basis}."""
    risk_tags = risk_tags or []

    if action_type in BLOCKED_ACTIONS:
        return {
            "verdict": "deny",
            "reason": f"action '{action_type}' is in BLOCKED_ACTIONS",
            "basis": "BLOCKED_ACTIONS",
        }

    if action_type in REQUIRES_OWNER_APPROVAL:
        if not approval_id:
            return {
                "verdict": "escalate",
                "reason": f"action '{action_type}' requires owner approval; no approval_id provided",
                "basis": "REQUIRES_OWNER_APPROVAL",
            }
        return {
            "verdict": "allow",
            "reason": f"action '{action_type}' has approval_id={approval_id}",
            "basis": "REQUIRES_OWNER_APPROVAL_satisfied",
        }

    escalating = [t for t in risk_tags if t in ESCALATING_RISK_TAGS]
    if escalating and not approval_id:
        return {
            "verdict": "escalate",
            "reason": f"risk_tags {escalating} require owner approval; no approval_id provided",
            "basis": "ESCALATING_RISK_TAGS",
        }

    if action_type in ALLOWED_WITHOUT_APPROVAL:
        return {
            "verdict": "allow",
            "reason": f"action '{action_type}' is in ALLOWED_WITHOUT_APPROVAL",
            "basis": "ALLOWED_WITHOUT_APPROVAL",
        }

    return {
        "verdict": "escalate",
        "reason": f"action '{action_type}' is not in any policy list; conservative default",
        "basis": "default_policy",
    }
