"""Chicken Hawk ↔ Hermes bridge.

Thin async HTTP client for the Hermes LearnAng evaluation engine. Chicken
Hawk calls Hermes when a routed job needs memory recall, agent evaluation,
trend lookup, or cross-evaluation comparison. All calls authenticate with
the Hermes API key pulled from Secret Manager at boot.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
import structlog

logger = structlog.get_logger("chicken_hawk.hermes_client")


class HermesNotConfigured(RuntimeError):
    """Raised when HERMES_URL or HERMES_API_KEY is missing at runtime."""


class HermesClient:
    """Async client for the Hermes Cloud Run service."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._base_url = (base_url or os.getenv("HERMES_URL", "")).rstrip("/")
        self._api_key = api_key or os.getenv("HERMES_API_KEY", "")
        self._client = httpx.AsyncClient(timeout=timeout)

    @property
    def configured(self) -> bool:
        return bool(self._base_url and self._api_key)

    def _require_configured(self) -> None:
        if not self.configured:
            raise HermesNotConfigured(
                "HERMES_URL and HERMES_API_KEY must both be set"
            )

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def health(self) -> dict[str, Any]:
        if not self._base_url:
            raise HermesNotConfigured("HERMES_URL not set")
        r = await self._client.get(f"{self._base_url}/health")
        r.raise_for_status()
        return r.json()

    async def recall_memory(
        self,
        query: str,
        tenant_id: str = "cti",
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        self._require_configured()
        payload = {"query": query, "tenant_id": tenant_id, "top_k": top_k}
        try:
            r = await self._client.post(
                f"{self._base_url}/memory/recall",
                json=payload,
                headers=self._headers(),
            )
            r.raise_for_status()
            return r.json().get("results", [])
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "hermes_recall_failed",
                status=exc.response.status_code,
                query=query[:100],
            )
            return []

    async def trigger_evaluation(
        self,
        tenant_id: str = "cti",
        eval_type: str = "daily",
    ) -> dict[str, Any]:
        self._require_configured()
        payload = {"tenant_id": tenant_id, "eval_type": eval_type}
        r = await self._client.post(
            f"{self._base_url}/evaluate/trigger",
            json=payload,
            headers=self._headers(),
        )
        r.raise_for_status()
        return r.json()

    async def get_trends(
        self,
        tenant_id: str = "cti",
        limit: int = 30,
    ) -> dict[str, Any]:
        self._require_configured()
        r = await self._client.get(
            f"{self._base_url}/trends/",
            params={"tenant_id": tenant_id, "limit": limit},
            headers=self._headers(),
        )
        r.raise_for_status()
        return r.json()

    async def compare(
        self,
        eval_id_a: str,
        eval_id_b: str,
        tenant_id: str = "cti",
    ) -> dict[str, Any]:
        self._require_configured()
        r = await self._client.get(
            f"{self._base_url}/compare/",
            params={
                "tenant_id": tenant_id,
                "eval_id_a": eval_id_a,
                "eval_id_b": eval_id_b,
            },
            headers=self._headers(),
        )
        r.raise_for_status()
        return r.json()

    async def aclose(self) -> None:
        await self._client.aclose()
