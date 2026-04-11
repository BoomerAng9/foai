"""
Chicken Hawk Gateway — configuration loader.
All values are read from environment variables (set via .env or Docker).
"""

from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache

from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMProvider(str, Enum):
    openai = "openai"
    anthropic = "anthropic"
    ollama = "ollama"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Gateway
    gateway_host: str = Field("0.0.0.0", description="Bind host")
    gateway_port: int = Field(8000, description="Bind port")
    gateway_secret: SecretStr = Field(..., description="Inter-service JWT signing secret")

    # LLM
    llm_provider: LLMProvider = Field(LLMProvider.openai, description="Active LLM provider")
    openai_api_key: SecretStr | None = Field(None)
    anthropic_api_key: SecretStr | None = Field(None)
    ollama_base_url: str | None = Field(None)

    # Lil_Hawk endpoints (default to Cloud Run URLs on foai-aims project)
    trae_hawk_url: str = Field("https://lil-trae-hawk-939270059361.us-central1.run.app", description="Lil_TRAE_Hawk base URL")
    coding_hawk_url: str = Field("https://lil-coding-hawk-939270059361.us-central1.run.app", description="Lil_Coding_Hawk base URL")
    agent_hawk_url: str = Field("https://lil-agent-hawk-939270059361.us-central1.run.app", description="Lil_Agent_Hawk base URL")
    flow_hawk_url: str = Field("https://lil-flow-hawk-939270059361.us-central1.run.app", description="Lil_Flow_Hawk base URL")
    sand_hawk_url: str = Field("https://lil-sand-hawk-939270059361.us-central1.run.app", description="Lil_Sand_Hawk base URL")
    memory_hawk_url: str = Field("https://lil-memory-hawk-939270059361.us-central1.run.app", description="Lil_Memory_Hawk base URL")
    graph_hawk_url: str = Field("https://lil-graph-hawk-939270059361.us-central1.run.app", description="Lil_Graph_Hawk base URL")
    back_hawk_url: str = Field("https://lil-back-hawk-939270059361.us-central1.run.app", description="Lil_Back_Hawk base URL")
    viz_hawk_url: str = Field("https://lil-viz-hawk-939270059361.us-central1.run.app", description="Lil_Viz_Hawk base URL")
    blend_hawk_url: str = Field("https://lil-blend-hawk-939270059361.us-central1.run.app", description="Lil_Blend_Hawk base URL")
    deep_hawk_url: str = Field("https://lil-deep-hawk-939270059361.us-central1.run.app", description="Lil_Deep_Hawk base URL")

    # Observability
    log_level: str = Field("INFO")
    trace_enabled: bool = Field(True)

    # Retry configuration
    llm_retry_attempts: int = Field(3)
    llm_retry_max_wait: int = Field(5)
    dispatch_retry_attempts: int = Field(2)
    dispatch_retry_max_wait: int = Field(5)

    @property
    def hawk_endpoints(self) -> dict[str, str]:
        """Return a mapping of Lil_Hawk name → base URL."""
        return {
            "Lil_TRAE_Hawk": self.trae_hawk_url,
            "Lil_Coding_Hawk": self.coding_hawk_url,
            "Lil_Agent_Hawk": self.agent_hawk_url,
            "Lil_Flow_Hawk": self.flow_hawk_url,
            "Lil_Sand_Hawk": self.sand_hawk_url,
            "Lil_Memory_Hawk": self.memory_hawk_url,
            "Lil_Graph_Hawk": self.graph_hawk_url,
            "Lil_Back_Hawk": self.back_hawk_url,
            "Lil_Viz_Hawk": self.viz_hawk_url,
            "Lil_Blend_Hawk": self.blend_hawk_url,
            "Lil_Deep_Hawk": self.deep_hawk_url,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
