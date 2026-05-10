"""
coastal-cast — surgical CAST array editor for coastal-brewing/web/app/team/page.tsx.

Modifies a single CastMember entry (add / edit / remove) without touching the
rest of the file. PMO is enum-validated. Slug uniqueness is enforced. After
mutation, runs `tsc --noEmit -p web/tsconfig.json` and rolls back on failure.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TEAM_PAGE = REPO_ROOT / "coastal-brewing" / "web" / "app" / "team" / "page.tsx"
WEB_DIR = REPO_ROOT / "coastal-brewing" / "web"

PMO_VALUES = (
    "leadership",
    "loss-prevention",
    "sales",
    "marketing",
    "accounting",
    "back-office",
    "ops",
)

CAST_OPEN = "const CAST: CastMember[] = ["
CAST_CLOSE = "];"


def read_page() -> str:
    if not TEAM_PAGE.is_file():
        raise FileNotFoundError(f"team page not at {TEAM_PAGE}")
    return TEAM_PAGE.read_text(encoding="utf-8")


def find_cast_block(text: str) -> tuple[int, int]:
    """Return (open_brace_pos, close_brace_pos) of the CAST array contents."""
    open_idx = text.find(CAST_OPEN)
    if open_idx < 0:
        raise RuntimeError("CAST array opener not found in team page")
    array_start = open_idx + len(CAST_OPEN)
    depth = 1
    i = array_start
    while i < len(text):
        ch = text[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return array_start, i
        i += 1
    raise RuntimeError("CAST array closer not found")


def parse_cast_entries(block: str) -> list[dict]:
    """Pull each {id: "...", ...} object out of the array block.

    Lightweight regex-based parser — sufficient because every entry follows the
    same shape (id / display_name / function / pmo / story) and template
    literals are not used. The full TS parse happens later via tsc.
    """
    entries: list[dict] = []
    depth = 0
    start = -1
    in_str = False
    str_quote = ""
    i = 0
    while i < len(block):
        ch = block[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == str_quote:
                in_str = False
        else:
            if ch in ('"', "'"):
                in_str = True
                str_quote = ch
            elif ch == "{":
                if depth == 0:
                    start = i
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0 and start >= 0:
                    raw = block[start : i + 1]
                    entries.append({"raw": raw, "id": _extract_id(raw)})
                    start = -1
        i += 1
    return entries


def _extract_id(raw: str) -> str:
    m = re.search(r"id:\s*[\"']([^\"']+)[\"']", raw)
    return m.group(1) if m else ""


def _escape_ts_str(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def render_entry(slug: str, display_name: str, function: str, pmo: str, story: str) -> str:
    return (
        "  {\n"
        f'    id: "{_escape_ts_str(slug)}",\n'
        f'    display_name: "{_escape_ts_str(display_name)}",\n'
        f'    function: "{_escape_ts_str(function)}",\n'
        f'    pmo: "{_escape_ts_str(pmo)}",\n'
        "    story:\n"
        f'      "{_escape_ts_str(story)}",\n'
        "  },\n"
    )


def insert_entry(text: str, entry_block: str) -> str:
    open_idx, close_idx = find_cast_block(text)
    inner = text[open_idx:close_idx]
    if not inner.endswith("\n"):
        inner = inner + "\n"
    new_inner = inner + entry_block
    return text[:open_idx] + new_inner + text[close_idx:]


def replace_entry(text: str, slug: str, entry_block: str) -> str:
    open_idx, close_idx = find_cast_block(text)
    inner = text[open_idx:close_idx]
    entries = parse_cast_entries(inner)
    target = next((e for e in entries if e["id"] == slug), None)
    if not target:
        raise ValueError(f"no CAST entry with id={slug!r}")
    raw = target["raw"]
    raw_pos = inner.find(raw)
    if raw_pos < 0:
        raise RuntimeError("entry text drifted between parse and replace")
    abs_start = open_idx + raw_pos
    abs_end = abs_start + len(raw)
    pre = text[:abs_start]
    post = text[abs_end:]
    new_block_text = entry_block.rstrip("\n").rstrip(",")
    if post.lstrip().startswith(","):
        return pre + new_block_text + post
    return pre + new_block_text + "," + post


def remove_entry(text: str, slug: str) -> str:
    open_idx, close_idx = find_cast_block(text)
    inner = text[open_idx:close_idx]
    entries = parse_cast_entries(inner)
    target = next((e for e in entries if e["id"] == slug), None)
    if not target:
        raise ValueError(f"no CAST entry with id={slug!r}")
    raw = target["raw"]
    raw_pos = inner.find(raw)
    if raw_pos < 0:
        raise RuntimeError("entry text drifted between parse and remove")
    abs_start = open_idx + raw_pos
    abs_end = abs_start + len(raw)
    if text[abs_end : abs_end + 1] == ",":
        abs_end += 1
    if text[abs_end : abs_end + 1] == "\n":
        abs_end += 1
    line_start = text.rfind("\n", 0, abs_start) + 1
    leading = text[line_start:abs_start]
    if not leading.strip():
        abs_start = line_start
    return text[:abs_start] + text[abs_end:]


def list_entries(text: str) -> list[dict]:
    open_idx, close_idx = find_cast_block(text)
    inner = text[open_idx:close_idx]
    entries = parse_cast_entries(inner)
    out = []
    for e in entries:
        raw = e["raw"]
        m_dn = re.search(r"display_name:\s*[\"']([^\"']+)[\"']", raw)
        m_fn = re.search(r"function:\s*[\"']([^\"']+)[\"']", raw)
        m_pmo = re.search(r"pmo:\s*[\"']([^\"']+)[\"']", raw)
        out.append({
            "id": e["id"],
            "display_name": m_dn.group(1) if m_dn else "",
            "function": m_fn.group(1) if m_fn else "",
            "pmo": m_pmo.group(1) if m_pmo else "",
        })
    return out


def typecheck() -> tuple[bool, str]:
    if not (WEB_DIR / "tsconfig.json").is_file():
        return True, "(no web/tsconfig.json — typecheck skipped)"
    proc = subprocess.run(  # noqa: S603
        ["npx", "tsc", "--noEmit", "-p", str(WEB_DIR / "tsconfig.json")],
        capture_output=True,
        text=True,
        timeout=240,
        cwd=str(WEB_DIR),
        encoding="utf-8",
    )
    return proc.returncode == 0, (proc.stdout + proc.stderr).strip()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="coastal-cast")
    sub = parser.add_subparsers(dest="action", required=True)

    p_add = sub.add_parser("add", help="Add a new CAST entry.")
    p_add.add_argument("slug")
    p_add.add_argument("--display-name", required=True)
    p_add.add_argument("--function", required=True)
    p_add.add_argument("--pmo", required=True, choices=PMO_VALUES)
    p_add.add_argument("--story", required=True)

    p_edit = sub.add_parser("edit", help="Replace an existing CAST entry by id.")
    p_edit.add_argument("slug")
    p_edit.add_argument("--display-name")
    p_edit.add_argument("--function")
    p_edit.add_argument("--pmo", choices=PMO_VALUES)
    p_edit.add_argument("--story")

    p_rm = sub.add_parser("remove", help="Remove a CAST entry by id.")
    p_rm.add_argument("slug")

    p_ls = sub.add_parser("list", help="List all CAST entries.")
    p_ls.add_argument("--pmo", choices=PMO_VALUES, help="Filter by PMO.")

    parser.add_argument("--no-typecheck", action="store_true", help="Skip tsc pass.")
    parser.add_argument("--json", action="store_true")

    args = parser.parse_args(argv)

    text = read_page()

    if args.action == "list":
        entries = list_entries(text)
        if args.pmo:
            entries = [e for e in entries if e["pmo"] == args.pmo]
        if args.json:
            print(json.dumps(entries, indent=2))
        else:
            for e in entries:
                print(f"  {e['id']:20s} {e['pmo']:14s} {e['function']}")
        return 0

    backup = TEAM_PAGE.with_suffix(".tsx.bak")
    shutil.copy2(TEAM_PAGE, backup)

    try:
        if args.action == "add":
            existing = list_entries(text)
            if any(e["id"] == args.slug for e in existing):
                print(f"❌ slug already exists: {args.slug}", file=sys.stderr)
                return 2
            entry_block = render_entry(
                args.slug, args.display_name, args.function, args.pmo, args.story
            )
            new_text = insert_entry(text, entry_block)

        elif args.action == "edit":
            existing = list_entries(text)
            current = next((e for e in existing if e["id"] == args.slug), None)
            if not current:
                print(f"❌ slug not found: {args.slug}", file=sys.stderr)
                return 2
            full_existing = parse_cast_entries(text[slice(*find_cast_block(text))])
            current_full = next(e for e in full_existing if e["id"] == args.slug)
            raw = current_full["raw"]
            m_dn = re.search(r"display_name:\s*[\"']([^\"']+)[\"']", raw)
            m_fn = re.search(r"function:\s*[\"']([^\"']+)[\"']", raw)
            m_pmo = re.search(r"pmo:\s*[\"']([^\"']+)[\"']", raw)
            m_story = re.search(r"story:\s*\n?\s*[\"']([\s\S]*?)[\"'],?\s*\n?\s*\}", raw)

            new_dn = args.display_name or (m_dn.group(1) if m_dn else "")
            new_fn = args.function or (m_fn.group(1) if m_fn else "")
            new_pmo = args.pmo or (m_pmo.group(1) if m_pmo else "")
            new_story = args.story or (m_story.group(1) if m_story else "")

            entry_block = render_entry(args.slug, new_dn, new_fn, new_pmo, new_story)
            new_text = replace_entry(text, args.slug, entry_block)

        elif args.action == "remove":
            new_text = remove_entry(text, args.slug)

        else:
            parser.error(f"unknown action: {args.action}")
            return 2

        TEAM_PAGE.write_text(new_text, encoding="utf-8")

        if not args.no_typecheck:
            ok, msg = typecheck()
            if not ok:
                shutil.copy2(backup, TEAM_PAGE)
                print(f"❌ typecheck FAILED — rolled back\n{msg[:1500]}", file=sys.stderr)
                return 1

        result = {
            "action": args.action,
            "slug": args.slug,
            "page_path": str(TEAM_PAGE),
            "typecheck": "PASS" if not args.no_typecheck else "skipped",
            "backup_path": str(backup),
        }
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            for k, v in result.items():
                print(f"  {k:14s}: {v}")
        return 0

    except Exception as e:  # noqa: BLE001
        shutil.copy2(backup, TEAM_PAGE)
        print(f"❌ {type(e).__name__}: {e} — rolled back", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
