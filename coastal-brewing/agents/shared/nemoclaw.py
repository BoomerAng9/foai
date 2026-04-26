"""NemoClaw policy gate client.

NemoClaw is embedded in Chicken Hawk; this is a thin wrapper for direct
policy checks (e.g. "is this discount within margin floor?") that don't
need to fire a side-effect call.
"""
from __future__ import annotations

import os
from typing import Any

import requests

NEMOCLAW_URL = os.environ.get("NEMOCLAW_URL", "https://hawk.foai.cloud/check").rstrip("/")
CHICKEN_HAWK_BEARER = os.environ.get("CHICKEN_HAWK_BEARER", "")


def check(action: str, context: dict[str, Any], timeout: int = 10) -> dict[str, Any]:
    """Ask NemoClaw to verdict a planned action without executing it.

    Returns: {verdict: "allow"|"escalate"|"deny", reason: str, basis: str}
    """
    if not CHICKEN_HAWK_BEARER:
        return {"verdict": "not_configured"}
    try:
        r = requests.post(
            NEMOCLAW_URL,
            json={"action": action, "context": context},
            headers={"Authorization": f"Bearer {CHICKEN_HAWK_BEARER}"},
            timeout=timeout,
        )
        if r.status_code == 200:
            return r.json()
        return {"verdict": f"http_{r.status_code}", "detail": r.text[:300]}
    except Exception as e:
        return {"verdict": "unreachable", "detail": str(e)}
