"""Hermes audit hook.

Hermes receipts are written automatically by Chicken Hawk on every executed
action. This module exposes a read-side helper for agents that need to query
the audit trail (e.g. "have we already drafted a caption for this campaign?").

Direct writes from agents are NOT supported — all writes go through Chicken
Hawk to preserve the immutable receipt chain.
"""
from __future__ import annotations

import os
from typing import Any

import requests

CHICKEN_HAWK_URL = os.environ.get("CHICKEN_HAWK_URL", "https://hawk.foai.cloud").rstrip("/")
CHICKEN_HAWK_BEARER = os.environ.get("CHICKEN_HAWK_BEARER", "")


def query_audit(task_id: str, timeout: int = 10) -> dict[str, Any]:
    """Read the audit trail for a given task_id."""
    if not CHICKEN_HAWK_BEARER:
        return {"ok": False, "message": "Hermes audit not configured."}
    try:
        r = requests.get(
            f"{CHICKEN_HAWK_URL}/audit/{task_id}",
            headers={"Authorization": f"Bearer {CHICKEN_HAWK_BEARER}"},
            timeout=timeout,
        )
        if r.status_code == 200:
            return {"ok": True, **r.json()}
        return {"ok": False, "status": r.status_code, "detail": r.text[:300]}
    except Exception as e:
        return {"ok": False, "detail": str(e)}
