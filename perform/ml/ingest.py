"""
Phase 1: Ingest historical NFL draft data into Neon.

Tables created:
  - draft_history: every pick from 2000-2025
  - draft_trades: draft-day trades (derived from draft_picks trade indicators)
  - team_needs: team positional needs by year (derived from roster turnover)
  - trade_value_chart: Jimmy Johnson + Rich Hill modern chart
  - combine_data: combine measurables 2000-2025

Data sources:
  - perform/data/nflverse/draft_picks.csv (1980-2025, we filter to 2000+)
  - perform/data/nflverse/combine.csv (2000-2026)
  - perform/data/nflverse/roster_2024.csv (for 2025/2026 team needs derivation)
"""
import os
import sys
import math
import pandas as pd
from pathlib import Path

# Add parent to path so we can import db
sys.path.insert(0, str(Path(__file__).resolve().parent))
from db import get_conn, execute_sql, batch_insert

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "nflverse"

# ──────────────────────────────────────────────────────────────────────
# Schema creation
# ──────────────────────────────────────────────────────────────────────

SCHEMA_SQL = """
-- Historical draft picks (2000-2025)
CREATE TABLE IF NOT EXISTS draft_history (
    id SERIAL PRIMARY KEY,
    season INT NOT NULL,
    round INT NOT NULL,
    pick INT NOT NULL,
    team VARCHAR(5) NOT NULL,
    pfr_player_id VARCHAR(30),
    player_name VARCHAR(120),
    position VARCHAR(10),
    position_category VARCHAR(10),
    side VARCHAR(5),
    college VARCHAR(100),
    age INT,
    years_played INT,
    all_pro INT DEFAULT 0,
    pro_bowls INT DEFAULT 0,
    seasons_started INT DEFAULT 0,
    career_av INT DEFAULT 0,
    draft_av INT DEFAULT 0,
    games_played INT DEFAULT 0,
    pass_yards INT DEFAULT 0,
    pass_tds INT DEFAULT 0,
    rush_yards INT DEFAULT 0,
    rush_tds INT DEFAULT 0,
    rec_yards INT DEFAULT 0,
    rec_tds INT DEFAULT 0,
    def_sacks FLOAT DEFAULT 0,
    def_ints INT DEFAULT 0,
    UNIQUE(season, round, pick)
);

-- Combine measurables
CREATE TABLE IF NOT EXISTS combine_data (
    id SERIAL PRIMARY KEY,
    season INT NOT NULL,
    draft_year INT,
    draft_team VARCHAR(30),
    draft_round INT,
    draft_overall INT,
    pfr_id VARCHAR(30),
    player_name VARCHAR(120),
    position VARCHAR(10),
    school VARCHAR(100),
    height VARCHAR(10),
    weight INT,
    forty FLOAT,
    bench INT,
    vertical FLOAT,
    broad_jump INT,
    cone FLOAT,
    shuttle FLOAT,
    UNIQUE(season, player_name, position)
);

-- Trade value charts (Jimmy Johnson + Rich Hill)
CREATE TABLE IF NOT EXISTS trade_value_chart (
    id SERIAL PRIMARY KEY,
    pick_number INT NOT NULL,
    jimmy_johnson_value FLOAT NOT NULL,
    rich_hill_value FLOAT,
    chart_type VARCHAR(20) DEFAULT 'both',
    UNIQUE(pick_number)
);

-- Team positional needs by year
CREATE TABLE IF NOT EXISTS team_needs (
    id SERIAL PRIMARY KEY,
    season INT NOT NULL,
    team VARCHAR(5) NOT NULL,
    position VARCHAR(10) NOT NULL,
    need_score FLOAT NOT NULL DEFAULT 5.0,
    UNIQUE(season, team, position)
);

-- Draft trades (synthetic from draft data patterns)
CREATE TABLE IF NOT EXISTS draft_trades (
    id SERIAL PRIMARY KEY,
    season INT NOT NULL,
    trade_up_team VARCHAR(5) NOT NULL,
    trade_down_team VARCHAR(5) NOT NULL,
    pick_acquired INT NOT NULL,
    picks_given TEXT,
    value_exchanged FLOAT DEFAULT 0,
    round INT NOT NULL
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_draft_history_season ON draft_history(season);
CREATE INDEX IF NOT EXISTS idx_draft_history_team ON draft_history(team);
CREATE INDEX IF NOT EXISTS idx_draft_history_position ON draft_history(position);
CREATE INDEX IF NOT EXISTS idx_combine_season ON combine_data(season);
CREATE INDEX IF NOT EXISTS idx_team_needs_season_team ON team_needs(season, team);
"""


def create_schema():
    """Create all tables."""
    print("Creating schema...")
    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(SCHEMA_SQL)
    cur.close()
    conn.close()
    print("  Schema created.")


# ──────────────────────────────────────────────────────────────────────
# Draft picks ingestion
# ──────────────────────────────────────────────────────────────────────

def safe_int(val, default=0):
    """Convert to int safely."""
    if pd.isna(val) or val == '' or val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_float(val, default=0.0):
    """Convert to float safely."""
    if pd.isna(val) or val == '' or val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def ingest_draft_picks():
    """Load draft_picks.csv into draft_history (2000+ only)."""
    print("Ingesting draft picks...")
    csv_path = DATA_DIR / "draft_picks.csv"
    df = pd.read_csv(csv_path, low_memory=False)

    # Filter to 2000+
    df = df[df['season'] >= 2000].copy()
    print(f"  {len(df)} picks from 2000-{df['season'].max()}")

    # Clear existing data
    execute_sql("DELETE FROM draft_history WHERE season >= 2000")

    rows = []
    for _, r in df.iterrows():
        rows.append((
            safe_int(r['season']),
            safe_int(r['round']),
            safe_int(r['pick']),
            str(r.get('team', '')).strip(),
            str(r.get('pfr_player_id', '')).strip() if pd.notna(r.get('pfr_player_id')) else None,
            str(r.get('pfr_player_name', '')).strip() if pd.notna(r.get('pfr_player_name')) else 'Unknown',
            str(r.get('position', '')).strip() if pd.notna(r.get('position')) else None,
            str(r.get('category', '')).strip() if pd.notna(r.get('category')) else None,
            str(r.get('side', '')).strip() if pd.notna(r.get('side')) else None,
            str(r.get('college', '')).strip() if pd.notna(r.get('college')) else None,
            safe_int(r.get('age')),
            safe_int(r.get('to', 0)) - safe_int(r.get('season', 0)) if safe_int(r.get('to', 0)) > 0 else 0,
            safe_int(r.get('allpro')),
            safe_int(r.get('probowls')),
            safe_int(r.get('seasons_started')),
            safe_int(r.get('car_av')),
            safe_int(r.get('dr_av')),
            safe_int(r.get('games')),
            safe_int(r.get('pass_yards')),
            safe_int(r.get('pass_tds')),
            safe_int(r.get('rush_yards')),
            safe_int(r.get('rush_tds')),
            safe_int(r.get('rec_yards')),
            safe_int(r.get('rec_tds')),
            safe_float(r.get('def_sacks')),
            safe_int(r.get('def_ints')),
        ))

    sql = """
        INSERT INTO draft_history
        (season, round, pick, team, pfr_player_id, player_name, position,
         position_category, side, college, age, years_played, all_pro, pro_bowls,
         seasons_started, career_av, draft_av, games_played, pass_yards, pass_tds,
         rush_yards, rush_tds, rec_yards, rec_tds, def_sacks, def_ints)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (season, round, pick) DO NOTHING
    """
    batch_insert(sql, rows)
    print(f"  Inserted {len(rows)} draft picks.")
    return len(rows)


# ──────────────────────────────────────────────────────────────────────
# Combine data ingestion
# ──────────────────────────────────────────────────────────────────────

def ingest_combine():
    """Load combine.csv into combine_data."""
    print("Ingesting combine data...")
    csv_path = DATA_DIR / "combine.csv"
    df = pd.read_csv(csv_path, low_memory=False)
    df = df[df['season'] >= 2000].copy()
    print(f"  {len(df)} combine entries from 2000-{df['season'].max()}")

    execute_sql("DELETE FROM combine_data WHERE season >= 2000")

    rows = []
    for _, r in df.iterrows():
        rows.append((
            safe_int(r['season']),
            safe_int(r.get('draft_year')) if pd.notna(r.get('draft_year')) else None,
            str(r.get('draft_team', '')).strip() if pd.notna(r.get('draft_team')) else None,
            safe_int(r.get('draft_round')) if pd.notna(r.get('draft_round')) else None,
            safe_int(r.get('draft_ovr')) if pd.notna(r.get('draft_ovr')) else None,
            str(r.get('pfr_id', '')).strip() if pd.notna(r.get('pfr_id')) else None,
            str(r.get('player_name', '')).strip() if pd.notna(r.get('player_name')) else 'Unknown',
            str(r.get('pos', '')).strip() if pd.notna(r.get('pos')) else None,
            str(r.get('school', '')).strip() if pd.notna(r.get('school')) else None,
            str(r.get('ht', '')).strip() if pd.notna(r.get('ht')) else None,
            safe_int(r.get('wt')) if pd.notna(r.get('wt')) else None,
            safe_float(r.get('forty')) if pd.notna(r.get('forty')) else None,
            safe_int(r.get('bench')) if pd.notna(r.get('bench')) else None,
            safe_float(r.get('vertical')) if pd.notna(r.get('vertical')) else None,
            safe_int(r.get('broad_jump')) if pd.notna(r.get('broad_jump')) else None,
            safe_float(r.get('cone')) if pd.notna(r.get('cone')) else None,
            safe_float(r.get('shuttle')) if pd.notna(r.get('shuttle')) else None,
        ))

    sql = """
        INSERT INTO combine_data
        (season, draft_year, draft_team, draft_round, draft_overall, pfr_id,
         player_name, position, school, height, weight, forty, bench, vertical,
         broad_jump, cone, shuttle)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (season, player_name, position) DO NOTHING
    """
    batch_insert(sql, rows)
    print(f"  Inserted {len(rows)} combine records.")
    return len(rows)


# ──────────────────────────────────────────────────────────────────────
# Trade value charts
# ──────────────────────────────────────────────────────────────────────

def generate_jimmy_johnson_chart():
    """
    Jimmy Johnson trade value chart (classic).
    Pick 1 = 3000, exponential decay to pick 258.
    """
    values = {}
    # Classic JJ chart values for key picks (interpolate the rest)
    key_values = {
        1: 3000, 2: 2600, 3: 2200, 4: 1800, 5: 1700,
        6: 1600, 7: 1500, 8: 1400, 9: 1350, 10: 1300,
        11: 1250, 12: 1200, 13: 1150, 14: 1100, 15: 1050,
        16: 1000, 17: 950, 18: 900, 19: 875, 20: 850,
        21: 800, 22: 780, 23: 760, 24: 740, 25: 720,
        26: 700, 27: 680, 28: 660, 29: 640, 30: 620,
        31: 600, 32: 590, 33: 580, 34: 560, 35: 550,
        36: 540, 37: 530, 38: 520, 39: 510, 40: 500,
        41: 490, 42: 480, 43: 470, 44: 460, 45: 450,
        46: 440, 47: 430, 48: 420, 49: 410, 50: 400,
        51: 390, 52: 380, 53: 370, 54: 360, 55: 350,
        56: 340, 57: 330, 58: 320, 59: 310, 60: 300,
        61: 292, 62: 284, 63: 276, 64: 270,
        65: 265, 96: 116, 97: 112, 100: 100,
        128: 48, 160: 27, 192: 15, 224: 6, 256: 1, 258: 1,
    }

    # Interpolate for all 258 picks
    sorted_keys = sorted(key_values.keys())
    for pick in range(1, 259):
        if pick in key_values:
            values[pick] = key_values[pick]
        else:
            # Find surrounding known values
            lower = max(k for k in sorted_keys if k <= pick)
            upper = min(k for k in sorted_keys if k >= pick)
            if lower == upper:
                values[pick] = key_values[lower]
            else:
                frac = (pick - lower) / (upper - lower)
                values[pick] = key_values[lower] + frac * (key_values[upper] - key_values[lower])

    return values


def generate_rich_hill_chart():
    """
    Rich Hill / Harvard modern chart — weights top picks even more heavily.
    Based on surplus value analysis (approximate).
    """
    values = {}
    for pick in range(1, 259):
        # Modern valuation: steeper at top, flatter at bottom
        values[pick] = round(3500 * math.exp(-0.025 * (pick - 1)) + 2, 1)
    return values


def ingest_trade_value_charts():
    """Insert both trade value charts."""
    print("Inserting trade value charts...")
    execute_sql("DELETE FROM trade_value_chart")

    jj = generate_jimmy_johnson_chart()
    rh = generate_rich_hill_chart()

    rows = []
    for pick in range(1, 259):
        rows.append((pick, round(jj[pick], 1), round(rh[pick], 1)))

    sql = """
        INSERT INTO trade_value_chart (pick_number, jimmy_johnson_value, rich_hill_value)
        VALUES (%s, %s, %s)
        ON CONFLICT (pick_number) DO NOTHING
    """
    batch_insert(sql, rows)
    print(f"  Inserted {len(rows)} chart entries.")
    return len(rows)


# ──────────────────────────────────────────────────────────────────────
# Team needs derivation
# ──────────────────────────────────────────────────────────────────────

# Position groups for needs scoring
POSITION_GROUPS = [
    'QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C',
    'DE', 'DT', 'OLB', 'ILB', 'CB', 'S', 'K', 'P'
]

# Standard abbreviation mapping for historical team names
TEAM_ABBREV_MAP = {
    'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BUF': 'BUF',
    'CAR': 'CAR', 'CHI': 'CHI', 'CIN': 'CIN', 'CLE': 'CLE',
    'DAL': 'DAL', 'DEN': 'DEN', 'DET': 'DET', 'GNB': 'GB',
    'GB': 'GB', 'HOU': 'HOU', 'IND': 'IND', 'JAX': 'JAX',
    'KC': 'KC', 'KAN': 'KC', 'LV': 'LV', 'LAC': 'LAC',
    'LAR': 'LAR', 'MIA': 'MIA', 'MIN': 'MIN', 'NE': 'NE',
    'NWE': 'NE', 'NO': 'NO', 'NOR': 'NO', 'NYG': 'NYG',
    'NYJ': 'NYJ', 'LVR': 'LV', 'OAK': 'LV', 'PHI': 'PHI',
    'PIT': 'PIT', 'SF': 'SF', 'SFO': 'SF', 'SEA': 'SEA',
    'TB': 'TB', 'TAM': 'TB', 'TEN': 'TEN', 'WAS': 'WAS',
    'SDG': 'LAC', 'STL': 'LAR', 'SD': 'LAC',
}


def derive_team_needs():
    """
    Derive team needs per season based on draft behavior.
    Strategy: for each team+year, look at what positions they drafted in
    rounds 1-3 (high priority needs) and set need scores accordingly.
    If a team drafted a position early, that position had high need.
    For undrafted positions, set moderate need.
    """
    print("Deriving team needs from draft history...")
    csv_path = DATA_DIR / "draft_picks.csv"
    df = pd.read_csv(csv_path, low_memory=False)
    df = df[df['season'] >= 2000].copy()

    execute_sql("DELETE FROM team_needs WHERE season >= 2000")

    rows = []
    for season in range(2000, 2026):
        season_df = df[df['season'] == season]

        # Get all teams that picked this year
        teams = set()
        for t in season_df['team'].dropna().unique():
            mapped = TEAM_ABBREV_MAP.get(str(t).strip(), str(t).strip())
            teams.add(mapped)

        for team in teams:
            # Get picks for this team
            team_picks = season_df[
                season_df['team'].map(lambda x: TEAM_ABBREV_MAP.get(str(x).strip(), str(x).strip())) == team
            ]

            for pos in POSITION_GROUPS:
                # Check if team drafted this position and when
                pos_picks = team_picks[team_picks['position'] == pos]

                if len(pos_picks) == 0:
                    # Didn't draft this position — moderate need (5) or low need
                    # Specialist positions (K, P) get low need unless drafted
                    if pos in ('K', 'P'):
                        need = 2.0
                    else:
                        need = 5.0
                else:
                    # Drafted this position — need was high. Earlier round = higher need.
                    earliest_round = pos_picks['round'].min()
                    if earliest_round == 1:
                        need = 9.0
                    elif earliest_round == 2:
                        need = 8.0
                    elif earliest_round == 3:
                        need = 7.0
                    elif earliest_round <= 5:
                        need = 6.0
                    else:
                        need = 4.0

                    # Multiple picks at same position = higher need
                    if len(pos_picks) > 1:
                        need = min(10.0, need + 1.0)

                rows.append((season, team, pos, need))

    sql = """
        INSERT INTO team_needs (season, team, position, need_score)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (season, team, position) DO NOTHING
    """
    batch_insert(sql, rows)
    print(f"  Inserted {len(rows)} team needs entries across {len(set(r[0] for r in rows))} seasons.")
    return len(rows)


# ──────────────────────────────────────────────────────────────────────
# Draft trades (synthetic derivation)
# ──────────────────────────────────────────────────────────────────────

def derive_draft_trades():
    """
    Derive trade events from the draft_picks data.
    A trade indicator: when a team picks at a slot that doesn't match
    the original pick order (original owner vs actual team).
    This is approximate — real trade data would come from a separate source.
    We detect trades by looking for teams that picked at unexpected slots.
    """
    print("Deriving draft trades (approximate)...")
    # We can't perfectly derive trades from just picks data,
    # but we can detect anomalies in pick ordering.
    # For now, insert empty — the trade model will learn from
    # overall trade frequency rates from known statistics.

    execute_sql("DELETE FROM draft_trades")

    # Historical average: ~30-35 trades per draft in modern era
    # We'll use this as a baseline rate in the simulation engine
    print("  Trade derivation deferred to simulation engine (uses historical rates).")
    return 0


# ──────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("NFL Draft ML Pipeline — Phase 1: Data Ingestion")
    print("=" * 60)

    create_schema()

    picks_count = ingest_draft_picks()
    combine_count = ingest_combine()
    chart_count = ingest_trade_value_charts()
    needs_count = derive_team_needs()
    trades_count = derive_draft_trades()

    print()
    print("=" * 60)
    print("Ingestion Summary:")
    print(f"  Draft picks:       {picks_count:,}")
    print(f"  Combine records:   {combine_count:,}")
    print(f"  Trade value chart: {chart_count:,}")
    print(f"  Team needs:        {needs_count:,}")
    print(f"  Trade records:     {trades_count:,}")
    print("=" * 60)


if __name__ == "__main__":
    main()
