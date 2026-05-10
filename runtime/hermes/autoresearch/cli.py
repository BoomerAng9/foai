"""AutoResearch CLI --hermes-autoresearch.

Commands:
  check             Run the full scan, print a CurrencyReport table.
  json              Same, emit JSON (for scheduled jobs or piping).
  explain <family>  Explain currency status for one tracked family.
  registry          Dump the registry (what we track + why).

Usage (from runtime/hermes/):
  python -m autoresearch.cli check
  python -m autoresearch.cli json > ~/currency.json
  python -m autoresearch.cli explain nemotron
  python -m autoresearch.cli registry
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from autoresearch.engine import CurrencyReport, DriftEntry, scan_all
from autoresearch.registry import REGISTRY, by_family


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="hermes-autoresearch",
        description="Enforce always-latest-OSS-model rule across the platform.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("check", help="Run scan and print a table")
    sub.add_parser("json", help="Run scan and emit JSON")

    p_explain = sub.add_parser("explain", help="Explain one family's status")
    p_explain.add_argument("family", help="Registry family id (e.g. 'nemotron')")

    sub.add_parser("registry", help="Dump the full registry")

    args = parser.parse_args(argv)

    if args.cmd == "check":
        report = asyncio.run(scan_all())
        _print_table(report)
        return 0 if not report.upgrade_candidates else 1

    if args.cmd == "json":
        report = asyncio.run(scan_all())
        print(json.dumps(report.to_dict(), indent=2))
        return 0

    if args.cmd == "explain":
        model = by_family(args.family)
        if model is None:
            print(f"unknown family: {args.family}", file=sys.stderr)
            return 2
        report = asyncio.run(scan_all())
        match = next((e for e in report.entries if e.family == args.family), None)
        if match is None:
            print(f"no scan entry for family: {args.family}", file=sys.stderr)
            return 2
        _print_explain(match)
        return 0

    if args.cmd == "registry":
        for m in REGISTRY:
            print(f"{m.family:22s}  {m.pinned_id}")
            print(f"  role:      {m.role}")
            print(f"  source:    {m.source}")
            print(f"  consumers: {', '.join(m.consumers)}")
            if m.upgrade_blocker:
                print(f"  blocker:   {m.upgrade_blocker}")
            print()
        return 0

    parser.print_help()
    return 2


def _print_table(r: CurrencyReport) -> None:
    print(f"AutoResearch scan @ {r.scanned_at}")
    print(f"  {r.total_checked} / {r.total_tracked} families had a source finding")
    print()

    rows = [
        ("family", "severity", "pinned", "latest"),
        ("---", "---", "---", "---"),
    ]
    for e in r.entries:
        rows.append(
            (
                e.family,
                _sev_badge(e.severity),
                _short(e.pinned_id, 40),
                _short(e.latest_id, 40) or "—",
            )
        )
    _print_columns(rows)

    if r.upgrade_candidates:
        print()
        print(f"{len(r.upgrade_candidates)} upgrade candidate(s) detected:")
        for e in r.upgrade_candidates:
            print(f"  *{e.family}: {e.pinned_id}  -->{e.latest_id}")
            print(f"    role:   {e.role}")
            print(f"    source: {e.source_url}")
            print(f"    note:   {e.summary[:160]}")


def _print_explain(e: DriftEntry) -> None:
    print(f"family:        {e.family}")
    print(f"severity:      {_sev_badge(e.severity)}")
    print(f"pinned:        {e.pinned_id}")
    print(f"latest:        {e.latest_id or '—'}")
    print(f"role:          {e.role}")
    print(f"consumers:")
    for c in e.consumers:
        print(f"    - {c}")
    print(f"source_url:    {e.source_url}")
    if e.upgrade_blocker:
        print(f"blocker:       {e.upgrade_blocker}")
    print(f"summary:       {e.summary}")


def _sev_badge(s: str) -> str:
    return {
        "current": "CURRENT",
        "upgrade-candidate": "UPGRADE",
        "blocker": "BLOCKER",
        "unknown": "UNKNOWN",
    }.get(s, s)


def _short(s: str, limit: int) -> str:
    if len(s) <= limit:
        return s
    return s[: limit - 1] + "..."


def _print_columns(rows: list[tuple[str, ...]]) -> None:
    if not rows:
        return
    widths = [max(len(str(r[i])) for r in rows) for i in range(len(rows[0]))]
    for r in rows:
        print("  ".join(str(cell).ljust(w) for cell, w in zip(r, widths)))


if __name__ == "__main__":
    sys.exit(main())
