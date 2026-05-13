"""Tests for the mtime-cached JSON loader used by pricing / voice / email
config surfaces. Pinning:
- cached values are returned on repeated calls without re-reading disk
- mtime change → cached value invalidated and disk re-read
- atomic_write_json: tempfile + os.replace, no partial writes visible to readers
- malformed JSON on disk returns the last-good cached value AND logs a warning
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

from owner_config_loader import load_json, atomic_write_json, _CACHE  # noqa: E402


@pytest.fixture(autouse=True)
def clear_cache():
    _CACHE.clear()
    yield
    _CACHE.clear()


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_first_read_caches_value(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    out = load_json(p)
    assert out == {"a": 1}
    assert str(p) in _CACHE


def test_second_read_returns_cached_without_re_reading(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    with mock.patch("owner_config_loader._read_disk", side_effect=AssertionError("must not re-read")):
        out = load_json(p)
    assert out == {"a": 1}


def test_mtime_change_invalidates_cache(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    # advance mtime
    time.sleep(0.01)
    _write(p, {"a": 2})
    out = load_json(p)
    assert out == {"a": 2}


def test_atomic_write_then_read_round_trip(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    atomic_write_json(p, {"a": 99})
    assert load_json(p) == {"a": 99}


def test_atomic_write_uses_tempfile_replace(tmp_path):
    p = tmp_path / "cfg.json"
    # No previous file
    atomic_write_json(p, {"created": True})
    assert json.loads(p.read_text()) == {"created": True}
    # No leftover temp files in dir
    leftovers = [f for f in tmp_path.iterdir() if f.name.startswith("cfg.json.tmp")]
    assert leftovers == []


def test_malformed_json_returns_last_good_and_warns(tmp_path, caplog):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    # Corrupt the file
    p.write_text("{not json", encoding="utf-8")
    time.sleep(0.01)
    # Force mtime update
    p.touch()
    with caplog.at_level("WARNING"):
        out = load_json(p)
    assert out == {"a": 1}  # last-good
    assert any("malformed json" in r.message.lower() for r in caplog.records)


def test_cadence_module_reads_through_loader(tmp_path, monkeypatch):
    """When pricing-config.json is overridden, cadence.CADENCES must
    reflect it. The previous Python-module-constant pattern would have
    locked the value at import time."""
    cfg = tmp_path / "pricing-config.json"
    atomic_write_json(cfg, {
        "cadences": {
            "monthly": {"discount": 0.0, "months_paid": 1, "months_delivered": 1,
                        "stripe_interval": "month", "stripe_interval_count": 1,
                        "label": "Month-to-month", "framing": "Standard. No commitment."},
            "3mo": {"discount": 0.99, "months_paid": 3, "months_delivered": 3,
                    "stripe_interval": "month", "stripe_interval_count": 3,
                    "label": "TEST", "framing": "TEST"},
            "6mo": {"discount": 0.20, "months_paid": 6, "months_delivered": 6,
                    "stripe_interval": "month", "stripe_interval_count": 6,
                    "label": "x", "framing": "x"},
            "9mo": {"discount": 0.25, "months_paid": 9, "months_delivered": 12,
                    "stripe_interval": "month", "stripe_interval_count": 12,
                    "label": "x", "framing": "x"},
        },
        "tier_monthly_retail": {},
        "tier_envelope_max_cents": {},
    })
    monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(tmp_path))
    # Force a clean import of cadence
    import importlib, sys
    if "cadence" in sys.modules:
        del sys.modules["cadence"]
    import cadence  # noqa: PLC0415
    assert cadence.CADENCES["3mo"]["discount"] == 0.99
