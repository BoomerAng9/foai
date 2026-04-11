#!/usr/bin/env python3
"""
Sqwaadrun Mission: Scrape 2026 NFL Draft Big Board
====================================================
Pure Python. Zero API costs. Hawks fetch directly.

Lil_Scrapp_Hawk → Lil_Extract_Hawk → Lil_Clean_Hawk → Lil_Pipe_Hawk

Primary Skill: PRODUCT
Business Engine: perform
"""

import asyncio
import json
import os
import re
import sys
import html as html_mod
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

try:
    import aiohttp
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "beautifulsoup4", "lxml", "-q"])
    import aiohttp
    from bs4 import BeautifulSoup

# Known draft board URLs — no search API needed
TARGETS = [
    "https://walterfootball.com/draft2026.php",
    "https://walterfootball.com/draft2026_2.php",
    "https://walterfootball.com/draft2026_3.php",
    "https://www.drafttek.com/2026-NFL-Draft-Big-Board/Top-NFL-Draft-Prospects-2026-Page-1.asp",
    "https://www.drafttek.com/2026-NFL-Draft-Big-Board/Top-NFL-Draft-Prospects-2026-Page-2.asp",
    "https://www.nfldraftbuzz.com/positions/ALL/1/2026",
    "https://www.nfldraftbuzz.com/positions/ALL/2/2026",
    "https://www.tankathon.com/nfl/mock_draft",
    "https://www.profootballnetwork.com/nfl-draft-hq/industry-consensus-big-board",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
}

# Position normalization
POS_NORMALIZE = {
    "OL": "OT", "OC": "C", "ILB": "LB", "OLB": "LB",
    "DT": "DL", "NT": "DL", "DE": "EDGE", "WDE": "EDGE", "SDE": "EDGE",
    "FS": "S", "SS": "S", "SAF": "S", "NCB": "CB", "SCB": "CB",
    "IOL": "OG", "G": "OG", "T": "OT", "WILL": "LB", "MIKE": "LB",
    "SAM": "LB", "KR": "WR", "PR": "WR", "ATH": "WR",
}

VALID_POS = {"QB", "RB", "WR", "TE", "OT", "OG", "C", "DL", "EDGE", "LB", "CB", "S", "K", "P", "LS", "FB"}


async def fetch(session: aiohttp.ClientSession, url: str) -> str:
    """Lil_Scrapp_Hawk — raw fetch."""
    try:
        async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=20), ssl=False) as resp:
            if resp.status == 200:
                return await resp.text(errors="replace")
            print(f"  [{resp.status}] {url}")
    except Exception as e:
        print(f"  [FAIL] {url}: {type(e).__name__}")
    return ""


def extract_from_walterfootball(soup: BeautifulSoup) -> list[dict]:
    """WalterFootball uses a specific format with bold names and positions."""
    prospects = []
    text = soup.get_text(separator="\n")

    # Pattern: "1. Fernando Mendoza, QB, Indiana" or variations
    pattern = r'(\d{1,3})\.\s+([A-Z][a-zA-Z\'\-\.\s]{2,35}?),\s*(QB|RB|WR|TE|OT|OG|OL|C|DL|DT|DE|EDGE|LB|ILB|OLB|CB|S|K|P|LS|FB|FS|SS|NT|IOL|SAF|ATH|G|T),\s*([A-Za-z][A-Za-z\.\s\'\-&]+?)(?:\n|\r|$|\.|\()'
    matches = re.findall(pattern, text)
    for m in matches:
        prospects.append({
            "rank": int(m[0]),
            "name": m[1].strip(),
            "position": m[2].strip(),
            "school": m[3].strip().rstrip(". "),
        })
    return prospects


def extract_from_table(soup: BeautifulSoup) -> list[dict]:
    """Generic table extraction for sites with <table> layouts."""
    prospects = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) >= 3:
                texts = [c.get_text(strip=True) for c in cells]
                # Try to find rank, name, position, school in the cells
                rank_match = None
                name = None
                pos = None
                school = None

                for t in texts:
                    if re.match(r'^\d{1,3}$', t) and not rank_match:
                        rank_match = int(t)
                    elif t.upper() in VALID_POS or t.upper() in POS_NORMALIZE:
                        pos = t.upper()
                    elif re.match(r'^[A-Z][a-zA-Z\'\-\.\s]{3,35}$', t) and not name:
                        name = t
                    elif re.match(r'^[A-Z][a-zA-Z\.\s\'\-&]{2,30}$', t) and name and not school:
                        school = t

                if name and pos:
                    prospects.append({
                        "rank": rank_match or 999,
                        "name": name,
                        "position": pos,
                        "school": school or "Unknown",
                    })
    return prospects


def extract_generic(soup: BeautifulSoup) -> list[dict]:
    """Lil_Extract_Hawk — generic regex extraction from page text."""
    text = soup.get_text(separator="\n")
    prospects = []

    patterns = [
        r'(\d{1,3})\.\s*([A-Z][a-zA-Z\'\-\.\s]{2,30}?)\s*[,\-\|]\s*(QB|RB|WR|TE|OT|OG|OL|C|DL|DT|DE|EDGE|LB|ILB|OLB|CB|S|K|P|LS|FB|FS|SS|NT|IOL)\s*[,\-\|]\s*([A-Za-z][A-Za-z\.\s\'\-&]{2,30})',
        r'(\d{1,3})\s+([A-Z][a-zA-Z\'\-\.\s]{2,30}?)\s+(QB|RB|WR|TE|OT|OG|OL|C|DL|DT|DE|EDGE|LB|ILB|OLB|CB|S|K|P|LS|FB|FS|SS|NT|IOL)\s+([A-Za-z][A-Za-z\.\s\'\-&]{2,30})',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text)
        for m in matches:
            prospects.append({
                "rank": int(m[0]),
                "name": m[1].strip(),
                "position": m[2].strip(),
                "school": m[3].strip().rstrip(". "),
            })

    return prospects


def clean_prospect(p: dict) -> dict:
    """Lil_Clean_Hawk — normalize everything."""
    p["position"] = POS_NORMALIZE.get(p["position"], p["position"])
    p["name"] = re.sub(r'\s+', ' ', p["name"]).strip()
    p["school"] = re.sub(r'\s+', ' ', p["school"]).strip()
    # Remove trailing numbers or weird chars from school
    p["school"] = re.sub(r'\d+$', '', p["school"]).strip()
    return p


async def main():
    print("=== Sqwaadrun Mission: 2026 Big Board Scrape ===")
    print("  Skill Channel: PRODUCT")
    print("  Engine: Per|Form")
    print("  Cost: $0.00 (pure Python)")
    print()

    all_prospects = []

    async with aiohttp.ClientSession() as session:
        for url in TARGETS:
            print(f"  [Lil_Scrapp_Hawk] {url}")
            html = await fetch(session, url)
            if not html:
                continue

            soup = BeautifulSoup(html, "lxml")

            # Try site-specific extractors first
            prospects = []
            if "walterfootball" in url:
                prospects = extract_from_walterfootball(soup)
            if not prospects:
                prospects = extract_from_table(soup)
            if not prospects:
                prospects = extract_generic(soup)

            print(f"  [Lil_Extract_Hawk] {len(prospects)} prospects found")
            all_prospects.extend(prospects)
            await asyncio.sleep(1)  # Lil_Guard_Hawk rate limit

    # Phase: CLEAN + DEDUP
    print(f"\n  [Lil_Clean_Hawk] Cleaning {len(all_prospects)} raw prospects...")
    cleaned = [clean_prospect(p) for p in all_prospects]

    # Filter invalid positions
    cleaned = [p for p in cleaned if p["position"] in VALID_POS]

    # Dedup by name, keep best rank
    seen = {}
    for p in cleaned:
        key = p["name"].lower().strip()
        if key not in seen or p.get("rank", 999) < seen[key].get("rank", 999):
            seen[key] = p

    final = sorted(seen.values(), key=lambda x: x.get("rank", 999))
    print(f"  [Lil_Clean_Hawk] {len(final)} unique prospects after dedup")

    # Phase: EXPORT
    output_file = OUTPUT_DIR / "2026-big-board.json"
    with open(output_file, "w") as f:
        json.dump(final, f, indent=2)
    print(f"\n  [Lil_Pipe_Hawk] JSON: {output_file}")

    csv_file = OUTPUT_DIR / "2026-big-board.csv"
    with open(csv_file, "w", encoding="utf-8") as f:
        f.write("rank,name,position,school\n")
        for i, p in enumerate(final, 1):
            rank = p.get("rank", i)
            name = p["name"].replace('"', "'")
            school = p["school"].replace('"', "'")
            f.write(f'{rank},"{name}",{p["position"]},"{school}"\n')
    print(f"  [Lil_Pipe_Hawk] CSV: {csv_file}")

    # Print top 20
    print(f"\n  === Top 20 ===")
    for p in final[:20]:
        print(f"    {p.get('rank', '?'):>3}. {p['name']:<25} {p['position']:<5} {p['school']}")

    print(f"\n=== Mission Complete: {len(final)} prospects | $0.00 cost ===")


if __name__ == "__main__":
    asyncio.run(main())
