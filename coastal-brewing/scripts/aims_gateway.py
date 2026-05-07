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
    "AIMS_GATEWAY_URL", "https://openrouter.ai/api/v1"
).rstrip("/")
# OpenRouter is the primary gateway (original pre-2026-05-06 path).
# Falls back to INWORLD_API_KEY for Inworld-specific surfaces if needed.
GATEWAY_API_KEY = (
    os.environ.get("OPENROUTER_API_KEY", "")
    or os.environ.get("INWORLD_API_KEY", "")
).strip()

# Per-surface model registry. Surface key → OpenRouter model ID.
# Updated 2026-05-07: full multi-model routing, no Anthropic.
SURFACE_MODELS: Dict[str, str] = {
    # Coastal customer chat
    "coastal_chat_retail":     "deepseek/deepseek-v4-flash",                # Sal, LUC, Marcus — multimodal, 1M ctx
    "coastal_chat_reasoning":  "x-ai/grok-4.20",                            # Melli, ACHEEVY — newest Grok, multimodal reasoning
    # Brand-voice + transactional (short, cheap)
    "welcome_message":         "z-ai/glm-4.7-flash",                        # $0.06/$0.40 — brand voice copy
    "transactional_short":     "z-ai/glm-4.7-flash",
    "json_chat_fallback":      "z-ai/glm-4.7-flash",
    # Summarization + research
    "session_summary":         "google/gemma-4-31b-it:free",                 # free tier, background task
    "research_synthesis":      "moonshotai/kimi-k2.6",                       # 262K ctx, strong research
    # Agent orchestration + code — fast, large ctx, no Anthropic
    "agent_orchestration":     "x-ai/grok-4-fast",                          # 2M ctx, fast orchestration
    "linkedin_maps_agent":     "x-ai/grok-4-fast",
    "code_generation":         "x-ai/grok-code-fast-1",                     # code-specific Grok
    "structured_evaluation":   "nvidia/nemotron-3-super-120b-a12b",          # $0.09/$0.45, 262K ctx
    # Spinner — Gemini 3.1 Flash Lite: function calling first-class, low ctx, fast, accurate
    "spinner_execution":       "google/gemini-3.1-flash-lite-preview",
    # Visual reasoning for Iller_Ang prompt composition
    "iller_ang_visual":        "google/gemini-3.1-flash-lite-preview",       # multimodal vision
    # Candidate surfaces
    "research_kimi_long_ctx":  "moonshotai/kimi-k2.6",
    "bilingual_chat":          "z-ai/glm-4.7",
    "realtime_data_agent":     "x-ai/grok-4-fast",
    "vision_chat":             "google/gemini-3.1-flash-lite-preview",
    "long_context_pro":        "google/gemini-3.1-pro-preview",
    "openai_default":          "openai/gpt-5.5",
    "frontier_reasoning":      "x-ai/grok-4.20",                            # replaces Anthropic Opus
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


# ─── Available-models registry ──────────────────────────────────────────
# Every model confirmed reachable on the Inworld Realtime Router as of
# 2026-05-06 (probed via /v1/chat/completions returning 200 + valid
# choices[]). Surfaces above pin specific models to specific use cases;
# this registry is the broader catalog of what's accessible if a caller
# wants to A/B test or ad-hoc pick a specific model not on the surface
# map.
#
# Owner directive 2026-05-06: register every available model even if
# we don't use them today — keeps optionality with no per-call cost.
# Add new entries when Inworld onboards a model OR when a probe of a
# new variant returns OK.
#
# Always-newest discipline (per
# `feedback_always_newest_model_version_2026_05_06.md`): when a vendor
# ships vN+1 and Inworld exposes it, bump the registry — don't keep
# vN as the active default.
AVAILABLE_MODELS: Dict[str, Dict[str, str]] = {
    # ─── Anthropic ──────────────────────────────────────────────────
    "anthropic": {
        # Frontier reasoning + structured output. Use only when task
        # genuinely earns the premium (per cost-discipline canon).
        "opus-4-7":        "anthropic/claude-opus-4-7",        # latest Opus, frontier
        "opus-4-6":        "anthropic/claude-opus-4-6",        # prior Opus
        # Tool-use accuracy + structured output sweet spot. Default for
        # agent orchestration.
        "sonnet-4-6":      "anthropic/claude-sonnet-4-6",      # latest Sonnet
        # Fast cheap tier — when DeepSeek/Gemma quality isn't enough but
        # Sonnet would be overkill.
        "haiku-4-5":       "anthropic/claude-haiku-4-5",
    },
    # ─── Google Gemini ──────────────────────────────────────────────
    "gemini": {
        "3.1-pro":              "google-ai-studio/gemini-3.1-pro",                # GA reasoning + long ctx
        "3.1-pro-preview":      "google-ai-studio/gemini-3.1-pro-preview",        # preview tier
        "3.1-flash-lite":       "google-ai-studio/gemini-3.1-flash-lite-preview", # current session_summary default
        "3.1-flash-image":      "google-ai-studio/gemini-3.1-flash-image-preview",# multimodal Flash
        "3-flash":              "google-vertex/gemini-3-flash-preview",           # older Flash
    },
    # ─── Google Gemma (open weights) ────────────────────────────────
    "gemma": {
        "4-26b-a4b":       "google-vertex/gemma-4-26b-a4b",     # MoE — retail brand-voice default
        "4-26b-a4b-deepinfra": "deepinfra/gemma-4-26b-a4b",     # alt provider for same model
        "4-31b":           "deepinfra/gemma-4-31b",              # dense, bigger variant
    },
    # ─── DeepSeek ───────────────────────────────────────────────────
    "deepseek": {
        "v4-pro":          "deepinfra/deepseek-v4-pro",         # reasoning, current default for melli/acheevy
        "v4-flash":        "deepinfra/deepseek-v4-flash",       # faster v4 (non-reasoning)
        "v3":              "deepinfra/deepseek-v3",             # legacy — kept for fallback only
    },
    # ─── OpenAI ─────────────────────────────────────────────────────
    "openai": {
        "gpt-5.5":         "openai/gpt-5.5",                     # latest GPT
        "gpt-5":           "openai/gpt-5",                        # GA tier
        "gpt-5-mini":      "openai/gpt-5-mini",                   # smaller, cheaper
    },
    # ─── Moonshot Kimi ──────────────────────────────────────────────
    "kimi": {
        # K2.6 — agentic coding, 256k context, very strong instruction-
        # following. Candidate alternative to Sonnet for code_generation
        # surfaces; A/B-test when Code_Ang ships.
        "k2-6-deepinfra":  "deepinfra/kimi-k2-6",
        "k2-6-fireworks":  "fireworks/kimi-k2-6",
    },
    # ─── Zhipu GLM ──────────────────────────────────────────────────
    "glm": {
        # 4.6 — bilingual (EN/CN), strong reasoning, agentic. Reserved
        # for future international Coastal surface or any vertical
        # serving non-English customers.
        "4.6":             "deepinfra/glm-4.6",
    },
    # ─── MiniMax ────────────────────────────────────────────────────
    "minimax": {
        # M2-7 — Inworld Router's auto-mode default pick. Cost-floor
        # reasoning; effectively free via `auto` surface when caller
        # opts into auto-routing.
        "m2-7":            "fireworks/minimax-m2-7",
    },
    # ─── xAI Grok ───────────────────────────────────────────────────
    "grok": {
        # Grok 4 — real-time data via X integration, large context.
        # Reserved for future social-monitoring agent or news-scanning
        # surface.
        "4":               "xai/grok-4",
        "3":               "xai/grok-3",                          # older — keep for reference
    },
    # ─── Mistral ────────────────────────────────────────────────────
    "mistral": {
        "large-3":         "mistral/mistral-large-3",              # cheap reasoning + code
        "medium":          "mistral/mistral-medium",
    },
    # ─── Auto ──────────────────────────────────────────────────────
    # Special "model" — Inworld picks per request based on optimization
    # criteria passed via extra_body.sort. Use for cost-sensitive
    # high-volume paths where any-cheap-fast model is acceptable.
    "auto": {
        "auto":            "auto",
    },
}


def model_id(provider: str, alias: str) -> str:
    """Look up a specific Inworld model id by provider + alias.

    Example:
        model_id("anthropic", "sonnet-4-6") -> "anthropic/claude-sonnet-4-6"
        model_id("kimi", "k2-6-deepinfra")  -> "deepinfra/kimi-k2-6"

    Raises KeyError on unknown provider/alias — same fail-loud posture
    as model_for().
    """
    provider_models = AVAILABLE_MODELS.get(provider)
    if provider_models is None:
        raise KeyError(
            f"provider '{provider}' not in AVAILABLE_MODELS — "
            f"available: {sorted(AVAILABLE_MODELS.keys())}"
        )
    if alias not in provider_models:
        raise KeyError(
            f"alias '{alias}' not under provider '{provider}' — "
            f"available aliases: {sorted(provider_models.keys())}"
        )
    return provider_models[alias]


def list_available_models() -> List[str]:
    """Flat list of every Inworld model id confirmed reachable. Use
    for diagnostics, model-picker UIs, or sanity-check probes."""
    out: List[str] = []
    for provider_models in AVAILABLE_MODELS.values():
        out.extend(provider_models.values())
    return sorted(set(out))


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
