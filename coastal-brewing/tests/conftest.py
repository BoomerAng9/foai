"""Shared pytest fixtures for the coastal-brewing test suite."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure scripts/ is on sys.path for all tests
REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(REPO_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(REPO_SCRIPTS))

REPO_CONFIG = Path(__file__).resolve().parents[1] / "config"


@pytest.fixture(autouse=True)
def set_coastal_owner_config_dir(monkeypatch):
    """Point COASTAL_OWNER_CONFIG_DIR at the repo config/ dir for every test
    unless the test overrides it via its own monkeypatch call. This ensures
    cadence._CadenceProxy can resolve pricing-config.json on dev machines
    (which don't have /app/config)."""
    # Only set if not already set in the environment (allows CI override)
    if "COASTAL_OWNER_CONFIG_DIR" not in os.environ:
        monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(REPO_CONFIG))
