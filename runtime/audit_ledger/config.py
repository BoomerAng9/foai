"""Env config for the audit_ledger writer.

Pydantic-settings; SQLite default for tests, Neon for production.
"""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WriterSettings(BaseSettings):
    """Module-level config; resolves from env or .env at import time."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database URL — Neon for prod, sqlite:///:memory: for tests
    foai_audit_ledger_url: str = Field(
        default="sqlite:///:memory:",
        alias="FOAI_AUDIT_LEDGER_URL",
        description=(
            "Postgres connection string for foai.audit_ledger. Production uses "
            "Neon role with INSERT-only grant on foai.audit_ledger (no SELECT — "
            "reader role is separate). Fall-back to sync_worker NEON_DATABASE_URL."
        ),
    )

    # Fall-back: if NEON_DATABASE_URL is set (shared with sync worker), use it
    neon_database_url: str | None = Field(default=None, alias="NEON_DATABASE_URL")

    # Per-deployment salt for SHA-256 hashing of customer UIDs before write
    foai_pii_salt: str = Field(
        default="",
        alias="FOAI_PII_SALT",
        description=(
            "32-byte random salt for SHA-256 hashing of customer_uid values "
            "before they hit the DB. Empty = writer refuses to write raw UIDs "
            "(fail-closed). Use the same salt as TASKADE_PII_SALT if Taskade "
            "sync needs to correlate."
        ),
    )

    # Also accept TASKADE_PII_SALT as a fallback — same physical salt is used
    # both at write-time and at Taskade-render-time, so they MUST match.
    taskade_pii_salt: str | None = Field(default=None, alias="TASKADE_PII_SALT")

    def resolved_database_url(self) -> str:
        """Pick the canonical DB URL — explicit FOAI_AUDIT_LEDGER_URL beats the
        shared NEON_DATABASE_URL fall-back.
        """
        if self.foai_audit_ledger_url != "sqlite:///:memory:":
            return self.foai_audit_ledger_url
        if self.neon_database_url:
            return self.neon_database_url
        return self.foai_audit_ledger_url

    def resolved_pii_salt(self) -> str:
        """FOAI_PII_SALT wins; TASKADE_PII_SALT is the fall-back when the
        deployment hasn't migrated env names yet.
        """
        return self.foai_pii_salt or self.taskade_pii_salt or ""
