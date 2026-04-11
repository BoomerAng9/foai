#!/usr/bin/env python3
"""
Sqwaadrun Mission: Seed NFL 32-Team Database
==============================================
Pure Python. Zero API cost. Sources: nflverse open datasets (CSV).

Lil_API_Hawk → Lil_Parse_Hawk → Lil_Clean_Hawk → Lil_Pipe_Hawk

Primary Skill: PRODUCT
Business Engine: Per|Form for Podcasters
Cost: $0.00
"""

import asyncio
import csv
import io
import json
import os
import sys
from pathlib import Path

try:
    import aiohttp
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "psycopg2-binary", "-q"])
    import aiohttp

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2
    from psycopg2.extras import execute_values

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL required")
    sys.exit(1)

# nflverse open data — direct CSV, no auth, no API key
NFLVERSE_ROSTERS = "https://raw.githubusercontent.com/leesharpe/nfldata/master/data/rosters.csv"
NFLVERSE_TEAMS = "https://raw.githubusercontent.com/leesharpe/nfldata/master/data/teams.csv"
NFLVERSE_TEAM_COLORS = "https://raw.githubusercontent.com/leesharpe/nfldata/master/data/teamcolors.csv"
NFLVERSE_LOGOS = "https://raw.githubusercontent.com/leesharpe/nfldata/master/data/logos.csv"
NFLVERSE_STANDINGS = "http://www.habitatring.com/standings.csv"
NFLVERSE_GAMES = "http://www.habitatring.com/games.csv"

# NFL team metadata — static, always accurate
NFL_TEAMS_STATIC = [
    {"abbrev": "ARI", "name": "Cardinals", "city": "Arizona", "conference": "NFC", "division": "West", "stadium": "State Farm Stadium", "primary_color": "#97233F", "secondary_color": "#000000"},
    {"abbrev": "ATL", "name": "Falcons", "city": "Atlanta", "conference": "NFC", "division": "South", "stadium": "Mercedes-Benz Stadium", "primary_color": "#A71930", "secondary_color": "#000000"},
    {"abbrev": "BAL", "name": "Ravens", "city": "Baltimore", "conference": "AFC", "division": "North", "stadium": "M&T Bank Stadium", "primary_color": "#241773", "secondary_color": "#9E7C0C"},
    {"abbrev": "BUF", "name": "Bills", "city": "Buffalo", "conference": "AFC", "division": "East", "stadium": "Highmark Stadium", "primary_color": "#00338D", "secondary_color": "#C60C30"},
    {"abbrev": "CAR", "name": "Panthers", "city": "Carolina", "conference": "NFC", "division": "South", "stadium": "Bank of America Stadium", "primary_color": "#0085CA", "secondary_color": "#101820"},
    {"abbrev": "CHI", "name": "Bears", "city": "Chicago", "conference": "NFC", "division": "North", "stadium": "Soldier Field", "primary_color": "#0B162A", "secondary_color": "#C83803"},
    {"abbrev": "CIN", "name": "Bengals", "city": "Cincinnati", "conference": "AFC", "division": "North", "stadium": "Paycor Stadium", "primary_color": "#FB4F14", "secondary_color": "#000000"},
    {"abbrev": "CLE", "name": "Browns", "city": "Cleveland", "conference": "AFC", "division": "North", "stadium": "Cleveland Browns Stadium", "primary_color": "#311D00", "secondary_color": "#FF3C00"},
    {"abbrev": "DAL", "name": "Cowboys", "city": "Dallas", "conference": "NFC", "division": "East", "stadium": "AT&T Stadium", "primary_color": "#003594", "secondary_color": "#869397"},
    {"abbrev": "DEN", "name": "Broncos", "city": "Denver", "conference": "AFC", "division": "West", "stadium": "Empower Field at Mile High", "primary_color": "#FB4F14", "secondary_color": "#002244"},
    {"abbrev": "DET", "name": "Lions", "city": "Detroit", "conference": "NFC", "division": "North", "stadium": "Ford Field", "primary_color": "#0076B6", "secondary_color": "#B0B7BC"},
    {"abbrev": "GB",  "name": "Packers", "city": "Green Bay", "conference": "NFC", "division": "North", "stadium": "Lambeau Field", "primary_color": "#203731", "secondary_color": "#FFB612"},
    {"abbrev": "HOU", "name": "Texans", "city": "Houston", "conference": "AFC", "division": "South", "stadium": "NRG Stadium", "primary_color": "#03202F", "secondary_color": "#A71930"},
    {"abbrev": "IND", "name": "Colts", "city": "Indianapolis", "conference": "AFC", "division": "South", "stadium": "Lucas Oil Stadium", "primary_color": "#002C5F", "secondary_color": "#A2AAAD"},
    {"abbrev": "JAX", "name": "Jaguars", "city": "Jacksonville", "conference": "AFC", "division": "South", "stadium": "EverBank Stadium", "primary_color": "#006778", "secondary_color": "#9F792C"},
    {"abbrev": "KC",  "name": "Chiefs", "city": "Kansas City", "conference": "AFC", "division": "West", "stadium": "GEHA Field at Arrowhead Stadium", "primary_color": "#E31837", "secondary_color": "#FFB81C"},
    {"abbrev": "LV",  "name": "Raiders", "city": "Las Vegas", "conference": "AFC", "division": "West", "stadium": "Allegiant Stadium", "primary_color": "#000000", "secondary_color": "#A5ACAF"},
    {"abbrev": "LAC", "name": "Chargers", "city": "Los Angeles", "conference": "AFC", "division": "West", "stadium": "SoFi Stadium", "primary_color": "#0080C6", "secondary_color": "#FFC20E"},
    {"abbrev": "LAR", "name": "Rams", "city": "Los Angeles", "conference": "NFC", "division": "West", "stadium": "SoFi Stadium", "primary_color": "#003594", "secondary_color": "#FFA300"},
    {"abbrev": "MIA", "name": "Dolphins", "city": "Miami", "conference": "AFC", "division": "East", "stadium": "Hard Rock Stadium", "primary_color": "#008E97", "secondary_color": "#FC4C02"},
    {"abbrev": "MIN", "name": "Vikings", "city": "Minnesota", "conference": "NFC", "division": "North", "stadium": "U.S. Bank Stadium", "primary_color": "#4F2683", "secondary_color": "#FFC62F"},
    {"abbrev": "NE",  "name": "Patriots", "city": "New England", "conference": "AFC", "division": "East", "stadium": "Gillette Stadium", "primary_color": "#002244", "secondary_color": "#C60C30"},
    {"abbrev": "NO",  "name": "Saints", "city": "New Orleans", "conference": "NFC", "division": "South", "stadium": "Caesars Superdome", "primary_color": "#D3BC8D", "secondary_color": "#101820"},
    {"abbrev": "NYG", "name": "Giants", "city": "New York", "conference": "NFC", "division": "East", "stadium": "MetLife Stadium", "primary_color": "#0B2265", "secondary_color": "#A71930"},
    {"abbrev": "NYJ", "name": "Jets", "city": "New York", "conference": "AFC", "division": "East", "stadium": "MetLife Stadium", "primary_color": "#125740", "secondary_color": "#FFFFFF"},
    {"abbrev": "PHI", "name": "Eagles", "city": "Philadelphia", "conference": "NFC", "division": "East", "stadium": "Lincoln Financial Field", "primary_color": "#004C54", "secondary_color": "#A5ACAF"},
    {"abbrev": "PIT", "name": "Steelers", "city": "Pittsburgh", "conference": "AFC", "division": "North", "stadium": "Acrisure Stadium", "primary_color": "#FFB612", "secondary_color": "#101820"},
    {"abbrev": "SF",  "name": "49ers", "city": "San Francisco", "conference": "NFC", "division": "West", "stadium": "Levi's Stadium", "primary_color": "#AA0000", "secondary_color": "#B3995D"},
    {"abbrev": "SEA", "name": "Seahawks", "city": "Seattle", "conference": "NFC", "division": "West", "stadium": "Lumen Field", "primary_color": "#002244", "secondary_color": "#69BE28"},
    {"abbrev": "TB",  "name": "Buccaneers", "city": "Tampa Bay", "conference": "NFC", "division": "South", "stadium": "Raymond James Stadium", "primary_color": "#D50A0A", "secondary_color": "#34302B"},
    {"abbrev": "TEN", "name": "Titans", "city": "Tennessee", "conference": "AFC", "division": "South", "stadium": "Nissan Stadium", "primary_color": "#0C2340", "secondary_color": "#4B92DB"},
    {"abbrev": "WAS", "name": "Commanders", "city": "Washington", "conference": "NFC", "division": "East", "stadium": "Northwest Stadium", "primary_color": "#5A1414", "secondary_color": "#FFB612"},
]

# nflverse uses different abbrevs sometimes
ABBREV_MAP = {
    "OAK": "LV", "SD": "LAC", "STL": "LAR", "LA": "LAR",
}


async def fetch_csv(url: str) -> list[dict]:
    """Lil_API_Hawk — fetch CSV from open data source."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                print(f"  [FAIL] {resp.status} {url}")
                return []
            text = await resp.text()
            reader = csv.DictReader(io.StringIO(text))
            return list(reader)


def normalize_abbrev(abbrev: str) -> str:
    """Lil_Clean_Hawk — normalize team abbreviation."""
    return ABBREV_MAP.get(abbrev, abbrev)


async def main():
    print("=== Sqwaadrun Mission: NFL 32-Team Database Seed ===")
    print("  Skill Channel: PRODUCT")
    print("  Engine: Per|Form for Podcasters")
    print("  Cost: $0.00 (nflverse open data)")
    print()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Phase 1: Seed all 32 teams from static data
    print("[Lil_Pipe_Hawk] Seeding 32 NFL teams...")
    for t in NFL_TEAMS_STATIC:
        cur.execute("""
            INSERT INTO nfl_teams (name, city, abbrev, conference, division, stadium, primary_color, secondary_color)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (abbrev) DO UPDATE SET
                name = EXCLUDED.name, city = EXCLUDED.city, conference = EXCLUDED.conference,
                division = EXCLUDED.division, stadium = EXCLUDED.stadium,
                primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color,
                updated_at = NOW()
        """, (t["name"], t["city"], t["abbrev"], t["conference"], t["division"],
              t["stadium"], t["primary_color"], t["secondary_color"]))
    conn.commit()
    print(f"  32 teams seeded")

    # Phase 2: Fetch nflverse rosters (most recent season)
    print("\n[Lil_API_Hawk] Fetching nflverse roster data...")
    roster_rows = await fetch_csv(NFLVERSE_ROSTERS)
    print(f"  {len(roster_rows)} total roster entries fetched")

    # Filter to most recent season
    if roster_rows:
        seasons = sorted(set(r.get("season", "0") for r in roster_rows), reverse=True)
        latest_season = seasons[0] if seasons else "2025"
        print(f"  Latest season in data: {latest_season}")
        current_roster = [r for r in roster_rows if r.get("season") == latest_season]
        print(f"  {len(current_roster)} players in {latest_season} season")

        # Insert roster entries
        inserted = 0
        skipped = 0
        for r in current_roster:
            team = normalize_abbrev(r.get("team", ""))
            name = r.get("full_name", r.get("player_name", "")).strip()
            pos = r.get("position", "").strip()
            if not team or not name or not pos:
                skipped += 1
                continue
            # Check if team exists
            if team not in [t["abbrev"] for t in NFL_TEAMS_STATIC]:
                skipped += 1
                continue

            jersey = None
            try:
                jersey = int(r.get("jersey_number", 0) or 0)
            except (ValueError, TypeError):
                pass

            age = None
            try:
                age = int(r.get("age", 0) or 0)
                if age == 0: age = None
            except (ValueError, TypeError):
                pass

            height = r.get("height", "")
            weight = None
            try:
                weight = int(r.get("weight", 0) or 0)
                if weight == 0: weight = None
            except (ValueError, TypeError):
                pass

            college = r.get("college", "")
            exp = None
            try:
                exp = int(r.get("years_exp", 0) or 0)
            except (ValueError, TypeError):
                pass

            depth = None
            try:
                depth = int(r.get("depth_chart_position", 0) or 0)
                if depth == 0: depth = 1
            except (ValueError, TypeError):
                depth = 1

            status = r.get("status", "Active")

            try:
                cur.execute("""
                    INSERT INTO nfl_rosters (team_abbrev, player_name, position, jersey_number, age, height, weight, college, experience, depth_chart_rank, injury_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (team_abbrev, player_name, position) DO UPDATE SET
                        jersey_number = EXCLUDED.jersey_number, age = EXCLUDED.age,
                        height = EXCLUDED.height, weight = EXCLUDED.weight,
                        college = EXCLUDED.college, experience = EXCLUDED.experience,
                        depth_chart_rank = EXCLUDED.depth_chart_rank,
                        injury_status = EXCLUDED.injury_status,
                        updated_at = NOW()
                """, (team, name, pos, jersey, age, height, weight, college, exp, depth, "healthy" if status == "Active" else status))
                inserted += 1
            except Exception as e:
                skipped += 1
                if inserted < 3:
                    print(f"  [WARN] Skip {name}: {e}")
                conn.rollback()
                conn = psycopg2.connect(DATABASE_URL)
                cur = conn.cursor()

        conn.commit()
        print(f"  [Lil_Pipe_Hawk] Inserted {inserted} roster entries, skipped {skipped}")

    # Phase 3: Fetch standings for win/loss records
    print("\n[Lil_API_Hawk] Fetching standings data...")
    standings_rows = await fetch_csv(NFLVERSE_STANDINGS)
    if standings_rows:
        seasons = sorted(set(r.get("season", "0") for r in standings_rows), reverse=True)
        latest = seasons[0] if seasons else "2025"
        print(f"  Latest standings season: {latest}")
        current = [r for r in standings_rows if r.get("season") == latest]
        updated = 0
        for s in current:
            team = normalize_abbrev(s.get("team", ""))
            wins = int(s.get("wins", 0) or 0)
            losses = int(s.get("losses", 0) or 0)
            if team in [t["abbrev"] for t in NFL_TEAMS_STATIC]:
                cur.execute("""
                    UPDATE nfl_teams SET wins_2025 = %s, losses_2025 = %s, updated_at = NOW()
                    WHERE abbrev = %s
                """, (wins, losses, team))
                updated += 1
        conn.commit()
        print(f"  [Lil_Pipe_Hawk] Updated {updated} team records with W/L")

    # Phase 4: Verify
    cur.execute("SELECT COUNT(*) FROM nfl_teams")
    team_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM nfl_rosters")
    roster_count = cur.fetchone()[0]
    cur.execute("SELECT team_abbrev, COUNT(*) FROM nfl_rosters GROUP BY team_abbrev ORDER BY count DESC LIMIT 5")
    top_teams = cur.fetchall()

    print(f"\n=== Mission Complete ===")
    print(f"  Teams: {team_count}")
    print(f"  Roster entries: {roster_count}")
    print(f"  Top 5 teams by roster size:")
    for team, count in top_teams:
        print(f"    {team}: {count} players")

    cur.close()
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
