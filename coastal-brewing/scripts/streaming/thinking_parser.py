"""Extract DeepSeek R1 native thinking tokens from OpenRouter SSE stream."""
from __future__ import annotations
import json
from typing import AsyncIterator, Tuple


# Token types emitted by the parser
THINKING = "thinking"
RESPONSE = "response"
DONE = "done"


async def parse_openrouter_stream(
    response_stream: AsyncIterator[str],
) -> AsyncIterator[Tuple[str, str]]:
    """
    Yield (token_type, content) tuples from an OpenRouter SSE stream.

    OpenRouter DeepSeek R1 returns:
      data: {"choices":[{"delta":{"reasoning":"...","content":null}}]}  <- thinking
      data: {"choices":[{"delta":{"reasoning":null,"content":"..."}}]}  <- response
      data: [DONE]

    Yields:
      ("thinking", text)   — reasoning token chunk
      ("response", text)   — response token chunk
      ("done", "")         — stream ended
    """
    async for line in response_stream:
        line = line.strip()
        if not line or not line.startswith("data: "):
            continue
        payload = line[6:]
        if payload == "[DONE]":
            yield DONE, ""
            return
        try:
            chunk = json.loads(payload)
        except json.JSONDecodeError:
            continue
        choices = chunk.get("choices", [])
        if not choices:
            continue
        delta = choices[0].get("delta", {})
        # DeepSeek R1 thinking tokens come in delta.reasoning
        reasoning = delta.get("reasoning") or ""
        content = delta.get("content") or ""
        if reasoning:
            yield THINKING, reasoning
        if content:
            yield RESPONSE, content
