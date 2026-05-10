"""Code_Ang — code generation + review agent in the A.I.M.S. ecosystem.

Routes through the A.I.M.S. Model Gateway's `code_generation` surface
(Claude Sonnet 4-6). Multi-step code reasoning where tool-use accuracy
compounds; Sonnet earns its cost on this surface per the alignment
matrix locked 2026-05-06.

Tool surface (all read-only by default; write/execute gated):
- code_read_file(path)         — read a file from the codebase
- code_list_directory(path)    — list files under a directory
- code_search_grep(pattern, path) — ripgrep-style content search
- code_git_diff(path?)         — show pending diff
- code_git_log(limit)          — recent commit history
- code_run_check(cmd)          — gated: run lint/test/build (CODE_ANG_EXEC_ENABLED=1)

The agent runs the Sonnet tool-use loop: receive a goal → tool calls
→ ingest results → repeat until final answer or max_iterations.

Activation gates:
- INWORLD_API_KEY (gateway access — already in vault)
- CODE_ANG_REPO_ROOT (default: parent of scripts/ — coastal-brewing/)
- CODE_ANG_EXEC_ENABLED (optional, default off — enables run_check)
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import re
import subprocess
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

log = logging.getLogger("aims.code_ang")

REPO_ROOT = pathlib.Path(
    os.environ.get(
        "CODE_ANG_REPO_ROOT",
        str(pathlib.Path(__file__).resolve().parent.parent.parent),
    )
).resolve()
EXEC_ENABLED = bool(os.environ.get("CODE_ANG_EXEC_ENABLED", "").strip())
MAX_FILE_BYTES = 200_000   # cap file reads
MAX_GREP_HITS = 60         # cap grep results to keep prompt budget sane


# ─── Activation ─────────────────────────────────────────────────────────


def is_configured() -> bool:
    from aims_gateway import is_configured as _gw_configured
    return _gw_configured() and REPO_ROOT.exists()


def missing_keys() -> List[str]:
    out: List[str] = []
    from aims_gateway import is_configured as _gw_configured
    if not _gw_configured():
        out.append("INWORLD_API_KEY")
    if not REPO_ROOT.exists():
        out.append(f"CODE_ANG_REPO_ROOT (path missing: {REPO_ROOT})")
    return out


# ─── Path safety ────────────────────────────────────────────────────────


def _safe_path(rel_or_abs: str) -> Optional[pathlib.Path]:
    """Resolve a path within REPO_ROOT — returns None if it escapes the
    sandbox. Prevents a tool call from reading arbitrary host files."""
    try:
        p = pathlib.Path(rel_or_abs)
        if not p.is_absolute():
            p = REPO_ROOT / p
        p = p.resolve()
        # Make sure resolved path is inside REPO_ROOT.
        p.relative_to(REPO_ROOT)
        return p
    except (ValueError, OSError):
        return None


# ─── Tool implementations ───────────────────────────────────────────────


def code_read_file(path: str) -> Dict[str, Any]:
    p = _safe_path(path)
    if p is None:
        return {"error": f"path '{path}' outside CODE_ANG_REPO_ROOT"}
    if not p.exists() or not p.is_file():
        return {"error": f"file not found: {path}"}
    try:
        data = p.read_bytes()
        if len(data) > MAX_FILE_BYTES:
            return {
                "error": f"file too large ({len(data)} bytes > {MAX_FILE_BYTES} cap)",
                "size": len(data),
                "head": data[:2000].decode("utf-8", "replace"),
            }
        text = data.decode("utf-8", "replace")
        return {
            "ok": True,
            "path": str(p.relative_to(REPO_ROOT)),
            "size": len(data),
            "lines": text.count("\n") + 1,
            "content": text,
        }
    except Exception as exc:
        return {"error": f"read failed: {exc}"}


def code_list_directory(path: str = ".") -> Dict[str, Any]:
    p = _safe_path(path)
    if p is None or not p.exists() or not p.is_dir():
        return {"error": f"directory not found or unsafe: {path}"}
    try:
        entries = []
        for child in sorted(p.iterdir()):
            if child.name.startswith("."):
                continue
            entries.append({
                "name": child.name,
                "type": "dir" if child.is_dir() else "file",
                "size": child.stat().st_size if child.is_file() else None,
            })
        return {
            "ok": True,
            "path": str(p.relative_to(REPO_ROOT)),
            "entries": entries[:200],
        }
    except Exception as exc:
        return {"error": f"list failed: {exc}"}


def code_search_grep(pattern: str, path: str = ".") -> Dict[str, Any]:
    p = _safe_path(path)
    if p is None or not p.exists():
        return {"error": f"path not found or unsafe: {path}"}
    try:
        regex = re.compile(pattern)
    except re.error as exc:
        return {"error": f"invalid regex: {exc}"}
    hits: List[Dict[str, Any]] = []
    try:
        targets = [p] if p.is_file() else list(p.rglob("*.py")) + list(p.rglob("*.ts")) + list(p.rglob("*.tsx")) + list(p.rglob("*.md"))
        for f in targets:
            if any(part.startswith(".") or part == "node_modules" or part == "__pycache__" for part in f.parts):
                continue
            try:
                lines = f.read_text("utf-8", "replace").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, start=1):
                if regex.search(line):
                    hits.append({
                        "path": str(f.relative_to(REPO_ROOT)),
                        "line": i,
                        "text": line[:300],
                    })
                    if len(hits) >= MAX_GREP_HITS:
                        return {"ok": True, "hits": hits, "truncated": True}
        return {"ok": True, "hits": hits, "truncated": False}
    except Exception as exc:
        return {"error": f"grep failed: {exc}"}


def code_git_diff(path: str = "") -> Dict[str, Any]:
    """Return git diff (HEAD vs working tree) for an optional path."""
    cmd = ["git", "-C", str(REPO_ROOT), "diff", "--no-color"]
    if path:
        safe = _safe_path(path)
        if safe is None:
            return {"error": f"path '{path}' outside repo"}
        cmd.append(str(safe.relative_to(REPO_ROOT)))
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, timeout=15)
        text = out.decode("utf-8", "replace")
        return {
            "ok": True,
            "diff_bytes": len(out),
            "diff": text[:30000],   # cap for prompt budget
            "truncated": len(out) > 30000,
        }
    except subprocess.CalledProcessError as exc:
        return {"error": f"git diff failed: {exc.output.decode('utf-8','replace')[:300]}"}
    except Exception as exc:
        return {"error": f"git diff exception: {exc}"}


def code_git_log(limit: int = 10) -> Dict[str, Any]:
    cmd = [
        "git", "-C", str(REPO_ROOT), "log",
        f"-n{max(1, min(int(limit or 10), 50))}",
        "--no-color",
        "--pretty=format:%h|%ad|%an|%s",
        "--date=short",
    ]
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, timeout=15)
        commits = []
        for line in out.decode("utf-8", "replace").splitlines():
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "sha": parts[0], "date": parts[1],
                    "author": parts[2], "subject": parts[3],
                })
        return {"ok": True, "commits": commits}
    except Exception as exc:
        return {"error": f"git log failed: {exc}"}


def code_run_check(cmd: str) -> Dict[str, Any]:
    """Gated execution — runs `cmd` inside REPO_ROOT. Off by default."""
    if not EXEC_ENABLED:
        return {
            "error": "execution disabled",
            "hint": "set CODE_ANG_EXEC_ENABLED=1 to enable code_run_check",
        }
    # Allowlist common dev commands; reject anything that looks dangerous.
    allowed_prefixes = ("pytest", "npm test", "npm run", "ruff", "mypy", "tsc", "eslint", "git diff", "git log", "git status")
    if not any(cmd.strip().startswith(p) for p in allowed_prefixes):
        return {"error": f"command not in allowlist: prefix must be one of {allowed_prefixes}"}
    try:
        out = subprocess.run(
            cmd, shell=True, cwd=str(REPO_ROOT),
            capture_output=True, timeout=120,
        )
        return {
            "ok": out.returncode == 0,
            "exit_code": out.returncode,
            "stdout": out.stdout.decode("utf-8", "replace")[:5000],
            "stderr": out.stderr.decode("utf-8", "replace")[:2000],
        }
    except subprocess.TimeoutExpired:
        return {"error": "command timed out (120s cap)"}
    except Exception as exc:
        return {"error": f"run_check exception: {exc}"}


# ─── Tool registry ──────────────────────────────────────────────────────


TOOL_SCHEMA: List[Dict[str, Any]] = [
    {"type": "function", "function": {
        "name": "code_read_file",
        "description": "Read a file from the codebase. Returns content + line count + size. Caps at 200KB.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "Path relative to repo root."},
        }, "required": ["path"]},
    }},
    {"type": "function", "function": {
        "name": "code_list_directory",
        "description": "List files + subdirs in a directory. Returns up to 200 entries with type + size.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "Directory path relative to repo root (default '.')."},
        }, "required": []},
    }},
    {"type": "function", "function": {
        "name": "code_search_grep",
        "description": "Regex search across .py/.ts/.tsx/.md files under a path. Returns up to 60 hits with line+text.",
        "parameters": {"type": "object", "properties": {
            "pattern": {"type": "string", "description": "Python regex pattern."},
            "path": {"type": "string", "description": "Directory or file to search (default '.')."},
        }, "required": ["pattern"]},
    }},
    {"type": "function", "function": {
        "name": "code_git_diff",
        "description": "Show pending git diff (HEAD vs working tree). Optional path scope. Capped at 30KB.",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string", "description": "Optional path scope."},
        }, "required": []},
    }},
    {"type": "function", "function": {
        "name": "code_git_log",
        "description": "Show recent commits. Default 10, max 50.",
        "parameters": {"type": "object", "properties": {
            "limit": {"type": "integer", "description": "Number of commits to return."},
        }, "required": []},
    }},
    {"type": "function", "function": {
        "name": "code_run_check",
        "description": "Run an allowlisted dev command (pytest, npm test, ruff, mypy, tsc, eslint, git status). Gated by CODE_ANG_EXEC_ENABLED env.",
        "parameters": {"type": "object", "properties": {
            "cmd": {"type": "string", "description": "Allowlisted command — see tool description."},
        }, "required": ["cmd"]},
    }},
]


_TOOL_DISPATCH = {
    "code_read_file":      lambda **kw: code_read_file(kw.get("path", "")),
    "code_list_directory": lambda **kw: code_list_directory(kw.get("path", ".")),
    "code_search_grep":    lambda **kw: code_search_grep(kw.get("pattern", ""), kw.get("path", ".")),
    "code_git_diff":       lambda **kw: code_git_diff(kw.get("path", "")),
    "code_git_log":        lambda **kw: code_git_log(kw.get("limit", 10)),
    "code_run_check":      lambda **kw: code_run_check(kw.get("cmd", "")),
}


# ─── Agent loop ────────────────────────────────────────────────────────


@dataclass
class CodeAngResult:
    final_answer: str = ""
    iterations: int = 0
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    duration_ms: float = 0.0


_DEFAULT_SYSTEM_PROMPT = """\
You are Code_Ang, the code generation + review agent for the A.I.M.S. \
ecosystem. You read code, search code, inspect git history, and produce \
specific, actionable code answers — file paths, line numbers, exact \
diffs, concrete suggestions.

You have read access to the codebase via tools. Use them to ground \
every claim in actual code; never invent file contents or APIs. When \
you need to verify a claim, call code_read_file or code_search_grep. \
When you need historical context, call code_git_log or code_git_diff.

Output rules: when you have a confident answer, return clean prose \
with file_path:line_number references. No markdown headings, no \
bullets unless presenting a code block. Stop calling tools as soon as \
you can produce a confident answer.

Never fabricate. If a tool returns no results or the answer isn't in \
the code, say that plainly.
"""


def run_agent(
    goal: str,
    max_iterations: int = 8,
    system_prompt: Optional[str] = None,
) -> CodeAngResult:
    from aims_gateway import chat_completion as _gw_chat_completion

    started = time.time()
    result = CodeAngResult()

    if not is_configured():
        result.error = (
            f"agent inactive — missing: {', '.join(missing_keys())}"
        )
        result.duration_ms = (time.time() - started) * 1000
        return result

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt or _DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": goal},
    ]

    for i in range(max_iterations):
        result.iterations = i + 1
        resp = _gw_chat_completion(
            surface="code_generation",
            messages=messages,
            max_tokens=4096,
            temperature=0.2,
            extra_body={"tools": TOOL_SCHEMA, "tool_choice": "auto"},
            timeout=90,
        )
        if not resp:
            result.error = "gateway returned no response"
            break
        choice = (resp.get("choices") or [{}])[0]
        msg = choice.get("message") or {}

        tool_calls = msg.get("tool_calls") or []
        if tool_calls:
            messages.append(msg)
            for call in tool_calls:
                fn_name = (call.get("function") or {}).get("name", "")
                fn_args_raw = (call.get("function") or {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                except json.JSONDecodeError:
                    fn_args = {}
                impl = _TOOL_DISPATCH.get(fn_name)
                if impl is None:
                    tool_result = {"error": f"unknown tool: {fn_name}"}
                else:
                    try:
                        tool_result = impl(**fn_args)
                    except Exception as exc:
                        tool_result = {"error": f"{fn_name} raised: {exc}"}
                result.tool_calls.append({
                    "iteration": i + 1, "tool": fn_name, "args": fn_args,
                    "result_preview": json.dumps(tool_result)[:400],
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.get("id", ""),
                    "content": json.dumps(tool_result),
                })
            continue

        content = msg.get("content")
        result.final_answer = (content or "").strip()
        result.duration_ms = (time.time() - started) * 1000
        return result

    result.error = f"max_iterations ({max_iterations}) reached without final answer"
    result.duration_ms = (time.time() - started) * 1000
    return result
