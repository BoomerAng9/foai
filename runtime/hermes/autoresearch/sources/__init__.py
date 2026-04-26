"""Source adapters — per-vendor scrapers that surface the latest
compatible model release for a given `family`.

Each adapter implements the same contract:

    async def latest(family: str) -> SourceFinding | None

Returns None if the family isn't supported by this source. The engine
dispatches based on `TrackedModel.source`.
"""

from autoresearch.sources.base import SourceFinding, SourceAdapter
from autoresearch.sources.nvidia import NvidiaHFAdapter, NvidiaGithubCosmosAdapter
from autoresearch.sources.stubs import StubAdapter

ADAPTERS: dict[str, SourceAdapter] = {
    "nvidia_hf": NvidiaHFAdapter(),
    "nvidia_github_cosmos": NvidiaGithubCosmosAdapter(),
    # Stubs — replaced with real adapters as we wire them.
    "fal_models": StubAdapter("fal_models"),
    "recraft_api": StubAdapter("recraft_api"),
    "google_aistudio": StubAdapter("google_aistudio"),
    "anthropic_api": StubAdapter("anthropic_api"),
    "huggingface_search": StubAdapter("huggingface_search"),
}

__all__ = ["ADAPTERS", "SourceAdapter", "SourceFinding"]
