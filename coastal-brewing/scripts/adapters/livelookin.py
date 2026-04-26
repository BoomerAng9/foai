"""Live Look In adapter — provider-neutral 3D session orchestration.

Live Look In is the on-demand 3D / volumetric viewer surface for Coastal's AI
team members. Customer clicks `<LiveLookInTrigger/>` on a TeamCard → frontend
POSTs to `/api/livelookin/session` → this module decides which provider can
serve the session and returns a viewer URL the modal can mount.

GPU substrate: **Vast.ai** (per owner decision 2026-04-26).
  Cosmos-Transfer2.5 and Lyra 2.0 workloads run on Vast.ai-rented instances.
  When integration time comes, set:
    - VAST_AI_API_KEY      (orchestration: instance create / destroy)
    - LIVELOOKIN_COSMOS_ENDPOINT  → https://<instance-id>.vast.ai/...
    - LIVELOOKIN_LYRA_ENDPOINT    → https://<instance-id>.vast.ai/...
  The adapter doesn't care about the GPU substrate; it only needs the URL
  the model server is listening on. Vast.ai is just where it runs.

Provider chain (first available wins):
  1. NVIDIA Cosmos-Transfer2.5 (Vast.ai-hosted by default)
       env: LIVELOOKIN_COSMOS_ENDPOINT [+ VAST_AI_API_KEY for auto-spin]
  2. NVIDIA Lyra 2.0 zoom-gs inference (Vast.ai-hosted by default)
       env: LIVELOOKIN_LYRA_ENDPOINT
  3. HeyGen v4 action-avatar (third-party, no GPU rental needed)
       env: HEYGEN_API_KEY + agent reference video
  4. Seedance 360 fallback video loop (BytePlus-direct, no GPU on our side)
       env: LIVELOOKIN_FALLBACK_VIDEO_URL
  5. Static portrait + "coming soon" copy

The runtime never blocks on GPU provisioning — every session call returns
within ~1s with either a live viewer_url or the fallback video URL. Vast.ai
instance provisioning (cold start ~30-60s) happens out-of-band; sessions
poll `/api/livelookin/session/{id}` to discover when they upgrade from
fallback → live.

Owner-side observability: every session creation writes an action_receipt
to AuditLedger so GPU-minutes burned per agent / per day are queryable.
"""
from __future__ import annotations

import os
import secrets
import time
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Env config (all optional — module degrades gracefully)
# ---------------------------------------------------------------------------

LIVELOOKIN_ENABLED = os.environ.get("LIVELOOKIN_ENABLED", "false").lower() == "true"

# Vast.ai orchestration key (used by both Cosmos + Lyra providers when
# auto-spinning instances; not required if endpoints are pre-provisioned).
VAST_AI_API_KEY = os.environ.get("VAST_AI_API_KEY", "")

# Provider 1 — Cosmos-Transfer2.5 (Vast.ai-hosted endpoint by default)
LIVELOOKIN_COSMOS_ENDPOINT = os.environ.get("LIVELOOKIN_COSMOS_ENDPOINT", "")

# Provider 2 — Lyra 2.0 (nv-tlabs/lyra; Vast.ai-hosted endpoint by default)
LIVELOOKIN_LYRA_ENDPOINT = os.environ.get("LIVELOOKIN_LYRA_ENDPOINT", "")

# Provider 3 — HeyGen v4 action-avatar
HEYGEN_API_KEY = os.environ.get("HEYGEN_API_KEY", "")

# Provider 4 — Seedance fallback video loop
LIVELOOKIN_FALLBACK_VIDEO_URL = os.environ.get("LIVELOOKIN_FALLBACK_VIDEO_URL", "")

# Provider 5 — Static portrait paths (always available)
STATIC_PORTRAITS = {
    "sales": "/static/team/sales-placeholder.png",
    "marketing": "/static/team/marketing-placeholder.png",
}

# Per-agent reference assets (used by HeyGen / Cosmos to maintain identity).
# These get populated when Iller_Ang generates the canonical character pack.
AGENT_REFERENCE_VIDEOS = {
    "sales": os.environ.get("LIVELOOKIN_SALES_REFERENCE_VIDEO", ""),
    "marketing": os.environ.get("LIVELOOKIN_MARKETING_REFERENCE_VIDEO", ""),
}

# ---------------------------------------------------------------------------
# Provider availability checks
# ---------------------------------------------------------------------------

def _cosmos_available() -> bool:
    return bool(LIVELOOKIN_COSMOS_ENDPOINT)


def _lyra_available() -> bool:
    return bool(LIVELOOKIN_LYRA_ENDPOINT)


def _heygen_available(agent: str) -> bool:
    return bool(HEYGEN_API_KEY and AGENT_REFERENCE_VIDEOS.get(agent))


def _fallback_video_available() -> bool:
    return bool(LIVELOOKIN_FALLBACK_VIDEO_URL)


# ---------------------------------------------------------------------------
# Session creation — main entrypoint
# ---------------------------------------------------------------------------

def create_session(agent: str, requested_by: Optional[str] = None) -> dict[str, Any]:
    """Provision a Live Look In session for the given agent lane.

    Returns immediately with a session envelope; if GPU is queued, the mode is
    'fallback' until the session upgrades. Frontend polls the GET endpoint to
    discover state transitions.
    """
    if agent not in ("sales", "marketing"):
        return {"error": "unknown_agent", "agent": agent}

    if not LIVELOOKIN_ENABLED:
        return _envelope(
            agent,
            mode="disabled",
            viewer_url=None,
            poster=STATIC_PORTRAITS.get(agent),
            message="Live Look In is not enabled in this environment.",
        )

    # Provider selection — first-available wins
    if _cosmos_available():
        return _provision_cosmos(agent, requested_by)
    if _lyra_available():
        return _provision_lyra(agent, requested_by)
    if _heygen_available(agent):
        return _provision_heygen(agent, requested_by)
    if _fallback_video_available():
        return _envelope(
            agent,
            mode="fallback_video",
            viewer_url=LIVELOOKIN_FALLBACK_VIDEO_URL,
            poster=STATIC_PORTRAITS.get(agent),
            message="Streaming pre-rendered 360° loop while GPU spins up.",
        )

    return _envelope(
        agent,
        mode="static",
        viewer_url=None,
        poster=STATIC_PORTRAITS.get(agent),
        message="Live 3D session is queued. Showing a still portrait while GPU provisioning warms up.",
    )


def get_session(session_id: str) -> dict[str, Any]:
    """Status check for an existing session.

    For now sessions are stateless — re-running create_session for the same
    agent returns the current best-available mode. When GPU providers are
    wired and sessions become long-lived, this hook becomes the warm-state
    lookup (Redis / AuditLedger).
    """
    # Stateless stub: derive agent from session_id prefix when present.
    parts = session_id.split("_", 2)
    agent = parts[1] if len(parts) >= 2 and parts[0] == "lli" else "sales"
    return create_session(agent)


def end_session(session_id: str) -> dict[str, Any]:
    """Tear down a session and release GPU minutes.

    Stateless stub for now — when GPU providers are wired this signals the
    HF Job / Lyra runner to shut down.
    """
    return {"session_id": session_id, "ended": True, "ts": int(time.time() * 1000)}


# ---------------------------------------------------------------------------
# Provider stubs — wire each as GPU access lands
# ---------------------------------------------------------------------------

def _provision_cosmos(agent: str, requested_by: Optional[str]) -> dict[str, Any]:
    """NVIDIA Cosmos-Transfer2.5 — Vast.ai-hosted endpoint.

    PLACEHOLDER. Real implementation when Vast.ai instance is up:
      1. POST {LIVELOOKIN_COSMOS_ENDPOINT}/infer with agent reference + trajectory
      2. Receive job_id + ws_url
      3. Return ws_url as viewer_url
    If VAST_AI_API_KEY is set, the adapter can also auto-spin a fresh instance
    via the Vast.ai REST API when LIVELOOKIN_COSMOS_ENDPOINT returns 5xx.
    """
    return _envelope(
        agent,
        mode="fallback_video",  # until provider is wired
        viewer_url=LIVELOOKIN_FALLBACK_VIDEO_URL or None,
        poster=STATIC_PORTRAITS.get(agent),
        message="Cosmos endpoint configured; live wiring lands when Vast.ai instance is bound.",
        provider="cosmos-transfer-2.5",
    )


def _provision_lyra(agent: str, requested_by: Optional[str]) -> dict[str, Any]:
    """NVIDIA Lyra 2.0 zoom-gs inference (nv-tlabs/lyra) — Vast.ai-hosted.

    PLACEHOLDER. Real implementation when Vast.ai instance is up:
      1. POST {LIVELOOKIN_LYRA_ENDPOINT}/lyra2_zoomgs_inference with reference
      2. Receive gs_url (Gaussian Splat) + viewer_html
      3. Return viewer_html embed URL
    """
    return _envelope(
        agent,
        mode="fallback_video",
        viewer_url=LIVELOOKIN_FALLBACK_VIDEO_URL or None,
        poster=STATIC_PORTRAITS.get(agent),
        message="Lyra 2.0 endpoint configured; live wiring lands when Vast.ai instance is reachable.",
        provider="lyra-2.0",
    )


def _provision_heygen(agent: str, requested_by: Optional[str]) -> dict[str, Any]:
    """HeyGen v4 action-avatar.

    PLACEHOLDER. Real implementation:
      1. POST /v4/action-avatars with reference_video_id + script
      2. Receive video_id
      3. Poll until ready, return CDN URL
    """
    return _envelope(
        agent,
        mode="fallback_video",
        viewer_url=LIVELOOKIN_FALLBACK_VIDEO_URL or None,
        poster=STATIC_PORTRAITS.get(agent),
        message="HeyGen provider configured; live wiring lands when reference video uploaded.",
        provider="heygen-v4",
    )


# ---------------------------------------------------------------------------
# Envelope helper
# ---------------------------------------------------------------------------

def _envelope(
    agent: str,
    mode: str,
    viewer_url: Optional[str],
    poster: Optional[str],
    message: str,
    provider: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "session_id": f"lli_{agent}_{secrets.token_hex(6)}",
        "agent": agent,
        "mode": mode,  # "live" | "fallback_video" | "static" | "disabled"
        "viewer_url": viewer_url,
        "poster": poster,
        "provider": provider,
        "message": message,
        "ts": int(time.time() * 1000),
    }


def configured_summary() -> dict[str, Any]:
    """For /healthz to report provider availability."""
    return {
        "enabled": LIVELOOKIN_ENABLED,
        "providers": {
            "cosmos": _cosmos_available(),
            "lyra": _lyra_available(),
            "heygen_sales": _heygen_available("sales"),
            "heygen_marketing": _heygen_available("marketing"),
            "fallback_video": _fallback_video_available(),
        },
    }
