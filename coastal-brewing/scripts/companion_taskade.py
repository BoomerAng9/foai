"""Taskade Public API client for per-user workspace provisioning +
note/mind-map writes.

API reference: https://developers.taskade.com/

Per-user workspace pattern: a single FOAI service account owns the
master account; each C|Brew Companion paid activation creates a
WORKSPACE under that service account via POST /workspaces. The
workspace_id is stored on the user's profile
(audit_ledger.companion_workspaces) and used for all subsequent
writes.

Internal-only — Taskade name never appears on customer surfaces.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import requests

log = logging.getLogger("coastal.companion.taskade")

_BASE = "https://www.taskade.com/api/v1"


class TaskadeError(Exception):
    pass


def _taskade_post(api_token: str, path: str, payload: dict[str, Any]) -> requests.Response:
    return requests.post(
        f"{_BASE}{path}",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )


def _taskade_get(api_token: str, path: str) -> requests.Response:
    return requests.get(
        f"{_BASE}{path}",
        headers={"Authorization": f"Bearer {api_token}"},
        timeout=15,
    )


def provision_workspace(*, api_token: str, workspace_name: str) -> str:
    """Create a new Taskade workspace and return its ID."""
    resp = _taskade_post(api_token, "/workspaces", {"name": workspace_name})
    if resp.status_code not in (200, 201):
        log.warning(
            "taskade workspace create failed %s: %s",
            resp.status_code, getattr(resp, "text", ""),
        )
        raise TaskadeError(f"workspace create failed {resp.status_code}")
    return resp.json()["id"]


def push_meeting_doc(*, api_token: str, workspace_id: str,
                     title: str, body_md: str) -> str:
    """Create a doc inside the user's workspace and return its ID."""
    resp = _taskade_post(
        api_token,
        f"/workspaces/{workspace_id}/projects",
        {"name": title, "type": "doc",
         "content": [{"text": body_md}]},
    )
    if resp.status_code not in (200, 201):
        raise TaskadeError(f"doc create failed {resp.status_code}")
    return resp.json()["id"]


def push_mindmap_nodes(*, api_token: str, workspace_id: str,
                       root_label: str,
                       branches: list[dict[str, Any]]) -> str:
    """Create a mind-map project under the workspace. `branches` is a
    list of {label, children: [...]} (recursive). Returns project_id."""
    project_resp = _taskade_post(
        api_token,
        f"/workspaces/{workspace_id}/projects",
        {"name": root_label, "type": "mindmap"},
    )
    if project_resp.status_code not in (200, 201):
        raise TaskadeError(f"mindmap create failed {project_resp.status_code}")
    project_id = project_resp.json()["id"]

    def _walk(parent_id: Optional[str], nodes: list[dict[str, Any]]) -> None:
        for n in nodes:
            r = _taskade_post(
                api_token,
                f"/projects/{project_id}/nodes",
                {"text": n.get("label", ""), "parentId": parent_id},
            )
            if r.status_code not in (200, 201):
                log.warning("mindmap node write failed %s", r.status_code)
                continue
            new_id = r.json()["id"]
            children = n.get("children", []) or []
            if children:
                _walk(new_id, children)

    _walk(None, branches)
    return project_id


def healthcheck(api_token: str) -> bool:
    try:
        r = _taskade_get(api_token, "/me")
        return r.status_code == 200
    except Exception:
        return False
