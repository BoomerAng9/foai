"""A.I.M.S. Model Gateway — ecosystem-wide LLM access through Inworld Realtime Router.

Vertical-agnostic. Coastal Brewing Co. is the first consumer; future
verticals (Per|Form, NurdsCode, plugmein, Account Assistant) plug
into the same gateway via the same client.

Why this gateway:
- Single ingress for every chat-completion call across the FOAI/A.I.M.S.
  ecosystem. No more scattered `openrouter.ai/api/v1` URLs across
  vertical runners.
- OpenAI-compatible (POST /v1/chat/completions, streaming OR
  non-streaming, same response shape) — drop-in for existing call sites.
- Owner-canon (no overlapping vendors): Inworld already in the stack
  for voice; the Realtime Router rides the same vendor relationship,
  same API key (`INWORLD_API_KEY`).
- Per-call model selection per the alignment matrix at:
  `feedback_default_to_deepseek_justify_premium_models_2026_05_06.md`
  + the live alignment locked 2026-05-06.
- Built-in failover, A/B test capability, regional routing, PII gates
  via Inworld's Router primitives — surfaced as future config without
  per-call code changes.

Canonical home: this is shipped at `coastal-brewing/scripts/` for v1
because it's first wired into coastal-runner. When a second vertical
wires it, the canonical path moves to `aims-tools/aims-model-gateway/`
and verticals import from there. Do NOT branch this code per vertical
— it's a shared service.

Reference: https://docs.inworld.ai/router/overview
Migration guide: https://docs.inworld.ai/router/migrating/from-openrouter
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx
import requests

log = logging.getLogger("aims.gateway")

# ─── Configuration ──────────────────────────────────────────────────────

GATEWAY_BASE_URL = os.environ.get(
    "AIMS_GATEWAY_URL", "https://api.inworld.ai/v1"
).rstrip("/")
# Reuses the existing Inworld API key — same vendor, same auth path.
GATEWAY_API_KEY = os.environ.get("INWORLD_API_KEY", "").strip()

# Per-surface model registry. Caller passes a `surface` key, gateway
# resolves to the locked Inworld model name. Keeps model selection
# centralized — when the matrix changes, edit this dict, not every
# call site. Owner-greenlit 2026-05-06.
SURFACE_MODELS: Dict[str, str] = {
    # Coastal customer chat
    "coastal_chat_retail":     "google-vertex/gemma-4-26b-a4b",      # Sal, LUC
    "coastal_chat_reasoning":  "deepinfra/deepseek-v3",                # Melli, ACHEEVY
    # Brand-voice + transactional
    "welcome_message":         "google-vertex/gemma-4-26b-a4b",
    "transactional_short":     "google-vertex/gemma-4-26b-a4b",
    "json_chat_fallback":      "google-vertex/gemma-4-26b-a4b",
    # Summarization + research
    "session_summary":         "google-ai-studio/gemini-3.1-flash-lite-preview",
    "research_synthesis":      "google-vertex/gemma-4-26b-a4b",
    # Frontier — agent orchestration earns its cost
    "agent_orchestration":     "anthropic/claude-sonnet-4-6",
    "linkedin_maps_agent":     "anthropic/claude-sonnet-4-6",
    "code_generation":         "anthropic/claude-sonnet-4-6",
    "structured_evaluation":   "anthropic/claude-sonnet-4-6",
    # Auto-routing — Inworld picks cost-optimized
    "auto":                    "auto",
}


def model_for(surface: str) -> str:
    """Resolve a surface key to its locked Inworld model name. Raises
    KeyError if the surface isn't in the registry — fail loud rather
    than fall back to the wrong model silently."""
    if surface not in SURFACE_MODELS:
        raise KeyError(
            f"surface '{surface}' not registered in AIMS Gateway — "
            f"add to SURFACE_MODELS in aims_gateway.py first"
        )
    return SURFACE_MODELS[surface]


def is_configured() -> bool:
    return bool(GATEWAY_API_KEY)


# ─── Sync client (one-shot non-streaming completions) ───────────────────


def chat_completion(
    *,
    surface: Optional[str] = None,
    model: Optional[str] = None,
    messages: List[Dict[str, Any]],
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
    timeout: int = 60,
    extra_body: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """One-shot chat completion through the gateway. Either pass
    `surface` (canonical) or `model` (escape hatch for ad-hoc calls).

    Returns the full OpenAI-compatible response dict on success, None
    on any failure (logs the error). Caller decides recoverability —
    we never raise to keep call sites resilient.
    """
    if not GATEWAY_API_KEY:
        log.warning("AIMS Gateway: INWORLD_API_KEY not configured")
        return None
    if surface is not None and model is None:
        model = model_for(surface)
    if not model:
        log.warning("AIMS Gateway: no model or surface specified")
        return None

    body: Dict[str, Any] = {"model": model, "messages": messages}
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if temperature is not None:
        body["temperature"] = temperature
    if extra_body:
        body.update(extra_body)

    try:
        resp = requests.post(
            f"{GATEWAY_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GATEWAY_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        log.warning("AIMS Gateway request failed for %s: %s", model, exc)
        return None
    if resp.status_code != 200:
        log.warning(
            "AIMS Gateway non-200 for %s: %s — %s",
            model, resp.status_code, resp.text[:300],
        )
        return None
    try:
        return resp.json()
    except Exception as exc:
        log.warning("AIMS Gateway parse failed for %s: %s", model, exc)
        return None


def extract_text(response: Optional[Dict[str, Any]]) -> str:
    """Pull the assistant's text from a chat-completion response. Returns
    empty string if anything's missing — pairs with the .strip() patterns
    in callers."""
    if not response:
        return ""
    choices = response.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content")
    return (content or "").strip()


# ─── Async streaming client (chat panel WS responses) ───────────────────


async def stream_chat_completion(
    *,
    surface: Optional[str] = None,
    model: Optional[str] = None,
    messages: List[Dict[str, Any]],
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
    timeout: float = 60.0,
    extra_body: Optional[Dict[str, Any]] = None,
) -> AsyncIterator[str]:
    """Yield raw SSE lines from the gateway. Caller is responsible for
    parsing them (e.g., via streaming/thinking_parser.py for the
    reasoning-vs-content split that DeepSeek-style models emit).

    The Gateway speaks OpenAI-compatible SSE — every line of the form
    `data: {...}\\n` with a final `data: [DONE]`. This generator yields
    each non-empty line as it arrives.
    """
    if not GATEWAY_API_KEY:
        log.warning("AIMS Gateway: INWORLD_API_KEY not configured")
        return
    if surface is not None and model is None:
        model = model_for(surface)
    if not model:
        log.warning("AIMS Gateway: no model or surface specified")
        return

    body: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if temperature is not None:
        body["temperature"] = temperature
    if extra_body:
        body.update(extra_body)

    headers = {
        "Authorization": f"Bearer {GATEWAY_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            f"{GATEWAY_BASE_URL}/chat/completions",
            headers=headers,
            json=body,
        ) as resp:
            if resp.status_code != 200:
                err = await resp.aread()
                log.warning(
                    "AIMS Gateway stream non-200 for %s: %s — %s",
                    model, resp.status_code,
                    err.decode("utf-8", "replace")[:300],
                )
                return
            async for line in resp.aiter_lines():
                if line:
                    yield line


# ─── Probe / diagnostics ────────────────────────────────────────────────


def probe(model: Optional[str] = None) -> Dict[str, Any]:
    """Quick health-check ping against the gateway. Used by status
    endpoints + local sanity checks. Returns latency + selected model."""
    target = model or "auto"
    t0 = time.time()
    resp = chat_completion(
        model=target,
        messages=[{"role": "user", "content": "ping"}],
        max_tokens=5,
        timeout=15,
    )
    elapsed_ms = (time.time() - t0) * 1000
    if not resp:
        return {"ok": False, "model": target, "elapsed_ms": elapsed_ms}
    metadata = resp.get("metadata") or {}
    return {
        "ok": True,
        "requested_model": target,
        "actual_model": resp.get("model"),
        "elapsed_ms": round(elapsed_ms, 1),
        "router_reasoning": metadata.get("reasoning"),
        "ttft_ms": (metadata.get("attempts") or [{}])[0].get("time_to_first_token_ms"),
    }
