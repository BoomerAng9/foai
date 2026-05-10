"""
coastal-deploy — SCP file to aims-vps + rebuild container + md5-verify live URL.

Pipeline:
  1. scp <local-file> aims-vps:<remote>
  2. ssh aims-vps "cd /docker/coastal-brewing && docker compose build <target> && docker compose up -d <target>"
  3. After ~12s settle: GET <verify-url> + md5 compare local vs live

Failure handling: SCP retries once on connection-reset (we hit this 4× in the manual session).
Cache: none.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shlex
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

DEFAULT_HOST = "aims-vps"
DEFAULT_REMOTE_BASE = "/docker/coastal-brewing"
DEFAULT_SETTLE_SECONDS = 12
DEFAULT_REBUILD_TARGETS = ("web", "runner", "both")


def md5_local(path: Path) -> str:
    h = hashlib.md5()  # noqa: S324 — content-fingerprint, not security
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def md5_url(url: str, timeout: int = 30) -> str:
    h = hashlib.md5()  # noqa: S324
    req = urllib.request.Request(url, headers={"User-Agent": "coastal-deploy/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        for chunk in iter(lambda: resp.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def run_cmd(cmd: list[str], timeout: int = 600) -> tuple[int, str, str]:
    proc = subprocess.run(  # noqa: S603 — args list, not shell string
        cmd, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace"
    )
    return proc.returncode, proc.stdout, proc.stderr


def scp_with_retry(local: Path, host: str, remote: str, retries: int = 1) -> tuple[bool, str]:
    cmd = ["scp", "-q", str(local), f"{host}:{remote}"]
    for attempt in range(retries + 1):
        rc, out, err = run_cmd(cmd, timeout=300)
        if rc == 0:
            return True, ""
        is_reset = "connection reset" in (err + out).lower() or "broken pipe" in (err + out).lower()
        if not is_reset or attempt == retries:
            return False, (err or out).strip()
        time.sleep(2)
    return False, "scp failed after retries"


def ssh_rebuild(host: str, base: str, target: str) -> tuple[bool, str]:
    if target == "both":
        compose = (
            f"cd {shlex.quote(base)} && "
            f"docker compose build web runner && docker compose up -d web runner"
        )
    else:
        compose = (
            f"cd {shlex.quote(base)} && "
            f"docker compose build {shlex.quote(target)} && "
            f"docker compose up -d {shlex.quote(target)}"
        )
    rc, out, err = run_cmd(["ssh", host, compose], timeout=900)
    if rc != 0:
        return False, (err or out).strip()
    return True, out.strip().splitlines()[-1] if out.strip() else "rebuild ok"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="coastal-deploy",
        description="SCP a local file to aims-vps, rebuild Coastal containers, md5-verify the live URL.",
    )
    parser.add_argument("local_file", help="Local file path to upload.")
    parser.add_argument(
        "--remote",
        help="Remote target path. Default: <DEFAULT_REMOTE_BASE>/<basename>",
    )
    parser.add_argument(
        "--rebuild",
        choices=DEFAULT_REBUILD_TARGETS + ("none",),
        default="none",
        help="Container target to rebuild after SCP. Default: none (file-only deploy).",
    )
    parser.add_argument(
        "--verify-url",
        help="HTTPS URL to GET after rebuild + md5-compare against local.",
    )
    parser.add_argument(
        "--host", default=DEFAULT_HOST, help=f"SSH host alias. Default: {DEFAULT_HOST}"
    )
    parser.add_argument(
        "--settle-seconds",
        type=int,
        default=DEFAULT_SETTLE_SECONDS,
        help="Sleep after rebuild before md5-verify. Default: 12.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of human text.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen — make no SSH/SCP calls.",
    )
    args = parser.parse_args(argv)

    local_path = Path(args.local_file)
    if not local_path.is_file():
        print(f"❌ local file not found: {local_path}", file=sys.stderr)
        return 2

    remote_path = args.remote or f"{DEFAULT_REMOTE_BASE}/{local_path.name}"

    result: dict = {
        "local_file": str(local_path),
        "remote_path": remote_path,
        "host": args.host,
        "md5_local": md5_local(local_path),
        "scp_status": None,
        "scp_error": None,
        "rebuild_status": None,
        "rebuild_error": None,
        "rebuild_target": args.rebuild,
        "verify_url": args.verify_url,
        "md5_live": None,
        "md5_match": None,
        "elapsed_seconds": None,
    }

    if args.dry_run:
        result["scp_status"] = "DRY_RUN"
        result["rebuild_status"] = "DRY_RUN" if args.rebuild != "none" else "skipped"
        result["md5_match"] = "DRY_RUN" if args.verify_url else None
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            for k, v in result.items():
                print(f"  {k:18s}: {v}")
        return 0

    started = time.time()

    # Step 1 — SCP
    ok, err = scp_with_retry(local_path, args.host, remote_path, retries=1)
    if not ok:
        result["scp_status"] = "FAIL"
        result["scp_error"] = err
        result["elapsed_seconds"] = round(time.time() - started, 1)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"❌ scp failed: {err}", file=sys.stderr)
        return 1
    result["scp_status"] = "PASS"

    # Step 2 — rebuild (optional)
    if args.rebuild != "none":
        ok, msg = ssh_rebuild(args.host, DEFAULT_REMOTE_BASE, args.rebuild)
        if not ok:
            result["rebuild_status"] = "FAIL"
            result["rebuild_error"] = msg
            result["elapsed_seconds"] = round(time.time() - started, 1)
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ rebuild failed: {msg}", file=sys.stderr)
            return 1
        result["rebuild_status"] = "PASS"
    else:
        result["rebuild_status"] = "skipped"

    # Step 3 — md5 verify (optional)
    if args.verify_url:
        if args.rebuild != "none":
            time.sleep(args.settle_seconds)
        try:
            live = md5_url(args.verify_url)
            result["md5_live"] = live
            result["md5_match"] = live == result["md5_local"]
        except Exception as e:  # noqa: BLE001
            result["md5_live"] = f"ERROR: {e}"
            result["md5_match"] = False

    result["elapsed_seconds"] = round(time.time() - started, 1)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"  scp:           PASS  ({local_path.name} → {args.host}:{remote_path})")
        print(f"  rebuild:       {result['rebuild_status']}  ({args.rebuild})")
        if args.verify_url:
            mark = "✅" if result["md5_match"] else "❌"
            print(f"  md5 verify:    {mark}  local={result['md5_local'][:8]}…  live={str(result['md5_live'])[:8]}…")
        print(f"  elapsed:       {result['elapsed_seconds']}s")

    if args.verify_url and not result["md5_match"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
