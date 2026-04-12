"""Tests for the Forge CLI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

FORGE_CLI = Path(__file__).resolve().parent.parent.parent / "cli" / "forge.py"


def test_cli_list() -> None:
    r = subprocess.run([sys.executable, str(FORGE_CLI), "list"],
                       capture_output=True, text=True, timeout=10)
    assert r.returncode == 0
    assert "smelt-ingot" in r.stdout


def test_cli_validate() -> None:
    r = subprocess.run([sys.executable, str(FORGE_CLI), "validate", "smelt-ingot"],
                       capture_output=True, text=True, timeout=10)
    assert r.returncode == 0
    assert "Valid" in r.stdout


def test_cli_validate_missing() -> None:
    r = subprocess.run([sys.executable, str(FORGE_CLI), "validate", "nonexistent"],
                       capture_output=True, text=True, timeout=10)
    assert r.returncode != 0


def test_cli_dry_run() -> None:
    r = subprocess.run([sys.executable, str(FORGE_CLI), "run", "smelt-ingot",
                        "--task", "t1", "--dry-run"],
                       capture_output=True, text=True, timeout=10)
    assert r.returncode == 0
    assert "DRY RUN" in r.stdout


def test_cli_no_command() -> None:
    r = subprocess.run([sys.executable, str(FORGE_CLI)],
                       capture_output=True, text=True, timeout=10)
    assert r.returncode != 0
