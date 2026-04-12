"""
Phase 2: Feature Engineering for NFL Draft ML Pipeline.

Feature groups:
  1. Prospect features (TIE grade, measurables, consensus rank)
  2. Pick context features (pick number, round, team, needs)
  3. Draft state features (positions drafted, sequence, surprise)
  4. Team behavior features (historical tendencies)
"""
import numpy as np
import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from db import execute_sql

# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DT',
             'OLB', 'ILB', 'CB', 'S', 'K', 'P']
POS_TO_IDX = {p: i for i, p in enumerate(POSITIONS)}
NUM_POSITIONS = len(POSITIONS)

# Map various position labels to our standard set
POS_NORMALIZE = {
    'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'HB': 'RB',
    'WR': 'WR', 'TE': 'TE',
    'T': 'OT', 'OT': 'OT', 'OL': 'OG', 'OG': 'OG', 'G': 'OG', 'C': 'C',
    'DE': 'DE', 'DT': 'DT', 'NT': 'DT', 'DL': 'DT',
    'OLB': 'OLB', 'LB': 'ILB', 'ILB': 'ILB', 'MLB': 'ILB', 'EDGE': 'DE',
    'CB': 'CB', 'DB': 'CB', 'S': 'S', 'SS': 'S', 'FS': 'S',
    'K': 'K', 'P': 'P', 'LS': 'C',
}

# Conference tiers for feature encoding
CONFERENCE_TIER = {
    'SEC': 1, 'Big Ten': 1, 'Big 12': 2, 'ACC': 2, 'Pac-12': 2, 'Pac-10': 2,
    'Big East': 3, 'AAC': 3, 'Mountain West': 3, 'Sun Belt': 4,
    'MAC': 4, 'Conference USA': 4, 'C-USA': 4,
    'Independent': 3, 'FCS': 5,
}

# 32 NFL teams for one-hot or ordinal encoding
NFL_TEAMS = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
    'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
    'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
    'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
]
TEAM_TO_IDX = {t: i for i, t in enumerate(NFL_TEAMS)}

TEAM_ABBREV_MAP = {
    'GNB': 'GB', 'KAN': 'KC', 'NWE': 'NE', 'NOR': 'NO',
    'SFO': 'SF', 'TAM': 'TB', 'LVR': 'LV', 'OAK': 'LV',
    'SDG': 'LAC', 'SD': 'LAC', 'STL': 'LAR',
}


def normalize_team(team: str) -> str:
    """Map team abbreviation to standard form."""
    t = str(team).strip()
    return TEAM_ABBREV_MAP.get(t, t)


def normalize_position(pos: str) -> str:
    """Map position to standard group."""
    if not pos or pd.isna(pos):
        return 'WR'  # fallback
    return POS_NORMALIZE.get(str(pos).strip(), 'WR')


# ──────────────────────────────────────────────────────────────────────
# Data loading
# ──────────────────────────────────────────────────────────────────────

def load_draft_history() -> pd.DataFrame:
    """Load all draft picks from Neon."""
    cols, rows = execute_sql("SELECT * FROM draft_history ORDER BY season, pick", fetch=True)
    return pd.DataFrame(rows, columns=cols)


def load_combine() -> pd.DataFrame:
    """Load combine data from Neon."""
    cols, rows = execute_sql("SELECT * FROM combine_data ORDER BY season", fetch=True)
    return pd.DataFrame(rows, columns=cols)


def load_team_needs() -> pd.DataFrame:
    """Load team needs from Neon."""
    cols, rows = execute_sql("SELECT * FROM team_needs ORDER BY season, team, position", fetch=True)
    return pd.DataFrame(rows, columns=cols)


def load_trade_values() -> dict:
    """Load trade value chart as dict: pick_number -> (jj_value, rh_value)."""
    cols, rows = execute_sql(
        "SELECT pick_number, jimmy_johnson_value, rich_hill_value FROM trade_value_chart ORDER BY pick_number",
        fetch=True
    )
    return {r[0]: (r[1], r[2]) for r in rows}


# ──────────────────────────────────────────────────────────────────────
# Combine merging
# ──────────────────────────────────────────────────────────────────────

def merge_combine_to_picks(picks_df: pd.DataFrame, combine_df: pd.DataFrame) -> pd.DataFrame:
    """Merge combine measurables into draft picks by pfr_id or name matching."""
    combine_by_pfr = {}
    combine_by_name = {}

    for _, row in combine_df.iterrows():
        if row.get('pfr_id') and not pd.isna(row.get('pfr_id')):
            combine_by_pfr[row['pfr_id']] = row
        name = str(row.get('player_name', '')).strip().lower()
        if name:
            combine_by_name[name] = row

    measurable_cols = ['forty', 'bench', 'vertical', 'broad_jump', 'cone', 'shuttle', 'weight']
    for col in measurable_cols:
        picks_df[f'combine_{col}'] = np.nan

    for idx, pick in picks_df.iterrows():
        match = None
        pfr_id = pick.get('pfr_player_id')
        if pfr_id and not pd.isna(pfr_id) and pfr_id in combine_by_pfr:
            match = combine_by_pfr[pfr_id]
        else:
            name = str(pick.get('player_name', '')).strip().lower()
            if name in combine_by_name:
                match = combine_by_name[name]

        if match is not None:
            for col in measurable_cols:
                val = match.get(col)
                if val is not None and not pd.isna(val):
                    picks_df.at[idx, f'combine_{col}'] = float(val)

    return picks_df


# ──────────────────────────────────────────────────────────────────────
# Feature extraction
# ──────────────────────────────────────────────────────────────────────

def build_team_needs_vectors(needs_df: pd.DataFrame) -> dict:
    """
    Build {(season, team): np.array(15 need scores)} lookup.
    """
    vectors = {}
    for (season, team), group in needs_df.groupby(['season', 'team']):
        vec = np.full(NUM_POSITIONS, 5.0)  # default moderate need
        for _, row in group.iterrows():
            pos = normalize_position(row['position'])
            if pos in POS_TO_IDX:
                vec[POS_TO_IDX[pos]] = float(row['need_score'])
        vectors[(int(season), str(team))] = vec
    return vectors


def compute_team_tendencies(picks_df: pd.DataFrame) -> dict:
    """
    Compute per-team historical tendencies:
      - position_freq: how often each position is drafted (normalized)
      - reach_rate: fraction of picks in rounds 1-3 that are "reaches"
        (position not typically drafted that high)
      - early_pick_rate: fraction of picks in rounds 1-2
    Returns {team: {position_freq: np.array, reach_rate: float, early_pick_rate: float}}
    """
    # Average round by position across all teams (baseline)
    pos_avg_round = {}
    for pos in POSITIONS:
        pos_picks = picks_df[picks_df['position'].map(
            lambda x: normalize_position(x) == pos if not pd.isna(x) else False
        )]
        if len(pos_picks) > 0:
            pos_avg_round[pos] = pos_picks['round'].mean()
        else:
            pos_avg_round[pos] = 5.0

    tendencies = {}
    for team in NFL_TEAMS:
        team_picks = picks_df[picks_df['team'].map(
            lambda x: normalize_team(x) == team if not pd.isna(x) else False
        )]

        if len(team_picks) == 0:
            tendencies[team] = {
                'position_freq': np.ones(NUM_POSITIONS) / NUM_POSITIONS,
                'reach_rate': 0.15,
                'early_pick_rate': 0.2,
            }
            continue

        # Position frequency
        pos_counts = np.zeros(NUM_POSITIONS)
        for _, p in team_picks.iterrows():
            pos = normalize_position(p.get('position', ''))
            if pos in POS_TO_IDX:
                pos_counts[POS_TO_IDX[pos]] += 1
        total = pos_counts.sum()
        if total > 0:
            pos_freq = pos_counts / total
        else:
            pos_freq = np.ones(NUM_POSITIONS) / NUM_POSITIONS

        # Reach rate (rounds 1-3: pick at position whose avg round is > current round + 1)
        early_picks = team_picks[team_picks['round'] <= 3]
        reaches = 0
        for _, p in early_picks.iterrows():
            pos = normalize_position(p.get('position', ''))
            avg_r = pos_avg_round.get(pos, 5.0)
            if p['round'] < avg_r - 1:
                reaches += 1
        reach_rate = reaches / max(len(early_picks), 1)

        # Early pick rate
        early_rate = len(team_picks[team_picks['round'] <= 2]) / max(len(team_picks), 1)

        tendencies[team] = {
            'position_freq': pos_freq,
            'reach_rate': reach_rate,
            'early_pick_rate': early_rate,
        }

    return tendencies


class FeatureBuilder:
    """
    Builds feature vectors for the draft prediction models.
    """

    def __init__(self):
        self.picks_df = None
        self.combine_df = None
        self.needs_vectors = None
        self.team_tendencies = None
        self.trade_values = None
        self._loaded = False

    def load(self):
        """Load all data from Neon."""
        print("Loading data for feature engineering...")
        self.picks_df = load_draft_history()
        self.combine_df = load_combine()
        needs_df = load_team_needs()
        self.needs_vectors = build_team_needs_vectors(needs_df)
        self.trade_values = load_trade_values()

        # Merge combine data
        self.picks_df = merge_combine_to_picks(self.picks_df, self.combine_df)

        # Normalize positions and teams
        self.picks_df['norm_position'] = self.picks_df['position'].map(normalize_position)
        self.picks_df['norm_team'] = self.picks_df['team'].map(normalize_team)

        # Compute tendencies
        self.team_tendencies = compute_team_tendencies(self.picks_df)

        self._loaded = True
        print(f"  Loaded {len(self.picks_df)} picks, {len(self.combine_df)} combine records.")

    def get_prospect_features(self, row: pd.Series, include_position: bool = False) -> np.ndarray:
        """
        Prospect features (9 dims without position, 24 with position):
          - conference tier (1)
          - combine: forty, bench, vertical, broad_jump, cone, shuttle, weight (7)
          - age (1)
          Optionally: position one-hot (15) — ONLY for inference, NOT training
        """
        # Conference tier
        college = str(row.get('college', ''))
        conf_tier = 3  # default mid-tier
        for conf, tier in CONFERENCE_TIER.items():
            if conf.lower() in college.lower():
                conf_tier = tier
                break

        # Combine measurables (7 features, normalized)
        forty = float(row.get('combine_forty', 0) or 0)
        bench = float(row.get('combine_bench', 0) or 0)
        vert = float(row.get('combine_vertical', 0) or 0)
        broad = float(row.get('combine_broad_jump', 0) or 0)
        cone = float(row.get('combine_cone', 0) or 0)
        shuttle = float(row.get('combine_shuttle', 0) or 0)
        weight = float(row.get('combine_weight', 0) or 0)

        age = float(row.get('age', 22) or 22)

        base = np.array([conf_tier, forty, bench, vert, broad, cone, shuttle, weight, age])

        if include_position:
            pos_vec = np.zeros(NUM_POSITIONS)
            pos = normalize_position(row.get('position', ''))
            if pos in POS_TO_IDX:
                pos_vec[POS_TO_IDX[pos]] = 1.0
            return np.concatenate([pos_vec, base])  # 24

        return base  # 9

    def get_pick_context_features(self, pick_num: int, round_num: int,
                                   team: str, season: int) -> np.ndarray:
        """
        Pick context features (19 dims):
          - pick_number (normalized 0-1) (1)
          - round (1)
          - team needs vector (15)
          - trade value of pick (JJ, normalized) (1)
          - picks remaining in round (approx) (1)
        Total: 19
        """
        pick_norm = pick_num / 258.0
        needs = self.needs_vectors.get((season, team), np.full(NUM_POSITIONS, 5.0))

        jj_val = 0.0
        if self.trade_values and pick_num in self.trade_values:
            jj_val = self.trade_values[pick_num][0] / 3000.0  # normalize

        picks_remaining_in_round = max(0, (round_num * 32) - pick_num) / 32.0

        return np.concatenate([
            [pick_norm],           # 1
            [round_num / 7.0],     # 1
            needs / 10.0,          # 15
            [jj_val],              # 1
            [picks_remaining_in_round],  # 1
        ])  # Total: 19

    def get_draft_state_features(self, picks_so_far: list, current_pick: int) -> np.ndarray:
        """
        Draft state features (18 dims):
          - positions drafted so far (running counts, 15)
          - total picks made (normalized) (1)
          - surprise score of last pick (1)
          - trade count so far (placeholder) (1)
        Total: 18
        """
        pos_counts = np.zeros(NUM_POSITIONS)
        for p in picks_so_far:
            pos = normalize_position(p.get('position', ''))
            if pos in POS_TO_IDX:
                pos_counts[POS_TO_IDX[pos]] += 1

        # Normalize counts
        total_picks = len(picks_so_far)
        if total_picks > 0:
            pos_counts_norm = pos_counts / total_picks
        else:
            pos_counts_norm = pos_counts

        # Surprise score: did last pick deviate from expected position?
        surprise = 0.0
        if len(picks_so_far) > 0:
            last = picks_so_far[-1]
            last_pos = normalize_position(last.get('position', ''))
            # Simple heuristic: if position is uncommon for this round
            if last_pos in ('K', 'P') and last.get('round', 7) < 5:
                surprise = 1.0
            elif last_pos == 'QB' and last.get('round', 1) == 1:
                surprise = 0.3  # QB at 1 is expected-ish

        trades_so_far = 0.0  # placeholder

        return np.concatenate([
            pos_counts_norm,          # 15
            [total_picks / 258.0],    # 1
            [surprise],               # 1
            [trades_so_far / 40.0],   # 1
        ])  # Total: 18

    def get_team_behavior_features(self, team: str) -> np.ndarray:
        """
        Team behavior features (17 dims):
          - position preference distribution (15)
          - reach rate (1)
          - early pick rate (1)
        Total: 17
        """
        tend = self.team_tendencies.get(team, {
            'position_freq': np.ones(NUM_POSITIONS) / NUM_POSITIONS,
            'reach_rate': 0.15,
            'early_pick_rate': 0.2,
        })

        return np.concatenate([
            tend['position_freq'],     # 15
            [tend['reach_rate']],      # 1
            [tend['early_pick_rate']], # 1
        ])  # Total: 17

    def build_training_data(self, min_season: int = 2000, max_season: int = 2025,
                            test_seasons: tuple = (2024, 2025)):
        """
        Build training and test datasets.

        For each pick, features are:
          prospect (24) + pick_context (19) + draft_state (18) + team_behavior (17) = 78 features

        Label: position index of the player picked (for pick predictor)
                This is a simplification — we predict POSITION rather than exact player,
                since the player pool changes every year. The simulation engine uses
                position prediction + team needs to select a specific player.

        Returns: X_train, y_train, X_test, y_test, feature_names
        """
        if not self._loaded:
            self.load()

        print("Building training data...")
        X_all = []
        y_all = []
        seasons_all = []

        for season in range(min_season, max_season + 1):
            season_picks = self.picks_df[self.picks_df['season'] == season].sort_values('pick')
            picks_so_far = []

            for _, row in season_picks.iterrows():
                team = normalize_team(row.get('team', ''))
                pick_num = int(row.get('pick', 0))
                round_num = int(row.get('round', 1))
                pos = normalize_position(row.get('position', ''))

                if pos not in POS_TO_IDX or team not in TEAM_TO_IDX:
                    picks_so_far.append(row.to_dict())
                    continue

                # Build feature vector (NO position one-hot — that's the label!)
                prospect_feat = self.get_prospect_features(row, include_position=False)
                context_feat = self.get_pick_context_features(pick_num, round_num, team, season)
                state_feat = self.get_draft_state_features(picks_so_far, pick_num)
                behavior_feat = self.get_team_behavior_features(team)

                features = np.concatenate([prospect_feat, context_feat, state_feat, behavior_feat])
                label = POS_TO_IDX[pos]

                X_all.append(features)
                y_all.append(label)
                seasons_all.append(season)

                picks_so_far.append(row.to_dict())

        X_all = np.array(X_all)
        y_all = np.array(y_all)
        seasons_all = np.array(seasons_all)

        # Split by season
        train_mask = ~np.isin(seasons_all, list(test_seasons))
        test_mask = np.isin(seasons_all, list(test_seasons))

        X_train = X_all[train_mask]
        y_train = y_all[train_mask]
        X_test = X_all[test_mask]
        y_test = y_all[test_mask]

        print(f"  Train: {len(X_train)} examples ({min_season}-{min(test_seasons)-1})")
        print(f"  Test:  {len(X_test)} examples ({test_seasons})")
        print(f"  Features: {X_all.shape[1]}")

        # 9 prospect + 19 context + 18 state + 17 behavior = 63 features
        feature_names = (
            ['conf_tier', 'forty', 'bench', 'vertical', 'broad_jump',
             'cone', 'shuttle', 'weight', 'age'] +
            ['pick_norm', 'round_norm'] +
            [f'need_{p}' for p in POSITIONS] +
            ['trade_value', 'picks_remaining'] +
            [f'drafted_{p}' for p in POSITIONS] +
            ['total_picks', 'surprise', 'trades_so_far'] +
            [f'team_pref_{p}' for p in POSITIONS] +
            ['reach_rate', 'early_pick_rate']
        )

        return X_train, y_train, X_test, y_test, feature_names

    def build_trade_training_data(self, min_season: int = 2000, max_season: int = 2025,
                                   test_seasons: tuple = (2024, 2025)):
        """
        Build training data for the trade predictor.

        For each pick slot, the label is whether a trade occurred.
        Since we don't have granular trade data, we use a synthetic approach:
          - Historical trade rate: ~30-35 trades per draft (~13% of picks)
          - Trades are more common in rounds 1-3
          - We assign probabilistic labels based on round and historical rates

        Returns: X_train, y_trade_train, X_test, y_trade_test
        """
        if not self._loaded:
            self.load()

        print("Building trade training data (synthetic labels)...")

        # Historical trade probability by round (approximate)
        trade_prob_by_round = {
            1: 0.25,  # ~8 trades in round 1
            2: 0.20,  # ~6 trades in round 2
            3: 0.15,  # ~5 trades in round 3
            4: 0.10,  # ~3 trades in round 4
            5: 0.08,
            6: 0.06,
            7: 0.05,
        }

        X_all = []
        y_all = []
        seasons_all = []

        np.random.seed(42)

        for season in range(min_season, max_season + 1):
            season_picks = self.picks_df[self.picks_df['season'] == season].sort_values('pick')
            picks_so_far = []

            for _, row in season_picks.iterrows():
                team = normalize_team(row.get('team', ''))
                pick_num = int(row.get('pick', 0))
                round_num = int(row.get('round', 1))

                if team not in TEAM_TO_IDX:
                    picks_so_far.append(row.to_dict())
                    continue

                context_feat = self.get_pick_context_features(pick_num, round_num, team, season)
                state_feat = self.get_draft_state_features(picks_so_far, pick_num)
                behavior_feat = self.get_team_behavior_features(team)

                features = np.concatenate([context_feat, state_feat, behavior_feat])

                # Synthetic trade label
                trade_prob = trade_prob_by_round.get(round_num, 0.05)
                label = 1 if np.random.random() < trade_prob else 0

                X_all.append(features)
                y_all.append(label)
                seasons_all.append(season)
                picks_so_far.append(row.to_dict())

        X_all = np.array(X_all)
        y_all = np.array(y_all)
        seasons_all = np.array(seasons_all)

        train_mask = ~np.isin(seasons_all, list(test_seasons))
        test_mask = np.isin(seasons_all, list(test_seasons))

        print(f"  Trade train: {train_mask.sum()} examples, trade rate: {y_all[train_mask].mean():.2%}")
        print(f"  Trade test:  {test_mask.sum()} examples")

        return X_all[train_mask], y_all[train_mask], X_all[test_mask], y_all[test_mask]


# ──────────────────────────────────────────────────────────────────────
# Standalone test
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    fb = FeatureBuilder()
    fb.load()
    X_train, y_train, X_test, y_test, names = fb.build_training_data()
    print(f"\nFeature names ({len(names)}):")
    for i, n in enumerate(names):
        print(f"  {i:2d}: {n}")
    print(f"\nLabel distribution (train):")
    for i, pos in enumerate(POSITIONS):
        count = (y_train == i).sum()
        print(f"  {pos}: {count} ({count/len(y_train):.1%})")
