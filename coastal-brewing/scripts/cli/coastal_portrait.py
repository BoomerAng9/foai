"""
coastal-portrait — full portrait pipeline per persona.

Pipeline:
  1. Read canon via coastal-canon <slug> (subprocess, JSON)
  2. Build Higgsfield prompt from canon (species, region, role, brand context)
  3. Stage 1: higgsfield generate create nano_banana_2 --image <canon-ref> --prompt <built> --wait
  4. Optionally Stage 2: gpt_image_2 refinement using Stage 1 output as input
  5. Save outputs to web/public/team/_<slug>_candidates/<slug>_v<n>.png

Owner-gate: Stage 2 + ship require explicit --ship.
Cache: SQLite at ~/.cache/agentic-cli/coastal-portrait/portrait.db.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TEAM_PUBLIC = REPO_ROOT / "coastal-brewing" / "web" / "public" / "team"
BRAND_PUBLIC = REPO_ROOT / "coastal-brewing" / "web" / "public" / "brand"
CACHE_DIR = Path.home() / ".cache" / "agentic-cli" / "coastal-portrait"
CACHE_DB = CACHE_DIR / "portrait.db"

CANON_REFS = {
    "tate-faceplate": TEAM_PUBLIC / "bar_ang.png",
    "sal-canonical": TEAM_PUBLIC / "sal_ang.png",
    "melli-office": BRAND_PUBLIC / "storefront-canon.png",
    "storefront": BRAND_PUBLIC / "storefront-window-etching-detail.png",
    "brand-grid": BRAND_PUBLIC / "brand-grid-canon.png",
}

PROMPT_TIER_BLOCKS = {
    "Boomer_Ang": (
        "Anthropomorphic character in Coastal Brewing Co. canonical Boomer_Ang style: "
        "bust shot from chest up, integrated face shield with green LED text reading the role name, "
        "cream-poster parchment backdrop with subtle Lowcountry texture, "
        "uniform with 3-stripe chevron + 'Made in PLR' chest patch. "
        "Documentary photorealism, soft cinematic lighting, no animation, no CGI shading. "
    ),
    "Lil_Hawk": (
        "Anthropomorphic Lil_Hawk character in Coastal Brewing Co. canon: "
        "high-resolution digital camo uniform, warehouse setting with industrial racking, "
        "tactical posture, no face shield, documentary photorealism, soft cinematic lighting. "
    ),
    "Boomer_Roo": (
        "Anthropomorphic kangaroo Roo team member in Coastal Brewing Co. canon: "
        "high-resolution digital camo shirt, warehouse setting, kangaroo tail visible, "
        "documentary photorealism, soft cinematic lighting. "
    ),
    "Sett": (
        "Anthropomorphic mustelid for Coastal Brewing Co. Sett (Marketing tier): "
        "{species_specific}, regional context: {region}. "
        "Documentary editorial portrait, soft natural lighting, "
        "Sett internal — no face shield, role-appropriate professional attire. "
    ),
}


def ensure_cache() -> sqlite3.Connection:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB))
    conn.execute(
        """CREATE TABLE IF NOT EXISTS portraits (
            slug TEXT NOT NULL,
            stage TEXT NOT NULL,
            canon_ref TEXT,
            prompt TEXT,
            job_id TEXT,
            result_url TEXT,
            local_path TEXT,
            credits_spent REAL,
            created_at TEXT,
            PRIMARY KEY (slug, stage, canon_ref)
        )"""
    )
    conn.commit()
    return conn


def fetch_canon(slug: str) -> dict:
    proc = subprocess.run(  # noqa: S603 — uses our own CLI
        [sys.executable, str(Path(__file__).parent / "coastal_canon.py"), slug, "--json"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=15,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"coastal-canon failed for {slug}: {proc.stderr}")
    return json.loads(proc.stdout)


def detect_tier(canon: dict) -> str:
    pmo = (canon.get("pmo") or "").lower()
    species = (canon.get("species") or "").lower()
    role = (canon.get("role") or "").lower()
    if pmo == "marketing" or "sett" in role:
        return "Sett"
    if "kangaroo" in species or "roo" in role:
        return "Boomer_Roo"
    if "lil_" in (canon.get("slug") or "").lower() or "lil hawk" in role:
        return "Lil_Hawk"
    return "Boomer_Ang"


def build_prompt(canon: dict) -> str:
    tier = detect_tier(canon)
    block = PROMPT_TIER_BLOCKS[tier]
    species = canon.get("species") or ""
    region = canon.get("region") or ""

    if tier == "Sett":
        block = block.format(
            species_specific=f"{species} morphology with persona-specific traits",
            region=region or "—",
        )

    role_line = f"Role: {canon.get('role') or canon.get('display_name')}. "
    name_line = f"Display name: {canon.get('display_name')}. "
    region_line = f"Region: {region}. " if region and tier != "Sett" else ""

    return (block + role_line + name_line + region_line).strip()


def resolve_canon_ref(canon_ref: str | None, canon: dict) -> Path | None:
    if not canon_ref:
        tier = detect_tier(canon)
        defaults = {
            "Boomer_Ang": "tate-faceplate",
            "Boomer_Roo": "brand-grid",
            "Lil_Hawk": "brand-grid",
            "Sett": None,
        }
        canon_ref = defaults.get(tier)
        if not canon_ref:
            return None
    if canon_ref in CANON_REFS:
        path = CANON_REFS[canon_ref]
        return path if path.is_file() else None
    p = Path(canon_ref)
    return p if p.is_file() else None


def stage_1_higgsfield(slug: str, prompt: str, ref_path: Path | None, dry_run: bool) -> dict:
    cmd = ["higgsfield", "generate", "create", "nano_banana_2", "--prompt", prompt]
    if ref_path:
        cmd += ["--image", str(ref_path)]
    cmd += ["--wait", "--wait-timeout", "10m", "--wait-interval", "10s", "--json"]

    if dry_run:
        return {"job_id": "DRY_RUN", "result_url": None, "credits": 0.0, "cmd": " ".join(cmd)}

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=720)  # noqa: S603
    if proc.returncode != 0:
        raise RuntimeError(f"higgsfield stage 1 failed: {proc.stderr.strip()[:500]}")

    payload = _extract_json(proc.stdout)
    job_id = payload.get("job_id") or payload.get("id") or ""
    result_url = (
        payload.get("result_url")
        or (payload.get("results") or [{}])[0].get("url")
        or (payload.get("output") or [{}])[0].get("url")
        or ""
    )
    credits = float(payload.get("credits_spent") or payload.get("cost") or 0.0)
    return {"job_id": job_id, "result_url": result_url, "credits": credits, "raw": payload}


def stage_2_gpt_image_2(slug: str, stage1_url: str, prompt: str, dry_run: bool) -> dict:
    cmd = [
        "higgsfield", "generate", "create", "gpt_image_2",
        "--prompt", prompt + " High-precision refinement: brand mark, chevron, chest patch, LED visor text — all canon-correct.",
        "--image", stage1_url,
        "--wait", "--wait-timeout", "10m", "--wait-interval", "10s", "--json",
    ]

    if dry_run:
        return {"job_id": "DRY_RUN", "result_url": None, "credits": 0.0, "cmd": " ".join(cmd)}

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=720)  # noqa: S603
    if proc.returncode != 0:
        raise RuntimeError(f"higgsfield stage 2 failed: {proc.stderr.strip()[:500]}")

    payload = _extract_json(proc.stdout)
    job_id = payload.get("job_id") or payload.get("id") or ""
    result_url = (
        payload.get("result_url")
        or (payload.get("results") or [{}])[0].get("url")
        or (payload.get("output") or [{}])[0].get("url")
        or ""
    )
    credits = float(payload.get("credits_spent") or payload.get("cost") or 0.0)
    return {"job_id": job_id, "result_url": result_url, "credits": credits, "raw": payload}


def _extract_json(stdout: str) -> dict:
    stripped = stdout.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass
    m = re.search(r"(\{.*\})", stdout, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return {}


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "coastal-portrait/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp, dest.open("wb") as f:  # noqa: S310
        shutil.copyfileobj(resp, f)
    return dest


def next_version(slug: str) -> int:
    candidates_dir = TEAM_PUBLIC / f"_{slug}_candidates"
    if not candidates_dir.is_dir():
        return 1
    pattern = re.compile(rf"{re.escape(slug)}_v(\d+)\.png$")
    versions = [
        int(m.group(1)) for p in candidates_dir.glob(f"{slug}_v*.png") if (m := pattern.match(p.name))
    ]
    return (max(versions) + 1) if versions else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="coastal-portrait",
        description="Run the 2-stage Higgsfield portrait pipeline for a Coastal persona.",
    )
    parser.add_argument("slug", help="Persona slug (resolved via coastal-canon)")
    parser.add_argument(
        "--canon-ref",
        help=f"Reference image. Names: {','.join(CANON_REFS)} OR a local path. Defaults by tier.",
    )
    parser.add_argument(
        "--stages",
        choices=("1", "2", "both"),
        default="1",
        help="Which stages to run. Default 1 (Stage-2 needs owner-confirm via --stages both or 2).",
    )
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--dry-run", action="store_true", help="No Higgsfield calls — show plan.")
    args = parser.parse_args(argv)

    canon = fetch_canon(args.slug)
    prompt = build_prompt(canon)
    ref_path = resolve_canon_ref(args.canon_ref, canon)
    tier = detect_tier(canon)
    version = next_version(args.slug)

    result: dict = {
        "slug": args.slug,
        "display_name": canon.get("display_name"),
        "tier": tier,
        "canon_ref": str(ref_path) if ref_path else None,
        "prompt": prompt,
        "version": version,
        "stage1": None,
        "stage2": None,
        "local_paths": [],
        "credits_total": 0.0,
        "elapsed_seconds": None,
    }

    started = time.time()
    conn = ensure_cache()
    candidates_dir = TEAM_PUBLIC / f"_{args.slug}_candidates"

    if args.stages in ("1", "both"):
        s1 = stage_1_higgsfield(args.slug, prompt, ref_path, args.dry_run)
        result["stage1"] = {k: s1.get(k) for k in ("job_id", "result_url", "credits")}
        result["credits_total"] += s1.get("credits", 0.0)
        if s1.get("result_url") and not args.dry_run:
            local = download(
                s1["result_url"], candidates_dir / f"{args.slug}_v{version}_stage1.png"
            )
            result["local_paths"].append(str(local))
            conn.execute(
                "INSERT OR REPLACE INTO portraits VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    args.slug, "stage1", str(ref_path) if ref_path else None,
                    prompt, s1["job_id"], s1["result_url"], str(local),
                    s1.get("credits", 0.0),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            conn.commit()

    if args.stages in ("2", "both"):
        stage1_url = (result["stage1"] or {}).get("result_url") if result["stage1"] else None
        if not stage1_url and not args.dry_run:
            print("❌ Stage 2 requires Stage 1 result_url (run --stages both or pass a Stage-1 url)", file=sys.stderr)
            conn.close()
            return 2
        s2 = stage_2_gpt_image_2(args.slug, stage1_url or "", prompt, args.dry_run)
        result["stage2"] = {k: s2.get(k) for k in ("job_id", "result_url", "credits")}
        result["credits_total"] += s2.get("credits", 0.0)
        if s2.get("result_url") and not args.dry_run:
            local = download(
                s2["result_url"], candidates_dir / f"{args.slug}_v{version}_stage2.png"
            )
            result["local_paths"].append(str(local))
            conn.execute(
                "INSERT OR REPLACE INTO portraits VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    args.slug, "stage2", stage1_url,
                    prompt, s2["job_id"], s2["result_url"], str(local),
                    s2.get("credits", 0.0),
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            conn.commit()

    conn.close()
    result["elapsed_seconds"] = round(time.time() - started, 1)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"  slug:          {args.slug}  ({canon.get('display_name')}, tier={tier})")
        print(f"  canon-ref:     {result['canon_ref'] or '(none)'}")
        print(f"  stage1:        {result['stage1']}")
        print(f"  stage2:        {result['stage2']}")
        print(f"  local saved:   {len(result['local_paths'])} file(s)")
        for p in result["local_paths"]:
            print(f"                   • {p}")
        print(f"  credits used:  {result['credits_total']}")
        print(f"  elapsed:       {result['elapsed_seconds']}s")

    return 0


if __name__ == "__main__":
    sys.exit(main())
