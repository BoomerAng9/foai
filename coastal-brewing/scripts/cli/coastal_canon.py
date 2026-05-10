"""
coastal-canon — persona canon reader.

Reads ~/foai/aims-tools/voice-library/personas/<slug>.md
Returns structured JSON: species, region, role, tier, pmo, reports_to, voice, bio_summary.

Token discipline: persona files are 1.5–4K tokens; this CLI returns ≤500 tokens.
Cache: filesystem read; no SQLite needed.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

PERSONAS_DIR = Path(
    os.environ.get(
        "COASTAL_PERSONAS_DIR",
        str(Path.home() / "foai" / "aims-tools" / "voice-library" / "personas"),
    )
).expanduser()

FIELD_CHOICES = ("species", "region", "role", "tier", "pmo", "reports_to", "voice", "bio", "all")
BIO_WORD_CAP = 200


def list_personas() -> list[str]:
    if not PERSONAS_DIR.is_dir():
        return []
    return sorted(p.stem for p in PERSONAS_DIR.glob("*.md"))


def read_persona_file(slug: str) -> str:
    path = PERSONAS_DIR / f"{slug}.md"
    if not path.is_file():
        available = list_personas()
        suggestion = ""
        if available:
            close = [s for s in available if slug.lower() in s.lower() or s.lower() in slug.lower()]
            if close:
                suggestion = f"  Did you mean: {', '.join(close[:5])}?"
        raise FileNotFoundError(
            f"persona not found at {path}.{suggestion}\n"
            f"Personas dir: {PERSONAS_DIR}\n"
            f"Total available: {len(available)}"
        )
    return path.read_text(encoding="utf-8")


def _extract_blockquote_header(text: str) -> str:
    """The header is the leading > blockquote block immediately after the # title.

    Different persona files separate header clauses with `·` within a line OR
    with line breaks between lines. Joining with `·` preserves both as
    splittable boundaries downstream.
    """
    lines = text.splitlines()
    block = []
    in_block = False
    for line in lines:
        if line.startswith("> "):
            in_block = True
            block.append(line[2:].strip())
        elif in_block and not line.strip():
            break
        elif in_block:
            block.append(line.strip())
    return " · ".join(block)


def _split_header_clauses(header: str) -> list[str]:
    """Break the header on · separators (preferred) or · / |."""
    parts = re.split(r"\s*[·•|]\s*", header)
    return [p.strip() for p in parts if p.strip()]


def _find_clause(clauses: list[str], key_pattern: str) -> str | None:
    rx = re.compile(rf"^{key_pattern}\s*:\s*(.+)$", re.IGNORECASE)
    for c in clauses:
        m = rx.match(c)
        if m:
            return m.group(1).strip()
    return None


def parse_header(text: str) -> dict[str, str | None]:
    header = _extract_blockquote_header(text)
    clauses = _split_header_clauses(header)

    species = _find_clause(clauses, "Species")
    region = _find_clause(clauses, "Region")
    role = _find_clause(clauses, "Role")
    tier = _find_clause(clauses, "Tier")
    pmo = _find_clause(clauses, "PMO")
    reports_to = _find_clause(clauses, "Reports?\\s*to")
    voice_kit = _find_clause(clauses, "Spinner\\s*kit")
    customer_facing = _find_clause(clauses, "Customer-?facing")
    phase = _find_clause(clauses, "Phase")

    cast_id = _find_clause(clauses, "Cast\\s*ID")
    if cast_id:
        cast_id = cast_id.strip("`")

    return {
        "cast_id": cast_id,
        "species": species,
        "region": region,
        "role": role,
        "tier": tier,
        "pmo": pmo,
        "reports_to": reports_to,
        "voice_kit": voice_kit,
        "customer_facing": customer_facing,
        "phase": phase,
    }


def extract_section(text: str, heading: str, max_chars: int | None = None) -> str:
    pattern = rf"##\s+{re.escape(heading)}\s*\n+(.*?)(?=\n##\s+|\Z)"
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if not m:
        return ""
    body = m.group(1).strip()
    if max_chars is not None and len(body) > max_chars:
        body = body[:max_chars].rsplit(" ", 1)[0] + "…"
    return body


def summarize_bio(text: str, word_cap: int = BIO_WORD_CAP) -> str:
    bio = extract_section(text, "Origin & Background")
    if not bio:
        bio = extract_section(text, "Background")
    if not bio:
        return ""
    paras = [p.strip() for p in bio.split("\n\n") if p.strip()]
    if not paras:
        return ""
    first = paras[0]
    first = re.sub(r"\*\*([^*]+)\*\*", r"\1", first)
    first = re.sub(r"\*([^*]+)\*", r"\1", first)
    first = re.sub(r"`([^`]+)`", r"\1", first)
    words = first.split()
    if len(words) <= word_cap:
        return first
    return " ".join(words[:word_cap]).rstrip(",.;:") + "…"


def build_canon(slug: str) -> dict:
    text = read_persona_file(slug)
    header = parse_header(text)

    title_match = re.search(r"^#\s+(.+?)$", text, re.MULTILINE)
    display_name = title_match.group(1).strip() if title_match else slug
    display_name = re.split(r"\s+[—-]\s+", display_name)[0].strip()

    voice_section = extract_section(text, "Voice", max_chars=600)
    if not voice_section:
        voice_section = extract_section(text, "Voice & Register", max_chars=600)

    return {
        "slug": slug,
        "display_name": display_name,
        "species": header["species"],
        "region": header["region"],
        "role": header["role"],
        "tier": header["tier"],
        "pmo": header["pmo"],
        "reports_to": header["reports_to"],
        "voice_kit": header["voice_kit"],
        "phase": header["phase"],
        "customer_facing": header["customer_facing"],
        "voice": voice_section or None,
        "bio_summary": summarize_bio(text),
    }


def filter_to_field(canon: dict, field: str) -> dict | str:
    if field == "all":
        return canon
    if field == "bio":
        return canon["bio_summary"]
    if field == "reports_to":
        return canon["reports_to"]
    return canon.get(field)


def render_text(canon: dict) -> str:
    lines = [
        f"# {canon['display_name']}  ({canon['slug']})",
        "",
        f"  Species:       {canon['species'] or '—'}",
        f"  Region:        {canon['region'] or '—'}",
        f"  Role:          {canon['role'] or '—'}",
        f"  Tier:          {canon['tier'] or '—'}      PMO: {canon['pmo'] or '—'}",
        f"  Reports to:    {canon['reports_to'] or '—'}",
        f"  Phase:         {canon['phase'] or '—'}      Customer-facing: {canon['customer_facing'] or '—'}",
        f"  Spinner kit:   {canon['voice_kit'] or '—'}",
    ]
    if canon["bio_summary"]:
        lines += ["", "  Bio (≤200 words):", "  " + canon["bio_summary"].replace("\n", "\n  ")]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="coastal-canon",
        description="Read a Coastal persona canon file and return structured fields.",
    )
    parser.add_argument("slug", nargs="?", help="Persona slug (e.g. eve_retti, melli_capensi)")
    parser.add_argument(
        "--field",
        choices=FIELD_CHOICES,
        default="all",
        help="Which field to return. Default: all (full canon).",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of human text.")
    parser.add_argument(
        "--list", action="store_true", help="List all available persona slugs and exit."
    )
    args = parser.parse_args(argv)

    if args.list:
        slugs = list_personas()
        if args.json:
            print(json.dumps({"personas": slugs, "count": len(slugs), "dir": str(PERSONAS_DIR)}))
        else:
            print(f"Personas at {PERSONAS_DIR}  ({len(slugs)} total):")
            for s in slugs:
                print(f"  {s}")
        return 0

    if not args.slug:
        parser.error("slug is required (or pass --list)")

    try:
        canon = build_canon(args.slug)
    except FileNotFoundError as e:
        print(f"❌ {e}", file=sys.stderr)
        return 2

    result = filter_to_field(canon, args.field)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        if args.field == "all":
            print(render_text(canon))
        elif isinstance(result, dict):
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif result is None:
            print(f"(field {args.field!r} not present)")
            return 1
        else:
            print(result)

    return 0


if __name__ == "__main__":
    sys.exit(main())
