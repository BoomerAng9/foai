"""CLI entry point for the OSS Intake quarantine sandbox.

Usage (from foai/ repo root):

    PYTHONPATH=. python -m services.oss_intake_sandbox.run \\
        --repo https://github.com/Intelligent-Internet/II-Commons \\
        --commit <pinned-sha> \\
        --tool-name ii-commons \\
        --out ./.tmp/ii-commons-scan

Output: scan artifacts written to --out dir; PROOF_BUNDLE.md updated with
the run block. Exit code: 0 if all scans `pass` or `skipped`; 1 if any
scan reports `findings`; 2 if any scan errored.
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .freshness import audit_repo
from .proof_bundle import append_run_to_bundle
from .scans import run_all_scans

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
)
log = logging.getLogger("oss_intake_sandbox.run")


def _clone_repo(repo_url: str, commit: str, dest: Path) -> bool:
    """Shallow-clone a repo and check out a specific commit. Returns True on success."""
    if not shutil.which("git"):
        log.error("git not on PATH; cannot clone")
        return False
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    log.info("cloning %s -> %s", repo_url, dest)
    try:
        subprocess.run(
            ["git", "clone", "--no-tags", repo_url, str(dest)],
            check=True,
            capture_output=True,
            text=True,
            timeout=900,
        )
        if commit:
            subprocess.run(
                ["git", "checkout", commit],
                cwd=str(dest),
                check=True,
                capture_output=True,
                text=True,
                timeout=120,
            )
    except subprocess.CalledProcessError as e:
        log.error("clone/checkout failed: exit=%d stderr=%s", e.returncode, (e.stderr or "")[:300])
        return False
    except subprocess.TimeoutExpired:
        log.error("clone/checkout timed out")
        return False
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OSS Intake quarantine sandbox CLI")
    parser.add_argument("--repo", required=True, help="GitHub repo URL")
    parser.add_argument("--commit", required=True, help="Pinned commit SHA (full or short)")
    parser.add_argument(
        "--tool-name",
        required=True,
        help="FOAI canonical tool name (e.g. ii-commons). Maps to foai/integrations/<tool-name>/",
    )
    parser.add_argument("--out", required=True, help="Output directory for scan artifacts")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[2]),
        help="FOAI repo root (defaults to two parents up from this script — foai/)",
    )
    parser.add_argument(
        "--skip-proof-bundle",
        action="store_true",
        help="Skip the PROOF_BUNDLE.md update (use for dry-run / preview)",
    )
    args = parser.parse_args(argv)

    out_dir = Path(args.out).resolve()
    repo_root = Path(args.repo_root).resolve()
    run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    log.info("oss_intake_sandbox starting run_id=%s tool=%s", run_id, args.tool_name)

    # 1. Freshness audit (gh CLI; no clone needed for this part)
    log.info("step 1/3: freshness audit via gh api")
    freshness = audit_repo(args.repo)
    log.info(
        "freshness status=%s license=%s last_commit=%s",
        freshness.status, freshness.license_spdx, freshness.last_commit_date,
    )

    # 2. Clone + scan
    clone_path = out_dir / "clone"
    log.info("step 2/3: clone + scan")
    if not _clone_repo(args.repo, args.commit, clone_path):
        log.error("clone failed; aborting")
        return 2
    scans_dir = out_dir / "scans"
    scans = run_all_scans(clone_path, scans_dir)

    # 3. PROOF_BUNDLE.md update
    log.info("step 3/3: PROOF_BUNDLE.md update")
    if args.skip_proof_bundle:
        log.info("--skip-proof-bundle set; not writing bundle")
    else:
        try:
            bundle_path = append_run_to_bundle(
                repo_root=repo_root,
                tool_name=args.tool_name,
                run_id=run_id,
                commit_sha=args.commit,
                freshness=freshness,
                scans=scans,
            )
            log.info("proof_bundle updated: %s", bundle_path)
        except FileNotFoundError as exc:
            log.error("proof_bundle update failed: %s", exc)
            return 2

    # Also write a summary.json to out_dir for downstream consumers
    summary_path = out_dir / "summary.json"
    summary_path.write_text(
        json.dumps(
            {
                "run_id": run_id,
                "tool_name": args.tool_name,
                "repo": args.repo,
                "commit": args.commit,
                "freshness": freshness.to_dict(),
                "scans": {name: result.to_dict() for name, result in scans.items()},
            },
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )
    log.info("summary written: %s", summary_path)

    # Exit code policy
    if any(r.status == "error" for r in scans.values()):
        log.warning("at least one scan errored")
        return 2
    if any(r.status == "findings" for r in scans.values()):
        log.warning("scans found issues — review PROOF_BUNDLE.md + escalate to ACHEEVY before promotion")
        return 1
    log.info("all scans clean (pass or skipped)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
