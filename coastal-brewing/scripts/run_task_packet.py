#!/usr/bin/env python3
"""Run a task packet through the one-direction routing system."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, check=False, text=True, capture_output=True)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("task_packet")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    packet_path = Path(args.task_packet)
    if not packet_path.is_absolute():
        packet_path = ROOT / packet_path

    route = run([sys.executable, "scripts/model_router.py", str(packet_path), "--receipt-dir", "receipts"])
    print(route.stdout)
    if route.returncode != 0:
        print(route.stderr, file=sys.stderr)
        return route.returncode

    data = json.loads(packet_path.read_text(encoding="utf-8"))
    receipt_path = ROOT / "receipts" / f"{data.get('task_id')}_route_receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))

    if args.dry_run:
        print(f"DRY RUN: would route task {data.get('task_id')} to {receipt['route']}.")
        if receipt["route"] == "feynman":
            ticket = run([sys.executable, "scripts/create_feynman_ticket.py", str(packet_path)])
            print(ticket.stdout)
        return 0

    print("Live execution is intentionally not enabled by default. Use n8n/OpenClaw after approvals are configured.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
