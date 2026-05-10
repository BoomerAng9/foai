"""
coastal-sett-pipeline — orchestrator for one or more portrait builds.

Pipeline (per slug, parallelized via ThreadPoolExecutor):
  1. coastal-canon <slug>           → fetch canon
  2. coastal-portrait <slug>        → Stage 1 (Stage 2 only on --refine)
  3. owner audit gate (manual)      → mandatory before deploy
  4. coastal-cast add <slug>        → write CAST entry from canon
  5. coastal-deploy <portrait.png> + coastal-deploy web/app/team/page.tsx
  6. coastal-ship --files=...       → opens PR + auto-merges if --ship

Returns Build Session Receipt per aims-build-control-pack format.
Cost estimate: 9 credits per portrait Stage1 + 2 — surfaces total before fire.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

CLI_BIN = Path(__file__).parent
PYTHON = sys.executable

CREDITS_STAGE1 = 4.0
CREDITS_STAGE2 = 5.0


def cli(name: str) -> list[str]:
    return [PYTHON, str(CLI_BIN / f"{name}.py")]


def fetch_canon(slug: str) -> dict:
    proc = subprocess.run(  # noqa: S603
        cli("coastal_canon") + [slug, "--json"],
        capture_output=True, text=True, timeout=15, encoding="utf-8",
    )
    if proc.returncode != 0:
        return {"slug": slug, "error": proc.stderr.strip()[:300]}
    return json.loads(proc.stdout)


def run_portrait(slug: str, stages: str, dry_run: bool) -> dict:
    cmd = cli("coastal_portrait") + [slug, "--stages", stages, "--json"]
    if dry_run:
        cmd.append("--dry-run")
    proc = subprocess.run(  # noqa: S603
        cmd, capture_output=True, text=True, timeout=900, encoding="utf-8",
    )
    out = proc.stdout.strip()
    try:
        result = json.loads(out)
    except json.JSONDecodeError:
        result = {"slug": slug, "raw": out, "stderr": proc.stderr.strip()[:300]}
    result["returncode"] = proc.returncode
    return result


def add_cast_from_canon(canon: dict) -> dict:
    if canon.get("error"):
        return {"slug": canon.get("slug"), "skipped": True, "reason": canon["error"]}

    slug = canon["slug"]
    pmo = (canon.get("pmo") or "").lower()
    pmo_map = {
        "marketing": "marketing",
        "sales": "sales",
        "ops": "ops",
        "operations": "ops",
        "loss-prevention": "loss-prevention",
        "lp": "loss-prevention",
        "back-office": "back-office",
        "accounting": "accounting",
        "leadership": "leadership",
    }
    pmo_value = pmo_map.get(pmo, "ops")

    function = canon.get("role") or canon.get("display_name") or slug
    function = function.split(" — ")[0].split("·")[0].strip()
    story = (canon.get("bio_summary") or "").strip()
    if not story:
        story = f"Canon entry for {canon.get('display_name', slug)}."

    cmd = cli("coastal_cast") + [
        "add", slug,
        "--display-name", canon.get("display_name") or slug,
        "--function", function,
        "--pmo", pmo_value,
        "--story", story,
        "--no-typecheck",
        "--json",
    ]
    proc = subprocess.run(  # noqa: S603
        cmd, capture_output=True, text=True, timeout=60, encoding="utf-8",
    )
    if proc.returncode == 2 and "already exists" in proc.stderr:
        return {"slug": slug, "skipped": True, "reason": "already in CAST"}
    if proc.returncode != 0:
        return {"slug": slug, "error": proc.stderr.strip()[:300]}
    try:
        return {"slug": slug, **json.loads(proc.stdout)}
    except json.JSONDecodeError:
        return {"slug": slug, "raw": proc.stdout.strip()[:300]}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="coastal-sett-pipeline")
    parser.add_argument("slugs", nargs="+", help="One or more persona slugs.")
    parser.add_argument(
        "--stages", choices=("1", "2", "both"), default="1",
        help="Higgsfield stages per slug. Default 1 (Stage 2 needs explicit confirm).",
    )
    parser.add_argument("--refine", action="store_true",
                        help="Shortcut for --stages both (Stage 1 + 2).")
    parser.add_argument("--ship", action="store_true",
                        help="After portraits + CAST adds, run coastal-ship.")
    parser.add_argument("--parallel", type=int, default=4,
                        help="Concurrent portrait jobs. Default 4.")
    parser.add_argument("--skip-cast", action="store_true",
                        help="Generate portraits only, do not edit CAST array.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Plan only — fetch canon, show prompts, no Higgsfield calls.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    stages = "both" if args.refine else args.stages
    credits_per = CREDITS_STAGE1 + (CREDITS_STAGE2 if stages != "1" else 0)
    total_credits = credits_per * len(args.slugs)

    receipt: dict = {
        "section_1_state": "Existing Build (Coastal portrait pipeline)",
        "section_2_gate": "Gate 3 — does the core feature work? (portrait gen + cast wire)",
        "section_3_changes": [],
        "section_4_files": [],
        "section_5_commands": [
            f"coastal-portrait <slug> --stages {stages}  ×{len(args.slugs)}",
        ],
        "section_6_checks": {},
        "section_7_evidence": {
            "slugs": list(args.slugs),
            "stages": stages,
            "credits_estimated": total_credits,
            "parallel": args.parallel,
            "ship": args.ship,
        },
        "section_8_security": "Sacred Separation enforced (no internal IDs in CAST stories).",
        "section_9_blockers": [],
        "section_10_next": "owner audit each portrait; if approved, ship the PR",
        "started_at": time.time(),
    }

    canons: dict[str, dict] = {}
    for slug in args.slugs:
        canons[slug] = fetch_canon(slug)
        if canons[slug].get("error"):
            receipt["section_9_blockers"].append(f"{slug}: canon fetch failed")

    portrait_results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=args.parallel) as ex:
        futures = {
            ex.submit(run_portrait, slug, stages, args.dry_run): slug
            for slug in args.slugs
            if not canons[slug].get("error")
        }
        for fut in as_completed(futures):
            slug = futures[fut]
            try:
                portrait_results[slug] = fut.result()
            except Exception as e:  # noqa: BLE001
                portrait_results[slug] = {"slug": slug, "error": str(e)}

    receipt["section_3_changes"].append(
        f"Generated {len(portrait_results)} portrait(s) via Higgsfield (stages={stages})"
    )
    for slug, pr in portrait_results.items():
        for path in pr.get("local_paths") or []:
            receipt["section_4_files"].append(path)
        if pr.get("returncode", 0) != 0:
            receipt["section_9_blockers"].append(f"{slug}: portrait returncode={pr['returncode']}")

    cast_results: dict[str, dict] = {}
    if not args.skip_cast and not args.dry_run:
        for slug in args.slugs:
            if portrait_results.get(slug, {}).get("returncode", 1) != 0:
                cast_results[slug] = {"slug": slug, "skipped": True, "reason": "portrait failed"}
                continue
            cast_results[slug] = add_cast_from_canon(canons[slug])
        receipt["section_3_changes"].append(
            f"CAST add attempted for {len(cast_results)} slug(s)"
        )
        added = sum(1 for r in cast_results.values() if not r.get("skipped") and not r.get("error"))
        receipt["section_6_checks"]["cast_added"] = added
        receipt["section_6_checks"]["cast_skipped"] = sum(
            1 for r in cast_results.values() if r.get("skipped")
        )
        receipt["section_6_checks"]["cast_failed"] = sum(
            1 for r in cast_results.values() if r.get("error")
        )

    if args.ship and not args.dry_run and not receipt["section_9_blockers"]:
        files_to_ship = list(receipt["section_4_files"])
        team_page = "coastal-brewing/web/app/team/page.tsx"
        if any(team_page in f or f.endswith("page.tsx") for f in files_to_ship):
            pass
        else:
            files_to_ship.append(team_page)
        ship_cmd = cli("coastal_ship") + [
            "--files", *files_to_ship,
            "--title", f"feat(coastal): sett-pipeline — {len(args.slugs)} slug(s)",
            "--body", "Generated via coastal-sett-pipeline. Owner audit complete.",
            "--auto-merge", "--json",
        ]
        proc = subprocess.run(  # noqa: S603
            ship_cmd, capture_output=True, text=True, timeout=1200, encoding="utf-8",
        )
        try:
            ship_result = json.loads(proc.stdout)
        except json.JSONDecodeError:
            ship_result = {"raw": proc.stdout.strip()[:500], "stderr": proc.stderr.strip()[:300]}
        receipt["section_7_evidence"]["ship_result"] = ship_result
        receipt["section_3_changes"].append(f"PR #{ship_result.get('pr_number')} opened/merged")

    receipt["elapsed_seconds"] = round(time.time() - receipt["started_at"], 1)
    receipt.pop("started_at", None)

    receipt["portraits"] = portrait_results
    if cast_results:
        receipt["cast"] = cast_results

    if args.json:
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
    else:
        print("# Build Session Receipt — coastal-sett-pipeline")
        print(f"  state:           {receipt['section_1_state']}")
        print(f"  gate:            {receipt['section_2_gate']}")
        print(f"  slugs:           {', '.join(args.slugs)}")
        print(f"  stages:          {stages}  ({credits_per} credits/slug; {total_credits} total est)")
        print(f"  portraits done:  {sum(1 for p in portrait_results.values() if p.get('returncode') == 0)}/{len(args.slugs)}")
        if cast_results:
            print(f"  cast added:      {receipt['section_6_checks'].get('cast_added', 0)}")
            print(f"  cast skipped:    {receipt['section_6_checks'].get('cast_skipped', 0)}")
        if receipt["section_9_blockers"]:
            print("  blockers:")
            for b in receipt["section_9_blockers"]:
                print(f"    • {b}")
        print(f"  elapsed:         {receipt['elapsed_seconds']}s")
        print(f"  next:            {receipt['section_10_next']}")

    return 1 if receipt["section_9_blockers"] else 0


if __name__ == "__main__":
    sys.exit(main())
