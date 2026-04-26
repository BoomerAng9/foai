"""NemoClaw policy module - embedded inside Chicken Hawk Gateway.

Mirrors the standalone NemoClaw v0.1 logic. Pure verdicts on action proposals,
risk events written to a JSON ledger under NEMOCLAW_DATA_DIR (default /data/nemoclaw).

Endpoints (all require Bearer NEMOCLAW_API_KEY for service-to-service):
  POST /check         - verdict on action proposal: allow | deny | escalate
  POST /risk-event    - record a risk event
  GET  /risk-events   - list recent risk events
"""
from __future__ import annotations

import json
import os
import pathlib
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

NEMOCLAW_API_KEY = os.getenv("NEMOCLAW_API_KEY", "")
DATA_DIR = pathlib.Path(os.getenv("NEMOCLAW_DATA_DIR", "/data/nemoclaw"))
EVENTS_PATH = DATA_DIR / "risk_events.json"
_lock = threading.Lock()

router = APIRouter()

BLOCKED_ACTIONS: set[str] = {
    "fabricate_certification", "claim_organic_without_proof", "claim_fair_trade_without_proof",
    "claim_mold_free_without_proof", "make_medical_or_health_claim", "claim_fda_approval",
    "store_raw_payment_credentials", "bypass_owner_approval", "bypass_acheevy",
    "execute_real_money_movement_without_approval", "modify_legal_documents_without_approval",
    "publish_unverified_claim",
}
REQUIRES_OWNER_APPROVAL: set[str] = {
    "publish_public_content", "publish_public_page", "send_email_externally", "send_sms_externally",
    "change_product_price", "submit_supplier_order", "issue_refund", "issue_refund_above_threshold",
    "change_subscription_billing", "change_supplier", "make_legal_or_certification_claim",
    "approve_certification_language", "change_ad_budget", "access_customer_payment_data",
    "access_payment_data", "launch_campaign", "place_wholesale_order", "sign_contract",
    "file_legal_document", "spend_money", "update_live_product_claims",
}
ESCALATING_RISK_TAGS: set[str] = {
    "legal", "money", "certification", "health", "fda", "final_public",
    "supplier_change", "ad_spend", "contract", "customer_payment_data",
}
ALLOWED_WITHOUT_APPROVAL: set[str] = {
    "create_internal_draft", "classify_message", "write_internal_summary", "create_research_ticket",
    "write_receipt", "prepare_owner_approval_request", "create_draft", "summarize", "classify",
    "generate_internal_report", "prepare_supplier_email_draft", "prepare_customer_support_draft",
    "prepare_shopify_product_draft", "create_receipt", "file_anomaly_event", "generate_daily_digest",
    "draft_caption", "draft_email", "classify_support", "summarize_daily_ops", "cluster_reviews",
    "draft_faq", "draft_product_copy", "draft_outreach", "draft_order_confirmation",
    "supplier_due_diligence", "claim_verification", "market_watch", "competitor_research",
    "product_evidence", "copy_evidence_review", "supplier_order_transmit",
}


def _evaluate(action_type: str, risk_tags: list[str], approval_id: Optional[str]) -> dict:
    if action_type in BLOCKED_ACTIONS:
        return {"verdict": "deny", "reason": f"action '{action_type}' is in BLOCKED_ACTIONS",
                "basis": "BLOCKED_ACTIONS"}
    if action_type in REQUIRES_OWNER_APPROVAL:
        if not approval_id:
            return {"verdict": "escalate",
                    "reason": f"action '{action_type}' requires owner approval; no approval_id provided",
                    "basis": "REQUIRES_OWNER_APPROVAL"}
        return {"verdict": "allow", "reason": f"action '{action_type}' has approval_id={approval_id}",
                "basis": "REQUIRES_OWNER_APPROVAL_satisfied"}
    escalating = [t for t in risk_tags if t in ESCALATING_RISK_TAGS]
    if escalating and not approval_id:
        return {"verdict": "escalate",
                "reason": f"risk_tags {escalating} require owner approval; no approval_id provided",
                "basis": "ESCALATING_RISK_TAGS"}
    if action_type in ALLOWED_WITHOUT_APPROVAL:
        return {"verdict": "allow", "reason": f"action '{action_type}' is in ALLOWED_WITHOUT_APPROVAL",
                "basis": "ALLOWED_WITHOUT_APPROVAL"}
    return {"verdict": "escalate",
            "reason": f"action '{action_type}' is not in any policy list; conservative default",
            "basis": "default_policy"}


def _load_events() -> list[dict]:
    if not EVENTS_PATH.exists():
        return []
    with open(EVENTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_events(events: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = EVENTS_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
    tmp.replace(EVENTS_PATH)


def _append_event(event: dict) -> None:
    with _lock:
        events = _load_events()
        events.append(event)
        _save_events(events)


def _require_bearer(authorization: Optional[str]) -> None:
    if not NEMOCLAW_API_KEY:
        raise HTTPException(status_code=503, detail="NEMOCLAW_API_KEY not configured")
    if not authorization or not authorization.startswith("Bearer ") or authorization[7:] != NEMOCLAW_API_KEY:
        raise HTTPException(status_code=401, detail="invalid bearer")


class CheckRequest(BaseModel):
    action_type: str
    risk_tags: list[str] = Field(default_factory=list)
    approval_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CheckResponse(BaseModel):
    check_id: str
    verdict: str
    reason: str
    basis: str
    decided_at: str


class RiskEventCreate(BaseModel):
    severity: str
    category: str
    description: str
    task_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RiskEvent(BaseModel):
    event_id: str
    severity: str
    category: str
    description: str
    task_id: Optional[str] = None
    actor: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    recorded_at: str


_VALID_SEVERITY = {"low", "medium", "high", "critical"}


@router.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest, authorization: Optional[str] = Header(default=None)) -> CheckResponse:
    _require_bearer(authorization)
    result = _evaluate(req.action_type, req.risk_tags, req.approval_id)
    response = CheckResponse(
        check_id=f"chk_{uuid.uuid4().hex[:16]}",
        verdict=result["verdict"], reason=result["reason"], basis=result["basis"],
        decided_at=datetime.now(timezone.utc).isoformat(),
    )
    if response.verdict == "deny":
        _append_event({
            "event_id": f"risk_{uuid.uuid4().hex[:16]}",
            "severity": "high",
            "category": "blocked_action_attempt",
            "description": f"NemoClaw denied '{req.action_type}': {response.reason}",
            "task_id": req.metadata.get("task_id"),
            "actor": req.actor,
            "metadata": {"action_type": req.action_type, "risk_tags": req.risk_tags,
                         "check_id": response.check_id},
            "recorded_at": response.decided_at,
        })
    return response


@router.post("/risk-event", response_model=RiskEvent)
async def create_risk_event(
    req: RiskEventCreate, authorization: Optional[str] = Header(default=None)
) -> RiskEvent:
    _require_bearer(authorization)
    if req.severity not in _VALID_SEVERITY:
        raise HTTPException(status_code=400, detail=f"severity must be one of {sorted(_VALID_SEVERITY)}")
    event = RiskEvent(
        event_id=f"risk_{uuid.uuid4().hex[:16]}",
        severity=req.severity, category=req.category, description=req.description,
        task_id=req.task_id, actor=req.actor, metadata=req.metadata,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )
    _append_event(event.model_dump())
    return event


@router.get("/risk-events", response_model=list[RiskEvent])
async def list_risk_events(
    limit: int = Query(default=100, le=1000),
    severity: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> list[RiskEvent]:
    _require_bearer(authorization)
    events = _load_events()
    if severity:
        events = [e for e in events if e.get("severity") == severity]
    return [RiskEvent(**e) for e in events[-limit:]]
