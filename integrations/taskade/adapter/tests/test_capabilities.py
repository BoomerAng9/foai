"""Tests for capability functions in isolation — mocked Taskade upstream."""
from __future__ import annotations

import os

os.environ.setdefault("TASKADE_API_BASE", "https://api.test.taskade.example/api/v1")
os.environ.setdefault("TASKADE_API_KEY", "test-taskade-key")

import pytest  # noqa: E402
import responses  # noqa: E402

from integrations.taskade.adapter import capabilities as caps  # noqa: E402
from integrations.taskade.adapter import role_descriptors as rd  # noqa: E402

BASE = os.environ["TASKADE_API_BASE"]


@pytest.fixture
def client() -> caps.TaskadeClient:
    return caps.TaskadeClient(api_base=BASE, api_token="test-taskade-key")


# ─── role_descriptors ─────────────────────────────────────────────────────


def test_map_agent_known_client_tier() -> None:
    assert rd.map_agent("Iller_Ang", surface="client_tier") == "Creative Director"
    assert rd.map_agent("ACHEEVY", surface="client_tier") == "CEO"
    assert rd.map_agent("Chicken_Hawk", surface="client_tier") == "Operations Coordinator"


def test_map_agent_owner_tier_passes_through() -> None:
    assert rd.map_agent("Iller_Ang", surface="owner_tier") == "Iller_Ang"


def test_map_agent_unknown_passes_through() -> None:
    assert rd.map_agent("NewlyMintedAgent", surface="client_tier") == "NewlyMintedAgent"


def test_redact_text_strips_model_names() -> None:
    text = "Used claude-opus-4-7 and gpt-5.2 via OpenRouter to generate"
    out = rd.redact_text(text, surface="client_tier")
    assert "claude" not in out.lower()
    assert "gpt" not in out.lower()
    assert "openrouter" not in out.lower()
    assert "language model" in out
    assert "model gateway" in out


def test_redact_text_owner_tier_noop() -> None:
    text = "Used claude-opus-4.7 via Anthropic"
    assert rd.redact_text(text, surface="owner_tier") == text


def test_redact_dict_recursive() -> None:
    data = {
        "agent": "Iller_Ang",
        "nested": {"reviewer": "Betty-Anne_Ang", "note": "claude-haiku-4.5 verdict"},
        "list_field": ["Sal_Ang", "via gpt-5.2"],
    }
    out = rd.redact_dict(data, surface="client_tier")
    assert out["agent"] == "Creative Director"
    assert out["nested"]["reviewer"] == "HR-PMO Director"
    assert "claude" not in out["nested"]["note"].lower()
    assert out["list_field"][0] == "Customer Experience Manager"
    assert "gpt" not in out["list_field"][1].lower()


# ─── workspace ────────────────────────────────────────────────────────────


@responses.activate
def test_workspace_list_list_response_shape(client: caps.TaskadeClient) -> None:
    """Some REST APIs return a bare list; tolerate both shapes."""
    responses.add(
        responses.GET,
        f"{BASE}/workspaces",
        json=[{"id": "ws_1"}, {"id": "ws_2"}],
        status=200,
    )
    result = caps.workspace_list(client, {})
    assert len(result["workspaces"]) == 2


@responses.activate
def test_workspace_get(client: caps.TaskadeClient) -> None:
    responses.add(
        responses.GET,
        f"{BASE}/workspaces/ws_1",
        json={"id": "ws_1", "name": "The Future of AI"},
        status=200,
    )
    result = caps.workspace_get(client, {"workspace_id": "ws_1"})
    assert result["workspace"]["name"] == "The Future of AI"


# ─── project ──────────────────────────────────────────────────────────────


@responses.activate
def test_project_create_doc(client: caps.TaskadeClient) -> None:
    responses.add(
        responses.POST,
        f"{BASE}/workspaces/ws_1/projects",
        json={"id": "proj_1", "name": "Hello"},
        status=201,
    )
    result = caps.project_create(
        client,
        {"workspace_id": "ws_1", "title": "Hello", "content_html": "<p>body</p>"},
    )
    assert result["project"]["id"] == "proj_1"


@responses.activate
def test_project_archive_post_path(client: caps.TaskadeClient) -> None:
    responses.add(
        responses.POST,
        f"{BASE}/projects/proj_1/archive",
        json={"id": "proj_1", "archived": True},
        status=200,
    )
    result = caps.project_archive(client, {"project_id": "proj_1"})
    assert result["project"]["archived"] is True
    assert "archive" in result["endpoint_used"]


@responses.activate
def test_project_archive_fallback_to_put(client: caps.TaskadeClient) -> None:
    """If POST /archive returns 404, fall back to PUT update with archived=true."""
    responses.add(
        responses.POST,
        f"{BASE}/projects/proj_1/archive",
        json={"error": "not found"},
        status=404,
    )
    responses.add(
        responses.PUT,
        f"{BASE}/projects/proj_1",
        json={"id": "proj_1", "archived": True},
        status=200,
    )
    result = caps.project_archive(client, {"project_id": "proj_1"})
    assert "PUT" in result["endpoint_used"]


# ─── task ─────────────────────────────────────────────────────────────────


@responses.activate
def test_task_add(client: caps.TaskadeClient) -> None:
    responses.add(
        responses.POST,
        f"{BASE}/projects/proj_1/nodes",
        json={"id": "task_1", "text": "Do thing"},
        status=201,
    )
    result = caps.task_add(client, {"project_id": "proj_1", "text": "Do thing"})
    assert result["task"]["id"] == "task_1"


@responses.activate
def test_task_complete(client: caps.TaskadeClient) -> None:
    responses.add(
        responses.PUT,
        f"{BASE}/projects/proj_1/nodes/task_1",
        json={"id": "task_1", "completed": True},
        status=200,
    )
    result = caps.task_complete(client, {"project_id": "proj_1", "task_id": "task_1"})
    assert result["task"]["completed"] is True


# ─── audit_event.render_html ──────────────────────────────────────────────


def test_audit_event_render_pii_hashed_client_tier(client: caps.TaskadeClient) -> None:
    result = caps.audit_event_render_html(
        client,
        {
            "event_id": "evt_1",
            "agent": "Iller_Ang",
            "action": "asset_generated",
            "payload": {"note": "Made by claude-opus-4.7"},
            "timestamp": "2026-05-14T20:00:00Z",
            "surface": "client_tier",
            "customer_uid": "cust_alice",
        },
        pii_salt="test-salt-32-bytes-of-padding-here",
    )
    html = result["html"]
    assert "Creative Director" in html
    assert "Iller_Ang" not in html
    assert "cust_alice" not in html
    assert "customer:" in html
    assert "language model" in html


def test_audit_event_render_payload_html_escaped(client: caps.TaskadeClient) -> None:
    result = caps.audit_event_render_html(
        client,
        {
            "event_id": "evt_1",
            "agent": "ACHEEVY",
            "action": "<svg/onload=alert(1)>",
            "payload": {"note": "<script>x</script>"},
            "timestamp": "2026-05-14T20:00:00Z",
            "surface": "owner_tier",
        },
        pii_salt="",
    )
    html = result["html"]
    assert "<script>" not in html
    assert "onload=" not in html


# ─── coaching_note.append (mocked round-trip) ─────────────────────────────


@responses.activate
def test_coaching_note_append_round_trip(client: caps.TaskadeClient) -> None:
    # Existing project content (fetched before append)
    responses.add(
        responses.GET,
        f"{BASE}/projects/cycle_w20",
        json={"id": "cycle_w20", "content": [{"text": "<h1>Week 20</h1>"}]},
        status=200,
    )
    # PUT to append
    responses.add(
        responses.PUT,
        f"{BASE}/projects/cycle_w20",
        json={"id": "cycle_w20", "updated": True},
        status=200,
    )
    result = caps.coaching_note_append(
        client,
        {
            "project_id": "cycle_w20",
            "agent_name": "Iller_Ang",
            "week_iso": "2026-W20",
            "body_md": "Focus on i2v bookend pattern.",
            "surface": "owner_tier",
        },
        pii_salt="",
    )
    assert result["appended"] is True
    assert "Iller_Ang" in result["html_block"]  # owner_tier — not redacted
    assert "2026-W20" in result["html_block"]
