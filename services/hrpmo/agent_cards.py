"""Read foai/registry/agents/*.yaml into in-memory dicts the HRPMO loop can score against."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Iterable

import yaml

log = logging.getLogger("hrpmo.agent_cards")


def load_agent_cards(agents_dir: str) -> dict[str, dict[str, Any]]:
    """Load every *.yaml under agents_dir. Returns {agent_name: parsed_yaml}.

    Skips files where `enabled: false` is set — HRPMO doesn't score disabled
    agents (they're not running).
    """
    out: dict[str, dict[str, Any]] = {}
    path = Path(agents_dir)
    if not path.exists():
        log.warning("agents_dir does not exist: %s", agents_dir)
        return out
    for f in sorted(path.glob("*.yaml")):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if not isinstance(data, dict):
                continue
            if data.get("enabled") is False:
                continue
            name = data.get("name")
            if not name:
                continue
            out[name] = data
        except Exception as e:  # pragma: no cover — defensive
            log.warning("failed to parse %s: %s", f, e)
    return out


def filter_active(cards: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Active = not deprecated, not blocked, status in {operational, in_development}."""
    return {
        name: data
        for name, data in cards.items()
        if data.get("status") in {"operational", "in_development"}
        and data.get("agent_class") != "executive_orchestrator"  # ACHEEVY scores herself differently
    }
