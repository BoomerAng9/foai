"""
Public customer-facing chat for hawk.foai.cloud Tool Chest.

Anonymous, rate-limited per IP, persona-prepended. Calls the central LiteLLM
gateway (Step D) via the OpenAI SDK — gives us provider failover for free
and avoids spreading per-provider keys across containers.

Persona discipline: the system prompt explicitly forbids revealing the
internal tool names (Hermes Agent / NemoClaw / Autoresearch / Lil_Hawk /
DeerFlow), the underlying model, or any internal cost / margin data.

Attachments: visitors can include images (multimodal models) or short
text files (md / txt / json / code) up to 5 MB image / 200 KB text. Text
files are appended as fenced blocks so the persona refusals still apply
to anything inside them.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from typing import Deque, Literal

import structlog
from fastapi import APIRouter, HTTPException, Request, status
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter()

_REQ_WINDOW_SECONDS = 60.0
_ip_hits: dict[str, Deque[float]] = defaultdict(deque)

_MAX_ATTACHMENTS = 4
_MAX_IMAGE_B64 = 7_500_000     # ~5.5 MB raw → ~7.4 MB base64
_MAX_TEXT_CHARS = 250_000


def _allow(ip: str, limit_per_min: int) -> bool:
    now = time.monotonic()
    cutoff = now - _REQ_WINDOW_SECONDS
    hits = _ip_hits[ip]
    while hits and hits[0] < cutoff:
        hits.popleft()
    if len(hits) >= limit_per_min:
        return False
    hits.append(now)
    return True


class Attachment(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    mime: str = Field(..., min_length=1, max_length=128)
    kind: Literal['image', 'text']
    data: str = Field(..., min_length=1)
    size: int = Field(..., ge=0)


class PublicChatRequest(BaseModel):
    message: str = Field("", max_length=4096)
    attachments: list[Attachment] = Field(default_factory=list)


class PublicChatResponse(BaseModel):
    reply: str
    elapsed_ms: float


def _build_user_content(req: PublicChatRequest) -> str | list[dict]:
    """Build the user-message content, multimodal if images are present.

    OpenAI/LiteLLM shape:
      string  → plain text
      list    → multimodal blocks: {type:text|image_url, ...}
    """
    if not req.attachments:
        return req.message or ""

    blocks: list[dict] = []
    text_parts: list[str] = []
    if req.message:
        text_parts.append(req.message)

    for a in req.attachments[:_MAX_ATTACHMENTS]:
        if a.kind == 'text':
            if len(a.data) > _MAX_TEXT_CHARS:
                text_parts.append(f"\n\n[Attachment '{a.name}' truncated — too large]\n")
                continue
            text_parts.append(
                f"\n\n--- Attachment: {a.name} ({a.mime}) ---\n```\n{a.data}\n```\n--- End attachment ---"
            )
        elif a.kind == 'image':
            if len(a.data) > _MAX_IMAGE_B64:
                text_parts.append(f"\n\n[Image '{a.name}' too large — skipped]\n")
                continue
            blocks.append({
                "type": "image_url",
                "image_url": {"url": f"data:{a.mime};base64,{a.data}"},
            })

    combined_text = "\n".join(p for p in text_parts if p).strip()
    if combined_text:
        blocks.insert(0, {"type": "text", "text": combined_text})

    if not blocks:
        return req.message or ""
    return blocks


@router.post("/api/public/chat", response_model=PublicChatResponse, tags=["PublicChat"])
async def public_chat(req: PublicChatRequest, request: Request) -> PublicChatResponse:
    settings = get_settings()
    if not settings.tool_chest_enabled:
        raise HTTPException(status_code=503, detail="Tool Chest disabled")

    if not (req.message.strip() or req.attachments):
        raise HTTPException(status_code=400, detail="Empty message")

    client_ip = request.client.host if request.client else "unknown"
    if not _allow(client_ip, settings.customer_rate_limit_per_min):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down a moment.",
        )

    base_url = os.environ.get("LITELLM_BASE_URL")
    api_key = os.environ.get("LITELLM_API_KEY")
    if not base_url or not api_key:
        raise HTTPException(status_code=503, detail="Customer chat not configured")

    started = time.perf_counter()
    normalised_base = base_url.rstrip("/")
    if not normalised_base.endswith("/v1"):
        normalised_base = normalised_base + "/v1"
    client = AsyncOpenAI(base_url=normalised_base, api_key=api_key)
    user_content = _build_user_content(req)

    try:
        completion = await client.chat.completions.create(
            model=settings.customer_default_model,
            max_tokens=settings.customer_max_tokens,
            messages=[
                {"role": "system", "content": settings.chicken_hawk_persona_prompt},
                {"role": "user", "content": user_content},
            ],
        )
    except Exception as exc:
        logger.warning(
            "public_chat_failed",
            error=str(exc),
            ip=client_ip,
            attachments=len(req.attachments),
        )
        raise HTTPException(status_code=502, detail="Chat service unavailable") from exc

    reply = (completion.choices[0].message.content or "").strip() or "I'm here. Ask me again?"
    return PublicChatResponse(reply=reply, elapsed_ms=(time.perf_counter() - started) * 1000)
