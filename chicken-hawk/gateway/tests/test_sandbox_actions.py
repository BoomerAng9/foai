"""Unit tests for sandbox_actions — Phase 1C dispatcher into aims-open-sandbox.

The aims-open-sandbox endpoint is mocked via httpx.MockTransport so the
suite runs offline. We cover the three handler functions
(dispatch_sandbox_job / get_job_status / list_recent_jobs) plus the
input-validation gate on the dispatcher.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx
import pytest

# Make gateway package importable without depending on the full FastAPI app
GATEWAY_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(GATEWAY_DIR))

import sandbox_actions  # noqa: E402


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def mock_sandbox(monkeypatch):
    """Patch httpx.AsyncClient to route through MockTransport returning
    whatever the test sets via ``handler``.
    """
    state = {"handler": None}

    real_async_client = httpx.AsyncClient

    def make_client(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(state["handler"])
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(sandbox_actions.httpx, "AsyncClient", make_client)
    return state


# ─── dispatch_sandbox_job — validation gates ────────────────────────


class TestDispatchValidation:
    def test_rejects_missing_code(self):
        result = _run(sandbox_actions.dispatch_sandbox_job({"language": "python"}))
        assert result["ok"] is False
        assert "code" in result["error"]

    def test_rejects_empty_code(self):
        result = _run(sandbox_actions.dispatch_sandbox_job({"code": "", "language": "python"}))
        assert result["ok"] is False

    def test_rejects_oversized_code(self):
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "x" * 200_000, "language": "python"}
        ))
        assert result["ok"] is False
        assert "100KB" in result["error"]

    def test_rejects_unsupported_language(self):
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "echo hi", "language": "cobol"}
        ))
        assert result["ok"] is False
        assert "cobol" in result["error"]

    def test_rejects_missing_language(self):
        result = _run(sandbox_actions.dispatch_sandbox_job({"code": "echo hi"}))
        assert result["ok"] is False


# ─── dispatch_sandbox_job — happy path ──────────────────────────────


class TestDispatchHappyPath:
    def test_returns_slim_projection_on_success(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            assert req.method == "POST"
            assert req.url.path == "/api/sandbox/execute"
            body = req.read().decode()
            assert "print" in body
            assert "python" in body
            return httpx.Response(
                201,
                json={
                    "ok": True,
                    "execution": {
                        "id": "exec_abc",
                        "status": "completed",
                        "language": "python",
                        "stdout": "hello",
                        "stderr": "",
                        "durationMs": 42,
                    },
                },
            )

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "print('hello')", "language": "python"}
        ))
        assert result["ok"] is True
        assert result["execution_id"] == "exec_abc"
        assert result["status"] == "completed"
        assert result["language"] == "python"
        assert result["stdout"] == "hello"
        assert result["duration_ms"] == 42

    def test_clamps_timeout_to_300(self, mock_sandbox):
        captured = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["body"] = req.read().decode()
            return httpx.Response(201, json={"ok": True, "execution": {"id": "x"}})

        mock_sandbox["handler"] = handler
        _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "x", "language": "bash", "timeout_seconds": 9999}
        ))
        assert "300" in captured["body"]

    def test_truncates_huge_stdout_in_slim_projection(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(
                201,
                json={
                    "execution": {
                        "id": "exec_big",
                        "status": "completed",
                        "language": "bash",
                        "stdout": "A" * 5000,
                        "stderr": "",
                    }
                },
            )

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "echo big", "language": "bash"}
        ))
        assert result["ok"] is True
        # 2000-char window + ellipsis annotation
        assert len(result["stdout"]) > 2000
        assert "more chars" in result["stdout"]


# ─── dispatch_sandbox_job — failure paths ───────────────────────────


class TestDispatchFailurePaths:
    def test_returns_error_on_5xx(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "container_oom"})

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "x", "language": "bash"}
        ))
        assert result["ok"] is False
        assert result["status_code"] == 500
        assert "container_oom" in result["error"]

    def test_returns_error_on_network_failure(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("DNS failure")

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.dispatch_sandbox_job(
            {"code": "x", "language": "bash"}
        ))
        assert result["ok"] is False
        assert "unreachable" in result["error"]


# ─── get_job_status ─────────────────────────────────────────────────


class TestGetJobStatus:
    def test_rejects_empty_execution_id(self):
        result = _run(sandbox_actions.get_job_status(""))
        assert result["ok"] is False

    def test_returns_slim_projection(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            assert req.url.path == "/api/sandbox/executions/exec_xyz"
            return httpx.Response(
                200,
                json={
                    "execution": {
                        "id": "exec_xyz",
                        "status": "completed",
                        "language": "python",
                        "stdout": "ok",
                        "stderr": "",
                        "durationMs": 11,
                        "startedAt": "2026-05-14T01:00:00Z",
                        "completedAt": "2026-05-14T01:00:01Z",
                    }
                },
            )

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.get_job_status("exec_xyz"))
        assert result["ok"] is True
        assert result["execution_id"] == "exec_xyz"
        assert result["status"] == "completed"
        assert result["duration_ms"] == 11

    def test_returns_not_found_on_404(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(404, json={"error": "Execution not found"})

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.get_job_status("exec_missing"))
        assert result["ok"] is False
        assert result["error"] == "execution_not_found"


# ─── list_recent_jobs ───────────────────────────────────────────────


class TestListRecentJobs:
    def test_returns_slim_list(self, mock_sandbox):
        def handler(req: httpx.Request) -> httpx.Response:
            assert "limit=10" in str(req.url)
            return httpx.Response(
                200,
                json={
                    "executions": [
                        {
                            "id": "exec_1",
                            "status": "completed",
                            "language": "python",
                            "durationMs": 50,
                            "startedAt": "2026-05-14T00:00:00Z",
                            # Extra fields the slim projection drops
                            "stdout": "noise",
                            "code": "secret",
                        },
                        {
                            "id": "exec_2",
                            "status": "running",
                            "language": "bash",
                            "durationMs": None,
                            "startedAt": "2026-05-14T00:01:00Z",
                        },
                    ]
                },
            )

        mock_sandbox["handler"] = handler
        result = _run(sandbox_actions.list_recent_jobs(limit=10))
        assert result["ok"] is True
        assert len(result["executions"]) == 2
        assert result["executions"][0]["id"] == "exec_1"
        # Extra fields stripped from the slim projection
        assert "stdout" not in result["executions"][0]
        assert "code" not in result["executions"][0]

    def test_clamps_limit_to_200(self, mock_sandbox):
        captured = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["url"] = str(req.url)
            return httpx.Response(200, json={"executions": []})

        mock_sandbox["handler"] = handler
        _run(sandbox_actions.list_recent_jobs(limit=99_999))
        assert "limit=200" in captured["url"]
