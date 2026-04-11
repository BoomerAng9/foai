"""
Token counting utilities.
Uses tiktoken when available, falls back to word-count approximation.
"""

from __future__ import annotations

import math
import re
from typing import Optional

_encoder = None
_USE_TIKTOKEN = False

try:
    import tiktoken

    _USE_TIKTOKEN = True
except ImportError:
    pass


def _get_encoder():
    global _encoder
    if _encoder is None and _USE_TIKTOKEN:
        _encoder = tiktoken.encoding_for_model("gpt-4o")
    return _encoder


def count_tokens(text: str) -> int:
    """Count tokens in text. Uses tiktoken if available, else ~4 chars/token."""
    if not text:
        return 0
    enc = _get_encoder()
    if enc is not None:
        return len(enc.encode(text))
    # Approximation: ~4 chars per token for English
    return max(1, math.ceil(len(text) / 4))


def count_message_tokens(messages: list[dict]) -> int:
    """Count total tokens across a list of message dicts."""
    total = 0
    for msg in messages:
        content = msg.get("content", "")
        role = msg.get("role", "")
        total += count_tokens(content) + count_tokens(role) + 4  # overhead
    return total


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximately max_tokens."""
    enc = _get_encoder()
    if enc is not None:
        tokens = enc.encode(text)
        if len(tokens) <= max_tokens:
            return text
        return enc.decode(tokens[:max_tokens])
    # Approximation
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text
    return text[:max_chars]
