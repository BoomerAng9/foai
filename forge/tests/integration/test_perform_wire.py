"""Integration test for perform-wire workflow."""

from __future__ import annotations

from pathlib import Path

import yaml

from forge.core.schema import StepType, Workflow

WF_DIR = Path(__file__).resolve().parent.parent.parent / "workflows"


def _load() -> Workflow:
    return Workflow(**yaml.safe_load((WF_DIR / "perform-wire.yaml").read_text()))


def test_loads() -> None:
    wf = _load()
    assert wf.id == "perform-wire"


def test_gate_before_promote() -> None:
    wf = _load()
    types = [s.inferred_type() for s in wf.steps]
    if StepType.promote in types:
        assert StepType.gate in types[:types.index(StepType.promote)]


def test_ends_with_chronicle() -> None:
    wf = _load()
    last = wf.steps[-1]
    if last.inferred_type() == StepType.bamaram:
        last = wf.steps[-2]
    assert last.inferred_type() == StepType.chronicle
