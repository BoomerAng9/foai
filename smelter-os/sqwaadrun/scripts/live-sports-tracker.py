#!/usr/bin/env python3
"""
Sqwaadrun Mission: Live Sports Roster & News Tracker
======================================================
Continuous tracker for NFL, NBA, MLB transactions, roster moves, and breaking news.
Runs on schedule via Lil_Sched_Hawk. Zero API cost.

Hawks deployed:
  Lil_Feed_Hawk    — RSS feed monitoring
  Lil_Scrapp_Hawk  — transaction wire scraping
  Lil_Diff_Hawk    — roster change detection
  Lil_Clean_Hawk   — entity normalization
  Lil_Pipe_Hawk    — DB insertion

Primary Skill: PRODUCT
Business Engine: Per|Form for Podcasters
Cost: $0.00
"""

import asyncio
import csv
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from html import unescape

try:
    import aiohttp
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "psycopg2-binary", "-q"])
    import aiohttp

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL required")
    sys.exit(1)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ── RSS Feeds (Lil_Feed_Hawk) ──────────────────────────────────────

NFL_FEEDS = [
    ("ESPN NFL", "https://www.espn.com/espn/rss/nfl/news"),
    ("NFL.com News", "https://www.nfl.com/feeds-rs/news/nfl.rss"),
    ("PFT NBC", "https://profootballtalk.nbcsports.com/feed/"),
    ("Yahoo NFL", "https://sports.yahoo.com/nfl/rss"),
]

NBA_FEEDS = [
    ("ESPN NBA", "https://www.espn.com/espn/rss/nba/news"),
    ("Yahoo NBA", "https://sports.yahoo.com/nba/rss"),
]

MLB_FEEDS = [
    ("ESPN MLB", "https://www.espn.com/espn/rss/mlb/news"),
    ("Yahoo MLB", "https://sports.yahoo.com/mlb/rss"),
]

# ── Transaction wire sources (Lil_Scrapp_Hawk) ────────────────────

NFL_TRANSACTION_URLS = [
    "https://www.pro-football-reference.com/years/2025/transactions.htm",
    "https://www.espn.com/nfl/transactions",
]

# ── Team abbreviation normalization ───────────────────────────────

NFL_TEAMS = {"ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB",
             "HOU","IND","JAX","KC","LV","LAC","LAR","MIA","MIN","NE","NO","NYG",
             "NYJ","PHI","PIT","SF","SEA","TB","TEN","WAS"}

# Map team name variants to abbreviations
TEAM_NAME_MAP = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF",
    "panthers": "CAR", "bears": "CHI", "bengals": "CIN", "browns": "CLE",
    "cowboys": "DAL", "broncos": "DEN", "lions": "DET", "packers": "GB",
    "texans": "HOU", "colts": "IND", "jaguars": "JAX", "chiefs": "KC",
    "raiders": "LV", "chargers": "LAC", "rams": "LAR", "dolphins": "MIA",
    "vikings": "MIN", "patriots": "NE", "saints": "NO", "giants": "NYG",
    "jets": "NYJ", "eagles": "PHI", "steelers": "PIT", "49ers": "SF",
    "seahawks": "SEA", "buccaneers": "TB", "titans": "TEN", "commanders": "WAS",
    "arizona": "ARI", "atlanta": "ATL", "baltimore": "BAL", "buffalo": "BUF",
    "carolina": "CAR", "chicago": "CHI", "cincinnati": "CIN", "cleveland": "CLE",
    "dallas": "DAL", "denver": "DEN", "detroit": "DET", "green bay": "GB",
    "houston": "HOU", "indianapolis": "IND", "jacksonville": "JAX", "kansas city": "KC",
    "las vegas": "LV", "los angeles chargers": "LAC", "los angeles rams": "LAR",
    "miami": "MIA", "minnesota": "MIN", "new england": "NE", "new orleans": "NO",
    "new york giants": "NYG", "new york jets": "NYJ", "philadelphia": "PHI",
    "pittsburgh": "PIT", "san francisco": "SF", "seattle": "SEA", "tampa bay": "TB",
    "tennessee": "TEN", "washington": "WAS",
}

# Transaction type detection
TRANSACTION_PATTERNS = {
    "trade": re.compile(r'\btrad(?:e[ds]?|ing)\b', re.I),
    "signing": re.compile(r'\bsign(?:s|ed|ing)?\b|\bcontract\b|\bdeal\b|\bagreed\b', re.I),
    "release": re.compile(r'\brelease[ds]?\b|\bwaive[ds]?\b|\bcut[s]?\b', re.I),
    "ir": re.compile(r'\binjured reserve\b|\b(?:placed on|moved to) IR\b', re.I),
    "extension": re.compile(r'\bextension\b|\bextend(?:s|ed)?\b|\bre-sign', re.I),
    "suspension": re.compile(r'\bsuspend(?:s|ed)?\b|\bsuspension\b', re.I),
    "retirement": re.compile(r'\bretir(?:e[ds]?|ing|ement)\b', re.I),
    "draft": re.compile(r'\bdraft(?:s|ed|ing)?\b|\bpick(?:s|ed)?\b|\bselect(?:s|ed)?\b', re.I),
}


def detect_transaction_type(text: str) -> str:
    """Lil_Clean_Hawk — classify transaction type from text."""
    for ttype, pattern in TRANSACTION_PATTERNS.items():
        if pattern.search(text):
            return ttype
    return "other"


def extract_team_from_text(text: str) -> str | None:
    """Lil_Clean_Hawk — extract team abbreviation from text."""
    text_lower = text.lower()
    for name, abbrev in sorted(TEAM_NAME_MAP.items(), key=lambda x: -len(x[0])):
        if name in text_lower:
            return abbrev
    return None


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    text = re.sub(r'<[^>]+>', '', text)
    return unescape(text).strip()


async def fetch_text(session: aiohttp.ClientSession, url: str) -> str:
    """Lil_Scrapp_Hawk — fetch URL content."""
    try:
        async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=20), ssl=False) as resp:
            if resp.status == 200:
                return await resp.text(errors="replace")
    except Exception as e:
        print(f"  [WARN] {url}: {type(e).__name__}")
    return ""


def parse_rss(xml_text: str) -> list[dict]:
    """Lil_Parse_Hawk — extract items from RSS/Atom feed."""
    items = []
    try:
        root = ET.fromstring(xml_text)
        # RSS 2.0
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            desc = strip_html(item.findtext("description") or "")
            pub_date = (item.findtext("pubDate") or "").strip()
            if title and link:
                items.append({"title": title, "link": link, "summary": desc[:500], "pub_date": pub_date})
        # Atom
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title = (entry.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.get("href", "") if link_el is not None else ""
            summary = strip_html(entry.findtext("{http://www.w3.org/2005/Atom}summary") or "")
            pub_date = (entry.findtext("{http://www.w3.org/2005/Atom}updated") or "").strip()
            if title and link:
                items.append({"title": title, "link": link, "summary": summary[:500], "pub_date": pub_date})
    except ET.ParseError:
        pass
    return items


async def scrape_news_feeds(session: aiohttp.ClientSession, conn, sport: str, feeds: list):
    """Lil_Feed_Hawk — scrape RSS feeds for a sport."""
    cur = conn.cursor()
    total_new = 0

    for source_name, url in feeds:
        xml_text = await fetch_text(session, url)
        if not xml_text:
            continue
        items = parse_rss(xml_text)
        for item in items:
            team = extract_team_from_text(item["title"] + " " + item.get("summary", ""))
            teams = [team] if team else []
            category = detect_transaction_type(item["title"] + " " + item.get("summary", ""))
            if category == "other":
                category = "analysis"

            try:
                cur.execute("""
                    INSERT INTO sports_news_feed (sport, headline, summary, source_name, source_url, teams_mentioned, category, published_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (source_url) DO NOTHING
                """, (sport, item["title"][:500], item.get("summary", "")[:1000], source_name, item["link"], teams, category))
                if cur.rowcount > 0:
                    total_new += 1
            except Exception:
                conn.rollback()
                cur = conn.cursor()

    conn.commit()
    return total_new


async def detect_roster_changes(conn, sport: str):
    """Lil_Diff_Hawk — compare current roster against previous snapshot."""
    cur = conn.cursor()

    if sport == "nfl":
        # Check for players whose status changed
        cur.execute("""
            SELECT team_abbrev, player_name, injury_status, updated_at
            FROM nfl_rosters
            WHERE updated_at > NOW() - INTERVAL '24 hours'
            AND injury_status != 'healthy'
        """)
        changes = cur.fetchall()
        new_changes = 0
        for team, player, status, updated in changes:
            try:
                cur.execute("""
                    INSERT INTO roster_change_log (sport, team_abbrev, player_name, change_type, new_value)
                    VALUES (%s, %s, %s, 'status_change', %s)
                    ON CONFLICT DO NOTHING
                """, (sport, team, player, status))
                if cur.rowcount > 0:
                    new_changes += 1
            except Exception:
                conn.rollback()
                cur = conn.cursor()
        conn.commit()
        return new_changes
    return 0


async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    print(f"=== Sqwaadrun Live Tracker — Mode: {mode} ===")
    print(f"  Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"  Cost: $0.00")
    print()

    conn = psycopg2.connect(DATABASE_URL)

    async with aiohttp.ClientSession() as session:
        if mode in ("all", "news", "nfl"):
            print("[Lil_Feed_Hawk] NFL news feeds...")
            n = await scrape_news_feeds(session, conn, "nfl", NFL_FEEDS)
            print(f"  {n} new articles")

        if mode in ("all", "news", "nba"):
            print("[Lil_Feed_Hawk] NBA news feeds...")
            n = await scrape_news_feeds(session, conn, "nba", NBA_FEEDS)
            print(f"  {n} new articles")

        if mode in ("all", "news", "mlb"):
            print("[Lil_Feed_Hawk] MLB news feeds...")
            n = await scrape_news_feeds(session, conn, "mlb", MLB_FEEDS)
            print(f"  {n} new articles")

        if mode in ("all", "roster"):
            print("\n[Lil_Diff_Hawk] Roster change detection...")
            n = await detect_roster_changes(conn, "nfl")
            print(f"  {n} roster changes detected")

    # Summary
    cur = conn.cursor()
    cur.execute("SELECT sport, COUNT(*) FROM sports_news_feed GROUP BY sport ORDER BY sport")
    news_counts = cur.fetchall()
    cur.execute("SELECT sport, COUNT(*) FROM sports_transactions GROUP BY sport ORDER BY sport")
    tx_counts = cur.fetchall()
    cur.execute("SELECT COUNT(*) FROM roster_change_log")
    change_count = cur.fetchone()[0]

    print(f"\n=== Tracker Summary ===")
    print(f"  News articles: {dict(news_counts)}")
    print(f"  Transactions: {dict(tx_counts)}")
    print(f"  Roster changes: {change_count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
