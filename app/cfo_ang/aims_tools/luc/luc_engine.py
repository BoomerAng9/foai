"""LUC Engine — all metering math lives here. UI is display only.

Functions: estimate(), canExecute(), recordUsage(), creditUsage()
Data: Firestore luc_accounts/{useramountid} for state,
      luc_events/{useramountid}/events/{eventId} for append-only history.
Plans are policy — quota limits loaded from Firestore, never hardcoded.
"""

from datetime import datetime, timezone

from google.cloud import firestore

from .luc_constants import SERVICE_CATALOG
from .luc_schemas import (
    AccountState,
    CanExecuteRequest,
    CanExecuteResponse,
    CreditUsageRequest,
    CreditUsageResponse,
    EstimateRequest,
    EstimateResponse,
    RecordUsageRequest,
    RecordUsageResponse,
)

GCP_PROJECT = "foai-aims"


def _get_db() -> firestore.Client:
    return firestore.Client(project=GCP_PROJECT)


def _get_account(db: firestore.Client, user_account_id: str) -> dict:
    """Load account state from Firestore."""
    doc = db.collection("luc_accounts").document(user_account_id).get()
    if not doc.exists:
        raise ValueError(f"Account not found: {user_account_id}")
    return doc.to_dict()


def _get_plan_limits(db: firestore.Client, plan_id: str) -> dict[str, float]:
    """Load plan quota limits from Firestore. Plans are policy, not code."""
    doc = db.collection("luc_plans").document(plan_id).get()
    if not doc.exists:
        raise ValueError(f"Plan not found: {plan_id}")
    data = doc.to_dict()
    return data.get("limits", {})


def _append_event(
    db: firestore.Client,
    user_account_id: str,
    event_type: str,
    payload: dict,
) -> str:
    """Append-only event to luc_events/{useramountid}/events/{eventId}."""
    now = datetime.now(timezone.utc).isoformat()
    event_ref = (
        db.collection("luc_events")
        .document(user_account_id)
        .collection("events")
        .document()
    )
    event_ref.set({
        "type": event_type,
        "timestamp": now,
        **payload,
    })
    return event_ref.id


# ── Core Functions ──────────────────────────────────────────────────

def estimate(req: EstimateRequest) -> EstimateResponse:
    """Estimate cost and quota impact before execution."""
    db = _get_db()
    account = _get_account(db, req.user_account_id)
    limits = _get_plan_limits(db, account["plan_id"])

    current_usage = account.get("usage", {}).get(req.service_key, 0.0)
    quota_limit = limits.get(req.service_key, 0.0)
    remaining_after = quota_limit - current_usage - req.quantity

    # Estimated cost: load unit prices from plan
    plan_doc = db.collection("luc_plans").document(account["plan_id"]).get()
    unit_prices = plan_doc.to_dict().get("unit_prices", {})
    unit_price = unit_prices.get(req.service_key, 0.0)
    estimated_cost = req.quantity * unit_price

    return EstimateResponse(
        user_account_id=req.user_account_id,
        service_key=req.service_key,
        quantity=req.quantity,
        estimated_cost=estimated_cost,
        current_usage=current_usage,
        quota_limit=quota_limit,
        remaining_after=remaining_after,
        within_quota=remaining_after >= 0,
    )


def can_execute(req: CanExecuteRequest) -> CanExecuteResponse:
    """Gate check: does the user have quota to execute this operation?"""
    db = _get_db()
    account = _get_account(db, req.user_account_id)
    limits = _get_plan_limits(db, account["plan_id"])

    current_usage = account.get("usage", {}).get(req.service_key, 0.0)
    quota_limit = limits.get(req.service_key, 0.0)
    remaining = quota_limit - current_usage

    allowed = remaining >= req.quantity
    denial_reason = None
    if not allowed:
        denial_reason = (
            f"Quota exceeded for {req.service_key}: "
            f"need {req.quantity}, have {remaining:.2f} remaining "
            f"(limit {quota_limit}, used {current_usage:.2f})"
        )

    return CanExecuteResponse(
        user_account_id=req.user_account_id,
        service_key=req.service_key,
        quantity=req.quantity,
        allowed=allowed,
        current_usage=current_usage,
        quota_limit=quota_limit,
        remaining=remaining,
        denial_reason=denial_reason,
    )


def record_usage(req: RecordUsageRequest) -> RecordUsageResponse:
    """Record actual usage after execution. Updates account + appends event."""
    db = _get_db()
    account_ref = db.collection("luc_accounts").document(req.user_account_id)
    account = _get_account(db, req.user_account_id)
    limits = _get_plan_limits(db, account["plan_id"])

    current_usage = account.get("usage", {}).get(req.service_key, 0.0)
    new_total = current_usage + req.quantity
    quota_limit = limits.get(req.service_key, 0.0)

    # Update usage atomically
    account_ref.update({
        f"usage.{req.service_key}": new_total,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    })

    # Append event
    event_id = _append_event(db, req.user_account_id, "usage", {
        "service_key": req.service_key,
        "quantity": req.quantity,
        "agent_name": req.agent_name,
        "task_id": req.task_id,
        "metadata": req.metadata,
        "new_total": new_total,
    })

    return RecordUsageResponse(
        user_account_id=req.user_account_id,
        service_key=req.service_key,
        quantity_recorded=req.quantity,
        new_usage_total=new_total,
        quota_limit=quota_limit,
        remaining=quota_limit - new_total,
        event_id=event_id,
    )


def credit_usage(req: CreditUsageRequest) -> CreditUsageResponse:
    """Credit back usage (refund, error correction)."""
    db = _get_db()
    account_ref = db.collection("luc_accounts").document(req.user_account_id)
    account = _get_account(db, req.user_account_id)

    current_usage = account.get("usage", {}).get(req.service_key, 0.0)
    new_total = max(0.0, current_usage - req.quantity)

    account_ref.update({
        f"usage.{req.service_key}": new_total,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    })

    event_id = _append_event(db, req.user_account_id, "credit", {
        "service_key": req.service_key,
        "quantity": req.quantity,
        "agent_name": req.agent_name,
        "reason": req.reason,
        "new_total": new_total,
    })

    return CreditUsageResponse(
        user_account_id=req.user_account_id,
        service_key=req.service_key,
        quantity_credited=req.quantity,
        new_usage_total=new_total,
        event_id=event_id,
    )


def get_account_state(user_account_id: str) -> AccountState:
    """Full account state with computed remaining and overage."""
    db = _get_db()
    account = _get_account(db, user_account_id)
    limits = _get_plan_limits(db, account["plan_id"])

    usage = account.get("usage", {})
    remaining = {}
    overage = {}

    for key in SERVICE_CATALOG:
        used = usage.get(key, 0.0)
        limit = limits.get(key, 0.0)
        diff = limit - used
        remaining[key] = max(0.0, diff)
        overage[key] = max(0.0, -diff)

    return AccountState(
        user_account_id=user_account_id,
        plan_id=account["plan_id"],
        usage=usage,
        limits=limits,
        remaining=remaining,
        overage=overage,
        last_updated=account.get("last_updated", ""),
    )
