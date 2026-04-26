"""Chicken Hawk gateway client.

Every Spinner tool call routes through Chicken Hawk before any external side effect.
Chicken Hawk hosts the embedded NemoClaw policy gate and writes AuditLedger receipts
as a side effect of allowed actions.
"""
from __future__ import annotations

import os
from typing import Any

import requests

CHICKEN_HAWK_URL = os.environ.get("CHICKEN_HAWK_URL", "https://hawk.foai.cloud").rstrip("/")
CHICKEN_HAWK_BEARER = os.environ.get("CHICKEN_HAWK_BEARER", "")


def dispatch(action: str, payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    """Send a tool call through Chicken Hawk → NemoClaw → AuditLedger → execution.

    Returns the gateway envelope. On failure returns an error envelope so the
    caller (the LLM agent) can surface a graceful message to the user.
    """
    if not CHICKEN_HAWK_BEARER:
        return {
            "ok": False,
            "verdict": "not_configured",
            "message": "Chicken Hawk bearer not set; tool call did not execute.",
        }
    try:
        r = requests.post(
            f"{CHICKEN_HAWK_URL}/run",
            json={"action": action, "payload": payload},
            headers={"Authorization": f"Bearer {CHICKEN_HAWK_BEARER}"},
            timeout=timeout,
        )
        if r.status_code == 200:
            return {"ok": True, **r.json()}
        if r.status_code == 403:
            return {
                "ok": False,
                "verdict": "denied",
                "message": "NemoClaw denied this action.",
                "detail": r.json(),
            }
        if r.status_code == 202:
            return {
                "ok": False,
                "verdict": "escalated",
                "message": "Owner approval required; routed to Telegram.",
                "detail": r.json(),
            }
        return {
            "ok": False,
            "verdict": f"http_{r.status_code}",
            "message": "Chicken Hawk returned an unexpected status.",
            "detail": r.text[:500],
        }
    except Exception as e:
        return {
            "ok": False,
            "verdict": "unreachable",
            "message": "Chicken Hawk unreachable.",
            "detail": str(e),
        }
