"""
test_moex.py — Tests for Mixture of Executors routing logic.

At least 10 test cases covering routing for different task types.
"""

from __future__ import annotations

import unittest

import sys
from pathlib import Path

# Ensure the runtime/claw package is importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from claw.moex import Executor, RoutingDecision, classify, route


class TestMoExRouting(unittest.TestCase):
    """Test MoEx keyword-based executor routing."""

    # --- Claw (Rust/systems) routing ---

    def test_rust_project_routes_to_claw(self):
        result = classify("Fix the borrow checker error in the Rust module")
        self.assertEqual(result.executor, Executor.CLAW)
        self.assertEqual(result.confidence, "high")

    def test_cargo_build_routes_to_claw(self):
        result = classify("Run cargo build and fix the compilation errors")
        self.assertEqual(result.executor, Executor.CLAW)
        self.assertIn("cargo", result.matched_keyword)

    def test_wasm_routes_to_claw(self):
        result = classify("Compile this to WebAssembly and optimize the binary size")
        self.assertEqual(result.executor, Executor.CLAW)

    def test_kernel_driver_routes_to_claw(self):
        result = classify("Write a kernel driver for the USB device")
        self.assertEqual(result.executor, Executor.CLAW)

    # --- Codex (Python/data/ML) routing ---

    def test_python_script_routes_to_codex(self):
        result = classify("Write a Python script to parse CSV files")
        self.assertEqual(result.executor, Executor.CODEX)
        self.assertEqual(result.confidence, "high")

    def test_pytorch_training_routes_to_codex(self):
        result = classify("Train a PyTorch model on the image dataset")
        self.assertEqual(result.executor, Executor.CODEX)

    def test_pandas_dataframe_routes_to_codex(self):
        result = classify("Create a pandas DataFrame from the JSON API response")
        self.assertEqual(result.executor, Executor.CODEX)

    def test_fastapi_routes_to_codex(self):
        result = classify("Build a FastAPI endpoint for user authentication")
        self.assertEqual(result.executor, Executor.CODEX)

    def test_jupyter_notebook_routes_to_codex(self):
        result = classify("Create a Jupyter notebook for data exploration")
        self.assertEqual(result.executor, Executor.CODEX)

    # --- Gemini (general/frontend/infra) routing ---

    def test_react_app_routes_to_gemini(self):
        result = classify("Build a React component for the dashboard")
        self.assertEqual(result.executor, Executor.GEMINI)
        self.assertEqual(result.confidence, "medium")

    def test_nextjs_routes_to_gemini(self):
        result = classify("Create a Next.js page with server-side rendering")
        self.assertEqual(result.executor, Executor.GEMINI)

    def test_docker_routes_to_gemini(self):
        result = classify("Write a Dockerfile for the production deployment")
        self.assertEqual(result.executor, Executor.GEMINI)

    def test_generic_task_routes_to_gemini_low_confidence(self):
        result = classify("Help me understand this error message")
        self.assertEqual(result.executor, Executor.GEMINI)
        self.assertEqual(result.confidence, "low")
        self.assertIsNone(result.matched_keyword)

    # --- route() convenience function ---

    def test_route_returns_string_name(self):
        self.assertEqual(route("Fix the Rust lifetime error"), "claw")
        self.assertEqual(route("Train a scikit-learn model"), "codex")
        self.assertEqual(route("Deploy to kubernetes cluster"), "gemini")

    # --- Edge cases ---

    def test_empty_input_routes_to_gemini(self):
        result = classify("")
        self.assertEqual(result.executor, Executor.GEMINI)
        self.assertEqual(result.confidence, "low")

    def test_mixed_keywords_first_match_wins(self):
        # "cargo" (claw) appears before any codex keyword when sorted
        result = classify("Use cargo to build the Python FFI bindings")
        self.assertEqual(result.executor, Executor.CLAW)

    def test_routing_decision_name_property(self):
        decision = RoutingDecision(
            executor=Executor.CODEX,
            matched_keyword="python",
            confidence="high",
        )
        self.assertEqual(decision.name, "codex")


if __name__ == "__main__":
    unittest.main()
