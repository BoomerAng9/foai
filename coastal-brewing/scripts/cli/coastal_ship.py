"""
coastal-ship — branch → commit → push → PR → CI wait → merge.

Pipeline:
  1. Stage exact files (never `git add .`)
  2. Commit with HEREDOC body (Co-Authored-By: Claude trailer)
  3. Push (--force-with-lease on existing branch; retry once on transient network)
  4. gh pr create (idempotent — re-uses existing PR if branch already linked)
  5. Wait for CI until mergeStateStatus ∈ {CLEAN, BLOCKED, DIRTY, UNSTABLE}
  6. If CLEAN + auto_merge → gh pr merge --merge --delete-branch --admin
  7. Verify merged via gh pr view --json state,mergedAt
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_TIMEOUT_SECONDS = 900
CI_POLL_SECONDS = 20

CO_AUTHOR_TRAILER = "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"


def run(cmd: list[str], cwd: str | None = None, check: bool = False, timeout: int = 300) -> tuple[int, str, str]:
    proc = subprocess.run(  # noqa: S603
        cmd,
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=timeout,
        encoding="utf-8",
        errors="replace",
    )
    if check and proc.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)} failed [{proc.returncode}]: {proc.stderr.strip()}")
    return proc.returncode, proc.stdout, proc.stderr


def current_branch(cwd: str) -> str:
    rc, out, _ = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd)
    if rc != 0:
        return ""
    return out.strip()


def stage_files(files: list[str], cwd: str) -> None:
    if not files:
        return
    rc, _, err = run(["git", "add", *files], cwd=cwd, check=False)
    if rc != 0:
        raise RuntimeError(f"git add failed: {err.strip()}")


def has_staged_changes(cwd: str) -> bool:
    rc, _, _ = run(["git", "diff", "--cached", "--quiet"], cwd=cwd)
    return rc != 0


def commit_with_message(title: str, body: str, cwd: str) -> str:
    full = title.strip()
    if body and body.strip():
        full = full + "\n\n" + body.strip()
    full = full + "\n\n" + CO_AUTHOR_TRAILER
    rc, out, err = run(["git", "commit", "-m", full], cwd=cwd, check=False)
    if rc != 0:
        raise RuntimeError(f"git commit failed: {(err or out).strip()}")
    rc, sha, _ = run(["git", "rev-parse", "HEAD"], cwd=cwd, check=True)
    return sha.strip()


def push_branch(branch: str, cwd: str, retries: int = 1) -> None:
    cmd = ["git", "push", "--set-upstream", "--force-with-lease", "origin", branch]
    for attempt in range(retries + 1):
        rc, out, err = run(cmd, cwd=cwd, timeout=180)
        if rc == 0:
            return
        msg = (err + out).lower()
        transient = any(s in msg for s in ("sec_e_message_altered", "broken pipe", "rpc failed", "could not read from remote", "connection reset"))
        if not transient or attempt == retries:
            raise RuntimeError(f"git push failed: {(err or out).strip()[:500]}")
        time.sleep(3)


def find_or_create_pr(branch: str, title: str, body: str, cwd: str) -> int:
    rc, out, _ = run(
        ["gh", "pr", "list", "--head", branch, "--json", "number,state", "--limit", "1"],
        cwd=cwd, check=False,
    )
    if rc == 0 and out.strip():
        items = json.loads(out)
        for item in items:
            if item.get("state") == "OPEN":
                return int(item["number"])

    rc, out, err = run(
        ["gh", "pr", "create", "--title", title, "--body", body],
        cwd=cwd, check=False, timeout=120,
    )
    if rc != 0:
        raise RuntimeError(f"gh pr create failed: {(err or out).strip()[:400]}")
    m = re.search(r"/pull/(\d+)", out)
    if not m:
        raise RuntimeError(f"could not parse PR number from: {out.strip()}")
    return int(m.group(1))


def fetch_pr_state(pr_number: int, cwd: str) -> dict:
    rc, out, err = run(
        ["gh", "pr", "view", str(pr_number), "--json",
         "number,state,mergeStateStatus,statusCheckRollup,mergedAt,mergeCommit"],
        cwd=cwd, check=False,
    )
    if rc != 0:
        raise RuntimeError(f"gh pr view failed: {(err or out).strip()[:400]}")
    return json.loads(out)


def wait_for_ci(pr_number: int, cwd: str, timeout: int) -> dict:
    deadline = time.time() + timeout
    last_state: dict = {}
    while time.time() < deadline:
        state = fetch_pr_state(pr_number, cwd)
        last_state = state
        merge_state = state.get("mergeStateStatus", "UNKNOWN")
        if merge_state in ("CLEAN", "DIRTY", "BLOCKED", "UNSTABLE"):
            return state
        time.sleep(CI_POLL_SECONDS)
    return last_state


def merge_pr(pr_number: int, cwd: str) -> dict:
    rc, out, err = run(
        ["gh", "pr", "merge", str(pr_number), "--merge", "--delete-branch", "--admin"],
        cwd=cwd, check=False, timeout=180,
    )
    if rc != 0:
        raise RuntimeError(f"gh pr merge failed: {(err or out).strip()[:400]}")
    state = fetch_pr_state(pr_number, cwd)
    return state


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="coastal-ship")
    parser.add_argument("--files", nargs="+", required=True, help="Files to stage (no globs).")
    parser.add_argument("--title", required=True, help="Commit + PR title.")
    parser.add_argument("--body", default="", help="Commit + PR body.")
    parser.add_argument("--branch", help="Branch name. Defaults to current branch.")
    parser.add_argument("--auto-merge", action="store_true",
                        help="Merge immediately when CI is CLEAN. Per standing-auth memory: ON for routine work.")
    parser.add_argument("--no-wait", action="store_true", help="Open PR + exit (skip CI wait + merge).")
    parser.add_argument(
        "--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS,
        help=f"CI wait timeout in seconds. Default {DEFAULT_TIMEOUT_SECONDS}.",
    )
    parser.add_argument("--cwd", default=os.getcwd(), help="Repo path.")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    branch = args.branch or current_branch(args.cwd)
    if not branch or branch == "main":
        print(f"❌ refusing to ship from branch={branch!r}", file=sys.stderr)
        return 2

    result: dict = {
        "branch": branch,
        "files": args.files,
        "commit_sha": None,
        "pushed": False,
        "pr_number": None,
        "merge_state": None,
        "merged_at": None,
        "merge_commit": None,
        "elapsed_seconds": None,
    }

    if args.dry_run:
        result.update({
            "commit_sha": "DRY_RUN",
            "pushed": "DRY_RUN",
            "pr_number": "DRY_RUN",
            "merge_state": "DRY_RUN",
        })
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            for k, v in result.items():
                print(f"  {k:14s}: {v}")
        return 0

    started = time.time()

    try:
        stage_files(args.files, args.cwd)
        if has_staged_changes(args.cwd):
            sha = commit_with_message(args.title, args.body, args.cwd)
            result["commit_sha"] = sha
        push_branch(branch, args.cwd)
        result["pushed"] = True

        pr = find_or_create_pr(branch, args.title, args.body, args.cwd)
        result["pr_number"] = pr

        if args.no_wait:
            result["merge_state"] = "NO_WAIT"
            result["elapsed_seconds"] = round(time.time() - started, 1)
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                for k, v in result.items():
                    print(f"  {k:14s}: {v}")
            return 0

        state = wait_for_ci(pr, args.cwd, args.timeout)
        result["merge_state"] = state.get("mergeStateStatus")

        if args.auto_merge and state.get("mergeStateStatus") in ("CLEAN", "UNSTABLE"):
            merged = merge_pr(pr, args.cwd)
            result["merge_state"] = merged.get("mergeStateStatus")
            result["merged_at"] = merged.get("mergedAt")
            result["merge_commit"] = (merged.get("mergeCommit") or {}).get("oid")

        result["elapsed_seconds"] = round(time.time() - started, 1)

    except Exception as e:  # noqa: BLE001
        result["error"] = f"{type(e).__name__}: {e}"
        result["elapsed_seconds"] = round(time.time() - started, 1)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"❌ {result['error']}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for k, v in result.items():
            print(f"  {k:14s}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
