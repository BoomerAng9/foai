"""Taskade client mocked at requests-level."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import companion_taskade as taskade  # noqa: E402


def test_provision_workspace_calls_taskade_api():
    fake_resp = mock.MagicMock(status_code=201)
    fake_resp.json.return_value = {"id": "tw_ABC123", "name": "Test"}
    with mock.patch.object(taskade, "_taskade_post", return_value=fake_resp) as p:
        ws_id = taskade.provision_workspace(
            api_token="t_test",
            workspace_name="test@example.com's C|Brew Notes",
        )
    assert ws_id == "tw_ABC123"
    p.assert_called_once()


def test_provision_workspace_raises_on_4xx():
    fake_resp = mock.MagicMock(status_code=403)
    fake_resp.text = "forbidden"
    with mock.patch.object(taskade, "_taskade_post", return_value=fake_resp):
        with pytest.raises(taskade.TaskadeError):
            taskade.provision_workspace(api_token="t_test", workspace_name="X")


def test_push_meeting_doc_returns_id():
    fake_resp = mock.MagicMock(status_code=201)
    fake_resp.json.return_value = {"id": "doc_XYZ"}
    with mock.patch.object(taskade, "_taskade_post", return_value=fake_resp):
        doc_id = taskade.push_meeting_doc(
            api_token="t", workspace_id="w", title="T", body_md="b",
        )
    assert doc_id == "doc_XYZ"


def test_healthcheck_returns_false_on_exception():
    with mock.patch.object(taskade, "_taskade_get",
                           side_effect=Exception("network")):
        assert taskade.healthcheck("t") is False
