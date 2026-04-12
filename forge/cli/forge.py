"""Forge CLI — `forge run <workflow> --task <id>` entry point.

Phase 7 implementation. Currently defines the CLI structure.
"""

from __future__ import annotations

import argparse
import sys


def main() -> None:
    """Main CLI entry point for the Forge Harness."""
    parser = argparse.ArgumentParser(
        prog="forge",
        description="Forge Harness — Smelter OS native workflow engine",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # forge run <workflow> --task <id>
    run_parser = subparsers.add_parser("run", help="Execute a workflow")
    run_parser.add_argument("workflow", help="Workflow ID or YAML path")
    run_parser.add_argument("--task", required=True, help="Task/RFP fragment ID")
    run_parser.add_argument(
        "--input", action="append", default=[], help="Input key=value pair"
    )

    # forge list
    subparsers.add_parser("list", help="List available workflows")

    # forge status <run-id>
    status_parser = subparsers.add_parser("status", help="Check run status")
    status_parser.add_argument("run_id", help="Run UUID")

    args = parser.parse_args()

    if args.command == "run":
        print(f"[Phase 7] forge run {args.workflow} --task {args.task}")
        print("CLI execution will be wired in Phase 7.")
    elif args.command == "list":
        print("[Phase 7] Available workflows will be listed here.")
    elif args.command == "status":
        print(f"[Phase 7] Status for run {args.run_id} will be shown here.")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
