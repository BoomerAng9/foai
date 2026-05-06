"""
Research Client — Scout_Ang research interface wrapping ii-researcher.

Provides structured research capabilities: search, extract, and summarize.
Uses Brave API for web search when BRAVE_API_KEY is available, falls back
to DuckDuckGo.

Based on ii-researcher by Intelligent-Internet (Apache 2.0).
"""

from __future__ import annotations

import asyncio
import os
import re
import time
import urllib.parse
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False


# -------------------------------------------------------------------
# Data models
# -------------------------------------------------------------------

@dataclass
class Source:
    """A single research source."""
    title: str
    url: str
    content: str
    relevance: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ResearchResult:
    """Structured output from a research task."""
    query: str
    summary: str
    sources: List[Source]
    depth: int
    timestamp: str
    duration_ms: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "summary": self.summary,
            "sources": [s.to_dict() for s in self.sources],
            "depth": self.depth,
            "timestamp": self.timestamp,
            "duration_ms": self.duration_ms,
        }


# -------------------------------------------------------------------
# Search backends
# -------------------------------------------------------------------

def _search_brave(query: str, num_results: int = 10) -> List[Source]:
    """Search using Brave Search API."""
    api_key = os.environ.get("BRAVE_API_KEY", "")
    if not api_key or not _HAS_REQUESTS:
        return []

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {"q": query, "count": min(num_results, 20)}

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("web", {}).get("results", [])
        return [
            Source(
                title=r.get("title", ""),
                url=r.get("url", ""),
                content=r.get("description", ""),
                relevance=1.0 - (i * 0.05),
            )
            for i, r in enumerate(results[:num_results])
        ]
    except Exception:
        return []


def _search_duckduckgo(query: str, num_results: int = 10) -> List[Source]:
    """Fallback search using DuckDuckGo HTML (no API key required)."""
    if not _HAS_REQUESTS:
        return []

    url = "https://html.duckduckgo.com/html/"
    headers = {"User-Agent": "Mozilla/5.0 (research-agent)"}
    data = {"q": query}

    try:
        resp = requests.post(url, headers=headers, data=data, timeout=10)
        resp.raise_for_status()
        html = resp.text

        # Parse result snippets from DDG HTML
        sources: List[Source] = []
        # Simple regex extraction from DDG HTML results
        result_blocks = re.findall(
            r'class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
            r'class="result__snippet"[^>]*>(.*?)</(?:a|span|td)',
            html,
            re.DOTALL,
        )
        for i, (raw_url, title, snippet) in enumerate(result_blocks[:num_results]):
            # DDG wraps URLs in a redirect
            clean_url = raw_url
            if "uddg=" in clean_url:
                match = re.search(r"uddg=([^&]+)", clean_url)
                if match:
                    clean_url = urllib.parse.unquote(match.group(1))
            clean_title = re.sub(r"<[^>]+>", "", title).strip()
            clean_snippet = re.sub(r"<[^>]+>", "", snippet).strip()
            sources.append(
                Source(
                    title=clean_title,
                    url=clean_url,
                    content=clean_snippet,
                    relevance=1.0 - (i * 0.05),
                )
            )
        return sources
    except Exception:
        return []


def _search(query: str, num_results: int = 10) -> List[Source]:
    """Search with automatic fallback: Brave -> DuckDuckGo."""
    if os.environ.get("BRAVE_API_KEY"):
        results = _search_brave(query, num_results)
        if results:
            return results
    return _search_duckduckgo(query, num_results)


# -------------------------------------------------------------------
# Content extraction
# -------------------------------------------------------------------

def _extract_content(url: str, timeout: int = 10) -> str:
    """Extract readable content from a URL using Jina Reader or basic fetch."""
    if not _HAS_REQUESTS:
        return ""

    # Try Jina Reader first (free, no key required for basic use)
    try:
        jina_url = f"https://r.jina.ai/{url}"
        resp = requests.get(
            jina_url,
            headers={"Accept": "text/plain"},
            timeout=timeout,
        )
        if resp.status_code == 200 and len(resp.text) > 100:
            return resp.text[:5000]  # Cap content length
    except Exception:
        pass

    # Fallback: basic fetch
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (research-agent)"})
        resp.raise_for_status()
        text = re.sub(r"<[^>]+>", " ", resp.text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]
    except Exception:
        return ""


# -------------------------------------------------------------------
# Public API
# -------------------------------------------------------------------

def research(query: str, depth: int = 1) -> ResearchResult:
    """Run a research task with iterative deepening.

    Args:
        query: Research question.
        depth: How many rounds of search + extract (1 = basic, 2+ = deeper).

    Returns:
        ResearchResult with summary and sources.
    """
    start = time.time()
    all_sources: List[Source] = []
    queries = [query]

    for round_num in range(depth):
        for q in queries:
            sources = _search(q, num_results=5)
            all_sources.extend(sources)

        # For deeper research, extract content from top sources
        if round_num < depth - 1 and all_sources:
            for src in all_sources[:3]:
                content = _extract_content(src.url)
                if content:
                    src.content = content

    # Deduplicate by URL
    seen_urls: set = set()
    unique_sources: List[Source] = []
    for s in all_sources:
        if s.url not in seen_urls:
            seen_urls.add(s.url)
            unique_sources.append(s)

    summary = summarize_sources(unique_sources)
    duration = (time.time() - start) * 1000

    return ResearchResult(
        query=query,
        summary=summary,
        sources=unique_sources,
        depth=depth,
        timestamp=datetime.now(tz=timezone.utc).isoformat(),
        duration_ms=round(duration, 1),
    )


def search_and_extract(query: str, num_sources: int = 5) -> List[Source]:
    """Search and extract full content from top results.

    Args:
        query: Search query.
        num_sources: Number of sources to retrieve and extract.

    Returns:
        List of Sources with extracted content.
    """
    sources = _search(query, num_results=num_sources)
    for src in sources:
        content = _extract_content(src.url)
        if content:
            src.content = content
    return sources


def summarize_sources(sources: List[Source]) -> str:
    """Synthesize multiple sources into a summary.

    Args:
        sources: List of Source objects to summarize.

    Returns:
        A plain-text summary synthesized from the sources.
    """
    if not sources:
        return "No sources found."

    # Extract key sentences from each source
    key_points: List[str] = []
    for src in sources[:10]:
        if src.content:
            # Take first meaningful sentence
            sentences = [s.strip() for s in src.content.split(".") if len(s.strip()) > 30]
            if sentences:
                key_points.append(f"- {sentences[0]}. (source: {src.title})")

    if not key_points:
        titles = [f"- {s.title}" for s in sources[:5] if s.title]
        return "Found sources:\n" + "\n".join(titles)

    return "Key findings:\n" + "\n".join(key_points[:8])
