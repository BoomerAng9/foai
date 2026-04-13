"""
Phase 4: Draft Simulation Engine.

Core classes:
  - DraftState: tracks current pick, picks made, trades, available prospects
  - simulate_pick(): uses ML model to predict next pick with chaos/randomness
  - simulate_trade(): decides if a trade happens and generates terms
  - simulate_draft(): runs all 258 picks, returns complete draft with trades
  - Team needs engine: updates needs after each pick
"""
import sys
import json
import math
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import joblib
from features import (
    FeatureBuilder, POSITIONS, POS_TO_IDX, NUM_POSITIONS,
    NFL_TEAMS, TEAM_TO_IDX, normalize_position, normalize_team,
)
from db import execute_sql

MODELS_DIR = Path(__file__).resolve().parent / "models"


# ──────────────────────────────────────────────────────────────────────
# Data classes
# ──────────────────────────────────────────────────────────────────────

@dataclass
class Prospect:
    """A draft-eligible prospect."""
    id: str
    name: str
    position: str           # normalized position
    school: str
    tie_score: float = 50.0
    tie_grade: str = "B"
    overall_rank: int = 0
    position_rank: int = 0
    conference_tier: int = 3
    combine_forty: float = 0.0
    combine_bench: float = 0.0
    combine_vertical: float = 0.0
    combine_broad_jump: float = 0.0
    combine_cone: float = 0.0
    combine_shuttle: float = 0.0
    weight: float = 0.0
    age: int = 22


@dataclass
class PickResult:
    """Result of a single pick."""
    pick_number: int
    round: int
    team: str
    player: Prospect
    is_trade: bool = False
    trade_details: Optional[dict] = None
    probability: float = 0.0
    surprise_score: float = 0.0


@dataclass
class TradeResult:
    """Result of a trade."""
    trade_up_team: str
    trade_down_team: str
    pick_acquired: int
    picks_given: list = field(default_factory=list)
    players_given: list = field(default_factory=list)
    value_delta: float = 0.0


@dataclass
class DraftResult:
    """Complete draft simulation result."""
    picks: list = field(default_factory=list)       # list of PickResult
    trades: list = field(default_factory=list)       # list of TradeResult
    chaos_factor: int = 50
    total_picks: int = 0
    total_trades: int = 0


class DraftState:
    """Tracks the full state of an in-progress draft."""

    def __init__(self, prospects: list[Prospect], chaos_factor: int = 50):
        self.prospects = {p.id: p for p in prospects}
        self.available = list(self.prospects.keys())  # sorted by rank
        self.picks_made: list[PickResult] = []
        self.trades: list[TradeResult] = []
        self.current_pick = 1
        self.current_round = 1
        self.chaos_factor = chaos_factor  # 0-100

        # Team needs (15 positions per team, 0-10 scale)
        self.team_needs: dict[str, np.ndarray] = {}
        for team in NFL_TEAMS:
            self.team_needs[team] = np.full(NUM_POSITIONS, 5.0)

        # Draft order (simplified: pick_num -> team)
        self.draft_order: dict[int, str] = {}

        # Position counts by team
        self.team_pos_counts: dict[str, np.ndarray] = {}
        for team in NFL_TEAMS:
            self.team_pos_counts[team] = np.zeros(NUM_POSITIONS)

    def set_team_needs(self, needs: dict[str, np.ndarray]):
        """Override team needs from external source."""
        for team, vec in needs.items():
            if team in self.team_needs:
                self.team_needs[team] = vec

    def set_draft_order(self, order: dict[int, str]):
        """Set the draft order: pick_number -> team abbreviation."""
        self.draft_order = order

    def get_team_at_pick(self, pick_num: int) -> str:
        """Get team picking at a given slot."""
        return self.draft_order.get(pick_num, NFL_TEAMS[pick_num % 32])

    def get_available_prospects(self) -> list[Prospect]:
        """Get remaining available prospects, sorted by rank."""
        return [self.prospects[pid] for pid in self.available if pid in self.prospects]

    def make_pick(self, pick_result: PickResult):
        """Record a pick and update state."""
        self.picks_made.append(pick_result)

        # Remove from available pool
        pid = pick_result.player.id
        if pid in self.available:
            self.available.remove(pid)

        # Update team needs
        team = pick_result.team
        pos = pick_result.player.position
        if team in self.team_needs and pos in POS_TO_IDX:
            idx = POS_TO_IDX[pos]
            self.team_needs[team][idx] = max(0, self.team_needs[team][idx] - 3.0)
            self.team_pos_counts[team][idx] += 1

        # Advance pick
        self.current_pick += 1
        self.current_round = min(7, (self.current_pick - 1) // 32 + 1)

    def record_trade(self, trade: TradeResult):
        """Record a trade."""
        self.trades.append(trade)

    def get_picks_as_dicts(self) -> list[dict]:
        """Return picks made as list of dicts for feature engineering."""
        return [
            {
                'position': p.player.position,
                'round': p.round,
                'pick': p.pick_number,
                'team': p.team,
            }
            for p in self.picks_made
        ]


# ──────────────────────────────────────────────────────────────────────
# Simulation Engine
# ──────────────────────────────────────────────────────────────────────

class DraftSimulator:
    """
    Runs NFL draft simulations using trained XGBoost models.
    """

    def __init__(self):
        self.pick_model = None
        self.trade_model = None
        self.feature_builder = None
        self.trade_values = {}
        self._loaded = False

    def load_models(self):
        """Load trained models and feature builder."""
        print("Loading models...")
        pick_path = MODELS_DIR / "pick_predictor.joblib"
        trade_path = MODELS_DIR / "trade_predictor.joblib"

        if not pick_path.exists():
            raise FileNotFoundError(f"Pick model not found at {pick_path}. Run train_draft_model.py first.")
        if not trade_path.exists():
            raise FileNotFoundError(f"Trade model not found at {trade_path}. Run train_draft_model.py first.")

        self.pick_model = joblib.load(pick_path)
        self.trade_model = joblib.load(trade_path)

        self.feature_builder = FeatureBuilder()
        self.feature_builder.load()
        self.trade_values = self.feature_builder.trade_values

        self._loaded = True
        print("  Models loaded.")

    def predict_position_probs(self, state: DraftState, team: str,
                                pick_num: int, round_num: int) -> np.ndarray:
        """
        Predict position probabilities for the next pick.
        Returns array of shape (15,) with P(position) for each position.
        """
        # Build features for a "generic prospect" at each position
        # We use pick context + draft state + team behavior
        context_feat = self.feature_builder.get_pick_context_features(
            pick_num, round_num, team, 2026  # use latest season for needs
        )
        state_feat = self.feature_builder.get_draft_state_features(
            state.get_picks_as_dicts(), pick_num
        )
        behavior_feat = self.feature_builder.get_team_behavior_features(team)

        # Use team needs to weight the context
        needs = state.team_needs.get(team, np.full(NUM_POSITIONS, 5.0))
        context_feat_with_needs = context_feat.copy()
        # Override the needs portion of context features (indices 2:17)
        context_feat_with_needs[2:2 + NUM_POSITIONS] = needs / 10.0

        # Create a dummy prospect feature (9 dims: no position one-hot in training)
        prospect_feat = np.zeros(9)  # conf_tier + 7 combine + age

        features = np.concatenate([prospect_feat, context_feat_with_needs, state_feat, behavior_feat])
        features = features.reshape(1, -1)

        probs = self.pick_model.predict_proba(features)[0]
        return probs

    def score_prospect(self, prospect: Prospect, team: str, state: DraftState,
                       pick_num: int, round_num: int) -> float:
        """
        Score a specific prospect for a specific team at a specific pick.
        Combines ML prediction with team needs and prospect rank.
        """
        pos = prospect.position
        pos_idx = POS_TO_IDX.get(pos, 0)

        # Get position probability from ML model
        pos_probs = self.predict_position_probs(state, team, pick_num, round_num)
        pos_prob = pos_probs[pos_idx]

        # Team need for this position
        need = state.team_needs.get(team, np.full(NUM_POSITIONS, 5.0))[pos_idx] / 10.0

        # Prospect quality (higher rank = lower rank number = better)
        if prospect.overall_rank > 0:
            rank_score = 1.0 / (1.0 + prospect.overall_rank / 50.0)
        else:
            rank_score = prospect.tie_score / 100.0

        # Combined score
        score = (0.35 * pos_prob) + (0.35 * need) + (0.30 * rank_score)

        return score

    def simulate_pick(self, state: DraftState) -> PickResult:
        """
        Simulate the next pick in the draft.
        Uses ML model + team needs + chaos factor to select a player.
        """
        pick_num = state.current_pick
        round_num = state.current_round
        team = state.get_team_at_pick(pick_num)

        available = state.get_available_prospects()
        if not available:
            # Fallback: create a generic prospect
            p = Prospect(id=f"generic_{pick_num}", name=f"Player {pick_num}",
                         position='WR', school='Unknown')
            return PickResult(pick_number=pick_num, round=round_num, team=team,
                              player=p, probability=0.0)

        # Score all available prospects
        scores = []
        for prospect in available[:100]:  # Only consider top 100 available
            score = self.score_prospect(prospect, team, state, pick_num, round_num)
            scores.append((prospect, score))

        scores.sort(key=lambda x: -x[1])

        # Apply chaos factor
        # chaos=0: always pick top-scored prospect
        # chaos=100: random from top 10
        chaos = state.chaos_factor / 100.0
        if chaos < 0.01:
            selected = scores[0][0]
            prob = scores[0][1]
        else:
            # Temperature-based sampling from top candidates
            top_n = max(2, min(10, int(10 * chaos)))
            top_scores = scores[:top_n]

            # Softmax with temperature
            temperature = 0.5 + chaos * 2.0
            raw_scores = np.array([s[1] for s in top_scores])
            exp_scores = np.exp(raw_scores / temperature)
            probs = exp_scores / exp_scores.sum()

            idx = np.random.choice(len(top_scores), p=probs)
            selected = top_scores[idx][0]
            prob = float(probs[idx])

        # Compute surprise score
        expected_rank = pick_num
        actual_rank = selected.overall_rank if selected.overall_rank > 0 else pick_num
        surprise = abs(actual_rank - expected_rank) / max(expected_rank, 1)
        surprise = min(1.0, surprise)

        return PickResult(
            pick_number=pick_num,
            round=round_num,
            team=team,
            player=selected,
            probability=prob,
            surprise_score=surprise,
        )

    def simulate_trade(self, state: DraftState) -> Optional[TradeResult]:
        """
        Decide if a trade happens at the current pick.
        Returns TradeResult if trade occurs, None otherwise.
        """
        pick_num = state.current_pick
        round_num = state.current_round
        team = state.get_team_at_pick(pick_num)

        # Build features for trade prediction
        context_feat = self.feature_builder.get_pick_context_features(
            pick_num, round_num, team, 2026
        )
        state_feat = self.feature_builder.get_draft_state_features(
            state.get_picks_as_dicts(), pick_num
        )
        behavior_feat = self.feature_builder.get_team_behavior_features(team)

        features = np.concatenate([context_feat, state_feat, behavior_feat]).reshape(1, -1)
        trade_prob = self.trade_model.predict_proba(features)[0][1]

        # Apply chaos factor to trade probability
        # Historical average: ~30-35 trades per 258 picks = ~13% rate
        # But we need to account for partner-finding success rate (~60%)
        # So target raw trigger rate: ~20% to land at ~12% after partner check
        chaos = state.chaos_factor / 100.0
        # Scale: at chaos=0, use 60% of model prob; at chaos=100, use 150%
        adjusted_prob = trade_prob * (0.6 + chaos * 0.9)
        # Hard cap per round (historical rates)
        round_cap = {1: 0.25, 2: 0.20, 3: 0.15, 4: 0.12, 5: 0.10, 6: 0.08, 7: 0.06}
        adjusted_prob = min(adjusted_prob, round_cap.get(round_num, 0.10))

        if np.random.random() > adjusted_prob:
            return None

        # Generate trade details
        # Find a team that might want to trade up
        trade_up_team = self._find_trade_partner(state, pick_num)
        if not trade_up_team:
            return None

        # Calculate trade compensation using Jimmy Johnson chart
        pick_value = self.trade_values.get(pick_num, (500, 500))[0]

        # Find picks to give back (from trading-up team's future picks)
        compensation_picks = self._generate_compensation(pick_num, pick_value, round_num)

        trade = TradeResult(
            trade_up_team=trade_up_team,
            trade_down_team=team,
            pick_acquired=pick_num,
            picks_given=compensation_picks,
            value_delta=pick_value,
        )

        # Update draft order: swap teams at the pick
        state.draft_order[pick_num] = trade_up_team

        return trade

    def _find_trade_partner(self, state: DraftState, pick_num: int) -> Optional[str]:
        """Find a team that would want to trade up to this pick.

        Per-team cap: no team can trade up more than 3 times total, or
        more than 2 times in the same round. This prevents one team
        from dominating the trade market.
        """
        current_team = state.get_team_at_pick(pick_num)
        available = state.get_available_prospects()

        if not available:
            return None

        # Count existing trades per team
        team_trade_counts: dict[str, int] = {}
        current_round = (pick_num - 1) // 32 + 1
        team_round_counts: dict[str, int] = {}
        for trade in state.trades:
            t = trade.trade_up_team
            team_trade_counts[t] = team_trade_counts.get(t, 0) + 1
            trade_round = (trade.pick_acquired - 1) // 32 + 1
            if trade_round == current_round:
                team_round_counts[t] = team_round_counts.get(t, 0) + 1

        # Teams with highest unmet needs that pick later
        best_team = None
        best_urgency = 0.0

        for team in NFL_TEAMS:
            if team == current_team:
                continue

            # Per-team caps: 3 total, 2 per round
            if team_trade_counts.get(team, 0) >= 3:
                continue
            if team_round_counts.get(team, 0) >= 2:
                continue

            # Check if this team picks later
            team_next_pick = None
            for p in range(pick_num + 1, 259):
                if state.get_team_at_pick(p) == team:
                    team_next_pick = p
                    break

            if team_next_pick is None:
                continue

            # Calculate urgency: max need * quality of top available at that position
            needs = state.team_needs.get(team, np.full(NUM_POSITIONS, 5.0))
            max_need = needs.max()
            urgency = max_need * (team_next_pick - pick_num) / 32.0

            if urgency > best_urgency:
                best_urgency = urgency
                best_team = team

        return best_team

    def _generate_compensation(self, pick_acquired: int, pick_value: float,
                                round_num: int) -> list:
        """Generate realistic trade compensation picks."""
        compensation = []

        if round_num == 1:
            # Trade up in round 1: give mid-round 1 + 2nd or 3rd
            compensation.append(f"Round {round_num} mid pick")
            compensation.append(f"Round {round_num + 1} pick")
            if pick_acquired <= 10:
                compensation.append(f"Round {min(round_num + 2, 7)} pick")
        elif round_num == 2:
            compensation.append(f"Round {round_num} later pick")
            compensation.append(f"Round {min(round_num + 1, 7)} pick")
        else:
            compensation.append(f"Round {min(round_num + 1, 7)} pick")

        return compensation

    def simulate_draft(self, prospects: list[Prospect],
                       chaos_factor: int = 50,
                       draft_order: Optional[dict[int, str]] = None,
                       team_needs: Optional[dict[str, np.ndarray]] = None,
                       total_picks: int = 258) -> DraftResult:
        """
        Run a complete draft simulation.

        Args:
            prospects: list of Prospect objects (the prospect pool)
            chaos_factor: 0 (chalk) to 100 (wild)
            draft_order: {pick_num: team_abbrev} mapping
            team_needs: {team: np.array(15)} needs vectors
            total_picks: total picks in draft (default 258)

        Returns: DraftResult with all picks and trades
        """
        if not self._loaded:
            self.load_models()

        # Sort prospects by overall rank / TIE score
        prospects_sorted = sorted(
            prospects,
            key=lambda p: (p.overall_rank if p.overall_rank > 0 else 999, -p.tie_score)
        )

        state = DraftState(prospects_sorted, chaos_factor)

        # Set draft order
        if draft_order:
            state.set_draft_order(draft_order)
        else:
            state.set_draft_order(self._default_draft_order(total_picks))

        # Set team needs
        if team_needs:
            state.set_team_needs(team_needs)
        else:
            self._load_default_needs(state)

        result = DraftResult(chaos_factor=chaos_factor)

        print(f"Simulating draft (chaos={chaos_factor}, {total_picks} picks)...")

        for pick_idx in range(total_picks):
            if not state.get_available_prospects():
                break

            # Check for trade
            trade = self.simulate_trade(state)
            if trade:
                state.record_trade(trade)
                result.trades.append(trade)

            # Make the pick
            pick_result = self.simulate_pick(state)
            if trade:
                pick_result.is_trade = True
                pick_result.trade_details = {
                    'trade_up_team': trade.trade_up_team,
                    'trade_down_team': trade.trade_down_team,
                    'compensation': trade.picks_given,
                }

            state.make_pick(pick_result)
            result.picks.append(pick_result)

            # Progress indicator
            if (pick_idx + 1) % 32 == 0:
                round_num = (pick_idx // 32) + 1
                print(f"  Round {round_num} complete. Trades so far: {len(result.trades)}")

        result.total_picks = len(result.picks)
        result.total_trades = len(result.trades)

        print(f"Draft complete: {result.total_picks} picks, {result.total_trades} trades")
        return result

    def _default_draft_order(self, total_picks: int = 258) -> dict[int, str]:
        """
        Generate a default 2026 draft order.
        Simplified: teams pick in reverse order of standing (worst to best).
        Real order would come from NFL data.
        """
        # Approximate 2026 order (based on 2025 season projections)
        round1_order = [
            'TEN', 'CLE', 'NYG', 'NE', 'JAX', 'LV', 'NYJ', 'CAR',
            'NO', 'CHI', 'SF', 'DAL', 'MIA', 'IND', 'ARI', 'CIN',
            'SEA', 'LAC', 'ATL', 'TB', 'PIT', 'LAR', 'MIN', 'GB',
            'HOU', 'BAL', 'PHI', 'BUF', 'DET', 'DEN', 'WAS', 'KC'
        ]

        order = {}
        for round_num in range(1, 8):
            for slot in range(32):
                pick_num = (round_num - 1) * 32 + slot + 1
                if pick_num > total_picks:
                    break
                # Serpentine: odd rounds normal, even rounds reversed
                if round_num % 2 == 0:
                    team = round1_order[31 - slot]
                else:
                    team = round1_order[slot]
                order[pick_num] = team

        # Fill any remaining compensatory picks
        for pick_num in range(len(order) + 1, total_picks + 1):
            if pick_num not in order:
                order[pick_num] = NFL_TEAMS[pick_num % 32]

        return order

    def _load_default_needs(self, state: DraftState):
        """Load team needs from DB for 2025 (latest available)."""
        try:
            cols, rows = execute_sql(
                "SELECT team, position, need_score FROM team_needs WHERE season = 2025",
                fetch=True
            )
            for team, pos, score in rows:
                norm_pos = normalize_position(pos)
                if team in state.team_needs and norm_pos in POS_TO_IDX:
                    state.team_needs[team][POS_TO_IDX[norm_pos]] = float(score)
        except Exception:
            pass  # Use defaults


# ──────────────────────────────────────────────────────────────────────
# Prospect pool loading
# ──────────────────────────────────────────────────────────────────────

def load_2026_prospects() -> list[Prospect]:
    """
    Load 2026 prospect pool from the perform_players table (existing TIE-graded prospects).
    Falls back to generating synthetic prospects from combine data.
    """
    try:
        cols, rows = execute_sql(
            """SELECT id, name, position, school, grade, tie_grade,
                      overall_rank, position_rank, forty_time, bench_reps,
                      vertical_jump, broad_jump, three_cone, shuttle, weight
               FROM perform_players
               ORDER BY overall_rank NULLS LAST, grade DESC NULLS LAST
               LIMIT 400""",
            fetch=True
        )
        prospects = []
        for row in rows:
            grade_val = float(row[4]) if row[4] else 50.0
            p = Prospect(
                id=str(row[0]),
                name=str(row[1]),
                position=normalize_position(str(row[2])),
                school=str(row[3]) if row[3] else 'Unknown',
                tie_score=grade_val,
                tie_grade=str(row[5]) if row[5] else 'B',
                overall_rank=int(row[6]) if row[6] else 0,
                position_rank=int(row[7]) if row[7] else 0,
                combine_forty=float(row[8]) if row[8] else 0.0,
                combine_bench=float(row[9]) if row[9] else 0.0,
                combine_vertical=float(row[10]) if row[10] else 0.0,
                combine_broad_jump=float(row[11]) if row[11] else 0.0,
                combine_cone=float(row[12]) if row[12] else 0.0,
                combine_shuttle=float(row[13]) if row[13] else 0.0,
                weight=float(row[14]) if row[14] else 0.0,
            )
            prospects.append(p)

        if prospects:
            print(f"  Loaded {len(prospects)} prospects from perform_players.")
            return prospects
    except Exception as e:
        print(f"  Could not load from perform_players: {e}")

    # Fallback: generate synthetic prospects from 2025 combine data
    return _generate_synthetic_prospects()


def _generate_synthetic_prospects() -> list[Prospect]:
    """Generate synthetic 2026 prospects based on historical patterns."""
    print("  Generating synthetic 2026 prospect pool...")

    # Position distribution in typical draft
    pos_counts = {
        'WR': 40, 'CB': 35, 'OT': 30, 'DE': 30, 'S': 25,
        'ILB': 25, 'OLB': 20, 'RB': 20, 'DT': 20, 'OG': 20,
        'TE': 18, 'QB': 15, 'C': 10, 'K': 3, 'P': 3,
    }

    schools = [
        'Alabama', 'Ohio State', 'Georgia', 'Michigan', 'LSU',
        'USC', 'Clemson', 'Texas', 'Oregon', 'Penn State',
        'Florida State', 'Oklahoma', 'Tennessee', 'Notre Dame',
        'Texas A&M', 'Auburn', 'Florida', 'Wisconsin', 'Iowa',
        'Miami', 'Colorado', 'UCLA', 'Washington', 'Utah',
        'Pittsburgh', 'North Carolina', 'Kentucky', 'Arkansas',
        'Missouri', 'Virginia Tech', 'Wake Forest', 'Boise State',
    ]

    prospects = []
    rank = 1
    np.random.seed(2026)

    for pos, count in pos_counts.items():
        for i in range(count):
            school = schools[np.random.randint(len(schools))]
            tie_score = max(20, min(99, 90 - rank * 0.2 + np.random.randn() * 8))

            p = Prospect(
                id=f"syn_{pos}_{i}",
                name=f"{pos} Prospect {i+1}",
                position=pos,
                school=school,
                tie_score=round(tie_score, 1),
                tie_grade='A' if tie_score >= 80 else 'B' if tie_score >= 60 else 'C',
                overall_rank=rank,
                age=22 + np.random.randint(0, 3),
            )
            prospects.append(p)
            rank += 1

    # Sort by TIE score
    prospects.sort(key=lambda p: -p.tie_score)
    for i, p in enumerate(prospects):
        p.overall_rank = i + 1

    print(f"  Generated {len(prospects)} synthetic prospects.")
    return prospects


# ──────────────────────────────────────────────────────────────────────
# Serialization helpers
# ──────────────────────────────────────────────────────────────────────

def draft_result_to_dict(result: DraftResult) -> dict:
    """Serialize DraftResult to JSON-friendly dict."""
    return {
        'chaos_factor': result.chaos_factor,
        'total_picks': result.total_picks,
        'total_trades': result.total_trades,
        'picks': [
            {
                'pick_number': p.pick_number,
                'round': p.round,
                'team': p.team,
                'player_name': p.player.name,
                'player_position': p.player.position,
                'player_school': p.player.school,
                'player_tie_score': p.player.tie_score,
                'player_overall_rank': p.player.overall_rank,
                'is_trade': p.is_trade,
                'trade_details': p.trade_details,
                'probability': round(p.probability, 4),
                'surprise_score': round(p.surprise_score, 4),
            }
            for p in result.picks
        ],
        'trades': [
            {
                'trade_up_team': t.trade_up_team,
                'trade_down_team': t.trade_down_team,
                'pick_acquired': t.pick_acquired,
                'picks_given': t.picks_given,
                'value_delta': round(t.value_delta, 1),
            }
            for t in result.trades
        ],
    }


# ──────────────────────────────────────────────────────────────────────
# Main (demo)
# ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("NFL Draft Simulation Engine — Demo Run")
    print("=" * 60)

    sim = DraftSimulator()
    sim.load_models()

    prospects = load_2026_prospects()

    # Run simulation
    result = sim.simulate_draft(prospects, chaos_factor=50, total_picks=258)

    # Print first 10 picks
    print("\n--- First 10 Picks ---")
    for pick in result.picks[:10]:
        trade_str = " [TRADE]" if pick.is_trade else ""
        print(
            f"  #{pick.pick_number:3d} (Rd {pick.round}) {pick.team:4s} -> "
            f"{pick.player.name:30s} {pick.player.position:4s} "
            f"({pick.player.school}){trade_str}"
        )

    # Print trade summary
    print(f"\n--- Trade Summary ---")
    print(f"  Total trades: {result.total_trades}")
    print(f"  Historical average: ~30-35 per draft")
    for trade in result.trades[:5]:
        print(
            f"  {trade.trade_up_team} trades UP to #{trade.pick_acquired} "
            f"from {trade.trade_down_team} (giving: {', '.join(trade.picks_given)})"
        )
    if result.total_trades > 5:
        print(f"  ... and {result.total_trades - 5} more trades")

    # Position distribution
    print(f"\n--- Position Distribution ---")
    pos_counts = {}
    for pick in result.picks:
        pos = pick.player.position
        pos_counts[pos] = pos_counts.get(pos, 0) + 1
    for pos in sorted(pos_counts, key=pos_counts.get, reverse=True):
        print(f"  {pos:5s}: {pos_counts[pos]:3d}")

    # Save result
    output_path = MODELS_DIR / "sample_simulation.json"
    with open(output_path, 'w') as f:
        json.dump(draft_result_to_dict(result), f, indent=2)
    print(f"\nFull simulation saved to {output_path}")


if __name__ == "__main__":
    main()
