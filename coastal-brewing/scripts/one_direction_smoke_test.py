#!/usr/bin/env python3
"""Smoke test for one-direction kit."""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md",
    "CREATE_WITH_CLAUDE_CODE.md",
    "configs/model_router.yaml",
    "configs/agent_roster.yaml",
    "memory/hermes_one_direction_schema.sql",
    "scripts/model_router.py",
    "scripts/create_feynman_ticket.py",
    "openclaw/action_policy.yaml",
]

def main() -> int:
    missing = [p for p in REQUIRED if not (ROOT / p).exists()]
    if missing:
        print("Missing files:", missing)
        return 1
    examples = list((ROOT / "examples/task_packets").glob("*.json"))
    if len(examples) < 3:
        print("Expected at least 3 example task packets")
        return 1
    for packet in examples:
        result = subprocess.run([sys.executable, "scripts/model_router.py", str(packet), "--receipt-dir", "receipts"], cwd=ROOT, text=True, capture_output=True)
        if result.returncode != 0:
            print(result.stderr)
            return result.returncode
    print("One-direction kit smoke test passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
