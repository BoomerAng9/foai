"""Append run results to foai/integrations/<tool_name>/PROOF_BUNDLE.md.

The PROOF_BUNDLE.md uses canonical section headers from the v2 Open Source
Agent Intake skill §9. This module appends a new dated run block under
the relevant sections, idempotently — re-running the same scan replaces
the prior block for that run (keyed by `run_id`) rather than duplicating.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from .freshness import FreshnessReport
from .scans import ScanResult

log = logging.getLogger("oss_intake_sandbox.proof_bundle")

_RUN_BLOCK_START = "<!-- oss_intake_sandbox:run:"
_RUN_BLOCK_END = "<!-- oss_intake_sandbox:run-end:"


def _proof_bundle_path(repo_root: Path, tool_name: str) -> Path:
    return repo_root / "foai" / "integrations" / tool_name / "PROOF_BUNDLE.md"


def _render_run_block(
    run_id: str,
    commit_sha: str,
    freshness: FreshnessReport,
    scans: dict[str, ScanResult],
) -> str:
    """Compose the full markdown block for one CLI run."""
    now = datetime.now(timezone.utc).isoformat()

    lines: list[str] = []
    lines.append(f"{_RUN_BLOCK_START}{run_id} -->")
    lines.append(f"### Run `{run_id}` — {now}")
    lines.append("")
    lines.append(f"**Commit inspected:** `{commit_sha}`")
    lines.append("")
    lines.append("**Freshness:**")
    lines.append("")
    lines.append(
        f"- repo: `{freshness.owner}/{freshness.repo_name}` · "
        f"license: `{freshness.license_spdx or 'unknown'}` · "
        f"stars: {freshness.stargazers_count} · "
        f"status: **{freshness.status}**"
    )
    lines.append(
        f"- last commit: `{freshness.last_commit_sha[:10]}` on "
        f"{freshness.last_commit_date or 'unknown'} "
        f"({freshness.days_since_last_commit if freshness.days_since_last_commit is not None else '?'} days ago)"
    )
    if freshness.last_release_tag:
        lines.append(
            f"- last release: `{freshness.last_release_tag}` on "
            f"{freshness.last_release_date or 'unknown'} "
            f"({freshness.days_since_last_release if freshness.days_since_last_release is not None else '?'} days ago)"
        )
    if freshness.notes:
        lines.append(f"- notes: {'; '.join(freshness.notes)}")
    lines.append("")
    lines.append("**Scan results:**")
    lines.append("")
    lines.append("| Tool | Status | Findings | Raw output | Reason / breakdown |")
    lines.append("|---|---|---:|---|---|")
    for name, result in scans.items():
        raw = result.raw_output_path or "—"
        if result.severity_breakdown:
            breakdown = ", ".join(f"{k}: {v}" for k, v in sorted(result.severity_breakdown.items()))
        else:
            breakdown = result.reason or "—"
        lines.append(f"| `{name}` | **{result.status}** | {result.findings_count} | `{raw}` | {breakdown} |")
    lines.append("")
    lines.append(f"{_RUN_BLOCK_END}{run_id} -->")
    return "\n".join(lines)


def _strip_existing_run(content: str, run_id: str) -> str:
    """If a block for this run_id already exists, remove it so we replace cleanly."""
    pattern = re.compile(
        re.escape(f"{_RUN_BLOCK_START}{run_id} -->")
        + r"[\s\S]*?"
        + re.escape(f"{_RUN_BLOCK_END}{run_id} -->"),
    )
    return pattern.sub("", content).rstrip() + "\n"


def append_run_to_bundle(
    *,
    repo_root: Path,
    tool_name: str,
    run_id: str,
    commit_sha: str,
    freshness: FreshnessReport,
    scans: dict[str, ScanResult],
) -> Path:
    """Append (or replace) the run block in the tool's PROOF_BUNDLE.md.

    Returns the bundle path. Raises `FileNotFoundError` if the PROOF_BUNDLE.md
    doesn't exist (owner must run the OSS Intake skill INTAKE step first).
    """
    bundle_path = _proof_bundle_path(repo_root, tool_name)
    if not bundle_path.exists():
        raise FileNotFoundError(
            f"PROOF_BUNDLE.md missing at {bundle_path} — author the INTAKE.md + PROOF_BUNDLE.md scaffold first per the v2 skill"
        )

    content = bundle_path.read_text(encoding="utf-8")
    content = _strip_existing_run(content, run_id)
    new_block = _render_run_block(run_id, commit_sha, freshness, scans)
    appended = content.rstrip() + "\n\n---\n\n" + new_block + "\n"
    bundle_path.write_text(appended, encoding="utf-8")
    log.info("proof_bundle.appended path=%s run_id=%s", bundle_path, run_id)
    return bundle_path
