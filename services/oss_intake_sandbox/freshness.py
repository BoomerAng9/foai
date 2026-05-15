"""Freshness audit — captures last-commit, release, maintainer activity for a repo.

Uses `gh` CLI (read-only, public API endpoints) — required on PATH. Falls
back to `unknown` per-field when offline or unauthenticated.
"""
from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from typing import Optional

log = logging.getLogger("oss_intake_sandbox.freshness")


@dataclass
class FreshnessReport:
    repo_url: str
    owner: str = ""
    repo_name: str = ""
    last_commit_sha: str = ""
    last_commit_date: str = ""
    default_branch: str = ""
    license_spdx: str = ""
    open_issues_count: int = 0
    open_pull_requests_count: int = 0
    last_release_tag: str = ""
    last_release_date: str = ""
    days_since_last_commit: Optional[int] = None
    days_since_last_release: Optional[int] = None
    stargazers_count: int = 0
    forks_count: int = 0
    archived: bool = False
    disabled: bool = False
    notes: list[str] = field(default_factory=list)
    status: str = "unknown"  # current | watch | stale | abandoned | unknown

    def to_dict(self) -> dict:
        return asdict(self)


_REPO_URL_PATTERN = re.compile(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/.]+)")


def _parse_repo_url(repo_url: str) -> tuple[str, str]:
    m = _REPO_URL_PATTERN.search(repo_url)
    if not m:
        return "", ""
    return m.group("owner"), m.group("repo")


def _gh_api(path: str, timeout: int = 30) -> Optional[dict]:
    if not shutil.which("gh"):
        log.warning("gh CLI not on PATH; freshness audit will report 'unknown'")
        return None
    try:
        proc = subprocess.run(
            ["gh", "api", path],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        log.warning("gh api %s timed out", path)
        return None
    if proc.returncode != 0:
        log.warning("gh api %s exit=%d: %s", path, proc.returncode, proc.stderr[:200])
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None


def _days_since_iso(iso_date: str) -> Optional[int]:
    from datetime import datetime, timezone

    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).days


def _classify_status(days_last_commit: Optional[int], archived: bool, disabled: bool) -> str:
    """Map activity recency to a freshness status per the v2 intake skill enum."""
    if disabled:
        return "abandoned"
    if archived:
        return "abandoned"
    if days_last_commit is None:
        return "unknown"
    if days_last_commit <= 90:
        return "current"
    if days_last_commit <= 365:
        return "watch"
    if days_last_commit <= 730:
        return "stale"
    return "abandoned"


def audit_repo(repo_url: str) -> FreshnessReport:
    """Fetch the repo's metadata + classify status."""
    report = FreshnessReport(repo_url=repo_url)
    owner, repo_name = _parse_repo_url(repo_url)
    report.owner = owner
    report.repo_name = repo_name
    if not owner or not repo_name:
        report.notes.append("could_not_parse_owner/repo from URL")
        return report

    meta = _gh_api(f"repos/{owner}/{repo_name}")
    if not meta:
        report.notes.append("gh api repos/<owner>/<repo> failed; check `gh auth status`")
        return report

    report.default_branch = meta.get("default_branch") or ""
    report.license_spdx = ((meta.get("license") or {}).get("spdx_id") or "") if meta.get("license") else ""
    report.open_issues_count = meta.get("open_issues_count") or 0
    report.stargazers_count = meta.get("stargazers_count") or 0
    report.forks_count = meta.get("forks_count") or 0
    report.archived = bool(meta.get("archived"))
    report.disabled = bool(meta.get("disabled"))

    # Last commit on default branch
    commit = _gh_api(f"repos/{owner}/{repo_name}/commits/HEAD")
    if commit:
        report.last_commit_sha = commit.get("sha") or ""
        commit_date = ((commit.get("commit") or {}).get("author") or {}).get("date") or ""
        report.last_commit_date = commit_date
        report.days_since_last_commit = _days_since_iso(commit_date)

    # Last release (may not exist for some repos)
    release = _gh_api(f"repos/{owner}/{repo_name}/releases/latest")
    if release:
        report.last_release_tag = release.get("tag_name") or ""
        report.last_release_date = release.get("published_at") or ""
        report.days_since_last_release = _days_since_iso(report.last_release_date)
    else:
        report.notes.append("no_releases_published")

    # Open PRs
    prs = _gh_api(f"repos/{owner}/{repo_name}/pulls?state=open&per_page=1")
    if isinstance(prs, list):
        # GitHub's per_page=1 returns single-element list; we want a count.
        # Switch to `/search/issues` for a true count.
        search = _gh_api(f"search/issues?q=repo:{owner}/{repo_name}+is:pr+is:open")
        if search and isinstance(search, dict):
            report.open_pull_requests_count = search.get("total_count") or 0

    report.status = _classify_status(report.days_since_last_commit, report.archived, report.disabled)
    return report
