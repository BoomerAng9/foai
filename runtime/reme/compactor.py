"""
Token-ratio compaction engine.
Progressive summarization that compresses context while preserving key information.
No external LLM calls — uses extractive summarization (sentence scoring).
"""

from __future__ import annotations

import re
import math
from collections import Counter
from typing import Optional

from .tokenizer import count_tokens, count_message_tokens, truncate_to_tokens


# --- BM25-inspired sentence scoring for extractive summarization ---


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _tokenize_words(text: str) -> list[str]:
    """Simple word tokenization."""
    return re.findall(r'\b\w+\b', text.lower())


def _compute_idf(sentences: list[str]) -> dict[str, float]:
    """Compute inverse document frequency for words across sentences."""
    n = len(sentences)
    if n == 0:
        return {}
    df = Counter()
    for sent in sentences:
        words = set(_tokenize_words(sent))
        for w in words:
            df[w] += 1
    return {w: math.log((n - freq + 0.5) / (freq + 0.5) + 1)
            for w, freq in df.items()}


def _score_sentence(sentence: str, idf: dict[str, float],
                    position: int, total: int) -> float:
    """Score a sentence by TF-IDF weight + position bias."""
    words = _tokenize_words(sentence)
    if not words:
        return 0.0

    tf = Counter(words)
    tfidf_score = sum(
        (tf[w] / len(words)) * idf.get(w, 0) for w in tf
    )

    # Position bias: first and last sentences are more important
    pos_ratio = position / max(total - 1, 1)
    position_bonus = 0.3 if pos_ratio < 0.1 or pos_ratio > 0.9 else 0.0

    # Length penalty: very short sentences are less informative
    length_bonus = min(len(words) / 15, 1.0) * 0.2

    # Entity/proper-noun bonus
    entity_count = len(re.findall(r'\b[A-Z][a-z]+\b', sentence))
    entity_bonus = min(entity_count * 0.1, 0.3)

    # Numeric data bonus (dates, numbers, metrics)
    num_count = len(re.findall(r'\b\d+\b', sentence))
    num_bonus = min(num_count * 0.1, 0.2)

    return tfidf_score + position_bonus + length_bonus + entity_bonus + num_bonus


def summarize_extractive(text: str, target_tokens: int) -> str:
    """
    Extractive summarization: score and select top sentences to fit
    within target_tokens.
    """
    current_tokens = count_tokens(text)
    if current_tokens <= target_tokens:
        return text

    sentences = _split_sentences(text)
    if len(sentences) <= 2:
        return truncate_to_tokens(text, target_tokens)

    idf = _compute_idf(sentences)
    scored = []
    for i, sent in enumerate(sentences):
        score = _score_sentence(sent, idf, i, len(sentences))
        scored.append((i, score, sent))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    # Greedily select sentences that fit within budget, preserving original order
    selected = []
    running_tokens = 0
    for idx, score, sent in scored:
        sent_tokens = count_tokens(sent)
        if running_tokens + sent_tokens <= target_tokens:
            selected.append((idx, sent))
            running_tokens += sent_tokens

    # Restore original order
    selected.sort(key=lambda x: x[0])
    result = " ".join(s for _, s in selected)

    if not result:
        return truncate_to_tokens(text, target_tokens)

    return result


def summarize_memory(context: str, max_tokens: int) -> str:
    """
    Compress context to fit within max_tokens using progressive summarization.
    Applies multiple passes if needed.
    """
    current_tokens = count_tokens(context)
    if current_tokens <= max_tokens:
        return context

    # Pass 1: extractive summarization
    result = summarize_extractive(context, max_tokens)
    current_tokens = count_tokens(result)

    # Pass 2: if still over budget, truncate
    if current_tokens > max_tokens:
        result = truncate_to_tokens(result, max_tokens)

    return result


def compact_context(messages: list[dict], target_ratio: float) -> list[dict]:
    """
    Reduce message list to target token ratio.
    target_ratio: e.g. 0.15 means keep 15% of original tokens.

    Strategy:
    1. Always preserve system messages and last 2 user/assistant turns.
    2. Summarize older messages progressively.
    """
    if not messages:
        return messages

    total_tokens = count_message_tokens(messages)
    target_tokens = max(int(total_tokens * target_ratio), 50)

    if total_tokens <= target_tokens:
        return messages

    # Separate system messages and conversation
    system_msgs = [m for m in messages if m.get("role") == "system"]
    conv_msgs = [m for m in messages if m.get("role") != "system"]

    # Always keep system messages
    system_tokens = count_message_tokens(system_msgs)

    # Keep last N turns intact (a turn = user + assistant)
    keep_recent = 4  # last 4 messages (2 turns)
    if len(conv_msgs) <= keep_recent:
        # Can't compress further without losing recent context
        result = system_msgs + conv_msgs
        # Try to compress system messages if still over
        if count_message_tokens(result) > target_tokens and system_msgs:
            budget = target_tokens - count_message_tokens(conv_msgs)
            if budget > 0:
                compressed_sys = []
                for m in system_msgs:
                    compressed_sys.append({
                        **m,
                        "content": summarize_memory(m["content"], budget)
                    })
                return compressed_sys + conv_msgs
        return result

    recent_msgs = conv_msgs[-keep_recent:]
    older_msgs = conv_msgs[:-keep_recent]
    recent_tokens = count_message_tokens(recent_msgs)

    # Budget for older messages
    budget = max(target_tokens - system_tokens - recent_tokens, 20)

    # Compress older messages into a single summary message
    older_text = "\n".join(
        f"[{m.get('role', 'unknown')}]: {m.get('content', '')}"
        for m in older_msgs
    )
    compressed_older = summarize_memory(older_text, budget)

    summary_msg = {
        "role": "system",
        "content": f"[Compressed conversation history]\n{compressed_older}"
    }

    return system_msgs + [summary_msg] + recent_msgs
