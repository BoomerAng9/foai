"""Source adapters — per-vendor scrapers that surface the latest
compatible model release for a given `family`.

Each adapter implements the same contract:

    async def latest(family: str) -> SourceFinding | None

Returns None if the family isn't supported by this source. The engine
dispatches based on `TrackedModel.source`.
"""

from autoresearch.sources.anthropic import AnthropicDocsAdapter
from autoresearch.sources.base import SourceAdapter, SourceFinding
from autoresearch.sources.fal import FalModelsAdapter
from autoresearch.sources.google import GoogleAIStudioAdapter
from autoresearch.sources.huggingface import HuggingFaceSearchAdapter
from autoresearch.sources.nvidia import NvidiaHFAdapter, NvidiaGithubCosmosAdapter
from autoresearch.sources.recraft import RecraftApiAdapter
from autoresearch.sources.stubs import StubAdapter

ADAPTERS: dict[str, SourceAdapter] = {
    "nvidia_hf": NvidiaHFAdapter(),
    "nvidia_github_cosmos": NvidiaGithubCosmosAdapter(),
    "fal_models": FalModelsAdapter(),
    "recraft_api": RecraftApiAdapter(),
    "google_aistudio": GoogleAIStudioAdapter(),
    "anthropic_api": AnthropicDocsAdapter(),
    "huggingface_search": HuggingFaceSearchAdapter(),
}

__all__ = ["ADAPTERS", "SourceAdapter", "SourceFinding", "StubAdapter"]
