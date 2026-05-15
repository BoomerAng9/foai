"""Thin HTTP client for the Taskade adapter service."""
from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger("taskade.sync_worker.adapter_client")


class AdapterError(Exception):
    """Raised on non-2xx adapter responses or unreachable adapter."""


class TaskadeAdapterClient:
    def __init__(self, base_url: str, bearer: str, timeout: float = 30.0):
        self._base = base_url.rstrip("/")
        self._bearer = bearer
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._bearer}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def health(self) -> bool:
        try:
            with httpx.Client(timeout=self._timeout) as c:
                r = c.get(f"{self._base}/health")
                return r.status_code == 200 and r.json().get("ok", False)
        except httpx.HTTPError as e:
            log.warning("adapter health check failed: %s", e)
            return False

    def invoke(self, capability: str, params: dict[str, Any]) -> dict[str, Any]:
        payload = {"capability": capability, "params": params}
        with httpx.Client(timeout=self._timeout) as c:
            r = c.post(f"{self._base}/invoke", headers=self._headers(), json=payload)
        if r.status_code != 200:
            raise AdapterError(
                f"adapter /invoke returned {r.status_code}: {r.text[:500]}"
            )
        body = r.json()
        if not body.get("ok"):
            raise AdapterError(f"adapter /invoke ok=false: {body.get('error')}")
        return body.get("result", {})

    def render_audit_html(self, render_params: dict[str, Any]) -> str:
        result = self.invoke("audit_event.render_html", render_params)
        return result["html"]

    def project_create_or_update(
        self,
        *,
        workspace_id: str,
        folder_id: str,
        title: str,
        content_html: str,
        existing_project_id: str | None = None,
    ) -> str:
        """Idempotent helper: create a daily-bucketed project if missing,
        otherwise append content_html to the existing project.

        Returns the project_id.
        """
        if existing_project_id:
            self.invoke(
                "project.update",
                {"project_id": existing_project_id, "content_html": content_html},
            )
            return existing_project_id

        result = self.invoke(
            "project.create",
            {
                "workspace_id": workspace_id,
                "title": title,
                "content_html": content_html,
                "folder_id": folder_id,
                "project_type": "doc",
            },
        )
        return result["project"]["id"]
