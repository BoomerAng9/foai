# coastal-brewing/scripts/owner_console.py
"""Owner-only API router for /api/v1/owner/*.

Every endpoint in this module is gated by `require_owner` which checks
the `coastal_owner` cookie HMAC + the email's continued presence in
COASTAL_OWNER_EMAILS (env change → ongoing session denied).
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from pydantic import BaseModel

import owner_auth
from owner_config_loader import load_json, atomic_write_json

log = logging.getLogger("coastal.owner_console")

router = APIRouter(prefix="/api/v1/owner", tags=["owner"])


def _owner_session_secret() -> str:
    secret = os.environ.get("COASTAL_OWNER_SESSION_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="owner session not configured")
    return secret


def require_owner(
    coastal_owner: Annotated[str | None, Cookie()] = None,
) -> dict:
    """FastAPI dependency. Returns the owner identity dict on success.
    Raises 401 (no/invalid cookie) or 403 (email no longer in allowlist)."""
    parsed = owner_auth.verify_owner_cookie(coastal_owner, _owner_session_secret())
    if parsed is None:
        raise HTTPException(status_code=401, detail="owner session required")
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(parsed["email"], allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    return parsed


_STRIPE_EVENT_CACHE: dict[str, object] = {"at": 0.0, "value": []}


def _cached_stripe_events() -> list[dict]:
    """Return a 30s-cached snapshot of stripe.Event.list(limit=50).
    On Stripe API failure, returns the last-cached value (or empty)
    + logs a warning. Refresh is lazy — fired on the next /activity
    request after the cache TTL expires (no background task)."""
    import time
    if time.time() - _STRIPE_EVENT_CACHE["at"] < 30:
        return _STRIPE_EVENT_CACHE["value"]
    try:
        import stripe
        events = stripe.Event.list(limit=50)
        out = [{"id": e.id, "type": e.type, "created": e.created} for e in events]
    except Exception as exc:
        log.warning("owner_console: stripe event fetch failed: %s", exc)
        return _STRIPE_EVENT_CACHE["value"]
    _STRIPE_EVENT_CACHE["at"] = time.time()
    _STRIPE_EVENT_CACHE["value"] = out
    return out


def _config_dir() -> Path:
    return Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config"))


def _pricing_path() -> Path:
    return _config_dir() / "pricing-config.json"


CONFIRM_PRICING = "CONFIRM PRICING CHANGE"


class PricingUpdate(BaseModel):
    tier_monthly_retail: dict[str, float] | None = None
    tier_envelope_max_cents: dict[str, int] | None = None
    cadence_discounts: dict[str, float] | None = None  # cadence_id → 0.0-0.40
    confirmation_phrase: str = ""


@router.get("/pricing")
def get_pricing(owner: dict = Depends(require_owner)) -> dict:
    return load_json(_pricing_path())


@router.put("/pricing")
def put_pricing(
    body: PricingUpdate,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_PRICING:
        raise HTTPException(
            status_code=400,
            detail=f"confirmation phrase mismatch (must be '{CONFIRM_PRICING}')",
        )
    current = load_json(_pricing_path())
    new = json.loads(json.dumps(current))  # deep copy
    if body.tier_monthly_retail:
        for k, v in body.tier_monthly_retail.items():
            if not (0 < v <= 999):
                raise HTTPException(
                    status_code=422,
                    detail=f"tier_monthly_retail[{k}] out of bounds (0, 999]",
                )
            new.setdefault("tier_monthly_retail", {})[k] = float(v)
    if body.tier_envelope_max_cents:
        for k, v in body.tier_envelope_max_cents.items():
            if not (0 < v <= 100000):
                raise HTTPException(
                    status_code=422,
                    detail=f"tier_envelope_max_cents[{k}] out of bounds (0, 100000]",
                )
            new.setdefault("tier_envelope_max_cents", {})[k] = int(v)
    if body.cadence_discounts:
        for cid, disc in body.cadence_discounts.items():
            if not (0.0 <= disc <= 0.40):
                raise HTTPException(
                    status_code=422,
                    detail=f"cadence_discounts[{cid}] out of bounds [0.0, 0.40]",
                )
            new.setdefault("cadences", {}).setdefault(cid, {})["discount"] = float(disc)
    atomic_write_json(_pricing_path(), new)
    import audit_ledger
    diff = {
        "tier_monthly_retail": body.tier_monthly_retail,
        "tier_envelope_max_cents": body.tier_envelope_max_cents,
        "cadence_discounts": body.cadence_discounts,
    }
    audit_ledger.record_event(event_type="owner_pricing_update", payload={
        "email": owner["email"], "diff": diff,
    })
    return new


CONFIRM_CUSTOMER_DELETE = "CONFIRM CUSTOMER DELETE"
CONFIRM_CUSTOMER_CANCEL = "CONFIRM CANCEL SUBSCRIPTION"


class CustomerActionBody(BaseModel):
    confirmation_phrase: str = ""


@router.get("/customers")
def list_customers(
    q: str = "",
    limit: int = 100,
    owner: dict = Depends(require_owner),
) -> dict:
    import stripe
    listing = stripe.Customer.list(limit=min(limit, 100), email=q or None)
    out = []
    for c in listing.data:
        md: dict = {}
        if c.metadata:
            try:
                for k in c.metadata:
                    md[k] = c.metadata[k]
            except Exception:
                pass
        out.append({
            "id": c.id,
            "email": getattr(c, "email", None),
            "created": getattr(c, "created", 0),
            "metadata": md,
        })
    return {"customers": out}


@router.post("/customers/{customer_id}/delete")
def delete_customer(
    customer_id: str,
    body: CustomerActionBody,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_CUSTOMER_DELETE:
        raise HTTPException(status_code=400, detail="confirmation phrase mismatch")
    import stripe
    import audit_ledger
    stripe.Customer.delete(customer_id)
    audit_ledger.record_event(event_type="owner_customer_delete", payload={
        "email": owner["email"], "customer_id": customer_id,
    })
    return {"ok": True, "deleted": customer_id}


@router.post("/customers/{customer_id}/cancel-subscription/{sub_id}")
def cancel_subscription(
    customer_id: str,
    sub_id: str,
    body: CustomerActionBody,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_CUSTOMER_CANCEL:
        raise HTTPException(status_code=400, detail="confirmation phrase mismatch")
    import stripe
    import audit_ledger
    sub = stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    audit_ledger.record_event(event_type="owner_subscription_cancel", payload={
        "email": owner["email"], "customer_id": customer_id, "subscription_id": sub_id,
    })
    return {"ok": True, "subscription_id": sub_id, "status": sub.status}


@router.get("/activity")
def get_activity(
    request: Request,
    since: str | None = None,
    include_stripe: bool = True,
    owner: dict = Depends(require_owner),
) -> dict:
    """Return last 50 audit_ledger events + (optionally) 50 Stripe events
    (cached 30s). `since` is a unix cursor — events older than this are
    excluded."""
    import audit_ledger
    cutoff = float(since) if since else 0.0
    try:
        events = audit_ledger.recent_events(limit=50, since_unix=cutoff)
    except AttributeError:
        # recent_events helper missing — add it to audit_ledger
        events = []
        log.warning("audit_ledger.recent_events not implemented; returning empty list")
    stripe_events: list[dict] = []
    if include_stripe:
        stripe_events = _cached_stripe_events()
    cursor = None
    if events:
        first = events[0]
        cursor = str(first.get("ts") or first.get("created_at") or "")
    return {
        "ok": True,
        "owner_email": owner["email"],
        "events": events,
        "stripe_events": stripe_events,
        "cursor": cursor,
    }
