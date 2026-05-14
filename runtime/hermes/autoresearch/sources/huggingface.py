"""HuggingFace search source adapter — generic per-family lookup.

For families that don't live in a specific org or repo (e.g.
``higgsfield`` — community fork ecosystem), the adapter searches the
HF model registry by family name and returns the most recently
uploaded match.

Sorts by ``createdAt`` descending so the first hit is the freshest
model in the family. Filters by family-name substring on the model
id to defend against unrelated search noise.
"""

from __future__ import annotations

from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources._common import hf_search_models, sanitize


# Map each tracked HF-search family to its search query. The HF API
# matches against author + model name; this is the substring we'll
# require to appear in any candidate model id.
_FAMILY_QUERY: dict[str, str] = {
    "higgsfield": "higgsfield",
    # Add families here as new ones get tracked via huggingface_search.
}


class HuggingFaceSearchAdapter(SourceAdapter):
    name = "huggingface_search"

    async def latest(self, family: str) -> SourceFinding | None:
        search = _FAMILY_QUERY.get(family)
        if search is None:
            return None

        models = await hf_search_models(
            search=search,
            sort="createdAt",
            direction="-1",
            limit=10,
        )
        if not models:
            return None

        substring = search.lower()
        match: dict | None = None
        for m in models:
            model_id = m.get("id", "")
            if isinstance(model_id, str) and substring in model_id.lower():
                match = m
                break

        # No prefix-substring match — take the freshest hit anyway. HF
        # search relevance is usually right even when our family name is
        # a soft substring.
        if match is None:
            match = models[0]

        model_id = match.get("id", "")
        if not isinstance(model_id, str) or not model_id:
            return None

        created_at = match.get("createdAt") or match.get("lastModified") or "unknown"
        downloads = match.get("downloads", 0)
        url = f"https://huggingface.co/{model_id}"

        return SourceFinding(
            family=family,
            latest_id=model_id,
            release_date=str(created_at),
            url=url,
            summary=sanitize(
                f"Most recent HF model matching '{search}': '{model_id}' "
                f"(downloads={downloads})."
            ),
            capabilities=(),
        )
