#!/usr/bin/env python3
"""
Extract all measurement/testing tables from The Beast 2026 NFL Draft PDF.
Outputs structured JSON with every player from every position group.
"""

import fitz
import json
import re
import sys
import os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PDF_PATH = r"C:\Users\rishj\iCloudDrive\ACHIEVEMOR_\Projects_\The Deploy Platform_\The Per_Form Platform\the-beast-2026-2.pdf"
PASSWORD = "thebeast2026!"

# Section starts (1-based page numbers found by scanning headers + manual verification)
SECTION_STARTS = [
    ("QB", "Quarterbacks", 6),
    ("RB", "Running Backs", 41),
    ("WR", "Wide Receivers", 85),
    ("TE", "Tight Ends", 173),
    ("OT", "Offensive Tackles", 223),
    ("OG", "Guards", 267),
    ("C", "Centers", 312),
    ("EDGE", "Edge Rushers", 335),
    ("DT", "Defensive Tackles", 403),
    ("LB", "Linebackers", 458),
    ("CB", "Cornerbacks", 515),
    ("S", "Safeties", 577),
    # Specialists have sub-sections (Kickers, Punters, Long Snappers)
    # handled separately below
]

# Specialists are on pages 623-626 with a different format
SPECIALIST_PAGES = {
    "K": [622],      # idx 622 = page 623 "KICKERS"
    "P": [623],      # idx 623 = page 624 "PUNTERS"
    "LS": [624, 625],  # idx 624-625 = pages 625-626 "LONG SNAPPERS"
}


def open_pdf():
    doc = fitz.open(PDF_PATH)
    doc.authenticate(PASSWORD)
    return doc


def parse_float_or_dnp(val):
    if val is None:
        return None
    val = val.strip()
    if val in ("DNP", "-", ""):
        return None
    try:
        return float(val)
    except ValueError:
        return val


def parse_int_or_dnp(val):
    if val is None:
        return None
    val = val.strip()
    if val in ("DNP", "-", ""):
        return None
    if "/" in val:
        return val
    try:
        return int(val)
    except ValueError:
        try:
            return float(val)
        except ValueError:
            return val


def get_section_range(idx):
    """Get (start_0based, end_0based_exclusive) for section at index."""
    start = SECTION_STARTS[idx][2] - 1
    if idx + 1 < len(SECTION_STARTS):
        end = SECTION_STARTS[idx + 1][2] - 1
    else:
        # Last non-specialist section (Safeties) ends before specialists
        end = 622  # pages up to 622 (idx 621), specialists start at 623 (idx 622)
    return start, end


def find_table_pages(doc, start_idx, end_idx, table_type="measurement"):
    """Find pages with specific table types within a range."""
    pages = []
    for pg in range(start_idx, end_idx):
        text = doc[pg].get_text()
        if table_type == "measurement":
            has_name = "NAME" in text
            has_school = "SCHOOL" in text
            has_40 = "40 YD" in text or "40-YD" in text
            has_jump = "VJ" in text or "BJ" in text
            if has_name and has_school and has_40 and has_jump:
                pages.append(pg)
        elif table_type == "ranking":
            if "NAME" in text and "SCHOOL" in text and "GRADE" in text and "AGE" in text:
                pages.append(pg)
    return pages


def is_player_name_line(line):
    """Check if line matches pattern: number + ALL-CAPS name (at least 3 chars)."""
    m = re.match(r'^(\d{1,3})\s+([A-Z][A-Z\s\.\'\-\u2019]+)$', line)
    if not m:
        return False
    name = m.group(2).strip()
    # Filter out column headers like "40 YD", "20 YD", "10 YD"
    if name in ("YD",):
        return False
    # Name must be at least 3 characters (first + last)
    if len(name) < 3:
        return False
    return True


SKIP_LINES = frozenset([
    "NAME", "SCHOOL", "GRADE", "YEAR", "HEIGHT", "WEIGHT", "AGE",
    "SIZE", "LENGTH", "SPAN", "BP", "BEST OF THE REST", "NOTES",
    "VJ", "BJ", "SS", "3-CONE",
])


def should_skip_header(line):
    """Check if line is a column header to skip."""
    if line in SKIP_LINES:
        return True
    if line.startswith(("40 YD", "40-YD", "20 YD", "10 YD", "HAND", "ARM", "WING")):
        return True
    return False


def parse_player_line(line):
    """Try to parse a 'RANK NAME' line. Returns (rank, name) or None."""
    m = re.match(r'^(\d{1,3})\s+([A-Z][A-Z\s\.\'\-\u2019]+)$', line)
    if not m:
        return None
    name = m.group(2).strip()
    if name in ("YD",) or len(name) < 3:
        return None
    return (int(m.group(1)), name)


def extract_ranking_players(doc, pages):
    """Extract from ranking table format."""
    players = []

    for pg in pages:
        text = doc[pg].get_text().replace('\u200b', '')
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        i = 0
        while i < len(lines):
            line = lines[i]

            parsed = parse_player_line(line)

            if parsed:
                rank_num, name = parsed

                data = []
                j = i + 1
                while j < len(lines):
                    nl = lines[j]
                    if is_player_name_line(nl):
                        break
                    # Individual player detail header
                    if re.match(r'^(QB|RB|WR|TE|OT|OG|C|EDGE|DT|DL|LB|CB|S|K|P|LS)\d+\s', nl):
                        break
                    if should_skip_header(nl):
                        j += 1
                        continue
                    data.append(nl)
                    j += 1

                player = _parse_rank_data(rank_num, name, data)
                if player:
                    players.append(player)
                i = j
                continue
            i += 1

    return players


def _parse_rank_data(rank, name, data):
    """Parse ranking table data lines into player dict."""
    player = {"rank": rank, "name": name}
    if not data:
        return player

    player["school"] = data[0]
    idx = 1

    if idx < len(data):
        player["grade"] = data[idx]; idx += 1
    if idx < len(data):
        player["year"] = data[idx]; idx += 1
    if idx < len(data):
        h = data[idx]
        player["height"] = h if h != "DNP" else None
        idx += 1
    if idx < len(data):
        player["weight"] = parse_int_or_dnp(data[idx]); idx += 1

    # 40-YD (10-YD)
    if idx < len(data):
        speed = data[idx]; idx += 1
        m = re.match(r'([\d\.]+|DNP)\s*\(([\d\.]+|DNP)\)', speed)
        if m:
            player["forty"] = parse_float_or_dnp(m.group(1))
            player["ten"] = parse_float_or_dnp(m.group(2))
        else:
            player["forty"] = parse_float_or_dnp(speed)

    if idx < len(data):
        player["hand"] = data[idx] if data[idx] != "DNP" else None; idx += 1
    if idx < len(data):
        player["arm"] = data[idx] if data[idx] != "DNP" else None; idx += 1
    if idx < len(data):
        player["wingspan"] = data[idx] if data[idx] != "DNP" else None; idx += 1
    if idx < len(data):
        try:
            player["age"] = float(data[idx])
        except ValueError:
            pass

    return player


def extract_measurement_players(doc, pages, has_bp):
    """Extract from measurement tables (BEST OF THE REST)."""
    players = []

    for pg in pages:
        text = doc[pg].get_text().replace('\u200b', '')
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        i = 0
        while i < len(lines):
            line = lines[i]

            parsed = parse_player_line(line)

            if parsed:
                rank_num, name = parsed

                data = []
                j = i + 1
                while j < len(lines):
                    nl = lines[j]
                    if is_player_name_line(nl):
                        break
                    if "Back to table of contents" in nl:
                        break
                    if should_skip_header(nl):
                        j += 1
                        continue
                    data.append(nl)
                    j += 1

                player = _parse_meas_data(rank_num, name, data, has_bp)
                if player:
                    players.append(player)
                i = j
                continue
            i += 1

    return players


def _parse_meas_data(rank, name, data, has_bp):
    """Parse measurement table data lines."""
    player = {"rank": rank, "name": name}
    if not data:
        return player

    player["school"] = data[0]

    tokens = []
    for line in data[1:]:
        if re.search(r'[a-z]{5,}', line):
            continue
        tokens.extend(line.split())

    idx = 0

    def get():
        nonlocal idx
        if idx < len(tokens):
            t = tokens[idx]; idx += 1; return t
        return None

    def peek():
        return tokens[idx] if idx < len(tokens) else None

    def get_with_frac():
        nonlocal idx
        t = get()
        if t is None or t == "DNP":
            return None
        nxt = peek()
        if nxt and re.match(r'^\d/\d$', nxt):
            t += " " + get()
        return t

    h = get()
    player["height"] = h if h and h != "DNP" else None

    player["weight"] = parse_int_or_dnp(get())
    player["forty"] = parse_float_or_dnp(get())
    player["twenty"] = parse_float_or_dnp(get())
    player["ten"] = parse_float_or_dnp(get())
    player["vertical"] = get_with_frac()

    bj = get()
    player["broad"] = bj if bj and bj != "DNP" else None

    player["shuttle"] = parse_float_or_dnp(get())
    player["threecone"] = parse_float_or_dnp(get())

    if has_bp:
        player["bench"] = parse_int_or_dnp(get())

    player["hand"] = get_with_frac()
    player["arm"] = get_with_frac()
    player["wingspan"] = get_with_frac()

    return player


def extract_specialists(doc):
    """Extract specialists (K/P/LS) from their unique format pages."""
    all_specialist_players = []

    for sub_pos, page_indices in SPECIALIST_PAGES.items():
        for pg in page_indices:
            text = doc[pg].get_text().replace('\u200b', '')
            lines = [l.strip() for l in text.split('\n') if l.strip()]

            i = 0
            while i < len(lines):
                line = lines[i]

                parsed = parse_player_line(line)

                if parsed:
                    rank_num, name = parsed

                    data = []
                    j = i + 1
                    while j < len(lines):
                        nl = lines[j]
                        if is_player_name_line(nl):
                            break
                        if "Back to table of contents" in nl or "THE BEAST" in nl:
                            break
                        if should_skip_header(nl):
                            j += 1
                            continue
                        if nl in ("KICKERS", "PUNTERS", "LONG SNAPPERS"):
                            j += 1
                            continue
                        data.append(nl)
                        j += 1

                    # Specialists format: School, Grade, Height, Weight, Hand, Arm, Wingspan
                    player = {"rank": rank_num, "name": name, "subPosition": sub_pos}
                    if data:
                        player["school"] = data[0]
                        didx = 1
                        if didx < len(data):
                            player["grade"] = data[didx]; didx += 1
                        if didx < len(data):
                            player["height"] = data[didx]; didx += 1
                        if didx < len(data):
                            player["weight"] = parse_int_or_dnp(data[didx]); didx += 1
                        if didx < len(data):
                            player["hand"] = data[didx] if data[didx] != "DNP" else None; didx += 1
                        if didx < len(data):
                            player["arm"] = data[didx] if data[didx] != "DNP" else None; didx += 1
                        if didx < len(data):
                            player["wingspan"] = data[didx] if data[didx] != "DNP" else None; didx += 1

                    all_specialist_players.append(player)
                    i = j
                    continue
                i += 1

    return all_specialist_players


def extract_top100(doc):
    """Extract Top 100 prospects table from page 628 (idx 627)."""
    prospects = []
    pg = 627
    text = doc[pg].get_text().replace('\u200b', '')
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    i = 0
    while i < len(lines):
        line = lines[i]
        # Match just a number (rank)
        if re.match(r'^\d{1,3}$', line):
            rank = int(line)
            if i + 2 < len(lines):
                name = lines[i + 1]
                pos = lines[i + 2]
                # School might be next
                school = lines[i + 3] if i + 3 < len(lines) else None
                prospects.append({
                    "rank": rank,
                    "name": name,
                    "position": pos,
                    "school": school
                })
                i += 4
                continue
        i += 1

    return prospects


def main():
    doc = open_pdf()
    print(f"Opened PDF: {doc.page_count} pages", file=sys.stderr)

    result = {
        "extractedAt": "2026-04-14",
        "source": "The Beast 2026 - Dane Brugler / The Athletic",
        "positions": {}
    }

    total_players = 0

    for sec_idx, (pos_abbr, pos_name, _) in enumerate(SECTION_STARTS):
        start_idx, end_idx = get_section_range(sec_idx)
        has_bp = pos_abbr != "QB"

        print(f"\n{'='*50}", file=sys.stderr)
        print(f"{pos_name} ({pos_abbr}): pages {start_idx+1}-{end_idx}", file=sys.stderr)

        rank_pages = find_table_pages(doc, start_idx, end_idx, "ranking")
        ranked = extract_ranking_players(doc, rank_pages)
        print(f"  Ranking: {[p+1 for p in rank_pages]} -> {len(ranked)} players", file=sys.stderr)

        meas_pages = find_table_pages(doc, start_idx, end_idx, "measurement")
        measurements = extract_measurement_players(doc, meas_pages, has_bp)
        print(f"  Measurements: {[p+1 for p in meas_pages]} -> {len(measurements)} players", file=sys.stderr)

        # Merge
        all_players = []
        seen = set()

        for p in ranked:
            all_players.append(p)
            seen.add(p["name"])

        for p in measurements:
            if p["name"] not in seen:
                all_players.append(p)
                seen.add(p["name"])
            else:
                for ex in all_players:
                    if ex["name"] == p["name"]:
                        for k, v in p.items():
                            if k not in ex or ex.get(k) is None:
                                ex[k] = v
                        break

        count = len(all_players)
        total_players += count
        result["positions"][pos_abbr] = all_players
        print(f"  Total: {count}", file=sys.stderr)

    # Specialists
    print(f"\n{'='*50}", file=sys.stderr)
    print("Specialists (K/P/LS)", file=sys.stderr)
    specialists = extract_specialists(doc)
    total_players += len(specialists)
    result["positions"]["K/P/LS"] = specialists
    print(f"  Total: {len(specialists)}", file=sys.stderr)

    # Top 100
    top100 = extract_top100(doc)
    result["top100"] = top100
    print(f"\nTop 100 prospects: {len(top100)}", file=sys.stderr)

    print(f"\n{'='*50}", file=sys.stderr)
    print(f"GRAND TOTAL: {total_players}", file=sys.stderr)

    doc.close()

    output_path = r"C:\Users\rishj\foai\perform\src\lib\draft\beast-measurements.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nOutput: {output_path}", file=sys.stderr)
    print(f"Size: {os.path.getsize(output_path):,} bytes", file=sys.stderr)

    for pos, players in result["positions"].items():
        print(f"  {pos}: {len(players)}", file=sys.stderr)

    # Print samples
    for pos in ["QB", "RB", "K/P/LS"]:
        if result["positions"].get(pos):
            print(f"\nSample {pos}:", file=sys.stderr)
            for p in result["positions"][pos][:3]:
                print(f"  {json.dumps(p, ensure_ascii=False)}", file=sys.stderr)


if __name__ == "__main__":
    main()
