"""Per-scan subprocess wrappers.

Each wrapper invokes one external scan tool, captures structured output to
the run's output directory, and returns a `ScanResult` dataclass. Missing
tools → `status="skipped"` with reason (never raises).
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal, Optional

log = logging.getLogger("oss_intake_sandbox.scans")

ScanStatus = Literal["pass", "findings", "fail", "skipped", "error"]


@dataclass
class ScanResult:
    name: str
    status: ScanStatus
    findings_count: int = 0
    raw_output_path: Optional[str] = None
    reason: str = ""
    severity_breakdown: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


def _which(tool: str) -> Optional[str]:
    return shutil.which(tool)


def _run(cmd: list[str], cwd: Path, timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False
    )


# ─── OSV-Scanner — dependency vulnerability scan ──────────────────────────


def run_osv_scanner(clone_path: Path, out_dir: Path) -> ScanResult:
    if not _which("osv-scanner"):
        return ScanResult(
            name="osv-scanner",
            status="skipped",
            reason="osv-scanner not on PATH; install via `go install github.com/google/osv-scanner/cmd/osv-scanner@latest`",
        )
    raw_path = out_dir / "osv-scanner.json"
    try:
        proc = _run(
            ["osv-scanner", "--format=json", "--recursive", str(clone_path)],
            cwd=out_dir,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return ScanResult(name="osv-scanner", status="error", reason="timeout > 600s")
    raw_path.write_text(proc.stdout or "{}", encoding="utf-8")
    # osv-scanner exits 1 when vulns found, 0 when clean
    if proc.returncode not in (0, 1):
        return ScanResult(
            name="osv-scanner",
            status="error",
            raw_output_path=str(raw_path),
            reason=f"exit={proc.returncode}: {proc.stderr[:200]}",
        )
    try:
        data = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        data = {}
    vulns: list[dict] = []
    for result in data.get("results", []):
        for pkg in result.get("packages", []):
            vulns.extend(pkg.get("vulnerabilities", []))
    breakdown: dict[str, int] = {}
    for v in vulns:
        sev = (v.get("database_specific", {}).get("severity") or "UNKNOWN").upper()
        breakdown[sev] = breakdown.get(sev, 0) + 1
    return ScanResult(
        name="osv-scanner",
        status="pass" if not vulns else "findings",
        findings_count=len(vulns),
        raw_output_path=str(raw_path),
        severity_breakdown=breakdown,
    )


# ─── Gitleaks — secret scan ───────────────────────────────────────────────


def run_gitleaks(clone_path: Path, out_dir: Path) -> ScanResult:
    if not _which("gitleaks"):
        return ScanResult(
            name="gitleaks",
            status="skipped",
            reason="gitleaks not on PATH; install via `brew install gitleaks` or download from github.com/gitleaks/gitleaks/releases",
        )
    raw_path = out_dir / "gitleaks.json"
    try:
        proc = _run(
            ["gitleaks", "detect", "--source", str(clone_path), "--report-path", str(raw_path), "--report-format", "json", "--no-banner", "--exit-code", "0"],
            cwd=out_dir,
            timeout=300,
        )
    except subprocess.TimeoutExpired:
        return ScanResult(name="gitleaks", status="error", reason="timeout > 300s")
    if proc.returncode not in (0, 1):
        return ScanResult(
            name="gitleaks",
            status="error",
            raw_output_path=str(raw_path) if raw_path.exists() else None,
            reason=f"exit={proc.returncode}: {proc.stderr[:200]}",
        )
    try:
        findings = json.loads(raw_path.read_text(encoding="utf-8") or "[]")
    except (json.JSONDecodeError, FileNotFoundError):
        findings = []
    return ScanResult(
        name="gitleaks",
        status="pass" if not findings else "findings",
        findings_count=len(findings),
        raw_output_path=str(raw_path) if raw_path.exists() else None,
    )


# ─── syft — SBOM generation (CycloneDX) ───────────────────────────────────


def run_syft(clone_path: Path, out_dir: Path) -> ScanResult:
    if not _which("syft"):
        return ScanResult(
            name="syft",
            status="skipped",
            reason="syft not on PATH; install via `brew install syft` or download from github.com/anchore/syft/releases",
        )
    raw_path = out_dir / "sbom.cdx.json"
    try:
        proc = _run(
            ["syft", str(clone_path), "-o", f"cyclonedx-json={raw_path}", "--quiet"],
            cwd=out_dir,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return ScanResult(name="syft", status="error", reason="timeout > 600s")
    if proc.returncode != 0:
        return ScanResult(
            name="syft",
            status="error",
            reason=f"exit={proc.returncode}: {proc.stderr[:200]}",
        )
    try:
        sbom = json.loads(raw_path.read_text(encoding="utf-8") or "{}")
    except (json.JSONDecodeError, FileNotFoundError):
        return ScanResult(name="syft", status="error", reason="SBOM file missing/empty after syft run")
    components = sbom.get("components", [])
    return ScanResult(
        name="syft",
        status="pass",
        findings_count=len(components),
        raw_output_path=str(raw_path),
    )


# ─── Semgrep — SAST ───────────────────────────────────────────────────────


def run_semgrep(clone_path: Path, out_dir: Path) -> ScanResult:
    if not _which("semgrep"):
        return ScanResult(
            name="semgrep",
            status="skipped",
            reason="semgrep not on PATH; install via `pipx install semgrep`",
        )
    raw_path = out_dir / "semgrep.json"
    try:
        proc = _run(
            ["semgrep", "scan", "--config=auto", "--json", "--output", str(raw_path), "--quiet", str(clone_path)],
            cwd=out_dir,
            timeout=900,
        )
    except subprocess.TimeoutExpired:
        return ScanResult(name="semgrep", status="error", reason="timeout > 900s")
    if proc.returncode not in (0, 1):
        return ScanResult(
            name="semgrep",
            status="error",
            raw_output_path=str(raw_path) if raw_path.exists() else None,
            reason=f"exit={proc.returncode}: {proc.stderr[:200]}",
        )
    try:
        data = json.loads(raw_path.read_text(encoding="utf-8") or "{}")
    except (json.JSONDecodeError, FileNotFoundError):
        data = {}
    findings = data.get("results", [])
    breakdown: dict[str, int] = {}
    for f in findings:
        sev = (f.get("extra", {}).get("severity") or "INFO").upper()
        breakdown[sev] = breakdown.get(sev, 0) + 1
    return ScanResult(
        name="semgrep",
        status="pass" if not findings else "findings",
        findings_count=len(findings),
        raw_output_path=str(raw_path) if raw_path.exists() else None,
        severity_breakdown=breakdown,
    )


# ─── Trivy — filesystem vuln scan ─────────────────────────────────────────


def run_trivy(clone_path: Path, out_dir: Path) -> ScanResult:
    if not _which("trivy"):
        return ScanResult(
            name="trivy",
            status="skipped",
            reason="trivy not on PATH; install via `brew install trivy`",
        )
    raw_path = out_dir / "trivy.json"
    try:
        proc = _run(
            ["trivy", "fs", "--format", "json", "--output", str(raw_path), "--quiet", str(clone_path)],
            cwd=out_dir,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return ScanResult(name="trivy", status="error", reason="timeout > 600s")
    if proc.returncode != 0:
        return ScanResult(
            name="trivy",
            status="error",
            raw_output_path=str(raw_path) if raw_path.exists() else None,
            reason=f"exit={proc.returncode}: {proc.stderr[:200]}",
        )
    try:
        data = json.loads(raw_path.read_text(encoding="utf-8") or "{}")
    except (json.JSONDecodeError, FileNotFoundError):
        data = {}
    vulns: list[dict] = []
    for result in data.get("Results", []) or []:
        vulns.extend(result.get("Vulnerabilities") or [])
    breakdown: dict[str, int] = {}
    for v in vulns:
        sev = (v.get("Severity") or "UNKNOWN").upper()
        breakdown[sev] = breakdown.get(sev, 0) + 1
    return ScanResult(
        name="trivy",
        status="pass" if not vulns else "findings",
        findings_count=len(vulns),
        raw_output_path=str(raw_path) if raw_path.exists() else None,
        severity_breakdown=breakdown,
    )


# ─── Malware pattern — static grep for suspicious patterns ────────────────

# Conservative list; the v2 skill §2 enumerates the canonical set.
_MALWARE_PATTERNS: tuple[tuple[str, str], ...] = (
    ("curl_pipe_sh", r"curl[^|]+\|\s*(?:bash|sh|zsh)"),
    ("wget_pipe_sh", r"wget[^|]+\|\s*(?:bash|sh|zsh)"),
    ("eval_decoded", r"eval\s*\(\s*(?:atob|base64\.decode|base64\.b64decode)"),
    ("os_environ_dump", r"(?:os\.environ|process\.env)(?:\.items\(\)|\s+\|\s+jq)"),
    ("reverse_shell_python", r"socket\.socket\([^)]*\)[\s\S]{0,200}?(?:connect|dup2)"),
    ("preinstall_script_pattern", r"\"(?:preinstall|postinstall)\"\s*:\s*\"[^\"]*(?:curl|wget|node|python|sh)\s+-"),
    ("keychain_access", r"(?:security\s+find-internet-password|security\s+find-generic-password|keytar)"),
    ("browser_profile_read", r"(?:~/.config/google-chrome|~/Library/Application Support/Google/Chrome|AppData/Local/Google/Chrome)"),
)


def run_malware_pattern_scan(clone_path: Path, out_dir: Path) -> ScanResult:
    """Static regex sweep for suspicious patterns enumerated in the v2 skill.

    Always runs (no external tool dependency). False positives are expected;
    every match → manual review by owner. Findings_count > 0 → 'findings'
    status; promotion blocked until reviewed.
    """
    import re

    raw_path = out_dir / "malware-pattern.json"
    matches: list[dict] = []
    compiled = [(name, re.compile(pat, re.IGNORECASE | re.MULTILINE)) for name, pat in _MALWARE_PATTERNS]
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".next"}
    skip_suffixes = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".pdf", ".bin", ".so", ".dylib", ".dll", ".class", ".pyc", ".lock", ".ico", ".woff", ".woff2", ".ttf", ".eot"}

    for path in clone_path.rglob("*"):
        if not path.is_file():
            continue
        if any(part in skip_dirs for part in path.parts):
            continue
        if path.suffix.lower() in skip_suffixes:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except (OSError, UnicodeDecodeError):
            continue
        if len(text) > 1_000_000:  # skip huge files
            continue
        for name, pattern in compiled:
            for m in pattern.finditer(text):
                line_no = text[: m.start()].count("\n") + 1
                matches.append(
                    {
                        "pattern": name,
                        "file": str(path.relative_to(clone_path)),
                        "line": line_no,
                        "match_preview": m.group(0)[:200],
                    }
                )
    raw_path.write_text(json.dumps(matches, indent=2), encoding="utf-8")
    breakdown: dict[str, int] = {}
    for m in matches:
        breakdown[m["pattern"]] = breakdown.get(m["pattern"], 0) + 1
    return ScanResult(
        name="malware-pattern",
        status="pass" if not matches else "findings",
        findings_count=len(matches),
        raw_output_path=str(raw_path),
        severity_breakdown=breakdown,
    )


# ─── Dispatch ─────────────────────────────────────────────────────────────


SCAN_RUNNERS = {
    "osv-scanner": run_osv_scanner,
    "gitleaks": run_gitleaks,
    "syft": run_syft,
    "semgrep": run_semgrep,
    "trivy": run_trivy,
    "malware-pattern": run_malware_pattern_scan,
}


def run_all_scans(clone_path: Path, out_dir: Path) -> dict[str, ScanResult]:
    """Run every scan in SCAN_RUNNERS; return name → ScanResult."""
    out_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, ScanResult] = {}
    for name, runner in SCAN_RUNNERS.items():
        log.info("scan_starting: %s", name)
        try:
            results[name] = runner(clone_path, out_dir)
        except Exception as exc:  # pragma: no cover — defensive top-level
            log.exception("scan_crashed: %s", name)
            results[name] = ScanResult(name=name, status="error", reason=str(exc))
        log.info("scan_complete: %s status=%s findings=%d", name, results[name].status, results[name].findings_count)
    return results
