"""Risk-event persistence — JSON file with thread lock for v0.

Future: replace with Hermes API call (record_risk_event endpoint).
"""
import json
import os
import pathlib
import threading
from typing import Any, Optional

DATA_DIR = pathlib.Path(os.getenv("NEMOCLAW_DATA_DIR", "/data"))
EVENTS_PATH = DATA_DIR / "risk_events.json"
_lock = threading.Lock()


def _load() -> list[dict[str, Any]]:
    if not EVENTS_PATH.exists():
        return []
    with open(EVENTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(events: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = EVENTS_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
    tmp.replace(EVENTS_PATH)


def append_event(event: dict[str, Any]) -> None:
    with _lock:
        events = _load()
        events.append(event)
        _save(events)


def list_events(limit: int = 100, severity: Optional[str] = None) -> list[dict[str, Any]]:
    with _lock:
        events = _load()
    if severity:
        events = [e for e in events if e.get("severity") == severity]
    return events[-limit:]
