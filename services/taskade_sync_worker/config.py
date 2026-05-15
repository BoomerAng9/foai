"""Pydantic settings — single source of truth for env config."""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — Neon Postgres for production, SQLite for tests
    neon_database_url: str = Field(default="sqlite:///./test-audit-ledger.db", alias="NEON_DATABASE_URL")

    # Taskade adapter service-to-service
    taskade_adapter_url: str = Field(default="http://taskade-adapter:8000", alias="TASKADE_ADAPTER_URL")
    taskade_adapter_bearer: str = Field(default="", alias="TASKADE_ADAPTER_BEARER")

    # Destination workspace + folder
    taskade_default_workspace_id: str = Field(default="", alias="TASKADE_DEFAULT_WORKSPACE_ID")
    taskade_audit_ledger_folder_id: str = Field(default="", alias="TASKADE_AUDIT_LEDGER_FOLDER_ID")

    # Sacred Separation
    taskade_pii_salt: str = Field(default="", alias="TASKADE_PII_SALT")
    sacred_separation_surface: str = Field(default="client_tier", alias="SACRED_SEPARATION_SURFACE")

    # Loop cadence + retry
    sync_interval_seconds: int = Field(default=300, alias="SYNC_INTERVAL_SECONDS")
    max_consecutive_failures: int = Field(default=5, alias="MAX_CONSECUTIVE_FAILURES")

    # Notifier (Chicken Hawk gateway notify endpoint)
    chicken_hawk_notifier_url: str = Field(default="", alias="CHICKEN_HAWK_NOTIFIER_URL")
    chicken_hawk_notifier_bearer: str = Field(default="", alias="CHICKEN_HAWK_NOTIFIER_BEARER")

    log_level: str = Field(default="info", alias="LOG_LEVEL")
