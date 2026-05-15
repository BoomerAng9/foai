"""Tests for the Genesis clone factory."""
from __future__ import annotations

from typing import Any

import pytest

from integrations.taskade.genesis_template import clone


class FakeAdapter:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def invoke(self, capability: str, params: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((capability, params))
        return {"ok": True}


class FakeNemoClawApprove:
    def request_owner_approval(self, **kwargs: Any) -> dict[str, Any]:
        return {"approved": True, "telegram_message_id": "msg_test"}


class FakeNemoClawReject:
    def request_owner_approval(self, **kwargs: Any) -> dict[str, Any]:
        return {"approved": False, "telegram_message_id": "msg_test"}


# ─── slugify ──────────────────────────────────────────────────────────────


def test_slugify_basic() -> None:
    assert clone.slugify("Acme Coffee Roasters") == "acme-coffee-roasters"


def test_slugify_strips_special_chars() -> None:
    assert clone.slugify("Foo & Bar Co.!") == "foo-bar-co"


def test_slugify_empty_fallback() -> None:
    assert clone.slugify("") == "client"
    assert clone.slugify("???") == "client"


# ─── render_manifest ──────────────────────────────────────────────────────


def test_render_manifest_substitutes_placeholders() -> None:
    manifest = clone.load_manifest()
    rendered = clone.render_manifest(
        manifest,
        params={
            "CLIENT_NAME": "Acme",
            "CLIENT_SLUG": "acme",
            "CLIENT_ADMIN_EMAIL": "admin@acme.test",
            "IDP_CHOICE": "google_workspace",
        },
    )
    assert rendered["organization"]["display_name"] == "Acme"
    # No raw placeholders left in workspace names
    for ws in rendered["workspaces"]:
        assert "{{CLIENT_NAME}}" not in ws["name"]
        assert "Acme" in ws["name"]


def test_render_manifest_missing_required_raises() -> None:
    manifest = clone.load_manifest()
    with pytest.raises(ValueError, match="missing required clone parameters"):
        clone.render_manifest(manifest, params={"CLIENT_NAME": "Acme"})


# ─── clone_to_client end-to-end (scaffold mode) ───────────────────────────


def test_clone_owner_rejected_returns_failed() -> None:
    result = clone.clone_to_client(
        client_name="Acme",
        idp_choice="google_workspace",
        client_admin_email="admin@acme.test",
        adapter=FakeAdapter(),
        nemoclaw=FakeNemoClawReject(),
    )
    assert result.status == "failed"
    assert "owner_rejected_via_nemoclaw" in result.errors
    # Nothing should have been provisioned
    assert result.created_resources == []


def test_clone_happy_path_scaffold() -> None:
    result = clone.clone_to_client(
        client_name="Acme Coffee",
        idp_choice="google_workspace",
        client_admin_email="admin@acme.test",
        adapter=FakeAdapter(),
        nemoclaw=FakeNemoClawApprove(),
    )
    assert result.status == "completed"
    assert result.client_slug == "acme-coffee"
    assert result.neon_schema_name == "foai_acme-coffee"
    assert result.saml_setup_doc_path == "foai/integrations/taskade/clients/acme-coffee/SAML_SSO_SETUP.md"
    # At least one CreatedResource recorded (the organization placeholder)
    assert len(result.created_resources) >= 1
    org_resource = result.created_resources[0]
    assert org_resource.resource_type == "organization"


def test_clone_records_nemoclaw_telegram_id() -> None:
    result = clone.clone_to_client(
        client_name="Acme",
        idp_choice="skip_for_now",
        client_admin_email="admin@acme.test",
        adapter=FakeAdapter(),
        nemoclaw=FakeNemoClawApprove(),
    )
    assert result.nemoclaw_approval_telegram_id == "msg_test"


def test_clone_to_dict_serializes() -> None:
    result = clone.clone_to_client(
        client_name="Test Co",
        idp_choice="okta",
        client_admin_email="admin@test.co",
        adapter=FakeAdapter(),
        nemoclaw=FakeNemoClawApprove(),
    )
    d = result.to_dict()
    assert d["client_name"] == "Test Co"
    assert d["client_slug"] == "test-co"
    assert d["status"] == "completed"
    assert isinstance(d["resources"], list)


# ─── rollback ─────────────────────────────────────────────────────────────


def test_rollback_walks_resources_reverse() -> None:
    adapter = FakeAdapter()
    result = clone.ClientCloneResult(
        client_name="Acme",
        client_slug="acme",
        organization_id="org_1",
        created_resources=[
            clone.CreatedResource("project", "proj_1"),
            clone.CreatedResource("project", "proj_2"),
        ],
    )
    clone.rollback(result, adapter)
    assert result.status == "rolled_back"
    # Both archive calls should fire (order is reverse)
    capabilities = [c[0] for c in adapter.calls]
    assert capabilities == ["project.archive", "project.archive"]
    ids = [c[1]["project_id"] for c in adapter.calls]
    assert ids == ["proj_2", "proj_1"]  # reverse order
