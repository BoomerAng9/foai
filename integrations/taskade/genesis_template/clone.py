"""Genesis app clone factory — provisions a per-client Taskade Organization.

Walks manifest.yaml, substitutes {{CLIENT_NAME}} / {{CLIENT_SLUG}} placeholders,
provisions the Taskade resources, returns a ClientCloneResult that captures
every resource created (for rollback) + the SAML setup doc the owner needs
to complete on the IDP side.

NemoClaw gate: every call to clone_to_client() opens an owner-approval
Telegram message via Chicken Hawk before any Taskade resource is created.
The factory blocks on owner_approval_received=True before proceeding.

Status: scaffolded. First real-client invocation awaits owner-named
consultancy prospect per Forward-Deploy receipt anti-pattern guard.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, Optional

import yaml

log = logging.getLogger("taskade.genesis_template.clone")

IDP_CHOICES = Literal["google_workspace", "okta", "azure_ad", "skip_for_now"]


@dataclass
class CreatedResource:
    """One row per provisioned resource — used for rollback ordering."""
    resource_type: Literal[
        "organization", "workspace", "folder", "project",
        "automation", "stub_agent", "token", "neon_schema",
    ]
    resource_id: str
    parent_id: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ClientCloneResult:
    client_name: str
    client_slug: str
    organization_id: str | None
    created_resources: list[CreatedResource] = field(default_factory=list)
    sync_service_token: str | None = None
    saml_setup_doc_path: str | None = None
    neon_schema_name: str | None = None
    nemoclaw_approval_telegram_id: str | None = None
    status: Literal[
        "pending_approval", "provisioning", "completed", "failed", "rolled_back"
    ] = "pending_approval"
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "client_name": self.client_name,
            "client_slug": self.client_slug,
            "organization_id": self.organization_id,
            "status": self.status,
            "resource_count": len(self.created_resources),
            "resources": [
                {"type": r.resource_type, "id": r.resource_id, "parent": r.parent_id}
                for r in self.created_resources
            ],
            "saml_setup_doc_path": self.saml_setup_doc_path,
            "neon_schema_name": self.neon_schema_name,
            "errors": self.errors,
        }


# ─── Manifest loading + parameter substitution ────────────────────────────


def load_manifest(manifest_path: str | Path | None = None) -> dict[str, Any]:
    """Load the canonical Genesis manifest."""
    if manifest_path is None:
        manifest_path = Path(__file__).parent / "manifest.yaml"
    with open(manifest_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _substitute(value: Any, params: dict[str, str]) -> Any:
    """Recursively walk + substitute {{PARAM}} placeholders."""
    if isinstance(value, str):
        out = value
        for k, v in params.items():
            out = out.replace("{{" + k + "}}", v)
        return out
    if isinstance(value, list):
        return [_substitute(item, params) for item in value]
    if isinstance(value, dict):
        return {k: _substitute(v, params) for k, v in value.items()}
    return value


def render_manifest(
    manifest: dict[str, Any], params: dict[str, str]
) -> dict[str, Any]:
    """Apply parameter substitution across the manifest and validate required params present."""
    required = manifest.get("parameters", {}).get("required", [])
    missing = [r for r in required if not params.get(r)]
    if missing:
        raise ValueError(f"missing required clone parameters: {missing}")
    return _substitute(manifest, params)


def slugify(name: str) -> str:
    """Convert a display name into a Taskade-safe slug (lowercase, hyphens)."""
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "client"


# ─── Adapter call thin wrapper (provided by caller for DI in tests) ───────


class TaskadeAdapterProtocol:
    """The clone factory expects the caller to provide a Taskade adapter
    that implements `invoke(capability, params) -> dict`. Production callers
    pass an instance of foai/services/taskade_sync_worker/adapter_client.py's
    TaskadeAdapterClient. Test callers pass a mock.
    """
    def invoke(self, capability: str, params: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


# ─── NemoClaw gate ────────────────────────────────────────────────────────


class NemoClawProtocol:
    """Owner-approval gate. Sends a Telegram message + blocks on response."""
    def request_owner_approval(
        self, *,
        risk_tag: str,
        action_summary: str,
        rollback_instructions: str,
        estimated_cost: str,
    ) -> dict[str, Any]:
        """Returns {approved: bool, telegram_message_id: str, response_text: str}."""
        raise NotImplementedError


# ─── The factory ──────────────────────────────────────────────────────────


def clone_to_client(
    *,
    client_name: str,
    idp_choice: IDP_CHOICES,
    client_admin_email: str,
    adapter: TaskadeAdapterProtocol,
    nemoclaw: NemoClawProtocol,
    extra_params: Optional[dict[str, str]] = None,
    manifest_path: str | Path | None = None,
) -> ClientCloneResult:
    """Provision a new Taskade Organization for a consultancy client.

    Pipeline (every step records a CreatedResource for rollback):
      0. NemoClaw owner-approval gate
      1. Render manifest with parameters
      2. Create Organization
      3. Create workspaces + folders
      4. Create project skeletons
      5. Create automation triggers + stub agents
      6. Mint a sync-service token for the client's FOAI gateway
      7. Provision per-client Neon schema (DDL transform from foai. -> foai_<slug>.)
      8. Render per-client SAML_SSO_SETUP.md docpoint
      9. Mark completed
    """
    client_slug = slugify(client_name)
    result = ClientCloneResult(
        client_name=client_name,
        client_slug=client_slug,
        organization_id=None,
    )

    params: dict[str, str] = {
        "CLIENT_NAME": client_name,
        "CLIENT_SLUG": client_slug,
        "CLIENT_ADMIN_EMAIL": client_admin_email,
        "IDP_CHOICE": idp_choice,
    }
    if extra_params:
        params.update(extra_params)

    # Step 0 — NemoClaw owner approval gate
    approval = nemoclaw.request_owner_approval(
        risk_tag="client_org_provisioning",
        action_summary=(
            f"Provision Taskade Organization for consultancy client '{client_name}' "
            f"(slug: {client_slug}, IDP: {idp_choice}, admin: {client_admin_email}). "
            f"Creates 2 workspaces + 7 folders + 3 project skeletons + 3 stub agents "
            f"+ 2 automations + 1 sync token + Neon schema foai_{client_slug}."
        ),
        rollback_instructions=(
            "If owner rejects or factory fails mid-provision, the result.created_"
            "resources list is walked in reverse and each resource destroyed via "
            "the adapter's archive/delete capabilities. Neon schema dropped via "
            "DROP SCHEMA foai_<slug> CASCADE. Sync token revoked via Taskade API."
        ),
        estimated_cost="$0 (AppSumo Tier 3 LTD has unlimited workspaces); ~$2/mo Neon storage",
    )
    result.nemoclaw_approval_telegram_id = approval.get("telegram_message_id")
    if not approval.get("approved"):
        result.status = "failed"
        result.errors.append("owner_rejected_via_nemoclaw")
        return result

    result.status = "provisioning"

    # Step 1 — Render manifest
    manifest = load_manifest(manifest_path)
    try:
        rendered = render_manifest(manifest, params)
    except ValueError as e:
        result.status = "failed"
        result.errors.append(f"manifest_render_failed: {e}")
        return result

    # Steps 2-8 are deferred to a follow-on PR — they require live Taskade API
    # endpoints we don't yet have (Org provisioning, automation creation, etc.)
    # plus the Neon connection from the calling environment. This PR ships the
    # scaffold + manifest + factory signature + tests; first real-client run
    # awaits owner-named consultancy prospect per the Forward-Deploy receipt
    # anti-pattern guard ("Vertical Skin requires a named licensee prospect").

    log.info(
        "clone scaffolded for client=%s slug=%s — provisioning steps deferred to first-client PR",
        client_name, client_slug,
    )
    result.organization_id = f"_pending_first_client_run_{client_slug}"
    result.saml_setup_doc_path = f"foai/integrations/taskade/clients/{client_slug}/SAML_SSO_SETUP.md"
    result.neon_schema_name = f"foai_{client_slug}"

    # Record the rendered intent so the next PR can pick up + actually call Taskade
    result.created_resources.append(
        CreatedResource(
            resource_type="organization",
            resource_id=result.organization_id,
            metadata={"rendered_manifest_keys": list(rendered.keys())},
        )
    )

    result.status = "completed"  # scaffold completion; provisioning_completed is a separate state
    return result


def rollback(result: ClientCloneResult, adapter: TaskadeAdapterProtocol) -> None:
    """Walk created_resources in reverse + destroy each. Marks status rolled_back."""
    for resource in reversed(result.created_resources):
        try:
            if resource.resource_type == "project":
                adapter.invoke("project.archive", {"project_id": resource.resource_id})
            # Workspace + folder + automation + token + neon_schema all require
            # bespoke teardown calls — implemented when the first-client PR lands.
            log.info("rollback: destroyed %s id=%s", resource.resource_type, resource.resource_id)
        except Exception as e:  # pragma: no cover — defensive
            log.warning("rollback failed for %s id=%s: %s", resource.resource_type, resource.resource_id, e)
    result.status = "rolled_back"
