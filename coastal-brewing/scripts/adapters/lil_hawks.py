"""Lil_Hawks dispatch adapter for Coastal Brewing.

Coastal-runner uses this to delegate to canonical FOAI Lil_Hawks instead of
running NVIDIA-style calls directly. Two integration paths:

1. Chicken Hawk gateway (`hawk.foai.cloud/chat`) — natural-language work.
   Routes internally to the right dev-tier Lil_Hawk (TRAE/Coding/Agent/Flow/
   Sand/Memory/Graph/Back/Viz/Deep/Blend) via DeerFlow 2.0 orchestration.
   Used for: caption drafts, email drafts, product copy variants, daily
   summaries, FAQ drafts, support classification, blog outlines.

2. Sqwaadrun (`sqwaadrun.foai.cloud/api/dispatch`) — web recon + scraping.
   Bearer-gated with `sqr_live_*` customer key.
   Used for: supplier_due_diligence, claim_verification, market_watch,
   competitor_research (the Feynman-research lane in the kit's vocabulary).

Both endpoints return gracefully when not configured — runner falls back to
filesystem placeholder behavior (current default).
"""
from __future__ import annotations

import os
from typing import Any, Optional

import requests

HAWK_GATEWAY_URL = os.environ.get("HAWK_GATEWAY_URL", "https://hawk.foai.cloud")
SQWAADRUN_BASE_URL = os.environ.get("SQWAADRUN_BASE_URL", "https://sqwaadrun.foai.cloud")
SQWAADRUN_API_KEY = os.environ.get("SQWAADRUN_API_KEY", "")


def chicken_hawk_configured() -> bool:
    return bool(HAWK_GATEWAY_URL)


def sqwaadrun_configured() -> bool:
    return bool(SQWAADRUN_API_KEY)


def dispatch_chicken_hawk(message: str, session_id: Optional[str] = None,
                          timeout: int = 60) -> dict[str, Any]:
    """POST a natural-language message to chicken-hawk /chat.

    Returns the gateway's HawkResponse shape: {hawk, content, reviewed,
    trace_id, elapsed_ms, metadata}. On failure returns {error, ...}.
    """
    if not chicken_hawk_configured():
        return {"error": "hawk_gateway_not_configured"}
    try:
        r = requests.post(
            f"{HAWK_GATEWAY_URL.rstrip('/')}/chat",
            json={"message": message, "session_id": session_id},
            timeout=timeout,
        )
        if r.status_code == 200:
            return r.json()
        return {"error": f"hawk_gateway_http_{r.status_code}", "body": r.text[:500]}
    except Exception as e:
        return {"error": "hawk_gateway_unreachable", "detail": str(e)}


def dispatch_sqwaadrun_recon(query: str, depth: str = "shallow",
                             timeout: int = 120) -> dict[str, Any]:
    """POST a web-recon mission to Sqwaadrun.

    Bearer-authenticated via SQWAADRUN_API_KEY (sqr_live_* customer key).
    Returns the mission response or an error envelope.
    """
    if not sqwaadrun_configured():
        return {"error": "sqwaadrun_not_configured"}
    try:
        r = requests.post(
            f"{SQWAADRUN_BASE_URL.rstrip('/')}/api/mission",
            headers={"Authorization": f"Bearer {SQWAADRUN_API_KEY}"},
            json={"query": query, "depth": depth},
            timeout=timeout,
        )
        if r.status_code == 200:
            return r.json()
        return {"error": f"sqwaadrun_http_{r.status_code}", "body": r.text[:500]}
    except Exception as e:
        return {"error": "sqwaadrun_unreachable", "detail": str(e)}


def configured_summary() -> dict:
    """For /healthz reporting — which Lil_Hawks integrations are wired."""
    return {
        "chicken_hawk": chicken_hawk_configured(),
        "chicken_hawk_url": HAWK_GATEWAY_URL,
        "sqwaadrun": sqwaadrun_configured(),
        "sqwaadrun_url": SQWAADRUN_BASE_URL,
    }
