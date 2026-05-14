"""Recraft source adapter — queries the Recraft public model endpoint.

Recraft publishes its model catalog at external.api.recraft.ai. Most
catalog reads are unauthenticated; we send the bearer if RECRAFT_API_KEY
is set in env so private/preview models surface for owner-scope runs.

Falls back to scraping the docs site when the API is unreachable.
"""

from __future__ import annotations

import os
import re

import httpx

from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources._common import sanitize, scrape


_API_URL = "https://external.api.recraft.ai/v1/models"
_DOCS_URL = "https://www.recraft.ai/docs"

# Recraft publishes IDs as `recraftvN` where N is the generation. Pinned
# today at `recraftv4`. Adapter surfaces the highest N seen.
_ID_PATTERN = re.compile(r"recraftv(\d+)", re.IGNORECASE)


class RecraftApiAdapter(SourceAdapter):
    name = "recraft_api"

    async def latest(self, family: str) -> SourceFinding | None:
        if family != "recraft":
            return None

        # Primary path — JSON API. Auth-optional.
        api_finding = await _try_api()
        if api_finding is not None:
            return api_finding

        # Fallback — scrape docs page.
        text = await scrape(_DOCS_URL, "recraft-docs.html")
        if not text:
            return None

        return _resolve_from_text(family, text, _DOCS_URL)


async def _try_api() -> SourceFinding | None:
    """Hit the JSON models endpoint. Returns None on any failure."""
    headers: dict[str, str] = {"Accept": "application/json"}
    api_key = os.getenv("RECRAFT_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(_API_URL, headers=headers)
            if r.status_code != 200:
                return None
            data = r.json()
    except Exception:
        return None

    # Endpoint shape is loosely documented; try the obvious envelope.
    blob = ""
    if isinstance(data, dict):
        items = data.get("data") or data.get("models") or []
        blob = " ".join(
            str(item.get("id") or item.get("name") or "")
            for item in items
            if isinstance(item, dict)
        )
    elif isinstance(data, list):
        blob = " ".join(
            str(item.get("id") or item.get("name") or "")
            for item in data
            if isinstance(item, dict)
        )

    return _resolve_from_text("recraft", blob, _API_URL)


def _resolve_from_text(
    family: str, text: str, url: str
) -> SourceFinding | None:
    versions = [int(m.group(1)) for m in _ID_PATTERN.finditer(text)]
    if not versions:
        return None
    highest = max(versions)
    model_id = f"recraftv{highest}"
    return SourceFinding(
        family=family,
        latest_id=model_id,
        release_date="unknown",
        url=url,
        summary=sanitize(
            f"Highest recraft generation observed: '{model_id}' "
            f"(versions seen: {sorted(set(versions))})."
        ),
        capabilities=("text-to-image", "vector-output", "brand-style-control"),
    )
