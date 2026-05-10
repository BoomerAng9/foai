"""Katteb adapter — SEO optimization + marketing automation for Coastal.

Owner directive 2026-05-01: integrate Katteb's API for SEO analysis,
article generation, AI-content humanizing, and fact-checking. Coastal's
brand is already configured server-side at Katteb (brand_id 2029, URL
https://Brewing.foai.cloud, created 2026-04-30).

API surface (13 endpoints under https://app.katteb.com/api/v2/?endpoint=):
  - articles/generate, articles/get, articles/list, articles/cancel
  - seo/analyze, seo/get
  - humanizer/detect, humanizer/rewrite
  - factcheck/verify
  - account/credits, account/limits
  - styles/list, brands/list

Auth: Bearer token in Authorization header.
Env: `KATTEB_API_KEY` (set on aims-vps via openclaw vault). Module reads
once at import; downstream modules check `is_configured()` before calling.

Cost discipline: every call costs Katteb credits (we have 25k available
on the AppSumo Pro tier). Spinner tools that wrap these endpoints emit
audit-ledger rows so `lil_ledger_hawk` can monitor burn rate.
"""
from __future__ import annotations

import os
import time
from typing import Any, Optional

import requests

KATTEB_API_KEY = os.environ.get("KATTEB_API_KEY", "")
KATTEB_BASE = os.environ.get("KATTEB_BASE_URL", "https://app.katteb.com/api/v2/")

# Coastal brand_id was provisioned at Katteb 2026-04-30 (owner-side action).
# Override via env if Coastal grows additional brand spaces (sub-brands,
# Per|Form, NURDSCODE, etc., each with their own Katteb brand).
COASTAL_BRAND_ID = int(os.environ.get("KATTEB_COASTAL_BRAND_ID", "2029"))

DEFAULT_TIMEOUT_S = 30.0


def is_configured() -> bool:
    return bool(KATTEB_API_KEY)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {KATTEB_API_KEY}",
        "Content-Type": "application/json",
    }


def _request(
    method: str,
    endpoint: str,
    params: Optional[dict[str, Any]] = None,
    body: Optional[dict[str, Any]] = None,
    timeout: float = DEFAULT_TIMEOUT_S,
) -> dict[str, Any]:
    """Round-trip a Katteb API call. Returns a normalized envelope:
        {ok, status, data | error, latency_ms}
    Never returns raw exceptions — caller handles graceful degradation
    via the `ok` flag.
    """
    if not is_configured():
        return {
            "ok": False,
            "status": 0,
            "error": "katteb_not_configured",
            "latency_ms": 0,
        }

    query = {"endpoint": endpoint}
    if params:
        query.update({k: v for k, v in params.items() if v is not None})

    started = time.monotonic()
    try:
        if method == "GET":
            resp = requests.get(KATTEB_BASE, headers=_headers(), params=query, timeout=timeout)
        elif method == "POST":
            resp = requests.post(
                KATTEB_BASE,
                headers=_headers(),
                params=query,
                json=body or {},
                timeout=timeout,
            )
        elif method == "DELETE":
            resp = requests.delete(KATTEB_BASE, headers=_headers(), params=query, timeout=timeout)
        else:
            return {"ok": False, "status": 0, "error": f"unsupported_method:{method}", "latency_ms": 0}

        latency_ms = int((time.monotonic() - started) * 1000)
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text[:500]}

        # Katteb returns success in the body (`success: true|false`), even
        # when HTTP is 200. Surface both for caller decision.
        ok = resp.status_code == 200 and bool(data.get("success", False))
        return {
            "ok": ok,
            "status": resp.status_code,
            "data": data,
            "latency_ms": latency_ms,
        }
    except requests.RequestException as e:
        return {
            "ok": False,
            "status": 0,
            "error": f"katteb_request_error: {e}",
            "latency_ms": int((time.monotonic() - started) * 1000),
        }


# ---------------------------------------------------------------------------
# Account — credit + rate-limit awareness
# ---------------------------------------------------------------------------

def get_credits() -> dict[str, Any]:
    """Returns the current Katteb credit balance + plan tier. Use to
    short-circuit expensive calls when running low; lil_ledger_hawk
    consumes this for burn-rate alerts."""
    return _request("GET", "account/credits")


def get_limits() -> dict[str, Any]:
    """Rate-limit status. Per-day read/write quotas live here."""
    return _request("GET", "account/limits")


def list_brands() -> dict[str, Any]:
    """List configured brand workspaces. Coastal's brand_id is 2029."""
    return _request("GET", "brands/list")


def list_styles() -> dict[str, Any]:
    """Custom writing styles configured at Katteb (voice presets)."""
    return _request("GET", "styles/list")


# ---------------------------------------------------------------------------
# Article generation
# ---------------------------------------------------------------------------

def generate_article(
    title: str,
    keywords: list[str],
    brand_id: int = COASTAL_BRAND_ID,
    style_id: Optional[int] = None,
    word_count: int = 1500,
    tone: str = "professional",
    extra: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Submit an article-generation job. Returns a job-ID envelope; poll
    `get_article(id)` for status + content.

    For Coastal: wire this to blog-post generation (sourcing transparency
    write-ups, brewing guides, regional-feature pieces). Style_id should
    point to the ACHEEVY voice register once the style is configured at
    Katteb.
    """
    body: dict[str, Any] = {
        "title": title,
        "keywords": keywords,
        "brand_id": brand_id,
        "word_count": word_count,
        "tone": tone,
    }
    if style_id is not None:
        body["style_id"] = style_id
    if extra:
        body.update(extra)
    return _request("POST", "articles/generate", body=body)


def get_article(article_id: str) -> dict[str, Any]:
    """Poll a generation job for status + content."""
    return _request("GET", "articles/get", params={"id": article_id})


def list_articles(page: int = 1, per_page: int = 20) -> dict[str, Any]:
    """Paginated list of articles in the Coastal brand workspace."""
    return _request("GET", "articles/list", params={"page": page, "per_page": per_page})


def cancel_article(article_id: str) -> dict[str, Any]:
    """Cancel a pending article job (refunds credits if not yet started)."""
    return _request("DELETE", "articles/cancel", params={"id": article_id})


# ---------------------------------------------------------------------------
# SEO analysis
# ---------------------------------------------------------------------------

def seo_analyze(
    url: str,
    target_keywords: list[str],
    brand_id: int = COASTAL_BRAND_ID,
) -> dict[str, Any]:
    """Submit a URL for SEO analysis against target keywords. Returns a
    job-ID envelope; poll `seo_get(id)` for the report.

    Use for Coastal: per-product page (`/products/<slug>`) SEO scoring,
    `/about`, `/team`, `/policies/*` checks. lil_ledger_hawk audit
    record per call so we can budget the credit burn against
    catalog-coverage runs (236 SKUs × ~50 credits = the wall to watch).
    """
    return _request(
        "POST",
        "seo/analyze",
        body={"url": url, "keywords": target_keywords, "brand_id": brand_id},
    )


def seo_get(report_id: str) -> dict[str, Any]:
    """Poll an SEO analysis job for results."""
    return _request("GET", "seo/get", params={"id": report_id})


# ---------------------------------------------------------------------------
# Humanizer — defend against AI-detector flags on social / blog
# ---------------------------------------------------------------------------

def humanizer_detect(text: str) -> dict[str, Any]:
    """Score text for AI-written likelihood. Use BEFORE publishing
    agent-generated long-form to social / blog — high AI-detection
    score = social-platform deboost risk. Pair with `humanizer_rewrite`
    if score is high.
    """
    return _request("POST", "humanizer/detect", body={"text": text})


def humanizer_rewrite(text: str, style_id: Optional[int] = None) -> dict[str, Any]:
    """Rewrite AI-generated text into a more human cadence. Used by
    Melli's BG'z (Persona Tah for influencer copy, Orien Talis for
    social) before publish_signoff fires."""
    body: dict[str, Any] = {"text": text}
    if style_id is not None:
        body["style_id"] = style_id
    return _request("POST", "humanizer/rewrite", body=body)


# ---------------------------------------------------------------------------
# Fact-check — pairs with claims-voider canon
# ---------------------------------------------------------------------------

def factcheck_verify(claim: str) -> dict[str, Any]:
    """Verify a factual claim with web search. Coastal use case: any
    public-facing claim (sourcing detail, partnership stat, market
    positioning) gets fact-checked via this endpoint BEFORE Melli's
    `sign_for_culture_attribution` gate. Hard barrier against
    publishing unverified claims that the claims-voider would otherwise
    catch only at the agent-prompt layer.
    """
    return _request("POST", "factcheck/verify", body={"claim": claim})
