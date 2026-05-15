"""Capability registry for the Taskade adapter.

Every capability is a pure function `(client, params) -> result_dict`. The
dispatcher in `main.py` calls these after Pydantic-validating params via
`schemas.CAPABILITY_PARAM_SCHEMAS`.

Endpoint conventions are extrapolated from the proven Coastal companion
integration (`coastal-brewing/scripts/companion_taskade.py`) plus standard
REST patterns. Where an endpoint shape is uncertain (project.archive,
task.update), the trust-gate execution (Phase 1 of integration plan) will
verify against the live Taskade API and we patch if needed.
"""
from __future__ import annotations

import hashlib
import html as html_lib
import logging
from datetime import datetime, timezone
from typing import Any

import bleach
import requests

from . import role_descriptors as rd

log = logging.getLogger("taskade.adapter.capabilities")

_DEFAULT_TIMEOUT = 30  # seconds


# ─── Taskade HTTP client (thin wrapper over requests) ─────────────────────


class TaskadeClient:
    """Owns the Taskade base URL + bearer token. One instance per FastAPI app."""

    def __init__(self, api_base: str, api_token: str, timeout: int = _DEFAULT_TIMEOUT):
        self._base = api_base.rstrip("/")
        self._token = api_token
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def get(self, path: str) -> dict[str, Any]:
        r = requests.get(
            f"{self._base}{path}", headers=self._headers(), timeout=self._timeout
        )
        r.raise_for_status()
        return r.json() if r.content else {}

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = requests.post(
            f"{self._base}{path}",
            headers=self._headers(),
            json=payload,
            timeout=self._timeout,
        )
        r.raise_for_status()
        return r.json() if r.content else {}

    def put(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = requests.put(
            f"{self._base}{path}",
            headers=self._headers(),
            json=payload,
            timeout=self._timeout,
        )
        r.raise_for_status()
        return r.json() if r.content else {}

    def healthcheck(self) -> bool:
        try:
            r = requests.get(
                f"{self._base}/me", headers=self._headers(), timeout=10
            )
            return r.status_code == 200
        except requests.RequestException:
            return False


# ─── Workspace capabilities ───────────────────────────────────────────────


def workspace_list(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    """GET /workspaces — return all workspaces visible to the token."""
    data = client.get("/workspaces")
    workspaces = data.get("workspaces", data if isinstance(data, list) else [])
    return {"workspaces": workspaces}


def workspace_get(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    wid = params["workspace_id"]
    return {"workspace": client.get(f"/workspaces/{wid}")}


# ─── Project capabilities ─────────────────────────────────────────────────


def project_create(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    wid = params["workspace_id"]
    payload: dict[str, Any] = {
        "name": params["title"],
        "type": params.get("project_type", "doc"),
    }
    if params.get("content_html"):
        payload["content"] = [{"text": params["content_html"]}]
    if params.get("folder_id"):
        payload["folderId"] = params["folder_id"]
    result = client.post(f"/workspaces/{wid}/projects", payload)
    return {"project": result}


def project_update(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    pid = params["project_id"]
    payload: dict[str, Any] = {}
    if params.get("title"):
        payload["name"] = params["title"]
    if params.get("content_html"):
        payload["content"] = [{"text": params["content_html"]}]
    result = client.put(f"/projects/{pid}", payload)
    return {"project": result}


def project_archive(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    """Try POST /projects/:id/archive first; if Taskade returns 404,
    fall back to PUT /projects/:id with {archived: true}.

    Trust-gate execution (Phase 1) will pin one or the other after the live
    API surface is confirmed.
    """
    pid = params["project_id"]
    try:
        result = client.post(f"/projects/{pid}/archive", {})
        return {"project": result, "endpoint_used": "POST /projects/:id/archive"}
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            log.warning("project.archive fell back to PUT update — pin in trust gate")
            result = client.put(f"/projects/{pid}", {"archived": True})
            return {"project": result, "endpoint_used": "PUT /projects/:id archived=true"}
        raise


def project_get(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    pid = params["project_id"]
    return {"project": client.get(f"/projects/{pid}")}


# ─── Task (node) capabilities ─────────────────────────────────────────────


def task_add(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    """Add a task (node) to a project. Follows the proven Coastal mindmap
    pattern: POST /projects/:id/nodes with {text, parentId}.
    """
    pid = params["project_id"]
    payload = {"text": params["text"]}
    if params.get("parent_id"):
        payload["parentId"] = params["parent_id"]
    result = client.post(f"/projects/{pid}/nodes", payload)
    return {"task": result}


def task_update(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    pid = params["project_id"]
    tid = params["task_id"]
    payload: dict[str, Any] = {}
    if params.get("text") is not None:
        payload["text"] = params["text"]
    if params.get("completed") is not None:
        payload["completed"] = params["completed"]
    result = client.put(f"/projects/{pid}/nodes/{tid}", payload)
    return {"task": result}


def task_complete(client: TaskadeClient, params: dict[str, Any]) -> dict[str, Any]:
    pid = params["project_id"]
    tid = params["task_id"]
    result = client.put(f"/projects/{pid}/nodes/{tid}", {"completed": True})
    return {"task": result}


# ─── Pure-function capabilities (no Taskade call) ─────────────────────────


def audit_event_render_html(
    client: TaskadeClient, params: dict[str, Any], *, pii_salt: str = ""
) -> dict[str, Any]:
    """Render an audit_event row as HTML for embedding in a Taskade project.

    Sacred Separation applied per `surface`:
      - owner_tier: raw agent names + raw payload
      - client_tier: agent names mapped to role descriptors; model/provider
        names redacted; customer_uid SHA-256 hashed with pii_salt.
    """
    surface = params.get("surface", "client_tier")
    agent = rd.map_agent(params["agent"], surface=surface)
    action = rd.redact_text(params["action"], surface=surface)
    payload_redacted = rd.redact_dict(params.get("payload", {}), surface=surface)

    customer_uid_display = ""
    if params.get("customer_uid"):
        if surface == "client_tier":
            digest = hashlib.sha256(
                (pii_salt + params["customer_uid"]).encode("utf-8")
            ).hexdigest()
            customer_uid_display = f"customer:{digest[:12]}"
        else:
            customer_uid_display = f"customer:{params['customer_uid']}"

    # Sanitize agent + action via bleach before HTML embedding to defeat
    # any injected <script> in payload-derived strings.
    safe_agent = bleach.clean(agent, tags=[], strip=True)
    safe_action = bleach.clean(action, tags=[], strip=True)

    # Render payload as a definition list, HTML-escaping every value.
    payload_items = []
    for k, v in payload_redacted.items():
        safe_key = bleach.clean(str(k), tags=[], strip=True)
        safe_val = html_lib.escape(repr(v) if not isinstance(v, str) else v)
        payload_items.append(f"<dt>{safe_key}</dt><dd>{safe_val}</dd>")
    payload_html = (
        f"<dl>{''.join(payload_items)}</dl>" if payload_items else "<em>(no payload)</em>"
    )

    customer_html = (
        f"<p><strong>{customer_uid_display}</strong></p>" if customer_uid_display else ""
    )

    html = (
        f"<article class=\"audit-event\" data-event-id=\"{bleach.clean(params['event_id'], tags=[], strip=True)}\">"
        f"<header><time>{bleach.clean(params['timestamp'], tags=[], strip=True)}</time> "
        f"— <strong>{safe_agent}</strong>: {safe_action}</header>"
        f"{customer_html}"
        f"{payload_html}"
        f"</article>"
    )
    return {"html": html, "surface": surface}


def coaching_note_append(
    client: TaskadeClient, params: dict[str, Any], *, pii_salt: str = ""
) -> dict[str, Any]:
    """Append a coaching-note HTML block to the project for the given week.

    HRPMO loop calls this with `surface=owner_tier` because the HRPMO folder
    is owner-only. If misconfigured to client_tier, redaction still applies
    safely.
    """
    surface = params.get("surface", "owner_tier")
    agent_name = rd.map_agent(params["agent_name"], surface=surface)
    body = rd.redact_text(params["body_md"], surface=surface)
    safe_body = bleach.linkify(bleach.clean(body, tags=["p", "ul", "li", "strong", "em", "code"], strip=True))

    timestamp = datetime.now(timezone.utc).isoformat()
    html_block = (
        f"<section class=\"coaching-note\" data-week=\"{bleach.clean(params['week_iso'], tags=[], strip=True)}\">"
        f"<header><strong>{bleach.clean(agent_name, tags=[], strip=True)}</strong> "
        f"— cycle <code>{bleach.clean(params['week_iso'], tags=[], strip=True)}</code> "
        f"<time>{timestamp}</time></header>"
        f"<div class=\"body\">{safe_body}</div>"
        f"</section>"
    )

    # Append to project — Taskade-side, this is a project.update with content
    # appended. We use project.update with a content_html addition.
    pid = params["project_id"]
    # Fetch existing project so we can append rather than overwrite.
    existing = client.get(f"/projects/{pid}")
    existing_content = ""
    if isinstance(existing, dict):
        content_list = existing.get("content", [])
        if isinstance(content_list, list) and content_list:
            existing_content = content_list[0].get("text", "")
    new_content = (existing_content or "") + "\n" + html_block
    result = client.put(f"/projects/{pid}", {"content": [{"text": new_content}]})
    return {"appended": True, "html_block": html_block, "project": result}


# ─── Capability registry — dispatch table ─────────────────────────────────


CAPABILITY_REGISTRY: dict[str, Any] = {
    "workspace.list": workspace_list,
    "workspace.get": workspace_get,
    "project.create": project_create,
    "project.update": project_update,
    "project.archive": project_archive,
    "project.get": project_get,
    "task.add": task_add,
    "task.update": task_update,
    "task.complete": task_complete,
    "audit_event.render_html": audit_event_render_html,
    "coaching_note.append": coaching_note_append,
}


# Capabilities that require Taskade API calls (vs pure functions). Used by
# the dispatcher to skip Taskade reachability check for pure functions.
TASKADE_API_CAPABILITIES: set[str] = {
    "workspace.list",
    "workspace.get",
    "project.create",
    "project.update",
    "project.archive",
    "project.get",
    "task.add",
    "task.update",
    "task.complete",
    "coaching_note.append",
}

PURE_FUNCTION_CAPABILITIES: set[str] = {
    "audit_event.render_html",
}
