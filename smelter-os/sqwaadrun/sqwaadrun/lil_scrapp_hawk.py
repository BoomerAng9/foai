#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════╗
║          LIL_SCRAPP_HAWK SQWAADRUN v1.0 — FULL SWARM                   ║
║          ACHIEVEMOR — Smelter OS — Chicken Hawk Fleet                  ║
║──────────────────────────────────────────────────────────────────────── ║
║  A 12-Hawk swarm web scraping framework. Replaces Firecrawl.           ║
║  Each Lil_Hawk owns a single responsibility.                           ║
║  Chicken Hawk dispatches; ACHEEVY approves.                            ║
║                                                                        ║
║  CORE HAWKS:                                                           ║
║    Lil_Guard_Hawk    — rate-limit, robots.txt, proxy rotation          ║
║    Lil_Scrapp_Hawk   — HTML fetching & raw extraction (Squad Lead)     ║
║    Lil_Parse_Hawk    — content parsing, markdown/JSON structuring      ║
║    Lil_Crawl_Hawk    — link discovery, sitemap walking, recursion      ║
║    Lil_Snap_Hawk     — screenshot & visual capture (Playwright)        ║
║    Lil_Store_Hawk    — persistence, dedup, caching, export             ║
║                                                                        ║
║  EXPANSION HAWKS:                                                      ║
║    Lil_Extract_Hawk  — CSS/XPath/regex targeted extraction             ║
║    Lil_Feed_Hawk     — RSS/Atom/JSON feed discovery & parsing          ║
║    Lil_Diff_Hawk     — change detection & scheduled monitoring         ║
║    Lil_Clean_Hawk    — boilerplate removal, text normalization         ║
║    Lil_API_Hawk      — REST/GraphQL endpoint scraping with auth        ║
║    Lil_Queue_Hawk    — priority job queue with retry scheduling        ║
║                                                                        ║
║  NO LLM REQUIRED — Pure Python. Zero API keys. Zero inference costs.   ║
║                                                                        ║
║  TAKE OFF:                                                             ║
║    pip install aiohttp beautifulsoup4 lxml html2text aiofiles          ║
║               tldextract                                               ║
║    python lil_scrapp_hawk.py scrape https://example.com                ║
║                                                                        ║
║  Upstream: Chicken Hawk → ACHEEVY (Digital CEO)                        ║
║  License:  ACHIEVEMOR Internal — All Rights Reserved                   ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import asyncio
import csv
import difflib
import hashlib
import io
import json
import logging
import os
import re
import time
import random
import sqlite3
import unicodedata
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import (
    Any, AsyncIterator, Callable, Dict, List, Optional, Pattern,
    Set, Tuple, Union
)
from urllib.parse import urljoin, urlparse, urlunparse, urlencode, parse_qs
from urllib.robotparser import RobotFileParser

import aiohttp
import aiofiles
from bs4 import BeautifulSoup, Comment, NavigableString
import html2text
import tldextract

# ─────────────────────────────────────────────────────────────────────────
#  UTF-8 I/O GUARD — Windows consoles default to cp1252 which crashes on
#  box-drawing characters in the roster report. Reconfigure stdout/stderr
#  to utf-8 at import time; no-op on *nix.
# ─────────────────────────────────────────────────────────────────────────
import sys as _sys
try:
    if hasattr(_sys.stdout, "reconfigure"):
        _sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(_sys.stderr, "reconfigure"):
        _sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# ─────────────────────────────────────────────────────────────────────────
#  LOGGING — Sqwaadrun-wide
# ─────────────────────────────────────────────────────────────────────────
LOG_FORMAT = "[%(asctime)s] [%(name)-20s] %(levelname)-7s %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("Sqwaadrun")


# ═════════════════════════════════════════════════════════════════════════
#  SHARED DATA STRUCTURES
# ═════════════════════════════════════════════════════════════════════════

class ScrapeStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    RATE_LIMITED = "rate_limited"
    BLOCKED = "blocked"


@dataclass
class ScrapeTarget:
    """A single URL to be scraped — the work unit passed between Hawks."""
    url: str
    depth: int = 0
    max_depth: int = 3
    parent_url: Optional[str] = None
    status: ScrapeStatus = ScrapeStatus.PENDING
    retries: int = 0
    max_retries: int = 3
    priority: int = 0  # lower = higher priority
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def domain(self) -> str:
        extracted = tldextract.extract(self.url)
        return f"{extracted.domain}.{extracted.suffix}"

    @property
    def url_hash(self) -> str:
        return hashlib.sha256(self.url.encode()).hexdigest()[:16]


@dataclass
class ScrapeResult:
    """Output from a completed scrape — flows from Lil_Scrapp_Hawk downstream."""
    url: str
    status_code: int = 0
    raw_html: str = ""
    clean_text: str = ""
    markdown: str = ""
    title: str = ""
    meta_description: str = ""
    links: List[str] = field(default_factory=list)
    images: List[Dict[str, str]] = field(default_factory=list)
    structured_data: Dict[str, Any] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    content_type: str = ""
    scraped_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    elapsed_ms: float = 0.0
    error: Optional[str] = None
    screenshot_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


@dataclass
class CrawlManifest:
    """Tracks the full crawl session state."""
    seed_url: str
    max_depth: int = 3
    max_pages: int = 100
    include_patterns: List[str] = field(default_factory=list)
    exclude_patterns: List[str] = field(default_factory=list)
    discovered: Set[str] = field(default_factory=set)
    completed: Set[str] = field(default_factory=set)
    failed: Set[str] = field(default_factory=set)
    results: List[ScrapeResult] = field(default_factory=list)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None

    @property
    def pages_scraped(self) -> int:
        return len(self.completed)

    @property
    def pages_remaining(self) -> int:
        return len(self.discovered - self.completed - self.failed)


# ═════════════════════════════════════════════════════════════════════════
#  BASE HAWK — Abstract interface every Lil_Hawk implements
# ═════════════════════════════════════════════════════════════════════════

class BaseLilHawk(ABC):
    """
    Every Lil_Hawk in the Sqwaadrun inherits from this base.
    Reports to Chicken Hawk; ultimate upstream is ACHEEVY.
    """
    hawk_name: str = "Base_Hawk"
    hawk_color: str = "#FFFFFF"

    def __init__(self):
        self.logger = logging.getLogger(self.hawk_name)
        self._active = True
        self.stats: Dict[str, int] = {
            "tasks_received": 0,
            "tasks_completed": 0,
            "tasks_failed": 0,
        }

    async def startup(self):
        """Initialize resources. Override if the Hawk needs setup."""
        self.logger.info(f"{self.hawk_name} reporting for duty.")

    async def shutdown(self):
        """Release resources. Override for cleanup."""
        self._active = False
        self.logger.info(
            f"{self.hawk_name} standing down. "
            f"Stats: {self.stats}"
        )

    @abstractmethod
    async def execute(self, *args, **kwargs) -> Any:
        """Primary task execution — each Hawk defines its own."""
        ...


# ═════════════════════════════════════════════════════════════════════════
#  1) LIL_GUARD_HAWK — Ethics, Rate-Limiting, Robots.txt, Proxies
# ═════════════════════════════════════════════════════════════════════════

class LilGuardHawk(BaseLilHawk):
    """
    The compliance & protection layer. Runs BEFORE any request leaves
    the Sqwaadrun. Enforces:
      - robots.txt obedience
      - Per-domain rate limiting (token bucket)
      - Rotating User-Agent strings
      - Optional proxy rotation
      - Domain blocklist / allowlist
    """
    hawk_name = "Lil_Guard_Hawk"
    hawk_color = "#FF4444"  # Red — stop and think

    def __init__(
        self,
        requests_per_second: float = 2.0,
        respect_robots: bool = True,
        proxies: Optional[List[str]] = None,
        blocked_domains: Optional[List[str]] = None,
        allowed_domains: Optional[List[str]] = None,
    ):
        super().__init__()
        self.rps = requests_per_second
        self.respect_robots = respect_robots
        self.proxies = proxies or []
        self.blocked_domains = set(blocked_domains or [])
        self.allowed_domains = set(allowed_domains or [])

        # Per-domain token buckets: domain -> last_request_time
        self._domain_timestamps: Dict[str, float] = {}
        self._robots_cache: Dict[str, RobotFileParser] = {}
        self._lock = asyncio.Lock()

        # User-Agent rotation pool
        self._user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 "
            "Firefox/128.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
        ]

    async def execute(
        self, target: ScrapeTarget, session: Optional[aiohttp.ClientSession] = None
    ) -> Tuple[bool, str]:
        """
        Returns (allowed: bool, reason: str).
        If allowed, also enforces the rate-limit delay.
        """
        self.stats["tasks_received"] += 1
        domain = target.domain

        # ── Domain blocklist / allowlist ──
        if self.blocked_domains and domain in self.blocked_domains:
            self.stats["tasks_failed"] += 1
            return False, f"Domain '{domain}' is on the blocklist."

        if self.allowed_domains and domain not in self.allowed_domains:
            self.stats["tasks_failed"] += 1
            return False, f"Domain '{domain}' not in allowlist."

        # ── Robots.txt check ──
        if self.respect_robots:
            allowed = await self._check_robots(target.url, session)
            if not allowed:
                self.stats["tasks_failed"] += 1
                return False, f"Blocked by robots.txt: {target.url}"

        # ── Rate-limit (token bucket per domain) ──
        async with self._lock:
            now = time.monotonic()
            last = self._domain_timestamps.get(domain, 0.0)
            min_interval = 1.0 / self.rps
            wait = max(0.0, min_interval - (now - last))
            if wait > 0:
                await asyncio.sleep(wait)
            self._domain_timestamps[domain] = time.monotonic()

        self.stats["tasks_completed"] += 1
        return True, "Cleared by Lil_Guard_Hawk."

    async def _check_robots(
        self, url: str, session: Optional[aiohttp.ClientSession] = None
    ) -> bool:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        domain = parsed.netloc

        if domain not in self._robots_cache:
            rp = RobotFileParser()
            try:
                if session:
                    async with session.get(robots_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 200:
                            text = await resp.text()
                            rp.parse(text.splitlines())
                        else:
                            # No robots.txt → everything allowed
                            rp.allow_all = True
                else:
                    rp.allow_all = True
            except Exception:
                rp.allow_all = True
            self._robots_cache[domain] = rp

        rp = self._robots_cache[domain]
        if hasattr(rp, "allow_all") and rp.allow_all:
            return True
        return rp.can_fetch("*", url)

    def get_random_ua(self) -> str:
        return random.choice(self._user_agents)

    def get_proxy(self) -> Optional[str]:
        if self.proxies:
            return random.choice(self.proxies)
        return None

    def get_headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {
            "User-Agent": self.get_random_ua(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
        if extra:
            headers.update(extra)
        return headers


# ═════════════════════════════════════════════════════════════════════════
#  2) LIL_SCRAPP_HAWK — Raw HTML Fetching & Extraction (Squad Lead)
# ═════════════════════════════════════════════════════════════════════════

class LilScrappHawk(BaseLilHawk):
    """
    Squad Lead of the Sqwaadrun. Responsible for:
      - Fetching raw HTML from a URL (async aiohttp)
      - Handling redirects, timeouts, retries
      - Passing raw HTML downstream to Lil_Parse_Hawk
      - JavaScript-rendered fallback via Playwright (if Lil_Snap_Hawk is active)
    """
    hawk_name = "Lil_Scrapp_Hawk"
    hawk_color = "#00E676"  # Execution Green

    def __init__(
        self,
        guard: LilGuardHawk,
        timeout: int = 30,
        max_response_size: int = 10 * 1024 * 1024,  # 10 MB
    ):
        super().__init__()
        self.guard = guard
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.max_response_size = max_response_size
        self._session: Optional[aiohttp.ClientSession] = None

    async def startup(self):
        await super().startup()
        connector = aiohttp.TCPConnector(
            limit=20,
            limit_per_host=5,
            ttl_dns_cache=300,
            enable_cleanup_closed=True,
        )
        self._session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout,
        )

    async def shutdown(self):
        if self._session and not self._session.closed:
            await self._session.close()
        await super().shutdown()

    async def execute(self, target: ScrapeTarget) -> ScrapeResult:
        """Fetch a single URL and return a ScrapeResult with raw HTML."""
        self.stats["tasks_received"] += 1
        result = ScrapeResult(url=target.url)
        start = time.monotonic()

        # ── Guard clearance ──
        allowed, reason = await self.guard.execute(target, self._session)
        if not allowed:
            result.error = reason
            result.elapsed_ms = (time.monotonic() - start) * 1000
            self.stats["tasks_failed"] += 1
            target.status = ScrapeStatus.BLOCKED
            return result

        # ── Fetch with retries ──
        last_error = None
        for attempt in range(1, target.max_retries + 1):
            try:
                headers = self.guard.get_headers()
                proxy = self.guard.get_proxy()

                async with self._session.get(
                    target.url, headers=headers, proxy=proxy,
                    allow_redirects=True, max_redirects=5,
                    ssl=True,
                ) as response:
                    result.status_code = response.status
                    result.headers = dict(response.headers)
                    result.content_type = response.headers.get(
                        "Content-Type", ""
                    )

                    if response.status >= 400:
                        result.error = f"HTTP {response.status}"
                        last_error = result.error
                        if response.status == 429:
                            target.status = ScrapeStatus.RATE_LIMITED
                            retry_after = int(
                                response.headers.get("Retry-After", 5)
                            )
                            self.logger.warning(
                                f"Rate-limited on {target.url}, "
                                f"waiting {retry_after}s"
                            )
                            await asyncio.sleep(retry_after)
                            continue
                        elif response.status >= 500:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        break

                    # Read body with size guard
                    body = await response.read()
                    if len(body) > self.max_response_size:
                        result.error = (
                            f"Response too large: {len(body)} bytes "
                            f"(max {self.max_response_size})"
                        )
                        break

                    # Detect encoding
                    encoding = response.charset or "utf-8"
                    try:
                        result.raw_html = body.decode(encoding)
                    except (UnicodeDecodeError, LookupError):
                        result.raw_html = body.decode("utf-8", errors="replace")

                    target.status = ScrapeStatus.SUCCESS
                    result.error = None
                    break

            except asyncio.TimeoutError:
                last_error = f"Timeout on attempt {attempt}"
                self.logger.warning(f"{last_error} for {target.url}")
                await asyncio.sleep(2 ** attempt)
            except aiohttp.ClientError as e:
                last_error = f"Client error: {e}"
                self.logger.warning(f"{last_error} for {target.url}")
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                last_error = f"Unexpected error: {e}"
                self.logger.error(f"{last_error} for {target.url}")
                break

        if target.status != ScrapeStatus.SUCCESS:
            target.status = ScrapeStatus.FAILED
            result.error = result.error or last_error
            self.stats["tasks_failed"] += 1
        else:
            self.stats["tasks_completed"] += 1

        result.elapsed_ms = (time.monotonic() - start) * 1000
        return result


# ═════════════════════════════════════════════════════════════════════════
#  3) LIL_PARSE_HAWK — Content Parsing & Structuring
# ═════════════════════════════════════════════════════════════════════════

class LilParseHawk(BaseLilHawk):
    """
    Takes raw HTML from Lil_Scrapp_Hawk and produces:
      - Clean text (stripped of tags, scripts, styles)
      - Markdown conversion (via html2text)
      - Title extraction
      - Meta description
      - Structured data (JSON-LD, OpenGraph, microdata)
      - Image catalog
      - Internal/external link separation
    """
    hawk_name = "Lil_Parse_Hawk"
    hawk_color = "#448AFF"  # Parser Blue

    # Tags that carry no useful content (class-level default)
    _DEFAULT_STRIP_TAGS = frozenset({
        "script", "style", "noscript", "iframe", "svg",
        "header", "footer", "nav", "aside", "form",
    })

    def __init__(self, include_nav: bool = False, include_forms: bool = False):
        super().__init__()
        # Instance-level copy so mutations don't leak across instances
        self.strip_tags: Set[str] = set(self._DEFAULT_STRIP_TAGS)

        self._h2t = html2text.HTML2Text()
        self._h2t.ignore_links = False
        self._h2t.ignore_images = False
        self._h2t.ignore_emphasis = False
        self._h2t.body_width = 0  # No wrapping
        self._h2t.protect_links = True
        self._h2t.wrap_links = False
        self._h2t.skip_internal_links = False
        self._h2t.single_line_break = True

        if include_nav:
            self.strip_tags.discard("nav")
            self.strip_tags.discard("header")
            self.strip_tags.discard("footer")
        if include_forms:
            self.strip_tags.discard("form")

    async def execute(self, result: ScrapeResult) -> ScrapeResult:
        """Enrich a ScrapeResult with parsed content."""
        self.stats["tasks_received"] += 1

        if not result.raw_html:
            self.stats["tasks_failed"] += 1
            return result

        try:
            soup = BeautifulSoup(result.raw_html, "lxml")

            # ── Title ──
            result.title = self._extract_title(soup)

            # ── Meta description ──
            result.meta_description = self._extract_meta_desc(soup)

            # ── Structured data (JSON-LD + OpenGraph) ──
            result.structured_data = self._extract_structured(soup)

            # ── Images ──
            result.images = self._extract_images(soup, result.url)

            # ── Links ──
            result.links = self._extract_links(soup, result.url)

            # ── Clean the DOM for text extraction ──
            cleaned = self._clean_soup(soup)

            # ── Clean text ──
            result.clean_text = self._extract_clean_text(cleaned)

            # ── Markdown ──
            result.markdown = self._convert_to_markdown(cleaned)

            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"Parse error for {result.url}: {e}")
            result.error = f"Parse error: {e}"
            self.stats["tasks_failed"] += 1

        return result

    # ── Private helpers ──

    @staticmethod
    def _extract_title(soup: BeautifulSoup) -> str:
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)
        return ""

    @staticmethod
    def _extract_meta_desc(soup: BeautifulSoup) -> str:
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            return meta["content"].strip()
        og = soup.find("meta", property="og:description")
        if og and og.get("content"):
            return og["content"].strip()
        return ""

    @staticmethod
    def _extract_structured(soup: BeautifulSoup) -> Dict[str, Any]:
        data: Dict[str, Any] = {}

        # JSON-LD
        json_ld_scripts = soup.find_all("script", type="application/ld+json")
        json_ld_list = []
        for script in json_ld_scripts:
            try:
                parsed = json.loads(script.string)
                json_ld_list.append(parsed)
            except (json.JSONDecodeError, TypeError):
                continue
        if json_ld_list:
            data["json_ld"] = json_ld_list

        # OpenGraph
        og_tags = soup.find_all("meta", property=re.compile(r"^og:"))
        if og_tags:
            data["opengraph"] = {
                tag["property"]: tag.get("content", "")
                for tag in og_tags if tag.get("property")
            }

        # Twitter cards
        tw_tags = soup.find_all("meta", attrs={"name": re.compile(r"^twitter:")})
        if tw_tags:
            data["twitter_card"] = {
                tag["name"]: tag.get("content", "")
                for tag in tw_tags if tag.get("name")
            }

        return data

    @staticmethod
    def _extract_images(soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        images = []
        seen_srcs = set()
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if not src or src.startswith("data:"):
                continue
            abs_src = urljoin(base_url, src)
            if abs_src in seen_srcs:
                continue
            seen_srcs.add(abs_src)
            images.append({
                "src": abs_src,
                "alt": img.get("alt", ""),
                "width": img.get("width", ""),
                "height": img.get("height", ""),
            })
        return images

    @staticmethod
    def _extract_links(soup: BeautifulSoup, base_url: str) -> List[str]:
        links = []
        seen = set()
        base_domain = tldextract.extract(base_url)
        base_registered = f"{base_domain.domain}.{base_domain.suffix}"

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            abs_url = urljoin(base_url, href)
            # Normalize — strip fragment
            parsed = urlparse(abs_url)
            normalized = urlunparse(parsed._replace(fragment=""))
            if normalized not in seen:
                seen.add(normalized)
                links.append(normalized)
        return links

    def _clean_soup(self, soup: BeautifulSoup) -> BeautifulSoup:
        """Remove non-content elements for clean extraction."""
        cleaned = BeautifulSoup(str(soup), "lxml")
        # Remove unwanted tags
        for tag_name in self.strip_tags:
            for tag in cleaned.find_all(tag_name):
                tag.decompose()
        # Remove HTML comments
        for comment in cleaned.find_all(string=lambda t: isinstance(t, Comment)):
            comment.extract()
        # Remove hidden elements
        for el in cleaned.find_all(
            attrs={"style": re.compile(r"display\s*:\s*none", re.I)}
        ):
            el.decompose()
        for el in cleaned.find_all(attrs={"hidden": True}):
            el.decompose()
        for el in cleaned.find_all(attrs={"aria-hidden": "true"}):
            el.decompose()
        return cleaned

    def _extract_clean_text(self, soup: BeautifulSoup) -> str:
        text = soup.get_text(separator="\n", strip=True)
        # Collapse multiple blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _convert_to_markdown(self, soup: BeautifulSoup) -> str:
        # Use the body if it exists, otherwise the whole thing
        body = soup.find("body")
        html_str = str(body) if body else str(soup)
        md = self._h2t.handle(html_str)
        # Clean up excessive whitespace
        md = re.sub(r"\n{3,}", "\n\n", md)
        return md.strip()


# ═════════════════════════════════════════════════════════════════════════
#  4) LIL_CRAWL_HAWK — Link Discovery, Sitemap Walking, Recursion
# ═════════════════════════════════════════════════════════════════════════

class LilCrawlHawk(BaseLilHawk):
    """
    Owns the crawl frontier. Responsible for:
      - Discovering new URLs from ScrapeResults
      - Walking XML sitemaps
      - Filtering by include/exclude patterns
      - Maintaining the visited set & priority queue
      - Enforcing max_depth and max_pages
    """
    hawk_name = "Lil_Crawl_Hawk"
    hawk_color = "#FFAB00"  # Discovery Gold

    def __init__(self):
        super().__init__()
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._seen: Set[str] = set()
        self._lock = asyncio.Lock()

    async def execute(
        self,
        manifest: CrawlManifest,
        result: Optional[ScrapeResult] = None,
    ) -> List[ScrapeTarget]:
        """
        Extract new targets from a result and add to queue.
        Returns list of new ScrapeTargets ready for dispatch.
        """
        self.stats["tasks_received"] += 1
        new_targets: List[ScrapeTarget] = []

        if result and result.links:
            seed_domain = tldextract.extract(manifest.seed_url)
            seed_registered = f"{seed_domain.domain}.{seed_domain.suffix}"

            for link in result.links:
                # Same-domain filter
                link_domain = tldextract.extract(link)
                link_registered = f"{link_domain.domain}.{link_domain.suffix}"
                if link_registered != seed_registered:
                    continue

                # Include/exclude patterns
                if manifest.include_patterns:
                    if not any(
                        re.search(p, link) for p in manifest.include_patterns
                    ):
                        continue
                if manifest.exclude_patterns:
                    if any(
                        re.search(p, link) for p in manifest.exclude_patterns
                    ):
                        continue

                # Dedup
                async with self._lock:
                    if link in self._seen:
                        continue
                    if len(manifest.discovered) >= manifest.max_pages:
                        break
                    self._seen.add(link)
                    manifest.discovered.add(link)

                # Determine depth
                parent_target_depth = 0
                if result.url:
                    parent_target_depth = len(
                        [t for t in manifest.discovered if t == result.url]
                    )

                # For simplicity: use URL path depth as proxy
                parsed = urlparse(link)
                path_depth = len(
                    [s for s in parsed.path.split("/") if s]
                )

                target = ScrapeTarget(
                    url=link,
                    depth=path_depth,
                    max_depth=manifest.max_depth,
                    parent_url=result.url,
                    priority=path_depth,
                )

                if path_depth <= manifest.max_depth:
                    new_targets.append(target)

        self.stats["tasks_completed"] += 1
        return new_targets

    async def parse_sitemap(
        self,
        sitemap_url: str,
        session: aiohttp.ClientSession,
        manifest: CrawlManifest,
    ) -> List[ScrapeTarget]:
        """Fetch and parse an XML sitemap into ScrapeTargets."""
        targets: List[ScrapeTarget] = []
        try:
            async with session.get(sitemap_url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return targets
                text = await resp.text()

            soup = BeautifulSoup(text, "lxml-xml")

            # Handle sitemap index
            sitemap_tags = soup.find_all("sitemap")
            if sitemap_tags:
                for sm in sitemap_tags:
                    loc = sm.find("loc")
                    if loc and loc.string:
                        child_targets = await self.parse_sitemap(
                            loc.string.strip(), session, manifest
                        )
                        targets.extend(child_targets)
                return targets

            # Regular sitemap
            url_tags = soup.find_all("url")
            for url_tag in url_tags:
                loc = url_tag.find("loc")
                if not loc or not loc.string:
                    continue
                url = loc.string.strip()
                if url not in self._seen and len(manifest.discovered) < manifest.max_pages:
                    self._seen.add(url)
                    manifest.discovered.add(url)
                    targets.append(ScrapeTarget(
                        url=url,
                        depth=0,
                        max_depth=manifest.max_depth,
                        priority=1,
                    ))

        except Exception as e:
            self.logger.warning(f"Sitemap parse error for {sitemap_url}: {e}")

        return targets


# ═════════════════════════════════════════════════════════════════════════
#  5) LIL_SNAP_HAWK — Screenshot & Visual Capture (Playwright)
# ═════════════════════════════════════════════════════════════════════════

class LilSnapHawk(BaseLilHawk):
    """
    Visual capture Hawk. Uses Playwright for:
      - Full-page screenshots
      - Viewport-specific screenshots
      - JavaScript-rendered page content extraction
      - PDF generation of pages
    Activates only when Playwright is available.
    """
    hawk_name = "Lil_Snap_Hawk"
    hawk_color = "#E040FB"  # Snap Purple

    def __init__(self, output_dir: str = "./screenshots"):
        super().__init__()
        self.output_dir = Path(output_dir)
        self._browser = None
        self._playwright = None
        self._available = False

    async def startup(self):
        await super().startup()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        try:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            self._available = True
            self.logger.info("Playwright browser launched.")
        except ImportError:
            self.logger.warning(
                "Playwright not installed. Lil_Snap_Hawk in standby. "
                "Run: pip install playwright && playwright install chromium"
            )
        except Exception as e:
            self.logger.warning(f"Playwright launch failed: {e}. Standby mode.")

    async def shutdown(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        await super().shutdown()

    @property
    def is_available(self) -> bool:
        return self._available

    async def execute(
        self,
        url: str,
        full_page: bool = True,
        viewport: Tuple[int, int] = (1920, 1080),
        wait_for: str = "networkidle",
        extract_js_html: bool = False,
    ) -> Dict[str, Any]:
        """
        Capture screenshot and optionally extract JS-rendered HTML.
        Returns dict with screenshot_path and optionally rendered_html.
        """
        self.stats["tasks_received"] += 1
        output: Dict[str, Any] = {"screenshot_path": None, "rendered_html": None}

        if not self._available:
            self.stats["tasks_failed"] += 1
            output["error"] = "Playwright not available"
            return output

        try:
            page = await self._browser.new_page(
                viewport={"width": viewport[0], "height": viewport[1]}
            )
            await page.goto(url, wait_until=wait_for, timeout=30000)

            # Screenshot
            filename = hashlib.sha256(url.encode()).hexdigest()[:12] + ".png"
            filepath = self.output_dir / filename
            await page.screenshot(path=str(filepath), full_page=full_page)
            output["screenshot_path"] = str(filepath)

            # JS-rendered HTML
            if extract_js_html:
                output["rendered_html"] = await page.content()

            await page.close()
            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"Screenshot failed for {url}: {e}")
            output["error"] = str(e)
            self.stats["tasks_failed"] += 1

        return output


# ═════════════════════════════════════════════════════════════════════════
#  6) LIL_STORE_HAWK — Persistence, Dedup, Caching, Export
# ═════════════════════════════════════════════════════════════════════════

class LilStoreHawk(BaseLilHawk):
    """
    Data persistence layer. Handles:
      - SQLite storage for scraped results
      - Content-hash dedup (skip if identical content seen before)
      - Export to JSON, JSONL, CSV, Markdown files
      - Cache lookups (return cached if URL scraped within TTL)
    """
    hawk_name = "Lil_Store_Hawk"
    hawk_color = "#00BCD4"  # Storage Cyan

    def __init__(
        self,
        db_path: str = "./scrape_cache.db",
        cache_ttl_seconds: int = 3600,
        output_dir: str = "./output",
    ):
        super().__init__()
        self.db_path = db_path
        self.cache_ttl = cache_ttl_seconds
        self.output_dir = Path(output_dir)
        self._conn: Optional[sqlite3.Connection] = None

    async def startup(self):
        await super().startup()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS scrape_results (
                url_hash     TEXT PRIMARY KEY,
                url          TEXT NOT NULL,
                content_hash TEXT,
                title        TEXT,
                status_code  INTEGER,
                markdown     TEXT,
                clean_text   TEXT,
                raw_html     TEXT,
                meta_desc    TEXT,
                links_json   TEXT,
                images_json  TEXT,
                struct_json  TEXT,
                scraped_at   TEXT,
                elapsed_ms   REAL,
                error        TEXT
            )
        """)
        self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_url ON scrape_results(url)
        """)
        self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_scraped_at ON scrape_results(scraped_at)
        """)
        self._conn.commit()

    async def shutdown(self):
        if self._conn:
            self._conn.close()
        await super().shutdown()

    async def execute(self, result: ScrapeResult) -> bool:
        """Store a ScrapeResult. Returns True if stored (not a dupe)."""
        self.stats["tasks_received"] += 1

        url_hash = hashlib.sha256(result.url.encode()).hexdigest()[:16]
        content_hash = hashlib.sha256(
            (result.clean_text or "").encode()
        ).hexdigest()[:16]

        # Dedup check — skip if identical content already stored
        existing = self._conn.execute(
            "SELECT content_hash FROM scrape_results WHERE url_hash = ?",
            (url_hash,)
        ).fetchone()

        if existing and existing[0] == content_hash:
            self.logger.debug(f"Dedup skip: {result.url}")
            self.stats["tasks_completed"] += 1
            return False

        self._conn.execute("""
            INSERT OR REPLACE INTO scrape_results
            (url_hash, url, content_hash, title, status_code, markdown,
             clean_text, raw_html, meta_desc, links_json, images_json,
             struct_json, scraped_at, elapsed_ms, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            url_hash,
            result.url,
            content_hash,
            result.title,
            result.status_code,
            result.markdown,
            result.clean_text,
            result.raw_html,
            result.meta_description,
            json.dumps(result.links),
            json.dumps(result.images),
            json.dumps(result.structured_data),
            result.scraped_at,
            result.elapsed_ms,
            result.error,
        ))
        self._conn.commit()
        self.stats["tasks_completed"] += 1
        return True

    def get_cached(self, url: str) -> Optional[ScrapeResult]:
        """Return cached result if within TTL."""
        url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
        row = self._conn.execute(
            "SELECT * FROM scrape_results WHERE url_hash = ?", (url_hash,)
        ).fetchone()
        if not row:
            return None

        scraped_at_str = row[12]
        try:
            scraped_at = datetime.fromisoformat(scraped_at_str)
            now = datetime.now(timezone.utc)
            age = (now - scraped_at).total_seconds()
            if age > self.cache_ttl:
                return None
        except (ValueError, TypeError):
            return None

        return ScrapeResult(
            url=row[1],
            title=row[3] or "",
            status_code=row[4] or 0,
            markdown=row[5] or "",
            clean_text=row[6] or "",
            raw_html=row[7] or "",
            meta_description=row[8] or "",
            links=json.loads(row[9] or "[]"),
            images=json.loads(row[10] or "[]"),
            structured_data=json.loads(row[11] or "{}"),
            scraped_at=row[12] or "",
            elapsed_ms=row[13] or 0.0,
            error=row[14],
        )

    async def export_json(
        self, results: List[ScrapeResult], filename: str = "scrape_results.json"
    ) -> str:
        """Export results list to a JSON file."""
        filepath = self.output_dir / filename
        data = [r.to_dict() for r in results]
        async with aiofiles.open(filepath, "w") as f:
            await f.write(json.dumps(data, indent=2, default=str))
        self.logger.info(f"Exported {len(results)} results to {filepath}")
        return str(filepath)

    async def export_jsonl(
        self, results: List[ScrapeResult], filename: str = "scrape_results.jsonl"
    ) -> str:
        """Export results list to a JSONL file (one JSON per line)."""
        filepath = self.output_dir / filename
        async with aiofiles.open(filepath, "w") as f:
            for r in results:
                await f.write(json.dumps(r.to_dict(), default=str) + "\n")
        self.logger.info(f"Exported {len(results)} results to {filepath}")
        return str(filepath)

    async def export_markdown(
        self, results: List[ScrapeResult], filename: str = "scrape_results.md"
    ) -> str:
        """Export all markdown content to a single Markdown file."""
        filepath = self.output_dir / filename
        async with aiofiles.open(filepath, "w") as f:
            for r in results:
                await f.write(f"# {r.title or r.url}\n\n")
                await f.write(f"**URL:** {r.url}\n")
                await f.write(f"**Scraped:** {r.scraped_at}\n\n")
                await f.write(r.markdown or r.clean_text or "_No content_")
                await f.write("\n\n---\n\n")
        self.logger.info(f"Exported {len(results)} pages to {filepath}")
        return str(filepath)


# ═════════════════════════════════════════════════════════════════════════
#  SQWAADRUN DISPATCHER — Chicken Hawk orchestrates all Hawks
# ═════════════════════════════════════════════════════════════════════════

class ScrappHawkSquadrun:
    """
    The Sqwaadrun coordinator. This is the Chicken Hawk dispatch layer
    that wires all Lil_Hawks together into a cohesive swarm.

    Usage:

        async with ScrappHawkSquadrun() as squad:
            # Single page scrape
            result = await squad.scrape("https://example.com")

            # Full site crawl
            results = await squad.crawl("https://example.com", max_pages=50)

            # Batch scrape
            results = await squad.batch_scrape([
                "https://example.com/page1",
                "https://example.com/page2",
            ])
    """

    def __init__(
        self,
        requests_per_second: float = 2.0,
        respect_robots: bool = True,
        proxies: Optional[List[str]] = None,
        cache_ttl: int = 3600,
        output_dir: str = "./output",
        screenshots_dir: str = "./screenshots",
        db_path: str = "./scrape_cache.db",
        blocked_domains: Optional[List[str]] = None,
        allowed_domains: Optional[List[str]] = None,
        concurrency: int = 5,
        enable_screenshots: bool = False,
    ):
        self.concurrency = concurrency
        self.enable_screenshots = enable_screenshots

        # ── Initialize the Sqwaadrun ──
        self.guard = LilGuardHawk(
            requests_per_second=requests_per_second,
            respect_robots=respect_robots,
            proxies=proxies,
            blocked_domains=blocked_domains,
            allowed_domains=allowed_domains,
        )
        self.scrapper = LilScrappHawk(guard=self.guard)
        self.parser = LilParseHawk()
        self.crawler = LilCrawlHawk()
        self.snapper = LilSnapHawk(output_dir=screenshots_dir)
        self.store = LilStoreHawk(
            db_path=db_path,
            cache_ttl_seconds=cache_ttl,
            output_dir=output_dir,
        )

        self._hawks: List[BaseLilHawk] = [
            self.guard, self.scrapper, self.parser,
            self.crawler, self.snapper, self.store,
        ]

        self.logger = logging.getLogger("Sqwaadrun.Dispatch")

    async def __aenter__(self):
        await self.startup()
        return self

    async def __aexit__(self, *exc):
        await self.shutdown()

    async def startup(self):
        """Bring all Hawks online."""
        self.logger.info("═══ Sqwaadrun launching ═══")
        for hawk in self._hawks:
            if hawk is self.snapper and not self.enable_screenshots:
                self.logger.info(
                    f"Skipping {hawk.hawk_name} (screenshots disabled)."
                )
                continue
            await hawk.startup()
        self.logger.info("═══ All Hawks reporting. Ready. ═══")

    async def shutdown(self):
        """Stand down all Hawks."""
        self.logger.info("═══ Sqwaadrun standing down ═══")
        for hawk in reversed(self._hawks):
            await hawk.shutdown()
        self.logger.info("═══ Sqwaadrun dismissed. ═══")

    # ── Single-Page Scrape ──

    async def scrape(
        self,
        url: str,
        use_cache: bool = True,
        take_screenshot: bool = False,
        extract_js: bool = False,
    ) -> ScrapeResult:
        """
        Scrape a single URL through the full Hawk pipeline.
        Guard → Scrapp → Parse → (Snap) → Store
        """
        # Cache check
        if use_cache:
            cached = self.store.get_cached(url)
            if cached:
                self.logger.info(f"Cache hit: {url}")
                return cached

        target = ScrapeTarget(url=url)

        # If JS rendering needed and Playwright available
        if extract_js and self.snapper.is_available:
            snap_result = await self.snapper.execute(
                url, extract_js_html=True
            )
            if snap_result.get("rendered_html"):
                result = ScrapeResult(
                    url=url,
                    raw_html=snap_result["rendered_html"],
                    status_code=200,
                    screenshot_path=snap_result.get("screenshot_path"),
                )
                result = await self.parser.execute(result)
                await self.store.execute(result)
                return result

        # Standard pipeline
        result = await self.scrapper.execute(target)
        if result.raw_html:
            result = await self.parser.execute(result)

        # Optional screenshot
        if take_screenshot and self.enable_screenshots and self.snapper.is_available:
            snap = await self.snapper.execute(url)
            result.screenshot_path = snap.get("screenshot_path")

        # Store
        await self.store.execute(result)
        return result

    # ── Batch Scrape ──

    async def batch_scrape(
        self,
        urls: List[str],
        use_cache: bool = True,
    ) -> List[ScrapeResult]:
        """Scrape multiple URLs concurrently with semaphore throttling."""
        sem = asyncio.Semaphore(self.concurrency)
        results: List[ScrapeResult] = []

        async def _scrape_one(u: str):
            async with sem:
                return await self.scrape(u, use_cache=use_cache)

        tasks = [_scrape_one(u) for u in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        final: List[ScrapeResult] = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                self.logger.error(f"Batch error on {urls[i]}: {r}")
                final.append(ScrapeResult(url=urls[i], error=str(r)))
            else:
                final.append(r)
        return final

    # ── Full Site Crawl ──

    async def crawl(
        self,
        seed_url: str,
        max_depth: int = 3,
        max_pages: int = 100,
        include_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        use_sitemap: bool = True,
    ) -> CrawlManifest:
        """
        Crawl a site starting from seed_url.
        Lil_Crawl_Hawk manages the frontier; Lil_Scrapp_Hawk fetches;
        Lil_Parse_Hawk structures; Lil_Store_Hawk persists.
        """
        manifest = CrawlManifest(
            seed_url=seed_url,
            max_depth=max_depth,
            max_pages=max_pages,
            include_patterns=include_patterns or [],
            exclude_patterns=exclude_patterns or [],
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        manifest.discovered.add(seed_url)

        # Try sitemap first
        if use_sitemap:
            parsed = urlparse(seed_url)
            sitemap_url = f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
            self.logger.info(f"Checking sitemap: {sitemap_url}")
            sitemap_targets = await self.crawler.parse_sitemap(
                sitemap_url, self.scrapper._session, manifest
            )
            if sitemap_targets:
                self.logger.info(
                    f"Sitemap yielded {len(sitemap_targets)} URLs."
                )

        # BFS crawl
        queue: List[ScrapeTarget] = [ScrapeTarget(
            url=seed_url, depth=0, max_depth=max_depth
        )]
        sem = asyncio.Semaphore(self.concurrency)

        while queue and manifest.pages_scraped < max_pages:
            # Take a batch
            batch = queue[:self.concurrency]
            queue = queue[self.concurrency:]

            async def _process(target: ScrapeTarget):
                async with sem:
                    if target.url in manifest.completed:
                        return
                    result = await self.scrape(target.url)
                    manifest.completed.add(target.url)
                    manifest.results.append(result)

                    # Discover new links
                    new_targets = await self.crawler.execute(manifest, result)
                    return new_targets

            tasks = [_process(t) for t in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for br in batch_results:
                if isinstance(br, list):
                    for t in br:
                        if (
                            t.url not in manifest.completed
                            and t.url not in manifest.failed
                        ):
                            queue.append(t)
                elif isinstance(br, Exception):
                    self.logger.error(f"Crawl batch error: {br}")

        manifest.finished_at = datetime.now(timezone.utc).isoformat()
        self.logger.info(
            f"Crawl complete: {manifest.pages_scraped} pages scraped, "
            f"{len(manifest.failed)} failed."
        )
        return manifest

    # ── Export Helpers ──

    async def export(
        self,
        results: List[ScrapeResult],
        fmt: str = "json",
        filename: Optional[str] = None,
    ) -> str:
        """Export results. fmt: 'json', 'jsonl', 'markdown'."""
        if fmt == "jsonl":
            return await self.store.export_jsonl(
                results, filename or "scrape_results.jsonl"
            )
        elif fmt == "markdown":
            return await self.store.export_markdown(
                results, filename or "scrape_results.md"
            )
        else:
            return await self.store.export_json(
                results, filename or "scrape_results.json"
            )

    # ── Roster Report ──

    def roster_report(self) -> str:
        """Print the current Sqwaadrun roster with stats."""
        lines = [
            "╔══════════════════════════════════════════════════════════╗",
            "║         LIL_SCRAPP_HAWK SQWAADRUN — ROSTER             ║",
            "╠══════════════════════════════════════════════════════════╣",
        ]
        for hawk in self._hawks:
            status = "ACTIVE" if hawk._active else "STANDBY"
            if hawk is self.snapper and not self.snapper.is_available:
                status = "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<20s}  "
                f"{status:<8s}  "
                f"Done: {hawk.stats['tasks_completed']:<5d}  "
                f"Fail: {hawk.stats['tasks_failed']:<5d} ║"
            )
        lines.append(
            "╚══════════════════════════════════════════════════════════╝"
        )
        return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════
#  CLI INTERFACE — Direct execution
# ═════════════════════════════════════════════════════════════════════════
#  EXPANSION DATA STRUCTURES
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class ExtractionRule:
    """A single extraction rule for Lil_Extract_Hawk."""
    name: str
    selector: str  # CSS selector, XPath, or regex pattern
    selector_type: str = "css"  # "css", "xpath", "regex"
    attribute: Optional[str] = None  # Extract specific attribute (e.g., "href")
    multiple: bool = False  # Return list vs single value
    transform: Optional[str] = None  # "strip", "lower", "upper", "int", "float"
    default: Any = None  # Default if not found


@dataclass
class ExtractionSchema:
    """A named collection of extraction rules to run against a page."""
    name: str
    rules: List[ExtractionRule]
    base_selector: Optional[str] = None  # Scope all rules under this element
    is_list: bool = False  # Extract multiple items (e.g., product listings)


@dataclass
class FeedEntry:
    """A single entry from an RSS/Atom/JSON feed."""
    title: str = ""
    link: str = ""
    published: str = ""
    updated: str = ""
    summary: str = ""
    content: str = ""
    author: str = ""
    categories: List[str] = field(default_factory=list)
    media_url: Optional[str] = None
    feed_source: str = ""


@dataclass
class DiffResult:
    """Output from Lil_Diff_Hawk change detection."""
    url: str
    changed: bool = False
    previous_hash: Optional[str] = None
    current_hash: Optional[str] = None
    added_lines: List[str] = field(default_factory=list)
    removed_lines: List[str] = field(default_factory=list)
    diff_ratio: float = 0.0  # 0.0 = identical, 1.0 = completely different
    checked_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class QueueJob:
    """A job in Lil_Queue_Hawk's priority queue."""
    job_id: str
    url: str
    priority: int = 5  # 1=highest, 10=lowest
    job_type: str = "scrape"  # "scrape", "crawl", "extract", "monitor"
    payload: Dict[str, Any] = field(default_factory=dict)
    status: str = "queued"  # "queued", "running", "done", "failed", "retry"
    retries_left: int = 3
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    scheduled_at: Optional[str] = None  # For delayed execution
    completed_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

    def __lt__(self, other: "QueueJob"):
        """Priority queue ordering — lower priority number = higher priority."""
        return self.priority < other.priority


# ═════════════════════════════════════════════════════════════════════════
#  7) LIL_EXTRACT_HAWK — CSS / XPath / Regex Targeted Extraction
# ═════════════════════════════════════════════════════════════════════════

class LilExtractHawk(BaseLilHawk):
    """
    Targeted data extraction from HTML using schemas.
    Supports CSS selectors, XPath, and regex patterns.
    Use this when you need structured records from pages
    (product listings, directory entries, table data, etc.)

    Example schema for scraping product listings:
        ExtractionSchema(
            name="products",
            base_selector=".product-card",
            is_list=True,
            rules=[
                ExtractionRule(name="title", selector="h2.product-title"),
                ExtractionRule(name="price", selector=".price", transform="strip"),
                ExtractionRule(name="link", selector="a", attribute="href"),
                ExtractionRule(name="image", selector="img", attribute="src"),
            ]
        )
    """
    hawk_name = "Lil_Extract_Hawk"
    hawk_color = "#FF9100"  # Extract Orange

    def __init__(self):
        super().__init__()
        self._schemas: Dict[str, ExtractionSchema] = {}

    def register_schema(self, schema: ExtractionSchema):
        """Register a reusable extraction schema."""
        self._schemas[schema.name] = schema
        self.logger.info(f"Registered schema: '{schema.name}' ({len(schema.rules)} rules)")

    async def execute(
        self,
        result: ScrapeResult,
        schema: Optional[ExtractionSchema] = None,
        schema_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract structured data from a ScrapeResult using a schema.
        Returns a dict of extracted fields (or list of dicts if schema.is_list).
        """
        self.stats["tasks_received"] += 1

        if schema_name and schema_name in self._schemas:
            schema = self._schemas[schema_name]

        if not schema:
            self.stats["tasks_failed"] += 1
            return {"error": "No extraction schema provided or found."}

        if not result.raw_html:
            self.stats["tasks_failed"] += 1
            return {"error": "No HTML content to extract from."}

        try:
            soup = BeautifulSoup(result.raw_html, "lxml")
            extracted = self._run_schema(soup, schema, result.url)
            self.stats["tasks_completed"] += 1
            return {"schema": schema.name, "url": result.url, "data": extracted}

        except Exception as e:
            self.logger.error(f"Extraction error on {result.url}: {e}")
            self.stats["tasks_failed"] += 1
            return {"error": str(e)}

    def _run_schema(
        self, soup: BeautifulSoup, schema: ExtractionSchema, base_url: str
    ) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """Execute extraction rules against soup."""

        if schema.is_list and schema.base_selector:
            # List extraction — find all containers, apply rules to each
            containers = soup.select(schema.base_selector)
            items = []
            for container in containers:
                item = {}
                for rule in schema.rules:
                    item[rule.name] = self._apply_rule(container, rule, base_url)
                items.append(item)
            return items
        else:
            # Single extraction — apply each rule to the full soup or scoped base
            scope = soup
            if schema.base_selector:
                scoped = soup.select_one(schema.base_selector)
                if scoped:
                    scope = scoped

            record = {}
            for rule in schema.rules:
                record[rule.name] = self._apply_rule(scope, rule, base_url)
            return record

    def _apply_rule(
        self, scope: BeautifulSoup, rule: ExtractionRule, base_url: str
    ) -> Any:
        """Apply a single extraction rule to a scope."""

        if rule.selector_type == "css":
            return self._extract_css(scope, rule, base_url)
        elif rule.selector_type == "regex":
            return self._extract_regex(scope, rule)
        elif rule.selector_type == "xpath":
            # BeautifulSoup doesn't natively support XPath — use CSS equivalent
            self.logger.warning(
                f"XPath not natively supported in BS4. "
                f"Attempting CSS conversion for rule '{rule.name}'."
            )
            return self._extract_css(scope, rule, base_url)
        return rule.default

    def _extract_css(
        self, scope: BeautifulSoup, rule: ExtractionRule, base_url: str
    ) -> Any:
        """Extract using CSS selector."""
        if rule.multiple:
            elements = scope.select(rule.selector)
            if not elements:
                return rule.default or []
            values = []
            for el in elements:
                val = self._get_value(el, rule, base_url)
                if val is not None:
                    values.append(val)
            return values
        else:
            element = scope.select_one(rule.selector)
            if not element:
                return rule.default
            return self._get_value(element, rule, base_url)

    def _extract_regex(self, scope: BeautifulSoup, rule: ExtractionRule) -> Any:
        """Extract using regex pattern against the text content."""
        text = scope.get_text(separator=" ", strip=True)
        if rule.multiple:
            matches = re.findall(rule.selector, text)
            return matches if matches else (rule.default or [])
        else:
            match = re.search(rule.selector, text)
            if match:
                val = match.group(1) if match.groups() else match.group(0)
                return self._transform(val, rule.transform)
            return rule.default

    def _get_value(
        self, element: Any, rule: ExtractionRule, base_url: str
    ) -> Any:
        """Get value from an element, either attribute or text content."""
        if rule.attribute:
            val = element.get(rule.attribute, rule.default)
            # Resolve relative URLs for href/src attributes
            if val and rule.attribute in ("href", "src", "data-src"):
                val = urljoin(base_url, val)
        else:
            val = element.get_text(strip=True)
        return self._transform(val, rule.transform)

    @staticmethod
    def _transform(value: Any, transform: Optional[str]) -> Any:
        """Apply transformation to extracted value."""
        if value is None or transform is None:
            return value
        if transform == "strip":
            return str(value).strip()
        elif transform == "lower":
            return str(value).lower()
        elif transform == "upper":
            return str(value).upper()
        elif transform == "int":
            try:
                cleaned = re.sub(r"[^\d\-]", "", str(value))
                return int(cleaned) if cleaned else None
            except ValueError:
                return None
        elif transform == "float":
            try:
                cleaned = re.sub(r"[^\d\.\-]", "", str(value))
                return float(cleaned) if cleaned else None
            except ValueError:
                return None
        return value

    # ── Convenience: extract tables ──

    async def extract_tables(
        self, result: ScrapeResult
    ) -> List[List[List[str]]]:
        """
        Extract all HTML tables as lists of rows.
        Returns: List of tables, each table is a list of rows,
        each row is a list of cell strings.
        """
        self.stats["tasks_received"] += 1
        tables = []

        if not result.raw_html:
            self.stats["tasks_failed"] += 1
            return tables

        soup = BeautifulSoup(result.raw_html, "lxml")
        for table_el in soup.find_all("table"):
            table_data = []
            for row in table_el.find_all("tr"):
                cells = []
                for cell in row.find_all(["td", "th"]):
                    cells.append(cell.get_text(strip=True))
                if cells:
                    table_data.append(cells)
            if table_data:
                tables.append(table_data)

        self.stats["tasks_completed"] += 1
        return tables

    async def tables_to_csv(
        self, tables: List[List[List[str]]], index: int = 0
    ) -> str:
        """Convert a table to CSV string."""
        if not tables or index >= len(tables):
            return ""
        output = io.StringIO()
        writer = csv.writer(output)
        for row in tables[index]:
            writer.writerow(row)
        return output.getvalue()


# ═════════════════════════════════════════════════════════════════════════
#  8) LIL_FEED_HAWK — RSS / Atom / JSON Feed Discovery & Parsing
# ═════════════════════════════════════════════════════════════════════════

class LilFeedHawk(BaseLilHawk):
    """
    Discovers and parses syndication feeds (RSS 2.0, Atom, JSON Feed).
    Can auto-discover feeds from a page's <link> tags, or parse
    a feed URL directly.
    """
    hawk_name = "Lil_Feed_Hawk"
    hawk_color = "#76FF03"  # Feed Green

    def __init__(self):
        super().__init__()

    async def execute(
        self,
        url: str,
        session: aiohttp.ClientSession,
        guard: LilGuardHawk,
        max_entries: int = 50,
    ) -> List[FeedEntry]:
        """
        Fetch and parse a feed URL directly.
        Returns a list of FeedEntry objects.
        """
        self.stats["tasks_received"] += 1
        entries: List[FeedEntry] = []

        try:
            headers = guard.get_headers()
            async with session.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=20)
            ) as resp:
                if resp.status != 200:
                    self.stats["tasks_failed"] += 1
                    return entries
                text = await resp.text()

            # Detect feed type and parse
            if '"version"' in text[:500] and '"items"' in text[:2000]:
                entries = self._parse_json_feed(text, url, max_entries)
            elif "<rss" in text[:500] or "<channel>" in text[:1000]:
                entries = self._parse_rss(text, url, max_entries)
            elif "<feed" in text[:500]:
                entries = self._parse_atom(text, url, max_entries)
            else:
                self.logger.warning(f"Unknown feed format at {url}")
                self.stats["tasks_failed"] += 1
                return entries

            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"Feed parse error for {url}: {e}")
            self.stats["tasks_failed"] += 1

        return entries

    async def discover_feeds(
        self, result: ScrapeResult
    ) -> List[Dict[str, str]]:
        """
        Discover feed URLs from a page's HTML <link> tags.
        Returns list of {url, type, title} dicts.
        """
        feeds = []
        if not result.raw_html:
            return feeds

        soup = BeautifulSoup(result.raw_html, "lxml")
        feed_types = [
            "application/rss+xml",
            "application/atom+xml",
            "application/json",
            "application/feed+json",
        ]

        for link in soup.find_all("link", rel="alternate"):
            link_type = link.get("type", "")
            if link_type in feed_types:
                href = link.get("href", "")
                if href:
                    abs_url = urljoin(result.url, href)
                    feeds.append({
                        "url": abs_url,
                        "type": link_type,
                        "title": link.get("title", ""),
                    })

        # Also check common feed URL patterns
        parsed = urlparse(result.url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        common_paths = [
            "/feed", "/feed/", "/rss", "/rss.xml", "/atom.xml",
            "/feed.xml", "/index.xml", "/feeds/posts/default",
        ]
        for path in common_paths:
            candidate = base + path
            if not any(f["url"] == candidate for f in feeds):
                feeds.append({
                    "url": candidate,
                    "type": "unknown",
                    "title": f"Common pattern: {path}",
                })

        return feeds

    # ── Feed parsers ──

    def _parse_rss(
        self, text: str, source: str, max_entries: int
    ) -> List[FeedEntry]:
        soup = BeautifulSoup(text, "lxml-xml")
        entries = []
        for item in soup.find_all("item")[:max_entries]:
            entry = FeedEntry(feed_source=source)
            entry.title = self._tag_text(item, "title")
            entry.link = self._tag_text(item, "link")
            entry.published = self._tag_text(item, "pubDate")
            entry.summary = self._tag_text(item, "description")
            entry.content = self._tag_text(item, "content:encoded") or entry.summary
            entry.author = self._tag_text(item, "author") or self._tag_text(item, "dc:creator")

            categories = item.find_all("category")
            entry.categories = [c.get_text(strip=True) for c in categories]

            enclosure = item.find("enclosure")
            if enclosure and enclosure.get("url"):
                entry.media_url = enclosure["url"]

            entries.append(entry)
        return entries

    def _parse_atom(
        self, text: str, source: str, max_entries: int
    ) -> List[FeedEntry]:
        soup = BeautifulSoup(text, "lxml-xml")
        entries = []
        for item in soup.find_all("entry")[:max_entries]:
            entry = FeedEntry(feed_source=source)
            entry.title = self._tag_text(item, "title")

            link_el = item.find("link", attrs={"rel": "alternate"})
            if not link_el:
                link_el = item.find("link")
            if link_el:
                entry.link = link_el.get("href", "")

            entry.published = self._tag_text(item, "published")
            entry.updated = self._tag_text(item, "updated")
            entry.summary = self._tag_text(item, "summary")

            content_el = item.find("content")
            if content_el:
                entry.content = content_el.get_text(strip=True)

            author_el = item.find("author")
            if author_el:
                entry.author = self._tag_text(author_el, "name")

            categories = item.find_all("category")
            entry.categories = [
                c.get("term", c.get_text(strip=True)) for c in categories
            ]
            entries.append(entry)
        return entries

    def _parse_json_feed(
        self, text: str, source: str, max_entries: int
    ) -> List[FeedEntry]:
        entries = []
        try:
            data = json.loads(text)
            for item in data.get("items", [])[:max_entries]:
                entry = FeedEntry(feed_source=source)
                entry.title = item.get("title", "")
                entry.link = item.get("url", "")
                entry.published = item.get("date_published", "")
                entry.updated = item.get("date_modified", "")
                entry.summary = item.get("summary", "")
                entry.content = item.get("content_html", "") or item.get("content_text", "")

                authors = item.get("authors", [])
                if authors:
                    entry.author = authors[0].get("name", "")

                entry.categories = item.get("tags", [])

                attachments = item.get("attachments", [])
                if attachments:
                    entry.media_url = attachments[0].get("url")

                entries.append(entry)
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON Feed parse error: {e}")
        return entries

    @staticmethod
    def _tag_text(parent, tag_name: str) -> str:
        el = parent.find(tag_name)
        return el.get_text(strip=True) if el else ""


# ═════════════════════════════════════════════════════════════════════════
#  9) LIL_DIFF_HAWK — Change Detection & Monitoring
# ═════════════════════════════════════════════════════════════════════════

class LilDiffHawk(BaseLilHawk):
    """
    Monitors pages for changes over time. Computes content hashes,
    generates diffs, tracks change history. Use for:
      - Price monitoring
      - Content change alerts
      - Competitor page tracking
      - Regulatory page updates
    """
    hawk_name = "Lil_Diff_Hawk"
    hawk_color = "#FF6D00"  # Diff Amber

    def __init__(self, history_dir: str = "./diff_history"):
        super().__init__()
        self.history_dir = Path(history_dir)
        self._snapshots: Dict[str, List[Dict[str, Any]]] = {}

    async def startup(self):
        await super().startup()
        self.history_dir.mkdir(parents=True, exist_ok=True)

    async def execute(
        self, result: ScrapeResult, content_key: str = "clean_text"
    ) -> DiffResult:
        """
        Compare current scrape against the most recent snapshot.
        Stores the current snapshot and returns a DiffResult.
        """
        self.stats["tasks_received"] += 1
        url = result.url
        current_content = getattr(result, content_key, "") or ""
        current_hash = hashlib.sha256(current_content.encode()).hexdigest()[:24]

        diff_result = DiffResult(url=url, current_hash=current_hash)

        # Get previous snapshot
        url_key = hashlib.sha256(url.encode()).hexdigest()[:16]
        snapshots = self._snapshots.get(url_key, [])

        if snapshots:
            prev = snapshots[-1]
            diff_result.previous_hash = prev["hash"]
            diff_result.changed = (current_hash != prev["hash"])

            if diff_result.changed:
                # Compute line-level diff
                prev_lines = prev["content"].splitlines()
                curr_lines = current_content.splitlines()

                differ = difflib.unified_diff(
                    prev_lines, curr_lines,
                    fromfile="previous", tofile="current",
                    lineterm=""
                )
                for line in differ:
                    if line.startswith("+") and not line.startswith("+++"):
                        diff_result.added_lines.append(line[1:])
                    elif line.startswith("-") and not line.startswith("---"):
                        diff_result.removed_lines.append(line[1:])

                # Compute similarity ratio
                matcher = difflib.SequenceMatcher(
                    None, prev["content"], current_content
                )
                diff_result.diff_ratio = 1.0 - matcher.ratio()
        else:
            # First snapshot — no comparison available
            diff_result.changed = False

        # Store current snapshot
        snapshot = {
            "hash": current_hash,
            "content": current_content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if url_key not in self._snapshots:
            self._snapshots[url_key] = []
        self._snapshots[url_key].append(snapshot)

        # Persist to disk
        await self._persist_snapshot(url_key, snapshot)

        self.stats["tasks_completed"] += 1
        return diff_result

    async def get_change_history(
        self, url: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Return the last N snapshots for a URL."""
        url_key = hashlib.sha256(url.encode()).hexdigest()[:16]
        snapshots = self._snapshots.get(url_key, [])
        return snapshots[-limit:]

    async def _persist_snapshot(self, url_key: str, snapshot: Dict[str, Any]):
        """Save snapshot to disk for persistence across sessions."""
        filepath = self.history_dir / f"{url_key}.jsonl"
        record = {
            "hash": snapshot["hash"],
            "timestamp": snapshot["timestamp"],
            "content_length": len(snapshot["content"]),
        }
        async with aiofiles.open(filepath, "a") as f:
            await f.write(json.dumps(record) + "\n")


# ═════════════════════════════════════════════════════════════════════════
#  10) LIL_CLEAN_HAWK — Text Normalization, Dedup, Table Structuring
# ═════════════════════════════════════════════════════════════════════════

class LilCleanHawk(BaseLilHawk):
    """
    Post-processing Hawk that cleans and normalizes extracted content.
    Runs after Lil_Parse_Hawk to handle:
      - Unicode normalization
      - Whitespace collapsing
      - Boilerplate removal (cookie banners, subscribe prompts)
      - Sentence boundary detection
      - Content deduplication across pages
      - Text quality scoring
    """
    hawk_name = "Lil_Clean_Hawk"
    hawk_color = "#B2FF59"  # Clean Lime

    # Common boilerplate patterns (case-insensitive)
    BOILERPLATE_PATTERNS = [
        r"accept\s+(all\s+)?cookies?",
        r"we\s+use\s+cookies",
        r"cookie\s+(policy|preferences|settings|consent)",
        r"subscribe\s+to\s+(our|the)\s+newsletter",
        r"sign\s+up\s+for\s+(our|the)\s+newsletter",
        r"enter\s+your\s+email",
        r"privacy\s+policy",
        r"terms\s+(of\s+service|and\s+conditions)",
        r"all\s+rights\s+reserved",
        r"©\s*\d{4}",
        r"powered\s+by",
        r"share\s+(this|on)\s+(facebook|twitter|linkedin)",
        r"follow\s+us\s+on",
        r"skip\s+to\s+(main\s+)?content",
        r"toggle\s+(navigation|menu)",
        r"loading\.\.\.",
        r"please\s+enable\s+javascript",
    ]

    def __init__(self, remove_boilerplate: bool = True):
        super().__init__()
        self.remove_boilerplate = remove_boilerplate
        self._compiled_patterns = [
            re.compile(p, re.IGNORECASE) for p in self.BOILERPLATE_PATTERNS
        ]
        self._content_hashes: Set[str] = set()

    async def execute(self, result: ScrapeResult) -> ScrapeResult:
        """Clean and normalize a ScrapeResult's text content."""
        self.stats["tasks_received"] += 1

        if not result.clean_text:
            self.stats["tasks_failed"] += 1
            return result

        try:
            text = result.clean_text

            # ── Unicode normalization ──
            import unicodedata
            text = unicodedata.normalize("NFKC", text)

            # ── Smart quote / dash normalization ──
            replacements = {
                "\u2018": "'", "\u2019": "'",  # Smart single quotes
                "\u201c": '"', "\u201d": '"',  # Smart double quotes
                "\u2013": "-", "\u2014": "--",  # En/em dashes
                "\u2026": "...",  # Ellipsis
                "\u00a0": " ",  # Non-breaking space
                "\u200b": "",  # Zero-width space
                "\u200e": "",  # LTR mark
                "\u200f": "",  # RTL mark
                "\ufeff": "",  # BOM
            }
            for old, new in replacements.items():
                text = text.replace(old, new)

            # ── Whitespace normalization ──
            # Collapse multiple spaces to single space per line
            lines = text.splitlines()
            lines = [re.sub(r" {2,}", " ", line.strip()) for line in lines]
            # Remove completely empty lines that exceed 2 consecutive
            collapsed = []
            blank_count = 0
            for line in lines:
                if not line:
                    blank_count += 1
                    if blank_count <= 2:
                        collapsed.append(line)
                else:
                    blank_count = 0
                    collapsed.append(line)
            text = "\n".join(collapsed).strip()

            # ── Boilerplate removal ──
            if self.remove_boilerplate:
                text = self._strip_boilerplate(text)

            result.clean_text = text

            # ── Also clean the markdown ──
            if result.markdown:
                md = result.markdown
                for old, new in replacements.items():
                    md = md.replace(old, new)
                md = re.sub(r"\n{3,}", "\n\n", md)
                result.markdown = md.strip()

            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"Clean error for {result.url}: {e}")
            self.stats["tasks_failed"] += 1

        return result

    def _strip_boilerplate(self, text: str) -> str:
        """Remove lines matching common boilerplate patterns."""
        lines = text.splitlines()
        cleaned = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                cleaned.append(line)
                continue
            # Skip short lines that match boilerplate
            if len(stripped) < 200:
                is_boilerplate = any(
                    p.search(stripped) for p in self._compiled_patterns
                )
                if is_boilerplate:
                    continue
            cleaned.append(line)
        return "\n".join(cleaned)

    def is_duplicate(self, result: ScrapeResult) -> bool:
        """Check if this content has been seen before (cross-page dedup)."""
        if not result.clean_text:
            return False
        content_hash = hashlib.sha256(
            result.clean_text.encode()
        ).hexdigest()[:24]
        if content_hash in self._content_hashes:
            return True
        self._content_hashes.add(content_hash)
        return False

    def quality_score(self, result: ScrapeResult) -> float:
        """
        Score content quality 0.0–1.0 based on heuristics.
        Higher = better quality content.
        """
        if not result.clean_text:
            return 0.0

        text = result.clean_text
        score = 0.0
        factors = 0

        # Length factor — penalize very short or very long
        length = len(text)
        if 200 < length < 50000:
            score += 0.8
        elif 50 < length <= 200:
            score += 0.4
        elif length >= 50000:
            score += 0.6
        factors += 1

        # Sentence structure — paragraphs with periods
        sentences = re.split(r"[.!?]+", text)
        avg_sentence_len = (
            sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
        )
        if 8 < avg_sentence_len < 40:
            score += 0.8
        elif 5 <= avg_sentence_len <= 8:
            score += 0.5
        factors += 1

        # Has title
        if result.title:
            score += 1.0
        factors += 1

        # Has meta description
        if result.meta_description:
            score += 0.5
        factors += 1

        # Low boilerplate ratio
        boilerplate_matches = sum(
            1 for line in text.splitlines()
            if any(p.search(line) for p in self._compiled_patterns)
        )
        total_lines = max(len(text.splitlines()), 1)
        boilerplate_ratio = boilerplate_matches / total_lines
        if boilerplate_ratio < 0.1:
            score += 1.0
        elif boilerplate_ratio < 0.3:
            score += 0.5
        factors += 1

        return round(score / max(factors, 1), 3)


# ═════════════════════════════════════════════════════════════════════════
#  11) LIL_API_HAWK — REST / GraphQL Endpoint Scraping
# ═════════════════════════════════════════════════════════════════════════

class LilAPIHawk(BaseLilHawk):
    """
    Scrapes REST and GraphQL API endpoints directly.
    Handles authentication (Bearer, API key, Basic),
    pagination, rate-limit response headers, and
    structured JSON extraction.
    """
    hawk_name = "Lil_API_Hawk"
    hawk_color = "#7C4DFF"  # API Purple

    def __init__(self):
        super().__init__()
        self._auth_configs: Dict[str, Dict[str, Any]] = {}

    def register_auth(
        self,
        domain: str,
        auth_type: str = "bearer",  # "bearer", "api_key", "basic", "header"
        token: Optional[str] = None,
        api_key: Optional[str] = None,
        api_key_param: str = "api_key",  # query param name or header name
        api_key_location: str = "header",  # "header" or "query"
        username: Optional[str] = None,
        password: Optional[str] = None,
        custom_headers: Optional[Dict[str, str]] = None,
    ):
        """Register authentication config for a domain."""
        self._auth_configs[domain] = {
            "auth_type": auth_type,
            "token": token,
            "api_key": api_key,
            "api_key_param": api_key_param,
            "api_key_location": api_key_location,
            "username": username,
            "password": password,
            "custom_headers": custom_headers or {},
        }
        self.logger.info(f"Auth registered for domain: {domain} ({auth_type})")

    async def execute(
        self,
        url: str,
        session: aiohttp.ClientSession,
        method: str = "GET",
        params: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        paginate: bool = False,
        pagination_key: str = "next",  # JSON key or Link header
        pagination_type: str = "url",  # "url", "cursor", "offset"
        max_pages: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Make an API request and return parsed JSON responses.
        Supports pagination to collect all results.
        """
        self.stats["tasks_received"] += 1
        all_results: List[Dict[str, Any]] = []
        current_url = url
        page = 0

        try:
            while current_url and page < max_pages:
                req_headers = self._build_headers(current_url, headers)
                req_params = params.copy() if params else {}

                kwargs: Dict[str, Any] = {
                    "headers": req_headers,
                    "timeout": aiohttp.ClientTimeout(total=30),
                    "ssl": False,
                }

                if method.upper() == "GET":
                    if req_params:
                        kwargs["params"] = req_params
                    async with session.get(current_url, **kwargs) as resp:
                        data = await self._handle_response(resp, current_url)
                elif method.upper() == "POST":
                    if body:
                        kwargs["json"] = body
                    async with session.post(current_url, **kwargs) as resp:
                        data = await self._handle_response(resp, current_url)
                else:
                    self.logger.error(f"Unsupported method: {method}")
                    break

                if data is None:
                    break

                all_results.append(data)
                page += 1

                if not paginate:
                    break

                # Determine next page URL
                current_url = self._get_next_page(
                    data, current_url, pagination_key,
                    pagination_type, params, page
                )

            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"API request error for {url}: {e}")
            self.stats["tasks_failed"] += 1
            all_results.append({"error": str(e)})

        return all_results

    async def graphql(
        self,
        endpoint: str,
        session: aiohttp.ClientSession,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a GraphQL query."""
        self.stats["tasks_received"] += 1

        body = {"query": query}
        if variables:
            body["variables"] = variables

        try:
            headers = self._build_headers(endpoint)
            headers["Content-Type"] = "application/json"

            async with session.post(
                endpoint, json=body, headers=headers,
                timeout=aiohttp.ClientTimeout(total=30), ssl=True,
            ) as resp:
                data = await self._handle_response(resp, endpoint)
                self.stats["tasks_completed"] += 1
                return data or {"error": f"HTTP {resp.status}"}

        except Exception as e:
            self.logger.error(f"GraphQL error for {endpoint}: {e}")
            self.stats["tasks_failed"] += 1
            return {"error": str(e)}

    def _build_headers(
        self, url: str, extra: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """Build request headers with auth for the given URL's domain."""
        parsed = urlparse(url)
        domain = parsed.netloc
        headers = {
            "Accept": "application/json",
            "User-Agent": "Lil_API_Hawk/1.0 (ACHIEVEMOR Sqwaadrun)",
        }

        # Apply auth if registered
        auth = self._auth_configs.get(domain)
        if auth:
            auth_type = auth["auth_type"]
            if auth_type == "bearer" and auth.get("token"):
                headers["Authorization"] = f"Bearer {auth['token']}"
            elif auth_type == "api_key":
                if auth.get("api_key_location") == "header":
                    param_name = auth.get("api_key_param", "X-API-Key")
                    headers[param_name] = auth.get("api_key", "")
                # query-param api keys are handled in execute()
            elif auth_type == "basic" and auth.get("username"):
                import base64
                creds = base64.b64encode(
                    f"{auth['username']}:{auth.get('password', '')}".encode()
                ).decode()
                headers["Authorization"] = f"Basic {creds}"

            # Custom headers
            if auth.get("custom_headers"):
                headers.update(auth["custom_headers"])

        if extra:
            headers.update(extra)
        return headers

    async def _handle_response(
        self, resp: aiohttp.ClientResponse, url: str
    ) -> Optional[Dict[str, Any]]:
        """Parse JSON response with error handling."""
        if resp.status == 429:
            retry_after = int(resp.headers.get("Retry-After", 5))
            self.logger.warning(f"API rate-limited on {url}, waiting {retry_after}s")
            await asyncio.sleep(retry_after)
            return None

        if resp.status >= 400:
            error_text = await resp.text()
            self.logger.error(f"API error {resp.status} for {url}: {error_text[:200]}")
            return {"error": f"HTTP {resp.status}", "body": error_text[:500]}

        try:
            return await resp.json()
        except Exception:
            text = await resp.text()
            return {"raw_text": text}

    def _get_next_page(
        self,
        data: Dict[str, Any],
        current_url: str,
        pagination_key: str,
        pagination_type: str,
        params: Optional[Dict[str, str]],
        page: int,
    ) -> Optional[str]:
        """Determine the next page URL for pagination."""
        if pagination_type == "url":
            # Look for a direct URL in the response
            next_url = self._deep_get(data, pagination_key)
            return next_url if isinstance(next_url, str) else None

        elif pagination_type == "cursor":
            cursor = self._deep_get(data, pagination_key)
            if cursor:
                parsed = urlparse(current_url)
                existing_params = parse_qs(parsed.query)
                existing_params["cursor"] = [str(cursor)]
                new_query = urlencode(existing_params, doseq=True)
                return parsed._replace(query=new_query).geturl()
            return None

        elif pagination_type == "offset":
            # Simple page number increment
            parsed = urlparse(current_url)
            existing_params = parse_qs(parsed.query)
            existing_params["page"] = [str(page + 1)]
            new_query = urlencode(existing_params, doseq=True)
            return parsed._replace(query=new_query).geturl()

        return None

    @staticmethod
    def _deep_get(data: Dict[str, Any], dotted_key: str) -> Any:
        """Get a nested value using dot notation (e.g., 'meta.next_url')."""
        keys = dotted_key.split(".")
        current = data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current


# ═════════════════════════════════════════════════════════════════════════
#  12) LIL_QUEUE_HAWK — Priority Job Queue with Retry Scheduling
# ═════════════════════════════════════════════════════════════════════════

class LilQueueHawk(BaseLilHawk):
    """
    Job queue manager for the Sqwaadrun. Handles:
      - Priority-based job ordering
      - Scheduled/delayed execution
      - Retry logic with exponential backoff
      - Job status tracking
      - Batch job submission
      - Concurrent worker pool management
    """
    hawk_name = "Lil_Queue_Hawk"
    hawk_color = "#18FFFF"  # Queue Cyan

    def __init__(self, max_workers: int = 5):
        super().__init__()
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._max_workers = max_workers
        self._active_jobs: Dict[str, QueueJob] = {}
        self._completed_jobs: List[QueueJob] = []
        self._job_counter = 0
        self._workers_running = False
        self._lock = asyncio.Lock()

    async def execute(
        self, job: Optional[QueueJob] = None, **kwargs
    ) -> Optional[QueueJob]:
        """Submit a job to the queue. Returns the job with its ID."""
        self.stats["tasks_received"] += 1

        if job is None:
            # Create from kwargs
            self._job_counter += 1
            job = QueueJob(
                job_id=f"JOB-{self._job_counter:06d}",
                url=kwargs.get("url", ""),
                priority=kwargs.get("priority", 5),
                job_type=kwargs.get("job_type", "scrape"),
                payload=kwargs.get("payload", {}),
            )

        await self._queue.put((job.priority, time.monotonic(), job))
        self.logger.info(
            f"Job {job.job_id} queued (priority={job.priority}, type={job.job_type})"
        )
        self.stats["tasks_completed"] += 1
        return job

    async def submit_batch(self, jobs: List[QueueJob]) -> List[QueueJob]:
        """Submit multiple jobs at once."""
        for job in jobs:
            await self.execute(job)
        return jobs

    async def process_queue(
        self,
        handler: Callable[[QueueJob], Any],
        stop_when_empty: bool = True,
    ):
        """
        Process all jobs in the queue using the provided handler function.
        The handler receives a QueueJob and should return a result dict.
        """
        self._workers_running = True
        workers = []

        for i in range(self._max_workers):
            worker = asyncio.create_task(
                self._worker(f"Worker-{i+1}", handler, stop_when_empty)
            )
            workers.append(worker)

        await asyncio.gather(*workers)
        self._workers_running = False
        self.logger.info(
            f"Queue processing complete. "
            f"{len(self._completed_jobs)} jobs processed."
        )

    async def _worker(
        self,
        worker_name: str,
        handler: Callable[[QueueJob], Any],
        stop_when_empty: bool,
    ):
        """Individual worker coroutine that pulls from the queue."""
        while True:
            try:
                if stop_when_empty and self._queue.empty():
                    break

                priority, ts, job = await asyncio.wait_for(
                    self._queue.get(), timeout=2.0
                )
            except asyncio.TimeoutError:
                if stop_when_empty:
                    break
                continue

            # Check scheduled time
            if job.scheduled_at:
                scheduled = datetime.fromisoformat(job.scheduled_at)
                now = datetime.now(timezone.utc)
                if scheduled > now:
                    delay = (scheduled - now).total_seconds()
                    if delay > 0:
                        await asyncio.sleep(min(delay, 60))
                        if delay > 60:
                            # Re-queue if still far out
                            await self._queue.put((priority, ts, job))
                            continue

            job.status = "running"
            async with self._lock:
                self._active_jobs[job.job_id] = job

            try:
                result = await handler(job)
                job.status = "done"
                job.result = result if isinstance(result, dict) else {"data": result}
                job.completed_at = datetime.now(timezone.utc).isoformat()

            except Exception as e:
                self.logger.error(f"{worker_name}: Job {job.job_id} failed: {e}")
                job.error = str(e)

                if job.retries_left > 0:
                    job.retries_left -= 1
                    job.status = "retry"
                    # Exponential backoff
                    backoff = 2 ** (3 - job.retries_left)
                    await asyncio.sleep(backoff)
                    await self._queue.put((priority + 1, time.monotonic(), job))
                    continue
                else:
                    job.status = "failed"

            async with self._lock:
                self._active_jobs.pop(job.job_id, None)
                self._completed_jobs.append(job)

            self._queue.task_done()

    def get_stats(self) -> Dict[str, Any]:
        """Return queue statistics."""
        return {
            "queued": self._queue.qsize(),
            "active": len(self._active_jobs),
            "completed": len(
                [j for j in self._completed_jobs if j.status == "done"]
            ),
            "failed": len(
                [j for j in self._completed_jobs if j.status == "failed"]
            ),
            "total_processed": len(self._completed_jobs),
        }

    def get_completed_jobs(
        self, status: Optional[str] = None
    ) -> List[QueueJob]:
        """Retrieve completed jobs, optionally filtered by status."""
        if status:
            return [j for j in self._completed_jobs if j.status == status]
        return self._completed_jobs.copy()


# ═════════════════════════════════════════════════════════════════════════
#  EXPANDED SQWAADRUN — Full 12-Hawk Coordinator
# ═════════════════════════════════════════════════════════════════════════

class ExpandedScrappHawkSquadrun(ScrappHawkSquadrun):
    """
    The full 12-Hawk Sqwaadrun. Extends the base 6-Hawk squad
    with extraction, feed parsing, change detection, cleaning,
    API scraping, and job queue management.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # ── Expansion Hawks ──
        self.extractor = LilExtractHawk()
        self.feeder = LilFeedHawk()
        self.differ = LilDiffHawk(
            history_dir=kwargs.get("diff_history_dir", "./diff_history")
        )
        self.cleaner = LilCleanHawk(
            remove_boilerplate=kwargs.get("remove_boilerplate", True)
        )
        self.api_hawk = LilAPIHawk()
        self.queue_hawk = LilQueueHawk(
            max_workers=kwargs.get("queue_workers", 5)
        )

        self._expansion_hawks: List[BaseLilHawk] = [
            self.extractor, self.feeder, self.differ,
            self.cleaner, self.api_hawk, self.queue_hawk,
        ]
        self._hawks.extend(self._expansion_hawks)

    async def startup(self):
        """Bring all 12 Hawks online."""
        await super().startup()
        for hawk in self._expansion_hawks:
            await hawk.startup()
        self.logger.info("═══ Expansion Hawks online. Full Sqwaadrun ready. ═══")

    async def shutdown(self):
        """Stand down all 12 Hawks."""
        for hawk in reversed(self._expansion_hawks):
            await hawk.shutdown()
        await super().shutdown()

    # ── Enhanced scrape with cleaning pipeline ──

    async def scrape_clean(
        self,
        url: str,
        use_cache: bool = True,
        extract_schema: Optional[ExtractionSchema] = None,
        monitor_changes: bool = False,
    ) -> Dict[str, Any]:
        """
        Full pipeline: Scrape → Parse → Clean → (Extract) → (Diff) → Store.
        Returns a rich dict with all outputs.
        """
        output: Dict[str, Any] = {}

        # Base scrape
        result = await self.scrape(url, use_cache=use_cache)
        output["scrape"] = result.to_dict()

        # Clean
        if result.clean_text:
            result = await self.cleaner.execute(result)
            output["quality_score"] = self.cleaner.quality_score(result)
            output["is_duplicate"] = self.cleaner.is_duplicate(result)

        # Extract structured data
        if extract_schema and result.raw_html:
            extracted = await self.extractor.execute(result, schema=extract_schema)
            output["extracted"] = extracted

        # Change detection
        if monitor_changes:
            diff = await self.differ.execute(result)
            output["diff"] = asdict(diff)

        return output

    # ── Feed discovery & scraping ──

    async def discover_and_parse_feeds(
        self, url: str, max_entries: int = 50
    ) -> Dict[str, Any]:
        """Scrape a page, discover its feeds, then parse them all."""
        result = await self.scrape(url)
        feeds_discovered = await self.feeder.discover_feeds(result)

        all_entries: List[Dict[str, Any]] = []
        for feed_info in feeds_discovered:
            entries = await self.feeder.execute(
                feed_info["url"], self.scrapper._session,
                self.guard, max_entries
            )
            for entry in entries:
                all_entries.append(asdict(entry))

        return {
            "page_url": url,
            "feeds_discovered": feeds_discovered,
            "entries": all_entries,
            "total_entries": len(all_entries),
        }

    # ── API endpoint scraping ──

    async def scrape_api(
        self,
        url: str,
        method: str = "GET",
        params: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        paginate: bool = False,
        max_pages: int = 10,
    ) -> List[Dict[str, Any]]:
        """Scrape a REST API endpoint through Lil_API_Hawk."""
        return await self.api_hawk.execute(
            url, self.scrapper._session,
            method=method, params=params, body=body,
            paginate=paginate, max_pages=max_pages,
        )

    # ── Queued batch operations ──

    async def queued_crawl(
        self,
        urls: List[str],
        priorities: Optional[List[int]] = None,
    ) -> List[QueueJob]:
        """Submit multiple URLs as queued jobs with priorities."""
        jobs = []
        for i, url in enumerate(urls):
            priority = priorities[i] if priorities and i < len(priorities) else 5
            job = QueueJob(
                job_id=f"CRAWL-{i+1:04d}",
                url=url,
                priority=priority,
                job_type="scrape",
            )
            jobs.append(job)

        await self.queue_hawk.submit_batch(jobs)

        # Process with the scrape handler
        async def _scrape_handler(job: QueueJob) -> Dict[str, Any]:
            result = await self.scrape(job.url)
            return result.to_dict()

        await self.queue_hawk.process_queue(_scrape_handler)
        return self.queue_hawk.get_completed_jobs()

    # ── Table extraction shortcut ──

    async def extract_tables(self, url: str) -> List[List[List[str]]]:
        """Scrape a page and extract all HTML tables."""
        result = await self.scrape(url)
        return await self.extractor.extract_tables(result)

    # ── Full roster ──

    def roster_report(self) -> str:
        """Print the expanded 12-Hawk Sqwaadrun roster."""
        lines = [
            "╔══════════════════════════════════════════════════════════════════╗",
            "║     LIL_SCRAPP_HAWK SQWAADRUN — EXPANDED ROSTER (12 Hawks)     ║",
            "╠══════════════════════════════════════════════════════════════════╣",
            "║  ─── CORE HAWKS ───                                            ║",
        ]
        core = [self.guard, self.scrapper, self.parser, self.crawler, self.snapper, self.store]
        for hawk in core:
            status = "ACTIVE" if hawk._active else "STANDBY"
            if hawk is self.snapper and not self.snapper.is_available:
                status = "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<22s} {status:<8s} "
                f"Done:{hawk.stats['tasks_completed']:<4d} "
                f"Fail:{hawk.stats['tasks_failed']:<4d}   ║"
            )
        lines.append("║  ─── EXPANSION HAWKS ───                                        ║")
        for hawk in self._expansion_hawks:
            status = "ACTIVE" if hawk._active else "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<22s} {status:<8s} "
                f"Done:{hawk.stats['tasks_completed']:<4d} "
                f"Fail:{hawk.stats['tasks_failed']:<4d}   ║"
            )
        lines.append(
            "╚══════════════════════════════════════════════════════════════════╝"
        )
        return "\n".join(lines)



# ═════════════════════════════════════════════════════════════════════════
#  13) LIL_SITEMAP_HAWK — Deep XML Sitemap Specialist
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class SitemapEntry:
    """A single entry from a parsed sitemap."""
    loc: str
    lastmod: Optional[str] = None
    changefreq: Optional[str] = None  # always, hourly, daily, weekly, monthly, yearly, never
    priority: float = 0.5
    images: List[str] = field(default_factory=list)
    news_title: Optional[str] = None
    news_publication_date: Optional[str] = None
    video_title: Optional[str] = None
    video_thumbnail: Optional[str] = None
    source_sitemap: str = ""


class LilSitemapHawk(BaseLilHawk):
    """
    Dedicated sitemap specialist. Goes far deeper than Lil_Crawl_Hawk's
    basic sitemap support. Handles:
      - Sitemap index recursion (nested sitemaps)
      - lastmod filtering (only pages changed after a cutoff)
      - Priority-based ordering from <priority> tags
      - changefreq awareness for scheduling intelligence
      - Image sitemaps (<image:image>)
      - Video sitemaps (<video:video>)
      - News sitemaps (<news:news>)
      - Auto-discovery from robots.txt
      - gzip-compressed sitemaps (.xml.gz)
      - Plain text sitemap format (one URL per line)
    """
    hawk_name = "Lil_Sitemap_Hawk"
    hawk_color = "#FFC107"  # Sitemap Amber

    CHANGEFREQ_HOURS = {
        "always": 0, "hourly": 1, "daily": 24, "weekly": 168,
        "monthly": 720, "yearly": 8760, "never": 999999,
    }

    def __init__(self):
        super().__init__()
        self._discovered: Set[str] = set()

    async def execute(
        self,
        base_url: str,
        session: aiohttp.ClientSession,
        guard: "LilGuardHawk",
        lastmod_after: Optional[str] = None,
        min_priority: float = 0.0,
        changefreq_filter: Optional[List[str]] = None,
        max_entries: int = 10000,
    ) -> List[SitemapEntry]:
        """
        Discover and parse all sitemaps for a domain.
        Returns a list of SitemapEntry objects, sorted by priority (highest first).
        """
        self.stats["tasks_received"] += 1
        all_entries: List[SitemapEntry] = []

        try:
            # Step 1: Discover sitemap URLs from robots.txt
            sitemap_urls = await self._discover_from_robots(base_url, session, guard)

            # Fallback: common sitemap locations
            if not sitemap_urls:
                parsed = urlparse(base_url)
                origin = f"{parsed.scheme}://{parsed.netloc}"
                sitemap_urls = [
                    f"{origin}/sitemap.xml",
                    f"{origin}/sitemap_index.xml",
                    f"{origin}/sitemap/sitemap.xml",
                    f"{origin}/wp-sitemap.xml",
                ]

            # Step 2: Parse each discovered sitemap (recursively for indexes)
            for sm_url in sitemap_urls:
                if len(all_entries) >= max_entries:
                    break
                entries = await self._parse_sitemap(
                    sm_url, session, guard, max_entries - len(all_entries)
                )
                all_entries.extend(entries)

            # Step 3: Apply filters
            filtered = self._apply_filters(
                all_entries, lastmod_after, min_priority, changefreq_filter
            )

            # Step 4: Sort by priority (highest first)
            filtered.sort(key=lambda e: e.priority, reverse=True)

            self.stats["tasks_completed"] += 1
            self.logger.info(
                f"Sitemap discovery: {len(all_entries)} total, "
                f"{len(filtered)} after filters"
            )
            return filtered

        except Exception as e:
            self.logger.error(f"Sitemap discovery error for {base_url}: {e}")
            self.stats["tasks_failed"] += 1
            return all_entries

    async def _discover_from_robots(
        self, base_url: str, session: aiohttp.ClientSession,
        guard: "LilGuardHawk",
    ) -> List[str]:
        """Parse robots.txt for Sitemap: directives."""
        parsed = urlparse(base_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        sitemap_urls = []

        try:
            headers = guard.get_headers()
            async with session.get(
                robots_url, headers=headers,
                timeout=aiohttp.ClientTimeout(total=10), ssl=True,
            ) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    for line in text.splitlines():
                        line = line.strip()
                        if line.lower().startswith("sitemap:"):
                            url = line.split(":", 1)[1].strip()
                            if url:
                                sitemap_urls.append(url)
        except Exception as e:
            self.logger.debug(f"robots.txt fetch failed: {e}")

        return sitemap_urls

    async def _parse_sitemap(
        self, url: str, session: aiohttp.ClientSession,
        guard: "LilGuardHawk", max_entries: int,
    ) -> List[SitemapEntry]:
        """Recursively parse a sitemap URL (handles indexes and gzip)."""
        entries: List[SitemapEntry] = []

        if url in self._discovered:
            return entries
        self._discovered.add(url)

        try:
            headers = guard.get_headers()
            async with session.get(
                url, headers=headers,
                timeout=aiohttp.ClientTimeout(total=20), ssl=True,
            ) as resp:
                if resp.status != 200:
                    return entries

                content_type = resp.headers.get("Content-Type", "")
                body = await resp.read()

                # Handle gzip
                if url.endswith(".gz") or "gzip" in content_type:
                    import gzip
                    try:
                        body = gzip.decompress(body)
                    except Exception:
                        pass

                text = body.decode("utf-8", errors="replace")

            # Detect format
            if text.strip().startswith("<?xml") or "<urlset" in text[:500] or "<sitemapindex" in text[:500]:
                return await self._parse_xml_sitemap(text, url, session, guard, max_entries)
            else:
                # Plain text format — one URL per line
                for line in text.splitlines():
                    line = line.strip()
                    if line and line.startswith("http"):
                        entries.append(SitemapEntry(loc=line, source_sitemap=url))
                        if len(entries) >= max_entries:
                            break

        except Exception as e:
            self.logger.warning(f"Sitemap parse error for {url}: {e}")

        return entries

    async def _parse_xml_sitemap(
        self, text: str, source_url: str,
        session: aiohttp.ClientSession, guard: "LilGuardHawk",
        max_entries: int,
    ) -> List[SitemapEntry]:
        """Parse an XML sitemap or sitemap index."""
        entries: List[SitemapEntry] = []
        soup = BeautifulSoup(text, "lxml-xml")

        # Check if this is a sitemap index
        sitemap_tags = soup.find_all("sitemap")
        if sitemap_tags:
            for sm in sitemap_tags:
                if len(entries) >= max_entries:
                    break
                loc = sm.find("loc")
                if loc and loc.string:
                    child_url = loc.string.strip()
                    child_entries = await self._parse_sitemap(
                        child_url, session, guard, max_entries - len(entries)
                    )
                    entries.extend(child_entries)
            return entries

        # Regular URL sitemap
        for url_tag in soup.find_all("url"):
            if len(entries) >= max_entries:
                break

            loc = url_tag.find("loc")
            if not loc or not loc.string:
                continue

            entry = SitemapEntry(
                loc=loc.string.strip(),
                source_sitemap=source_url,
            )

            lastmod = url_tag.find("lastmod")
            if lastmod and lastmod.string:
                entry.lastmod = lastmod.string.strip()

            changefreq = url_tag.find("changefreq")
            if changefreq and changefreq.string:
                entry.changefreq = changefreq.string.strip().lower()

            priority_tag = url_tag.find("priority")
            if priority_tag and priority_tag.string:
                try:
                    entry.priority = float(priority_tag.string.strip())
                except ValueError:
                    pass

            # Image sitemap extensions
            for img in url_tag.find_all("image:loc"):
                if img.string:
                    entry.images.append(img.string.strip())

            # News sitemap extensions
            news = url_tag.find("news:news")
            if news:
                title = news.find("news:title")
                if title and title.string:
                    entry.news_title = title.string.strip()
                pub_date = news.find("news:publication_date")
                if pub_date and pub_date.string:
                    entry.news_publication_date = pub_date.string.strip()

            # Video sitemap extensions
            video = url_tag.find("video:video")
            if video:
                vtitle = video.find("video:title")
                if vtitle and vtitle.string:
                    entry.video_title = vtitle.string.strip()
                thumb = video.find("video:thumbnail_loc")
                if thumb and thumb.string:
                    entry.video_thumbnail = thumb.string.strip()

            entries.append(entry)

        return entries

    def _apply_filters(
        self, entries: List[SitemapEntry],
        lastmod_after: Optional[str],
        min_priority: float,
        changefreq_filter: Optional[List[str]],
    ) -> List[SitemapEntry]:
        """Filter entries by lastmod, priority, and changefreq."""
        filtered = []
        for entry in entries:
            # Priority filter
            if entry.priority < min_priority:
                continue

            # lastmod filter
            if lastmod_after and entry.lastmod:
                try:
                    # Handle various date formats
                    cutoff = lastmod_after.replace("Z", "+00:00")
                    entry_date = entry.lastmod.replace("Z", "+00:00")
                    if entry_date < cutoff:
                        continue
                except (ValueError, TypeError):
                    pass

            # changefreq filter
            if changefreq_filter and entry.changefreq:
                if entry.changefreq not in changefreq_filter:
                    continue

            filtered.append(entry)
        return filtered

    def to_scrape_targets(
        self, entries: List[SitemapEntry], max_depth: int = 3
    ) -> List[ScrapeTarget]:
        """Convert sitemap entries into ScrapeTargets for the pipeline."""
        targets = []
        for entry in entries:
            targets.append(ScrapeTarget(
                url=entry.loc,
                depth=0,
                max_depth=max_depth,
                priority=int((1.0 - entry.priority) * 10),  # Invert: high sitemap priority = low queue number
                metadata={
                    "lastmod": entry.lastmod,
                    "changefreq": entry.changefreq,
                    "sitemap_priority": entry.priority,
                    "source_sitemap": entry.source_sitemap,
                },
            ))
        return targets


# ═════════════════════════════════════════════════════════════════════════
#  14) LIL_STEALTH_HAWK — Anti-Detection & Session Management
# ═════════════════════════════════════════════════════════════════════════

class LilStealthHawk(BaseLilHawk):
    """
    Advanced anti-detection layer. Sits between Lil_Guard_Hawk and
    Lil_Scrapp_Hawk to make requests look organic:
      - Browser-realistic header ordering
      - Referrer chain building (mimic navigation paths)
      - Cookie jar management per domain
      - Request timing jitter (human-like random delays)
      - Session persistence across requests to same domain
      - Bot detection signal flagging (Cloudflare, Akamai, etc.)
      - Accept-Language rotation matching User-Agent locale
    """
    hawk_name = "Lil_Stealth_Hawk"
    hawk_color = "#607D8B"  # Stealth Gray

    # Browser fingerprint profiles — headers in realistic order
    BROWSER_PROFILES = {
        "chrome_win": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Cache-Control": "max-age=0",
            "Sec-Ch-Ua": '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        },
        "chrome_mac": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Sec-Ch-Ua": '"Chromium";v="125", "Not.A/Brand";v="24", "Google Chrome";v="125"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        },
        "firefox_linux": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Priority": "u=0, i",
        },
        "safari_mac": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
        },
    }

    # Bot detection signals to flag
    BOT_DETECTION_SIGNALS = [
        r"cf-ray",  # Cloudflare
        r"cf-mitigated",
        r"__cf_bm",
        r"akamai",
        r"captcha",
        r"recaptcha",
        r"hcaptcha",
        r"challenge-platform",
        r"just a moment",  # Cloudflare interstitial
        r"attention required",
        r"access denied",
        r"403 forbidden",
        r"please verify you are a human",
        r"bot detection",
    ]

    def __init__(self, jitter_range: Tuple[float, float] = (0.5, 3.0)):
        super().__init__()
        self.jitter_range = jitter_range
        self._cookie_jars: Dict[str, Dict[str, str]] = {}
        self._session_profiles: Dict[str, str] = {}  # domain -> profile_name
        self._referrer_chains: Dict[str, List[str]] = {}  # domain -> [url history]
        self._compiled_signals = [
            re.compile(p, re.IGNORECASE) for p in self.BOT_DETECTION_SIGNALS
        ]

    async def execute(
        self, target: ScrapeTarget
    ) -> Dict[str, Any]:
        """
        Prepare stealth headers and timing for a request.
        Returns dict with headers, cookies, delay, and profile info.
        """
        self.stats["tasks_received"] += 1
        domain = target.domain

        # Pick or maintain a consistent browser profile per domain
        if domain not in self._session_profiles:
            profile_name = random.choice(list(self.BROWSER_PROFILES.keys()))
            self._session_profiles[domain] = profile_name
        else:
            profile_name = self._session_profiles[domain]

        profile = self.BROWSER_PROFILES[profile_name].copy()

        # Add referrer from chain
        if domain in self._referrer_chains and self._referrer_chains[domain]:
            profile["Referer"] = self._referrer_chains[domain][-1]

        # Add cookies
        cookies = self._cookie_jars.get(domain, {})

        # Human-like timing jitter
        delay = random.uniform(*self.jitter_range)

        self.stats["tasks_completed"] += 1
        return {
            "headers": profile,
            "cookies": cookies,
            "delay": delay,
            "profile": profile_name,
            "domain": domain,
        }

    def update_cookies(self, domain: str, response_headers: Dict[str, str]):
        """Extract and store cookies from response headers."""
        if domain not in self._cookie_jars:
            self._cookie_jars[domain] = {}

        set_cookie = response_headers.get("Set-Cookie", "")
        if set_cookie:
            # Simple cookie parsing — name=value from first segment
            for cookie_str in set_cookie.split(","):
                parts = cookie_str.strip().split(";")[0]
                if "=" in parts:
                    name, value = parts.split("=", 1)
                    self._cookie_jars[domain][name.strip()] = value.strip()

    def update_referrer_chain(self, domain: str, url: str, max_chain: int = 5):
        """Track navigation path per domain for referrer building."""
        if domain not in self._referrer_chains:
            self._referrer_chains[domain] = []
        self._referrer_chains[domain].append(url)
        # Keep chain bounded
        if len(self._referrer_chains[domain]) > max_chain:
            self._referrer_chains[domain] = self._referrer_chains[domain][-max_chain:]

    def detect_bot_protection(self, result: ScrapeResult) -> Dict[str, Any]:
        """
        Analyze a response for bot detection signals.
        Returns dict with detected: bool and signals: list.
        """
        signals_found = []
        check_text = (result.raw_html or "") + str(result.headers)

        for pattern in self._compiled_signals:
            if pattern.search(check_text):
                signals_found.append(pattern.pattern)

        # Check status codes
        if result.status_code == 403:
            signals_found.append("http_403")
        if result.status_code == 503:
            signals_found.append("http_503_possible_challenge")

        # Check for challenge pages (very short body with script)
        if result.raw_html and len(result.raw_html) < 5000:
            if "<script" in result.raw_html and ("challenge" in result.raw_html.lower() or "ray" in result.raw_html.lower()):
                signals_found.append("challenge_page_detected")

        return {
            "detected": len(signals_found) > 0,
            "signals": signals_found,
            "recommendation": "rotate_proxy" if signals_found else "clear",
        }


# ═════════════════════════════════════════════════════════════════════════
#  15) LIL_SCHEMA_HAWK — Deep Structured Data / Schema.org Extraction
# ═════════════════════════════════════════════════════════════════════════

class LilSchemaHawk(BaseLilHawk):
    """
    Deep structured data extraction beyond Lil_Parse_Hawk's basics.
    Handles:
      - JSON-LD with @graph support and nested objects
      - Microdata (itemscope/itemprop) full tree extraction
      - RDFa attributes
      - OpenGraph extended properties
      - Dublin Core metadata
      - Schema.org type identification and normalization
      - Meta tag harvesting (all meta tags, not just description/OG)
    """
    hawk_name = "Lil_Schema_Hawk"
    hawk_color = "#E91E63"  # Schema Pink

    def __init__(self):
        super().__init__()

    async def execute(self, result: ScrapeResult) -> Dict[str, Any]:
        """
        Extract all structured data from a page.
        Returns a comprehensive dict of all structured data found.
        """
        self.stats["tasks_received"] += 1
        output: Dict[str, Any] = {"url": result.url, "schemas_found": []}

        if not result.raw_html:
            self.stats["tasks_failed"] += 1
            return output

        try:
            soup = BeautifulSoup(result.raw_html, "lxml")

            # JSON-LD (deep)
            json_ld = self._extract_json_ld(soup)
            if json_ld:
                output["json_ld"] = json_ld
                output["schemas_found"].append("json_ld")

            # Microdata
            microdata = self._extract_microdata(soup)
            if microdata:
                output["microdata"] = microdata
                output["schemas_found"].append("microdata")

            # RDFa
            rdfa = self._extract_rdfa(soup)
            if rdfa:
                output["rdfa"] = rdfa
                output["schemas_found"].append("rdfa")

            # OpenGraph (extended)
            og = self._extract_opengraph_extended(soup)
            if og:
                output["opengraph"] = og
                output["schemas_found"].append("opengraph")

            # Twitter Card (extended)
            twitter = self._extract_twitter_extended(soup)
            if twitter:
                output["twitter_card"] = twitter
                output["schemas_found"].append("twitter_card")

            # Dublin Core
            dc = self._extract_dublin_core(soup)
            if dc:
                output["dublin_core"] = dc
                output["schemas_found"].append("dublin_core")

            # All meta tags
            output["meta_tags"] = self._extract_all_meta(soup)

            # Schema.org types detected
            output["schema_types"] = self._detect_schema_types(output)

            self.stats["tasks_completed"] += 1

        except Exception as e:
            self.logger.error(f"Schema extraction error for {result.url}: {e}")
            self.stats["tasks_failed"] += 1
            output["error"] = str(e)

        return output

    def _extract_json_ld(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract JSON-LD with @graph flattening."""
        results = []
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    results.extend(data)
                elif isinstance(data, dict):
                    # Flatten @graph
                    if "@graph" in data:
                        graph = data["@graph"]
                        if isinstance(graph, list):
                            results.extend(graph)
                        else:
                            results.append(graph)
                    else:
                        results.append(data)
            except (json.JSONDecodeError, TypeError):
                continue
        return results

    def _extract_microdata(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract microdata (itemscope/itemprop) as nested dicts."""
        items = []
        for element in soup.find_all(attrs={"itemscope": True}):
            # Only top-level items (not nested inside another itemscope)
            parent = element.parent
            if parent and parent.has_attr("itemscope"):
                continue
            item = self._parse_microdata_item(element)
            if item:
                items.append(item)
        return items

    def _parse_microdata_item(self, element) -> Dict[str, Any]:
        """Recursively parse a single microdata item."""
        item: Dict[str, Any] = {}

        item_type = element.get("itemtype", "")
        if item_type:
            item["@type"] = item_type

        for prop in element.find_all(attrs={"itemprop": True}):
            prop_name = prop.get("itemprop", "")
            if not prop_name:
                continue

            # Nested item
            if prop.has_attr("itemscope"):
                value = self._parse_microdata_item(prop)
            else:
                # Get value from appropriate attribute
                if prop.name in ("a", "area", "link"):
                    value = prop.get("href", prop.get_text(strip=True))
                elif prop.name in ("img", "video", "audio", "source", "embed"):
                    value = prop.get("src", "")
                elif prop.name == "meta":
                    value = prop.get("content", "")
                elif prop.name == "time":
                    value = prop.get("datetime", prop.get_text(strip=True))
                elif prop.name == "data":
                    value = prop.get("value", prop.get_text(strip=True))
                else:
                    value = prop.get_text(strip=True)

            # Handle multiple values for same property
            if prop_name in item:
                existing = item[prop_name]
                if isinstance(existing, list):
                    existing.append(value)
                else:
                    item[prop_name] = [existing, value]
            else:
                item[prop_name] = value

        return item

    def _extract_rdfa(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract RDFa attributes (typeof, property, about)."""
        items = []
        for element in soup.find_all(attrs={"typeof": True}):
            item = {"@type": element.get("typeof", "")}
            about = element.get("about", "")
            if about:
                item["@id"] = about

            for prop in element.find_all(attrs={"property": True}):
                prop_name = prop.get("property", "")
                content = prop.get("content", prop.get_text(strip=True))
                if prop_name:
                    item[prop_name] = content

            if len(item) > 1:
                items.append(item)
        return items

    @staticmethod
    def _extract_opengraph_extended(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract all OpenGraph properties including nested (og:image:width etc)."""
        og: Dict[str, Any] = {}
        for meta in soup.find_all("meta"):
            prop = meta.get("property", "")
            if prop.startswith("og:"):
                key = prop[3:]  # strip "og:"
                content = meta.get("content", "")
                # Handle nested properties (og:image:width → image.width)
                if ":" in key:
                    parts = key.split(":", 1)
                    if parts[0] not in og:
                        og[parts[0]] = {}
                    if isinstance(og[parts[0]], dict):
                        og[parts[0]][parts[1]] = content
                    elif isinstance(og[parts[0]], str):
                        # Promote string to dict
                        og[parts[0]] = {"_value": og[parts[0]], parts[1]: content}
                else:
                    og[key] = content
        return og

    @staticmethod
    def _extract_twitter_extended(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract all Twitter Card meta tags."""
        tw: Dict[str, Any] = {}
        for meta in soup.find_all("meta"):
            name = meta.get("name", "")
            if name.startswith("twitter:"):
                key = name[8:]  # strip "twitter:"
                tw[key] = meta.get("content", "")
        return tw

    @staticmethod
    def _extract_dublin_core(soup: BeautifulSoup) -> Dict[str, str]:
        """Extract Dublin Core metadata (DC.title, DC.creator, etc)."""
        dc: Dict[str, str] = {}
        for meta in soup.find_all("meta"):
            name = meta.get("name", "")
            if name.upper().startswith("DC.") or name.upper().startswith("DCTERMS."):
                dc[name] = meta.get("content", "")
        return dc

    @staticmethod
    def _extract_all_meta(soup: BeautifulSoup) -> Dict[str, str]:
        """Extract all meta tags as name→content pairs."""
        meta_dict: Dict[str, str] = {}
        for meta in soup.find_all("meta"):
            name = meta.get("name", "") or meta.get("property", "") or meta.get("http-equiv", "")
            content = meta.get("content", "")
            if name and content:
                meta_dict[name] = content
        return meta_dict

    @staticmethod
    def _detect_schema_types(output: Dict[str, Any]) -> List[str]:
        """Detect all Schema.org types referenced in the data."""
        types = set()

        # From JSON-LD
        for item in output.get("json_ld", []):
            if isinstance(item, dict):
                t = item.get("@type", "")
                if isinstance(t, list):
                    types.update(t)
                elif t:
                    types.add(t)

        # From microdata
        for item in output.get("microdata", []):
            t = item.get("@type", "")
            if t:
                types.add(t)

        # From RDFa
        for item in output.get("rdfa", []):
            t = item.get("@type", "")
            if t:
                types.add(t)

        return sorted(types)


# ═════════════════════════════════════════════════════════════════════════
#  16) LIL_PIPE_HAWK — Data Pipeline / ETL Transformations
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class PipelineStep:
    """A single transformation step in a pipeline."""
    action: str  # "map", "filter", "rename", "coerce", "dedup", "sort", "flatten", "compute"
    config: Dict[str, Any] = field(default_factory=dict)


class LilPipeHawk(BaseLilHawk):
    """
    Data pipeline / ETL transformations. Takes raw extracted data
    and transforms it through a configurable pipeline:
      - Field mapping / renaming
      - Type coercion (str→int, date parsing, bool, float)
      - Filtering (include/exclude by field values)
      - Deduplication by key field
      - Sorting
      - Computed fields (concatenation, templates)
      - Flattening nested objects
      - Output formatting (JSON, CSV, SQL INSERT statements)
    """
    hawk_name = "Lil_Pipe_Hawk"
    hawk_color = "#795548"  # Pipe Brown

    def __init__(self):
        super().__init__()
        self._pipelines: Dict[str, List[PipelineStep]] = {}

    def register_pipeline(self, name: str, steps: List[PipelineStep]):
        """Register a reusable named pipeline."""
        self._pipelines[name] = steps
        self.logger.info(f"Pipeline registered: '{name}' ({len(steps)} steps)")

    async def execute(
        self,
        data: Union[List[Dict[str, Any]], Dict[str, Any]],
        steps: Optional[List[PipelineStep]] = None,
        pipeline_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Run data through a transformation pipeline.
        Input can be a single dict or list of dicts.
        """
        self.stats["tasks_received"] += 1

        if pipeline_name and pipeline_name in self._pipelines:
            steps = self._pipelines[pipeline_name]

        if not steps:
            self.stats["tasks_failed"] += 1
            return data if isinstance(data, list) else [data]

        # Normalize to list
        records = data if isinstance(data, list) else [data]

        try:
            for step in steps:
                records = self._apply_step(records, step)
            self.stats["tasks_completed"] += 1
        except Exception as e:
            self.logger.error(f"Pipeline error: {e}")
            self.stats["tasks_failed"] += 1

        return records

    def _apply_step(
        self, records: List[Dict[str, Any]], step: PipelineStep
    ) -> List[Dict[str, Any]]:
        """Apply a single pipeline step."""
        action = step.action
        config = step.config

        if action == "rename":
            # config: {"old_name": "new_name", ...}
            mapping = config.get("mapping", config)
            return [
                {mapping.get(k, k): v for k, v in rec.items()}
                for rec in records
            ]

        elif action == "map":
            # config: {"fields": ["field1", "field2"]} — keep only these fields
            fields = config.get("fields", [])
            if fields:
                return [
                    {k: v for k, v in rec.items() if k in fields}
                    for rec in records
                ]
            return records

        elif action == "filter":
            # config: {"field": "status", "op": "eq", "value": "active"}
            field_name = config.get("field", "")
            op = config.get("op", "eq")
            value = config.get("value")
            return [
                rec for rec in records
                if self._filter_match(rec.get(field_name), op, value)
            ]

        elif action == "coerce":
            # config: {"field": "price", "to": "float"}
            field_name = config.get("field", "")
            to_type = config.get("to", "str")
            result = []
            for rec in records:
                rec = rec.copy()
                if field_name in rec:
                    rec[field_name] = self._coerce(rec[field_name], to_type)
                result.append(rec)
            return result

        elif action == "dedup":
            # config: {"key": "url"}
            key = config.get("key", "")
            seen = set()
            deduped = []
            for rec in records:
                val = rec.get(key)
                if val not in seen:
                    seen.add(val)
                    deduped.append(rec)
            return deduped

        elif action == "sort":
            # config: {"key": "price", "reverse": true}
            key = config.get("key", "")
            reverse = config.get("reverse", False)
            return sorted(records, key=lambda r: r.get(key, ""), reverse=reverse)

        elif action == "compute":
            # config: {"field": "full_name", "template": "{first} {last}"}
            field_name = config.get("field", "")
            template = config.get("template", "")
            result = []
            for rec in records:
                rec = rec.copy()
                try:
                    rec[field_name] = template.format(**rec)
                except (KeyError, IndexError):
                    rec[field_name] = ""
                result.append(rec)
            return result

        elif action == "flatten":
            # config: {"field": "address", "prefix": "addr_"}
            field_name = config.get("field", "")
            prefix = config.get("prefix", f"{field_name}_")
            result = []
            for rec in records:
                rec = rec.copy()
                nested = rec.pop(field_name, None)
                if isinstance(nested, dict):
                    for k, v in nested.items():
                        rec[f"{prefix}{k}"] = v
                result.append(rec)
            return result

        elif action == "default":
            # config: {"field": "status", "value": "unknown"}
            field_name = config.get("field", "")
            default_val = config.get("value", "")
            return [
                {**rec, field_name: rec.get(field_name) or default_val}
                for rec in records
            ]

        return records

    @staticmethod
    def _filter_match(field_val: Any, op: str, target: Any) -> bool:
        """Evaluate a filter condition."""
        if op == "eq":
            return field_val == target
        elif op == "neq":
            return field_val != target
        elif op == "gt":
            return field_val is not None and field_val > target
        elif op == "lt":
            return field_val is not None and field_val < target
        elif op == "gte":
            return field_val is not None and field_val >= target
        elif op == "lte":
            return field_val is not None and field_val <= target
        elif op == "contains":
            return target in str(field_val) if field_val else False
        elif op == "not_contains":
            return target not in str(field_val) if field_val else True
        elif op == "in":
            return field_val in (target if isinstance(target, list) else [target])
        elif op == "exists":
            return field_val is not None
        elif op == "regex":
            return bool(re.search(str(target), str(field_val))) if field_val else False
        return True

    @staticmethod
    def _coerce(value: Any, to_type: str) -> Any:
        """Type coercion with safe fallbacks."""
        if value is None:
            return None
        try:
            if to_type == "int":
                cleaned = re.sub(r"[^\d\-]", "", str(value))
                return int(cleaned) if cleaned else None
            elif to_type == "float":
                cleaned = re.sub(r"[^\d.\-]", "", str(value))
                return float(cleaned) if cleaned else None
            elif to_type == "bool":
                return str(value).lower() in ("true", "1", "yes", "on")
            elif to_type == "str":
                return str(value).strip()
            elif to_type == "lower":
                return str(value).lower()
            elif to_type == "upper":
                return str(value).upper()
        except (ValueError, TypeError):
            return value
        return value

    # ── Export helpers ──

    @staticmethod
    def to_csv_string(records: List[Dict[str, Any]]) -> str:
        """Convert records to CSV string."""
        if not records:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
        return output.getvalue()

    @staticmethod
    def to_sql_inserts(
        records: List[Dict[str, Any]], table_name: str = "scraped_data"
    ) -> str:
        """Convert records to SQL INSERT statements."""
        if not records:
            return ""
        statements = []
        for rec in records:
            columns = ", ".join(rec.keys())
            values = ", ".join(
                f"'{str(v).replace(chr(39), chr(39)+chr(39))}'" if v is not None else "NULL"
                for v in rec.values()
            )
            statements.append(f"INSERT INTO {table_name} ({columns}) VALUES ({values});")
        return "\n".join(statements)


# ═════════════════════════════════════════════════════════════════════════
#  17) LIL_SCHED_HAWK — Scheduled / Interval-Based Scraping
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class ScheduledJob:
    """A recurring scrape job."""
    job_id: str
    url: str
    interval_seconds: int = 3600  # default: every hour
    job_type: str = "scrape"  # "scrape", "scrape-clean", "extract", "api"
    payload: Dict[str, Any] = field(default_factory=dict)
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    run_count: int = 0
    max_runs: int = 0  # 0 = unlimited
    active: bool = True
    on_change_only: bool = False  # Only callback if content changed


class LilSchedHawk(BaseLilHawk):
    """
    Scheduled and interval-based scraping manager.
      - Register recurring jobs with intervals
      - Integrates with Lil_Diff_Hawk for change-only callbacks
      - Runs a background loop that dispatches jobs when due
      - Persists schedule to disk for restart survival
    """
    hawk_name = "Lil_Sched_Hawk"
    hawk_color = "#9C27B0"  # Schedule Purple

    def __init__(self, schedule_file: str = "./schedule.json"):
        super().__init__()
        self.schedule_file = Path(schedule_file)
        self._jobs: Dict[str, ScheduledJob] = {}
        self._running = False

    async def startup(self):
        await super().startup()
        await self._load_schedule()

    async def shutdown(self):
        self._running = False
        await self._save_schedule()
        await super().shutdown()

    async def execute(
        self, job: Optional[ScheduledJob] = None, **kwargs
    ) -> ScheduledJob:
        """Register a scheduled job."""
        self.stats["tasks_received"] += 1

        if job is None:
            job = ScheduledJob(
                job_id=kwargs.get("job_id", f"SCHED-{len(self._jobs)+1:04d}"),
                url=kwargs.get("url", ""),
                interval_seconds=kwargs.get("interval", 3600),
                job_type=kwargs.get("job_type", "scrape"),
                payload=kwargs.get("payload", {}),
                max_runs=kwargs.get("max_runs", 0),
                on_change_only=kwargs.get("on_change_only", False),
            )

        # Set next run time
        now = datetime.now(timezone.utc)
        job.next_run = (now + timedelta(seconds=0)).isoformat()

        self._jobs[job.job_id] = job
        self.logger.info(
            f"Scheduled: {job.job_id} → {job.url} "
            f"every {job.interval_seconds}s"
        )
        await self._save_schedule()
        self.stats["tasks_completed"] += 1
        return job

    def remove_job(self, job_id: str) -> bool:
        """Remove a scheduled job."""
        if job_id in self._jobs:
            del self._jobs[job_id]
            return True
        return False

    def list_jobs(self) -> List[ScheduledJob]:
        """List all scheduled jobs."""
        return list(self._jobs.values())

    def get_due_jobs(self) -> List[ScheduledJob]:
        """Return jobs that are due for execution."""
        now = datetime.now(timezone.utc).isoformat()
        due = []
        for job in self._jobs.values():
            if not job.active:
                continue
            if job.max_runs > 0 and job.run_count >= job.max_runs:
                job.active = False
                continue
            if job.next_run and job.next_run <= now:
                due.append(job)
        return due

    def mark_completed(self, job: ScheduledJob):
        """Mark a job as completed and schedule next run."""
        now = datetime.now(timezone.utc)
        job.last_run = now.isoformat()
        job.run_count += 1
        job.next_run = (now + timedelta(seconds=job.interval_seconds)).isoformat()

        if job.max_runs > 0 and job.run_count >= job.max_runs:
            job.active = False
            self.logger.info(f"Job {job.job_id} completed all {job.max_runs} runs.")

    async def run_loop(
        self,
        handler: Callable[["ScheduledJob"], Any],
        check_interval: float = 10.0,
    ):
        """
        Background loop that checks for due jobs and dispatches them.
        The handler receives a ScheduledJob and should execute it.
        """
        self._running = True
        self.logger.info("Schedule loop started.")

        while self._running:
            due_jobs = self.get_due_jobs()
            for job in due_jobs:
                try:
                    self.logger.info(f"Dispatching scheduled job: {job.job_id}")
                    await handler(job)
                    self.mark_completed(job)
                except Exception as e:
                    self.logger.error(f"Scheduled job {job.job_id} failed: {e}")

            if due_jobs:
                await self._save_schedule()

            await asyncio.sleep(check_interval)

    async def _save_schedule(self):
        """Persist schedule to disk."""
        try:
            data = {}
            for jid, job in self._jobs.items():
                data[jid] = asdict(job)
            async with aiofiles.open(self.schedule_file, "w") as f:
                await f.write(json.dumps(data, indent=2, default=str))
        except Exception as e:
            self.logger.warning(f"Failed to save schedule: {e}")

    async def _load_schedule(self):
        """Load schedule from disk."""
        if not self.schedule_file.exists():
            return
        try:
            async with aiofiles.open(self.schedule_file, "r") as f:
                data = json.loads(await f.read())
            for jid, jdata in data.items():
                self._jobs[jid] = ScheduledJob(**jdata)
            self.logger.info(f"Loaded {len(self._jobs)} scheduled jobs from disk.")
        except Exception as e:
            self.logger.warning(f"Failed to load schedule: {e}")


# ═════════════════════════════════════════════════════════════════════════
#  CHICKEN HAWK DISPATCHER — Upstream Command & Control
# ═════════════════════════════════════════════════════════════════════════

class MissionType(Enum):
    """Mission types that Chicken Hawk can dispatch."""
    RECON = "recon"          # Single page scrape
    SWEEP = "sweep"          # Full site crawl
    HARVEST = "harvest"      # Targeted extraction with schema
    PATROL = "patrol"        # Scheduled monitoring
    INTERCEPT = "intercept"  # API endpoint scraping
    SURVEY = "survey"        # Sitemap discovery + analysis
    BATCH_OPS = "batch_ops"  # Batch URL processing


@dataclass
class Mission:
    """A high-level directive from ACHEEVY or Boomer_Angs."""
    mission_id: str
    mission_type: MissionType
    targets: List[str]  # URLs
    config: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, active, completed, failed
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    completed_at: Optional[str] = None
    results: List[Dict[str, Any]] = field(default_factory=list)
    kpis: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["mission_type"] = self.mission_type.value
        return d


class ChickenHawkDispatcher:
    """
    The upstream command layer. Chicken Hawk receives high-level mission
    directives and translates them into Sqwaadrun operations.

    Hierarchy:
      ACHEEVY (Digital CEO)
        └── Chicken Hawk (2IC / COO)  ← THIS CLASS
              ├── Lil_Guard_Hawk
              ├── Lil_Scrapp_Hawk (Squad Lead)
              ├── Lil_Parse_Hawk
              ├── Lil_Crawl_Hawk
              ├── Lil_Snap_Hawk
              ├── Lil_Store_Hawk
              ├── Lil_Extract_Hawk
              ├── Lil_Feed_Hawk
              ├── Lil_Diff_Hawk
              ├── Lil_Clean_Hawk
              ├── Lil_API_Hawk
              ├── Lil_Queue_Hawk
              ├── Lil_Sitemap_Hawk
              ├── Lil_Stealth_Hawk
              ├── Lil_Schema_Hawk
              ├── Lil_Pipe_Hawk
              └── Lil_Sched_Hawk

    Infrastructure engines (NOT agents, NOT in roster):
      OpenClaw  → runtime/execution
      NemoClaw  → security/tenant isolation
      Hermes    → multi-model evaluation/KPIs
      AutoResearch → research automation
    """

    def __init__(self):
        self.logger = logging.getLogger("Chicken_Hawk")
        self._mission_log: List[Mission] = []
        self._mission_counter = 0
        self._squad: Optional["FullScrappHawkSquadrun"] = None

    def attach_squad(self, squad: "FullScrappHawkSquadrun"):
        """Wire the Sqwaadrun to Chicken Hawk."""
        self._squad = squad
        self.logger.info("Sqwaadrun attached to Chicken Hawk dispatch.")

    async def dispatch(self, mission: Mission) -> Mission:
        """
        Execute a mission. Translates the high-level directive into
        concrete Sqwaadrun operations and collects results + KPIs.
        """
        if not self._squad:
            mission.error = "No Sqwaadrun attached."
            mission.status = "failed"
            return mission

        mission.status = "active"
        self._mission_log.append(mission)
        start = time.monotonic()

        self.logger.info(
            f"Mission {mission.mission_id} dispatched: "
            f"{mission.mission_type.value} → {len(mission.targets)} targets"
        )

        try:
            if mission.mission_type == MissionType.RECON:
                await self._execute_recon(mission)

            elif mission.mission_type == MissionType.SWEEP:
                await self._execute_sweep(mission)

            elif mission.mission_type == MissionType.HARVEST:
                await self._execute_harvest(mission)

            elif mission.mission_type == MissionType.PATROL:
                await self._execute_patrol(mission)

            elif mission.mission_type == MissionType.INTERCEPT:
                await self._execute_intercept(mission)

            elif mission.mission_type == MissionType.SURVEY:
                await self._execute_survey(mission)

            elif mission.mission_type == MissionType.BATCH_OPS:
                await self._execute_batch(mission)

            mission.status = "completed"

        except Exception as e:
            self.logger.error(f"Mission {mission.mission_id} failed: {e}")
            mission.error = str(e)
            mission.status = "failed"

        elapsed = time.monotonic() - start
        mission.completed_at = datetime.now(timezone.utc).isoformat()
        mission.kpis = self._collect_kpis(mission, elapsed)

        self.logger.info(
            f"Mission {mission.mission_id} {mission.status}: "
            f"{len(mission.results)} results in {elapsed:.1f}s"
        )
        return mission

    # ── Mission executors ──

    async def _execute_recon(self, mission: Mission):
        """Single-page scrape with optional cleaning."""
        clean = mission.config.get("clean", True)
        for url in mission.targets:
            if clean:
                result = await self._squad.scrape_clean(url)
            else:
                r = await self._squad.scrape(url)
                result = r.to_dict()
            mission.results.append(
                result if isinstance(result, dict) else {"data": result}
            )

    async def _execute_sweep(self, mission: Mission):
        """Full site crawl."""
        for url in mission.targets:
            manifest = await self._squad.crawl(
                url,
                max_depth=mission.config.get("max_depth", 3),
                max_pages=mission.config.get("max_pages", 100),
                include_patterns=mission.config.get("include", []),
                exclude_patterns=mission.config.get("exclude", []),
            )
            mission.results.append({
                "seed_url": url,
                "pages_scraped": manifest.pages_scraped,
                "pages_discovered": len(manifest.discovered),
                "pages_failed": len(manifest.failed),
            })

    async def _execute_harvest(self, mission: Mission):
        """Targeted extraction with schema."""
        schema_def = mission.config.get("schema")
        if not schema_def:
            mission.error = "HARVEST mission requires 'schema' in config."
            return

        schema = ExtractionSchema(
            name=schema_def.get("name", "harvest"),
            base_selector=schema_def.get("base_selector", ""),
            is_list=schema_def.get("is_list", True),
            rules=[
                ExtractionRule(**rule_def)
                for rule_def in schema_def.get("rules", [])
            ],
        )

        for url in mission.targets:
            output = await self._squad.scrape_clean(url, extract_schema=schema)
            mission.results.append(output)

    async def _execute_patrol(self, mission: Mission):
        """Monitoring with change detection."""
        for url in mission.targets:
            output = await self._squad.scrape_clean(url, monitor_changes=True)
            mission.results.append(output)

    async def _execute_intercept(self, mission: Mission):
        """API scraping."""
        auth = mission.config.get("auth")
        if auth:
            for domain, auth_config in auth.items():
                self._squad.api_hawk.register_auth(domain, **auth_config)

        for url in mission.targets:
            data = await self._squad.scrape_api(
                url,
                method=mission.config.get("method", "GET"),
                paginate=mission.config.get("paginate", False),
                max_pages=mission.config.get("max_pages", 10),
            )
            mission.results.append({"url": url, "data": data})

    async def _execute_survey(self, mission: Mission):
        """Sitemap discovery and analysis."""
        for url in mission.targets:
            entries = await self._squad.sitemap_hawk.execute(
                url, self._squad.scrapper._session, self._squad.guard,
                max_entries=mission.config.get("max_entries", 5000),
            )
            mission.results.append({
                "base_url": url,
                "entries_found": len(entries),
                "entries": [asdict(e) for e in entries[:100]],  # Cap detail output
                "changefreq_distribution": self._count_field(entries, "changefreq"),
                "priority_distribution": self._count_field(entries, "priority"),
            })

    async def _execute_batch(self, mission: Mission):
        """Batch URL processing."""
        results = await self._squad.batch_scrape(mission.targets)
        for r in results:
            mission.results.append(r.to_dict())

    # ── KPI collection (for Hermes) ──

    def _collect_kpis(self, mission: Mission, elapsed: float) -> Dict[str, Any]:
        """Collect performance KPIs for Hermes evaluation engine."""
        return {
            "mission_id": mission.mission_id,
            "mission_type": mission.mission_type.value,
            "targets_count": len(mission.targets),
            "results_count": len(mission.results),
            "elapsed_seconds": round(elapsed, 2),
            "throughput_pages_per_sec": round(
                len(mission.results) / max(elapsed, 0.001), 2
            ),
            "status": mission.status,
            "error": mission.error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def _count_field(entries: list, field: str) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for e in entries:
            val = str(getattr(e, field, "unknown"))
            counts[val] = counts.get(val, 0) + 1
        return counts

    def create_mission(
        self,
        mission_type: Union[MissionType, str],
        targets: List[str],
        **config,
    ) -> Mission:
        """Factory method to create a Mission object."""
        self._mission_counter += 1
        if isinstance(mission_type, str):
            mission_type = MissionType(mission_type)
        return Mission(
            mission_id=f"MISSION-{self._mission_counter:04d}",
            mission_type=mission_type,
            targets=targets,
            config=config,
        )

    def get_mission_log(self) -> List[Dict[str, Any]]:
        """Return all mission records."""
        return [m.to_dict() for m in self._mission_log]


# ═════════════════════════════════════════════════════════════════════════
#  FULL SCRAPP HAWK SQWAADRUN — All 17 Hawks + Chicken Hawk Dispatch
# ═════════════════════════════════════════════════════════════════════════

class FullScrappHawkSquadrun(ExpandedScrappHawkSquadrun):
    """
    The complete 17-Hawk Sqwaadrun with Chicken Hawk dispatch.
    Extends ExpandedScrappHawkSquadrun (12 Hawks) with:
      - Lil_Sitemap_Hawk  (#13)
      - Lil_Stealth_Hawk  (#14)
      - Lil_Schema_Hawk   (#15)
      - Lil_Pipe_Hawk     (#16)
      - Lil_Sched_Hawk    (#17)
      + ChickenHawkDispatcher (upstream command layer)
    """

    def __init__(self, **kwargs):
        # Pop specialist-only kwargs before calling the base __init__
        # (which does not accept these and would raise TypeError).
        jitter_range = kwargs.pop("jitter_range", (0.5, 3.0))
        schedule_file = kwargs.pop("schedule_file", "./schedule.json")

        super().__init__(**kwargs)

        # ── New Hawks ──
        self.sitemap_hawk = LilSitemapHawk()
        self.stealth_hawk = LilStealthHawk(jitter_range=jitter_range)
        self.schema_hawk = LilSchemaHawk()
        self.pipe_hawk = LilPipeHawk()
        self.sched_hawk = LilSchedHawk(schedule_file=schedule_file)

        self._new_hawks: List[BaseLilHawk] = [
            self.sitemap_hawk, self.stealth_hawk,
            self.schema_hawk, self.pipe_hawk, self.sched_hawk,
        ]
        self._hawks.extend(self._new_hawks)

        # ── Chicken Hawk Dispatcher ──
        self.chicken_hawk = ChickenHawkDispatcher()
        self.chicken_hawk.attach_squad(self)

    async def startup(self):
        await super().startup()
        for hawk in self._new_hawks:
            await hawk.startup()
        self.logger.info("═══ Full 17-Hawk Sqwaadrun + Chicken Hawk online. ═══")

    async def shutdown(self):
        for hawk in reversed(self._new_hawks):
            await hawk.shutdown()
        await super().shutdown()

    # ── Mission dispatch (pass-through to Chicken Hawk) ──

    async def mission(
        self,
        mission_type: Union[MissionType, str],
        targets: List[str],
        **config,
    ) -> Mission:
        """Create and dispatch a mission through Chicken Hawk."""
        m = self.chicken_hawk.create_mission(mission_type, targets, **config)
        return await self.chicken_hawk.dispatch(m)

    # ── Sitemap-driven crawl ──

    async def sitemap_crawl(
        self,
        base_url: str,
        lastmod_after: Optional[str] = None,
        min_priority: float = 0.0,
        max_entries: int = 1000,
        max_pages: int = 100,
    ) -> CrawlManifest:
        """
        Use Lil_Sitemap_Hawk to discover URLs, then scrape them.
        More efficient than BFS crawling for large sites.
        """
        entries = await self.sitemap_hawk.execute(
            base_url, self.scrapper._session, self.guard,
            lastmod_after=lastmod_after,
            min_priority=min_priority,
            max_entries=max_entries,
        )

        urls = [e.loc for e in entries[:max_pages]]
        if not urls:
            self.logger.warning("No sitemap entries found, falling back to BFS crawl.")
            return await self.crawl(base_url, max_pages=max_pages)

        self.logger.info(f"Sitemap crawl: {len(urls)} URLs from sitemap")
        results = await self.batch_scrape(urls)

        manifest = CrawlManifest(
            seed_url=base_url,
            max_pages=max_pages,
            started_at=datetime.now(timezone.utc).isoformat(),
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        manifest.discovered = set(urls)
        manifest.completed = set(r.url for r in results if not r.error)
        manifest.failed = set(r.url for r in results if r.error)
        manifest.results = results
        return manifest

    # ── Stealth scrape ──

    async def stealth_scrape(self, url: str) -> ScrapeResult:
        """Scrape with full stealth headers and jitter timing."""
        target = ScrapeTarget(url=url)
        stealth = await self.stealth_hawk.execute(target)

        # Apply jitter delay
        await asyncio.sleep(stealth["delay"])

        # Scrape with stealth headers (bypasses guard's basic headers)
        result = await self.scrape(url)

        # Check for bot detection
        detection = self.stealth_hawk.detect_bot_protection(result)
        if detection["detected"]:
            self.logger.warning(
                f"Bot detection on {url}: {detection['signals']}"
            )
            result.metadata = result.structured_data  # preserve existing
            result.structured_data["bot_detection"] = detection

        # Update stealth state
        self.stealth_hawk.update_referrer_chain(target.domain, url)
        if result.headers:
            self.stealth_hawk.update_cookies(target.domain, result.headers)

        return result

    # ── Schema extraction ──

    async def extract_schemas(self, url: str) -> Dict[str, Any]:
        """Scrape a page and extract all structured data schemas."""
        result = await self.scrape(url)
        return await self.schema_hawk.execute(result)

    # ── Pipeline processing ──

    async def scrape_and_pipe(
        self,
        url: str,
        extract_schema: Optional[ExtractionSchema] = None,
        pipeline_steps: Optional[List[PipelineStep]] = None,
    ) -> List[Dict[str, Any]]:
        """Scrape → Extract → Transform through pipeline."""
        result = await self.scrape(url)

        if extract_schema:
            extracted = await self.extractor.execute(result, schema=extract_schema)
            data = extracted.get("data", [])
        else:
            data = [result.to_dict()]

        if pipeline_steps:
            data = await self.pipe_hawk.execute(
                data if isinstance(data, list) else [data],
                steps=pipeline_steps,
            )

        return data

    # ── Full roster ──

    def roster_report(self) -> str:
        """Print the complete 17-Hawk + Chicken Hawk roster."""
        lines = [
            "╔═══════════════════════════════════════════════════════════════════════╗",
            "║     LIL_SCRAPP_HAWK SQWAADRUN — FULL ROSTER (17 Hawks)              ║",
            "║     Chicken Hawk Dispatch: ONLINE                                    ║",
            "╠═══════════════════════════════════════════════════════════════════════╣",
            "║  ─── CORE HAWKS ───                                                 ║",
        ]
        core = [self.guard, self.scrapper, self.parser, self.crawler, self.snapper, self.store]
        for hawk in core:
            status = "ACTIVE" if hawk._active else "STANDBY"
            if hawk is self.snapper and not self.snapper.is_available:
                status = "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<22s} {status:<8s} "
                f"Done:{hawk.stats['tasks_completed']:<5d} "
                f"Fail:{hawk.stats['tasks_failed']:<4d}  ║"
            )

        exp = [self.extractor, self.feeder, self.differ, self.cleaner, self.api_hawk, self.queue_hawk]
        lines.append("║  ─── EXPANSION HAWKS ───                                              ║")
        for hawk in exp:
            status = "ACTIVE" if hawk._active else "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<22s} {status:<8s} "
                f"Done:{hawk.stats['tasks_completed']:<5d} "
                f"Fail:{hawk.stats['tasks_failed']:<4d}  ║"
            )

        lines.append("║  ─── SPECIALIST HAWKS ───                                             ║")
        for hawk in self._new_hawks:
            status = "ACTIVE" if hawk._active else "STANDBY"
            lines.append(
                f"║  {hawk.hawk_color}  {hawk.hawk_name:<22s} {status:<8s} "
                f"Done:{hawk.stats['tasks_completed']:<5d} "
                f"Fail:{hawk.stats['tasks_failed']:<4d}  ║"
            )

        lines.append(
            "╚═══════════════════════════════════════════════════════════════════════╝"
        )
        return "\n".join(lines)



# ═════════════════════════════════════════════════════════════════════════
#  CONVENIENCE FUNCTIONS — Quick access for Claw-Code integration
# ═════════════════════════════════════════════════════════════════════════

async def quick_scrape(url: str, clean: bool = True) -> ScrapeResult:
    """One-liner: scrape a URL and return cleaned result."""
    async with FullScrappHawkSquadrun() as squad:
        result = await squad.scrape(url)
        if clean:
            result = await squad.cleaner.execute(result)
        return result


async def quick_extract(
    url: str, schema: ExtractionSchema
) -> Dict[str, Any]:
    """One-liner: scrape and extract structured data."""
    async with FullScrappHawkSquadrun() as squad:
        result = await squad.scrape(url)
        return await squad.extractor.execute(result, schema=schema)


async def quick_crawl(
    seed_url: str, max_pages: int = 50
) -> CrawlManifest:
    """One-liner: crawl a site."""
    async with FullScrappHawkSquadrun() as squad:
        return await squad.crawl(seed_url, max_pages=max_pages)


async def quick_api(
    url: str, auth_domain: Optional[str] = None,
    auth_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """One-liner: hit an API endpoint."""
    async with FullScrappHawkSquadrun() as squad:
        if auth_domain and auth_token:
            squad.api_hawk.register_auth(auth_domain, token=auth_token)
        return await squad.scrape_api(url)


async def quick_mission(
    mission_type: str, targets: List[str], **config
) -> Dict[str, Any]:
    """One-liner: dispatch a Chicken Hawk mission."""
    async with FullScrappHawkSquadrun() as squad:
        m = await squad.mission(mission_type, targets, **config)
        return m.to_dict()


# ═════════════════════════════════════════════════════════════════════════
#  UNIFIED CLI — All 17 Hawks + Chicken Hawk, All Commands
# ═════════════════════════════════════════════════════════════════════════

async def main():
    """CLI for the full 17-Hawk Lil_Scrapp_Hawk Sqwaadrun."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Lil_Scrapp_Hawk Sqwaadrun — 17-Hawk Web Scraping Swarm + Chicken Hawk Dispatch",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
ACHIEVEMOR — Smelter OS — Chicken Hawk Fleet

TAKE OFF:
  pip install aiohttp beautifulsoup4 lxml html2text aiofiles tldextract
  python lil_scrapp_hawk.py scrape https://example.com

COMMANDS:
  scrape         Scrape a single URL
  scrape-clean   Scrape with cleaning + quality scoring
  crawl          BFS crawl an entire site
  sitemap-crawl  Sitemap-driven crawl (faster for large sites)
  batch          Batch scrape from a URL list file
  feeds          Discover and parse RSS/Atom/JSON feeds
  api            Scrape REST/GraphQL API endpoints
  tables         Extract HTML tables
  schemas        Extract all structured data (JSON-LD, microdata, RDFa, OG)
  mission        Dispatch a Chicken Hawk mission (recon/sweep/harvest/patrol/intercept/survey)
  roster         Show the full 17-Hawk roster

OPTIONAL:
  pip install playwright && playwright install chromium  (for JS rendering)
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="Command")

    # ── roster ──
    subparsers.add_parser("roster", help="Show full 17-Hawk Sqwaadrun roster")

    # ── scrape ──
    sp = subparsers.add_parser("scrape", help="Scrape a single URL")
    sp.add_argument("url")
    sp.add_argument("--format", "-f", choices=["json", "markdown", "text"], default="json")
    sp.add_argument("--js", action="store_true", help="JS rendering via Playwright")
    sp.add_argument("--stealth", action="store_true", help="Use stealth headers + jitter")
    sp.add_argument("--output", "-o")

    # ── scrape-clean ──
    sp = subparsers.add_parser("scrape-clean", help="Scrape with full cleaning pipeline")
    sp.add_argument("url")
    sp.add_argument("--monitor", action="store_true", help="Enable change detection")
    sp.add_argument("--output", "-o")

    # ── crawl ──
    sp = subparsers.add_parser("crawl", help="BFS crawl a site")
    sp.add_argument("url")
    sp.add_argument("--max-pages", type=int, default=100)
    sp.add_argument("--max-depth", type=int, default=3)
    sp.add_argument("--include", nargs="*", default=[])
    sp.add_argument("--exclude", nargs="*", default=[])
    sp.add_argument("--format", "-f", choices=["json", "jsonl", "markdown"], default="json")
    sp.add_argument("--output", "-o")
    sp.add_argument("--concurrency", "-c", type=int, default=5)
    sp.add_argument("--no-sitemap", action="store_true")

    # ── sitemap-crawl ──
    sp = subparsers.add_parser("sitemap-crawl", help="Sitemap-driven crawl")
    sp.add_argument("url")
    sp.add_argument("--max-pages", type=int, default=100)
    sp.add_argument("--min-priority", type=float, default=0.0)
    sp.add_argument("--lastmod-after", help="Only pages modified after this date (ISO)")
    sp.add_argument("--format", "-f", choices=["json", "jsonl", "markdown"], default="json")
    sp.add_argument("--output", "-o")

    # ── batch ──
    sp = subparsers.add_parser("batch", help="Batch scrape from URL list file")
    sp.add_argument("file")
    sp.add_argument("--format", "-f", choices=["json", "jsonl", "markdown"], default="json")
    sp.add_argument("--output", "-o")
    sp.add_argument("--concurrency", "-c", type=int, default=5)

    # ── feeds ──
    sp = subparsers.add_parser("feeds", help="Discover and parse feeds")
    sp.add_argument("url")
    sp.add_argument("--max-entries", type=int, default=25)
    sp.add_argument("--output", "-o")

    # ── api ──
    sp = subparsers.add_parser("api", help="Scrape API endpoint")
    sp.add_argument("url")
    sp.add_argument("--method", default="GET", choices=["GET", "POST"])
    sp.add_argument("--bearer-token")
    sp.add_argument("--paginate", action="store_true")
    sp.add_argument("--max-pages", type=int, default=10)
    sp.add_argument("--output", "-o")

    # ── tables ──
    sp = subparsers.add_parser("tables", help="Extract HTML tables")
    sp.add_argument("url")
    sp.add_argument("--format", "-f", choices=["json", "csv"], default="json")
    sp.add_argument("--output", "-o")

    # ── schemas ──
    sp = subparsers.add_parser("schemas", help="Extract all structured data schemas")
    sp.add_argument("url")
    sp.add_argument("--output", "-o")

    # ── mission ──
    sp = subparsers.add_parser("mission", help="Dispatch a Chicken Hawk mission")
    sp.add_argument("type", choices=["recon", "sweep", "harvest", "patrol", "intercept", "survey", "batch_ops"])
    sp.add_argument("urls", nargs="+", help="Target URLs")
    sp.add_argument("--max-pages", type=int, default=100)
    sp.add_argument("--max-depth", type=int, default=3)
    sp.add_argument("--output", "-o")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "roster":
        squad = FullScrappHawkSquadrun()
        print(squad.roster_report())
        return

    async def write_output(text: str, filepath: Optional[str] = None):
        if filepath:
            async with aiofiles.open(filepath, "w") as f:
                await f.write(text)
            print(f"Saved to {filepath}")
        else:
            print(text)

    concurrency = getattr(args, "concurrency", 5)

    async with FullScrappHawkSquadrun(concurrency=concurrency) as squad:

        if args.command == "scrape":
            if getattr(args, "stealth", False):
                result = await squad.stealth_scrape(args.url)
            else:
                result = await squad.scrape(args.url, extract_js=getattr(args, "js", False))
            fmt = args.format
            if fmt == "markdown":
                output = result.markdown or result.clean_text
            elif fmt == "text":
                output = result.clean_text
            else:
                output = result.to_json()
            await write_output(output, args.output)

        elif args.command == "scrape-clean":
            output = await squad.scrape_clean(args.url, monitor_changes=args.monitor)
            await write_output(json.dumps(output, indent=2, default=str), args.output)

        elif args.command == "crawl":
            manifest = await squad.crawl(
                args.url, max_depth=args.max_depth, max_pages=args.max_pages,
                include_patterns=args.include, exclude_patterns=args.exclude,
                use_sitemap=not args.no_sitemap,
            )
            outfile = args.output or f"crawl_{args.format}"
            path = await squad.export(manifest.results, fmt=args.format, filename=outfile)
            print(f"Crawl complete: {manifest.pages_scraped} pages → {path}")

        elif args.command == "sitemap-crawl":
            manifest = await squad.sitemap_crawl(
                args.url, lastmod_after=args.lastmod_after,
                min_priority=args.min_priority, max_pages=args.max_pages,
            )
            outfile = args.output or f"sitemap_crawl_{args.format}"
            path = await squad.export(manifest.results, fmt=args.format, filename=outfile)
            print(f"Sitemap crawl: {manifest.pages_scraped} pages → {path}")

        elif args.command == "batch":
            with open(args.file) as f:
                urls = [l.strip() for l in f if l.strip() and not l.startswith("#")]
            results = await squad.batch_scrape(urls)
            outfile = args.output or f"batch_{args.format}"
            path = await squad.export(results, fmt=args.format, filename=outfile)
            print(f"Batch: {len(results)} URLs → {path}")

        elif args.command == "feeds":
            output = await squad.discover_and_parse_feeds(args.url, max_entries=args.max_entries)
            await write_output(json.dumps(output, indent=2, default=str), args.output)

        elif args.command == "api":
            if args.bearer_token:
                parsed = urlparse(args.url)
                squad.api_hawk.register_auth(parsed.netloc, token=args.bearer_token)
            output = await squad.scrape_api(
                args.url, method=args.method, paginate=args.paginate, max_pages=args.max_pages,
            )
            await write_output(json.dumps(output, indent=2, default=str), args.output)

        elif args.command == "tables":
            tables = await squad.extract_tables(args.url)
            if args.format == "csv" and tables:
                await write_output(await squad.extractor.tables_to_csv(tables), args.output)
            else:
                await write_output(json.dumps(tables, indent=2), args.output)

        elif args.command == "schemas":
            output = await squad.extract_schemas(args.url)
            await write_output(json.dumps(output, indent=2, default=str), args.output)

        elif args.command == "mission":
            m = await squad.mission(
                args.type, args.urls,
                max_pages=args.max_pages, max_depth=args.max_depth,
            )
            await write_output(json.dumps(m.to_dict(), indent=2, default=str), args.output)

        print()
        print(squad.roster_report())


def cli() -> None:
    """Sync entry point expected by the installed console-script wrapper."""
    asyncio.run(main())


if __name__ == "__main__":
    cli()
