"""Tests for the PROOF_BUNDLE.md updater."""
from __future__ import annotations

from pathlib import Path

import pytest

from services.oss_intake_sandbox import proof_bundle
from services.oss_intake_sandbox.freshness import FreshnessReport
from services.oss_intake_sandbox.scans import ScanResult


@pytest.fixture
def fake_repo_root(tmp_path: Path) -> Path:
    """Make a fake foai/integrations/<tool>/PROOF_BUNDLE.md fixture."""
    integrations = tmp_path / "foai" / "integrations" / "ii-commons"
    integrations.mkdir(parents=True)
    bundle = integrations / "PROOF_BUNDLE.md"
    bundle.write_text(
        "# PROOF_BUNDLE — ii-commons\n\n"
        "Initial scaffold.\n\n"
        "## §1 — Install log\n\nTBD\n",
        encoding="utf-8",
    )
    return tmp_path


def _sample_freshness() -> FreshnessReport:
    return FreshnessReport(
        repo_url="https://github.com/Intelligent-Internet/II-Commons",
        owner="Intelligent-Internet",
        repo_name="II-Commons",
        last_commit_sha="abc1234567890",
        last_commit_date="2026-04-01T00:00:00Z",
        default_branch="main",
        license_spdx="Apache-2.0",
        stargazers_count=42,
        forks_count=5,
        days_since_last_commit=44,
        status="current",
    )


def _sample_scans() -> dict[str, ScanResult]:
    return {
        "osv-scanner": ScanResult(name="osv-scanner", status="pass", findings_count=0),
        "gitleaks": ScanResult(name="gitleaks", status="pass", findings_count=0),
        "syft": ScanResult(
            name="syft", status="pass", findings_count=128, raw_output_path="/tmp/sbom.cdx.json"
        ),
        "semgrep": ScanResult(name="semgrep", status="skipped", reason="semgrep not on PATH"),
        "trivy": ScanResult(name="trivy", status="skipped", reason="trivy not on PATH"),
        "malware-pattern": ScanResult(name="malware-pattern", status="pass", findings_count=0),
    }


def test_append_writes_run_block(fake_repo_root: Path) -> None:
    bundle_path = proof_bundle.append_run_to_bundle(
        repo_root=fake_repo_root,
        tool_name="ii-commons",
        run_id="run-test-001",
        commit_sha="abc1234567890",
        freshness=_sample_freshness(),
        scans=_sample_scans(),
    )
    content = bundle_path.read_text(encoding="utf-8")
    assert "<!-- oss_intake_sandbox:run:run-test-001 -->" in content
    assert "<!-- oss_intake_sandbox:run-end:run-test-001 -->" in content
    assert "Intelligent-Internet/II-Commons" in content
    assert "Apache-2.0" in content
    # All 6 scans should appear in the table
    assert "`osv-scanner`" in content
    assert "`syft`" in content
    assert "`malware-pattern`" in content
    # Original scaffold preserved
    assert "## §1 — Install log" in content


def test_append_replaces_existing_run_block(fake_repo_root: Path) -> None:
    """Re-running with the same run_id replaces the block instead of duplicating."""
    proof_bundle.append_run_to_bundle(
        repo_root=fake_repo_root,
        tool_name="ii-commons",
        run_id="run-stable-id",
        commit_sha="commit_a",
        freshness=_sample_freshness(),
        scans=_sample_scans(),
    )
    # Second run with same run_id but different commit
    proof_bundle.append_run_to_bundle(
        repo_root=fake_repo_root,
        tool_name="ii-commons",
        run_id="run-stable-id",
        commit_sha="commit_b",
        freshness=_sample_freshness(),
        scans=_sample_scans(),
    )
    content = (fake_repo_root / "foai" / "integrations" / "ii-commons" / "PROOF_BUNDLE.md").read_text(encoding="utf-8")
    # Exactly ONE block for the run_id (no duplication)
    assert content.count("<!-- oss_intake_sandbox:run:run-stable-id -->") == 1
    # The newer commit replaces the older
    assert "commit_b" in content
    assert "commit_a" not in content


def test_append_distinct_run_ids_both_kept(fake_repo_root: Path) -> None:
    """Different run_ids produce additive blocks."""
    proof_bundle.append_run_to_bundle(
        repo_root=fake_repo_root,
        tool_name="ii-commons",
        run_id="run-A",
        commit_sha="aaa",
        freshness=_sample_freshness(),
        scans=_sample_scans(),
    )
    proof_bundle.append_run_to_bundle(
        repo_root=fake_repo_root,
        tool_name="ii-commons",
        run_id="run-B",
        commit_sha="bbb",
        freshness=_sample_freshness(),
        scans=_sample_scans(),
    )
    content = (fake_repo_root / "foai" / "integrations" / "ii-commons" / "PROOF_BUNDLE.md").read_text(encoding="utf-8")
    assert content.count("<!-- oss_intake_sandbox:run:run-A -->") == 1
    assert content.count("<!-- oss_intake_sandbox:run:run-B -->") == 1
    assert "aaa" in content
    assert "bbb" in content


def test_append_raises_when_bundle_missing(tmp_path: Path) -> None:
    """If the PROOF_BUNDLE.md doesn't exist, the CLI must abort with FileNotFoundError."""
    with pytest.raises(FileNotFoundError, match="PROOF_BUNDLE.md missing"):
        proof_bundle.append_run_to_bundle(
            repo_root=tmp_path,
            tool_name="never-created",
            run_id="run-X",
            commit_sha="xxx",
            freshness=_sample_freshness(),
            scans=_sample_scans(),
        )
