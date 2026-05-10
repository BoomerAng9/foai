"""
coastal-anticipate — bridge for auto-implement Stage 2 (Coastal-specific intent).

Pure pattern-match (no LLM). Reads a transcript file or stdin text, scores
match against canonical Coastal triggers, returns the recommended action +
inferred slugs + confidence + rationale.

Returns no_action when confidence < 0.6 — auto-implement falls back to brief mode.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

CLI_BIN = Path(__file__).parent
PYTHON = sys.executable

SETT_TRIGGERS = (
    "sett", "badger", "mustelid", "marketing tier", "marketing arm",
    "12 mustelid", "marketing org", "twelve mustelid",
)

SALES_TRIGGERS = (
    "sales tier", "sales floor", "sal_ang", "lou", "barista", "front-of-house",
    "boomer_ang", "boomer ang",
)

PRICING_TRIGGERS = (
    "price", "pricing", "msrp", "sku", "catalog", "tier", "subscription",
    "haggle", "anchor", "landing zone",
)

CANON_TRIGGERS = (
    "brand mark", "logo", "etching", "storefront", "face shield", "visor",
    "uniform", "stork patch", "made in plr",
)

LP_TRIGGERS = (
    "loss prevention", "loss-prevention", "warehouse", "lp team",
    "high-res camo", "digital camo",
)

CONFIDENCE_FLOOR = 0.6


def list_personas() -> list[str]:
    proc = subprocess.run(  # noqa: S603
        [PYTHON, str(CLI_BIN / "coastal_canon.py"), "--list", "--json"],
        capture_output=True, text=True, timeout=10, encoding="utf-8",
    )
    if proc.returncode != 0:
        return []
    try:
        data = json.loads(proc.stdout)
        return data.get("personas", [])
    except json.JSONDecodeError:
        return []


def find_named_personas(text: str, personas: list[str]) -> list[str]:
    text_low = text.lower()
    found: list[str] = []
    for p in personas:
        # match by slug or by likely display-name (slug + spaces)
        if p in text_low or p.replace("_", " ") in text_low:
            found.append(p)
    return sorted(set(found))


def trigger_score(text_low: str, triggers: tuple[str, ...]) -> tuple[int, list[str]]:
    hits = [t for t in triggers if t in text_low]
    return len(hits), hits


def classify(text: str) -> dict:
    text_low = text.lower()
    personas = list_personas()
    named = find_named_personas(text, personas)

    sett_hits, sett_terms = trigger_score(text_low, SETT_TRIGGERS)
    sales_hits, sales_terms = trigger_score(text_low, SALES_TRIGGERS)
    pricing_hits, pricing_terms = trigger_score(text_low, PRICING_TRIGGERS)
    canon_hits, canon_terms = trigger_score(text_low, CANON_TRIGGERS)
    lp_hits, lp_terms = trigger_score(text_low, LP_TRIGGERS)

    actions: list[dict] = []

    if sett_hits >= 2 or len(named) >= 3:
        sett_slugs = [s for s in named if s in (
            "melli_capensi", "persona_tah", "eve_retti", "leu_kurus",
            "ana_kuma", "arcto_nyx", "cuc_phuong", "java_nessa",
            "mar_che", "meles_mehli", "moscha_tah", "orien_talis",
            "taxi_dea",
        )]
        confidence = min(0.95, 0.55 + 0.1 * sett_hits + 0.05 * len(sett_slugs))
        actions.append({
            "action": "coastal-sett-pipeline",
            "slugs": sett_slugs or ["all"],
            "confidence": round(confidence, 2),
            "rationale": f"sett triggers={sett_terms[:5]}; named={sett_slugs[:6]}",
        })

    if sales_hits >= 2 and not (sett_hits >= 2):
        sales_slugs = [s for s in named if s.endswith("_ang") and s != "melli_capensi"]
        confidence = min(0.92, 0.5 + 0.1 * sales_hits + 0.05 * len(sales_slugs))
        actions.append({
            "action": "coastal-portrait",
            "slugs": sales_slugs or [],
            "confidence": round(confidence, 2),
            "rationale": f"sales triggers={sales_terms[:5]}; named={sales_slugs[:6]}",
        })

    if pricing_hits >= 2:
        actions.append({
            "action": "catalog-edit (defer — no CLI yet)",
            "slugs": [],
            "confidence": min(0.75, 0.4 + 0.1 * pricing_hits),
            "rationale": f"pricing triggers={pricing_terms[:5]}",
        })

    if canon_hits >= 2:
        actions.append({
            "action": "canon-update (defer — no CLI yet)",
            "slugs": [],
            "confidence": min(0.7, 0.4 + 0.1 * canon_hits),
            "rationale": f"canon triggers={canon_terms[:5]}",
        })

    if lp_hits >= 2 and not actions:
        lp_slugs = [s for s in named if s in ("ros_ang", "joey_ang", "sky_ang", "boomer_roo")]
        actions.append({
            "action": "coastal-portrait (LP tier)",
            "slugs": lp_slugs,
            "confidence": min(0.85, 0.5 + 0.1 * lp_hits),
            "rationale": f"lp triggers={lp_terms[:5]}; named={lp_slugs}",
        })

    if not actions:
        return {
            "anticipated_action": "no_action",
            "slugs_inferred": [],
            "confidence": 0.0,
            "rationale": "no Coastal-specific triggers above threshold",
        }

    actions.sort(key=lambda a: a["confidence"], reverse=True)
    primary = actions[0]
    primary["alternates"] = [a for a in actions[1:] if a["confidence"] >= 0.4]

    if primary["confidence"] < CONFIDENCE_FLOOR:
        return {
            "anticipated_action": "no_action",
            "slugs_inferred": [],
            "confidence": primary["confidence"],
            "rationale": f"top action {primary['action']} below floor ({CONFIDENCE_FLOOR})",
        }

    return {
        "anticipated_action": primary["action"],
        "slugs_inferred": primary["slugs"],
        "confidence": primary["confidence"],
        "rationale": primary["rationale"],
        "alternates": primary["alternates"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="coastal-anticipate")
    parser.add_argument(
        "input", nargs="?",
        help="Transcript file path. Omit to read from stdin.",
    )
    parser.add_argument("--text", help="Inline transcript text (overrides input file).")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    if args.text:
        text = args.text
    elif args.input:
        path = Path(args.input)
        if not path.is_file():
            print(f"❌ transcript file not found: {path}", file=sys.stderr)
            return 2
        text = path.read_text(encoding="utf-8")
    else:
        if sys.stdin.isatty():
            parser.error("provide a transcript file path, --text, or pipe via stdin")
            return 2
        text = sys.stdin.read()

    if not text.strip():
        print("❌ empty transcript", file=sys.stderr)
        return 2

    result = classify(text)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"  action:      {result['anticipated_action']}")
        print(f"  confidence:  {result['confidence']}")
        print(f"  slugs:       {', '.join(result.get('slugs_inferred') or []) or '(none)'}")
        print(f"  rationale:   {result.get('rationale')}")
        for alt in result.get("alternates") or []:
            print(f"  alternate:   {alt['action']}  ({alt['confidence']})  — {alt['rationale']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
