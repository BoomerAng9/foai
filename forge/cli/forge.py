"""Forge CLI — ``forge run <workflow> --task <id>`` entry point."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_FOAI_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _FOAI_ROOT not in sys.path:
    sys.path.insert(0, _FOAI_ROOT)

import yaml  # noqa: E402

WORKFLOWS_DIR = Path(__file__).resolve().parent.parent / "workflows"


def _load_yaml(name: str) -> dict[str, Any]:
    path = Path(name)
    if not path.exists():
        path = WORKFLOWS_DIR / f"{name}.yaml"
    if not path.exists():
        print(f"Error: workflow '{name}' not found", file=sys.stderr)
        sys.exit(1)
    with open(path) as f:
        return yaml.safe_load(f)  # type: ignore[no-any-return]


def cmd_list() -> None:
    if not WORKFLOWS_DIR.exists():
        print("No workflows directory.")
        return
    for p in sorted(WORKFLOWS_DIR.glob("*.yaml")):
        d = yaml.safe_load(p.read_text())
        print(f"  {d.get('id', p.stem):<25} {d.get('owner', ''):<15} {d.get('description', '')}")


def cmd_validate(wf_name: str) -> None:
    from forge.core.schema import Workflow
    data = _load_yaml(wf_name)
    wf = Workflow(**data)
    print(f"Valid: {wf.id} v{wf.version} ({len(wf.steps)} steps)")
    for s in wf.steps:
        print(f"  [{s.id}] hawk={s.hawk}")


def cmd_run(wf_name: str, task: str, raw_inputs: list[str], dry: bool) -> None:
    from forge.core.schema import Workflow
    data = _load_yaml(wf_name)
    wf = Workflow(**data)
    inputs = dict(kv.split("=", 1) for kv in raw_inputs)
    if dry:
        print(f"[DRY RUN] {wf.id} v{wf.version} task={task}")
        print(f"[DRY RUN] Inputs: {json.dumps(inputs)}")
        for i, s in enumerate(wf.steps, 1):
            print(f"  {i}. [{s.id}] hawk={s.hawk}")
        return
    print("Live execution requires FORGE_DATABASE_URL.")
    sys.exit(1)


def main() -> None:
    p = argparse.ArgumentParser(prog="forge", description="Forge Harness CLI")
    sub = p.add_subparsers(dest="command", required=True)
    rp = sub.add_parser("run")
    rp.add_argument("workflow")
    rp.add_argument("--task", required=True)
    rp.add_argument("--input", action="append", default=[])
    rp.add_argument("--dry-run", action="store_true")
    sub.add_parser("list")
    vp = sub.add_parser("validate")
    vp.add_argument("workflow")
    sp = sub.add_parser("status")
    sp.add_argument("run_id")
    a = p.parse_args()
    if a.command == "list":
        cmd_list()
    elif a.command == "validate":
        cmd_validate(a.workflow)
    elif a.command == "run":
        cmd_run(a.workflow, a.task, a.input, a.dry_run)
    elif a.command == "status":
        print(f"Status for {a.run_id} requires FORGE_DATABASE_URL.")


if __name__ == "__main__":
    main()
