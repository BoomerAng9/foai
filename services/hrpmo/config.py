"""Pydantic settings for the HRPMO loop service."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    neon_database_url: str = Field(default="sqlite:///:memory:", alias="NEON_DATABASE_URL")

    # Adapter
    taskade_adapter_url: str = Field(default="http://taskade-adapter:8000", alias="TASKADE_ADAPTER_URL")
    taskade_adapter_bearer: str = Field(default="", alias="TASKADE_ADAPTER_BEARER")
    taskade_default_workspace_id: str = Field(default="", alias="TASKADE_DEFAULT_WORKSPACE_ID")
    taskade_hrpmo_folder_id: str = Field(default="", alias="TASKADE_HRPMO_FOLDER_ID")

    # AutoResearch — dispatch endpoint inside the FOAI runtime
    autoresearch_url: str = Field(default="http://autoresearch:8000", alias="AUTORESEARCH_URL")
    autoresearch_bearer: str = Field(default="", alias="AUTORESEARCH_BEARER")

    # Agent operating card directory
    agents_dir: str = Field(default="/registry/agents", alias="AGENTS_DIR")

    # Scoring thresholds — agents below either trigger coaching
    vibe_threshold: float = Field(default=0.7, alias="VIBE_THRESHOLD")
    kpi_threshold: float = Field(default=0.5, alias="KPI_THRESHOLD")
    max_recipes_per_cycle: int = Field(default=12, alias="MAX_RECIPES_PER_CYCLE")

    # Notifier
    chicken_hawk_notifier_url: str = Field(default="", alias="CHICKEN_HAWK_NOTIFIER_URL")
    chicken_hawk_notifier_bearer: str = Field(default="", alias="CHICKEN_HAWK_NOTIFIER_BEARER")

    # Cycle behavior — when triggered programmatically (else cron does it)
    dry_run: bool = Field(default=False, alias="DRY_RUN")

    log_level: str = Field(default="info", alias="LOG_LEVEL")
