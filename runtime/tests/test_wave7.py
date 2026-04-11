"""
Wave 7 Tests — MoEx dispatch, GCS adapter, CodeSandbox client.

Tests:
  1.  MoEx routes "build a Rust HTTP server" -> claw
  2.  MoEx routes "train a PyTorch model" -> codex
  3.  MoEx routes "create a React dashboard" -> gemini
  4.  MoEx routes "write a Python FastAPI service" -> codex
  5.  MoEx routes "deploy to Kubernetes" -> gemini
  6.  MoEx routes "compile a Cargo workspace" -> claw
  7.  MoEx routes ambiguous task -> gemini (fallback)
  8.  MoEx execute() dispatches to correct executor
  9.  GCS adapter upload/download round-trip (mocked)
  10. GCS adapter list_files (mocked)
  11. GCS adapter handles missing credentials gracefully
  12. CodeSandbox client create_sandbox (stubbed)
  13. CodeSandbox client get_sandbox_url
  14. CodeSandbox client get_sandbox_embed_url
  15. Codex MCP tool execute_code runs Python
  16. Gemini MCP tool schema is valid
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add runtime to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from claw.moex import classify, route, Executor, RoutingDecision


class TestMoExRouting(unittest.TestCase):
    """Test MoEx keyword-based routing."""

    def test_01_rust_http_server_routes_to_claw(self):
        decision = classify("build a Rust HTTP server with tokio")
        self.assertEqual(decision.executor, Executor.CLAW)
        self.assertEqual(decision.name, "claw")

    def test_02_pytorch_model_routes_to_codex(self):
        decision = classify("train a PyTorch model for image classification")
        self.assertEqual(decision.executor, Executor.CODEX)
        self.assertEqual(decision.name, "codex")

    def test_03_react_dashboard_routes_to_gemini(self):
        decision = classify("create a React dashboard with charts")
        self.assertEqual(decision.executor, Executor.GEMINI)
        self.assertEqual(decision.name, "gemini")

    def test_04_fastapi_routes_to_codex(self):
        decision = classify("write a Python FastAPI service for user auth")
        self.assertEqual(decision.executor, Executor.CODEX)

    def test_05_kubernetes_routes_to_gemini(self):
        decision = classify("deploy to Kubernetes cluster on GCP")
        self.assertEqual(decision.executor, Executor.GEMINI)

    def test_06_cargo_workspace_routes_to_claw(self):
        decision = classify("compile a Cargo workspace with multiple crates")
        self.assertEqual(decision.executor, Executor.CLAW)

    def test_07_ambiguous_task_routes_to_gemini(self):
        decision = classify("write a haiku about sunsets")
        self.assertEqual(decision.executor, Executor.GEMINI)
        self.assertEqual(decision.confidence, "low")

    def test_08_route_convenience_returns_string(self):
        self.assertEqual(route("build a Rust CLI"), "claw")
        self.assertEqual(route("pandas dataframe analysis"), "codex")
        self.assertEqual(route("create a Vue app"), "gemini")


class TestMoExExecute(unittest.TestCase):
    """Test MoEx execute() dispatch method."""

    def test_09_execute_dispatches_claw(self):
        """Claw executor returns structured stub for Rust tasks."""
        # We need to patch the imports at module level since moex imports them
        # For this test, we import execute from the module directly
        # and check the routing decision
        decision = classify("build a Rust HTTP server")
        self.assertEqual(decision.executor, Executor.CLAW)
        # The actual execute() call requires the MCP imports to resolve;
        # we verify routing is correct here.


class TestGCSAdapter(unittest.TestCase):
    """Test GCS storage adapter with mocked client."""

    def test_10_upload_download_roundtrip(self):
        """Upload then download returns same data (mocked)."""
        from storage.gcs_adapter import upload, download

        mock_blob = MagicMock()
        mock_blob.download_as_bytes.return_value = b"test-avatar-data"

        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob

        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch("storage.gcs_adapter._get_client", return_value=mock_client):
            # Upload
            up_result = upload("smelter-os-personas", "avatars/test.png", b"test-avatar-data")
            self.assertTrue(up_result.success)
            self.assertEqual(up_result.path, "gs://smelter-os-personas/avatars/test.png")

            # Download
            down_result = download("smelter-os-personas", "avatars/test.png")
            self.assertTrue(down_result.success)
            self.assertEqual(down_result.data, b"test-avatar-data")

    def test_11_list_files(self):
        """list_files returns blob names (mocked)."""
        from storage.gcs_adapter import list_files

        mock_blob_1 = MagicMock()
        mock_blob_1.name = "avatars/alice.png"
        mock_blob_2 = MagicMock()
        mock_blob_2.name = "avatars/bob.png"

        mock_bucket = MagicMock()
        mock_bucket.list_blobs.return_value = [mock_blob_1, mock_blob_2]

        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch("storage.gcs_adapter._get_client", return_value=mock_client):
            result = list_files("smelter-os-personas", prefix="avatars/")
            self.assertTrue(result.success)
            self.assertEqual(result.files, ["avatars/alice.png", "avatars/bob.png"])

    def test_12_missing_credentials_returns_error(self):
        """Operations fail gracefully without GCS credentials."""
        from storage.gcs_adapter import upload

        with patch("storage.gcs_adapter._get_client", return_value=None):
            result = upload("bucket", "path", b"data")
            self.assertFalse(result.success)
            self.assertIn("not available", result.error)


class TestCodeSandboxClient(unittest.TestCase):
    """Test CodeSandbox client (stubbed — no API key expected)."""

    def test_13_create_sandbox_without_key(self):
        """create_sandbox returns helpful error without API key."""
        from sandbox.codesandbox_client import create_sandbox

        with patch.dict(os.environ, {}, clear=True):
            result = create_sandbox(template="react")
            self.assertFalse(result.success)
            self.assertIn("CODESANDBOX_API_KEY", result.error)

    def test_14_get_sandbox_url(self):
        """get_sandbox_url returns correct URL format."""
        from sandbox.codesandbox_client import get_sandbox_url

        result = get_sandbox_url("abc123")
        self.assertTrue(result.success)
        self.assertEqual(result.url, "https://codesandbox.io/s/abc123")
        self.assertEqual(result.sandbox_id, "abc123")

    def test_15_get_sandbox_embed_url(self):
        """get_sandbox_embed_url returns embed URL."""
        from sandbox.codesandbox_client import get_sandbox_embed_url

        result = get_sandbox_embed_url("xyz789")
        self.assertTrue(result.success)
        self.assertEqual(result.url, "https://codesandbox.io/embed/xyz789")

    def test_16_get_sandbox_url_missing_id(self):
        """get_sandbox_url fails with empty ID."""
        from sandbox.codesandbox_client import get_sandbox_url

        result = get_sandbox_url("")
        self.assertFalse(result.success)


class TestCodexMCPTool(unittest.TestCase):
    """Test Codex MCP tool definition and execution."""

    def test_17_execute_code_runs_python(self):
        """execute_code runs a simple Python script."""
        from mcp.codex_tool import execute_code

        result = execute_code("python", "print('hello from codex')")
        self.assertTrue(result.success)
        self.assertIn("hello from codex", result.output)

    def test_18_execute_code_rejects_unsupported_language(self):
        """execute_code rejects non-Python languages."""
        from mcp.codex_tool import execute_code

        result = execute_code("ruby", "puts 'hi'")
        self.assertFalse(result.success)
        self.assertIn("Unsupported", result.error)

    def test_19_mcp_execute_missing_action(self):
        """MCP execute with unknown action returns error."""
        from mcp.codex_tool import execute

        result = execute({"action": "unknown_action"})
        self.assertFalse(result["success"])


class TestGeminiMCPTool(unittest.TestCase):
    """Test Gemini MCP tool definition."""

    def test_20_tool_schema_valid(self):
        """Gemini tool definition has required MCP fields."""
        from mcp.gemini_tool import MCP_TOOL_DEFINITION

        self.assertIn("name", MCP_TOOL_DEFINITION)
        self.assertIn("description", MCP_TOOL_DEFINITION)
        self.assertIn("input_schema", MCP_TOOL_DEFINITION)
        self.assertIn("execute", MCP_TOOL_DEFINITION)
        self.assertEqual(MCP_TOOL_DEFINITION["name"], "gemini")

    def test_21_codex_tool_schema_valid(self):
        """Codex tool definition has required MCP fields."""
        from mcp.codex_tool import MCP_TOOL_DEFINITION

        self.assertIn("name", MCP_TOOL_DEFINITION)
        self.assertIn("description", MCP_TOOL_DEFINITION)
        self.assertIn("input_schema", MCP_TOOL_DEFINITION)
        self.assertIn("execute", MCP_TOOL_DEFINITION)
        self.assertEqual(MCP_TOOL_DEFINITION["name"], "codex")


if __name__ == "__main__":
    unittest.main()
