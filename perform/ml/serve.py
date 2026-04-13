"""
Phase 5: FastAPI inference service for the NFL Draft Simulation Engine.

Endpoints:
  POST /ml/simulate       — run a full draft simulation
  POST /ml/predict-pick   — predict next pick probabilities (top 10)
  POST /ml/predict-trade  — predict trade probability at current pick
  GET  /ml/health         — health check

Usage:
  cd foai/perform/ml
  uvicorn serve:app --host 0.0.0.0 --port 8100 --reload
"""
import sys
import time
import json
import numpy as np
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation import (
    DraftSimulator, DraftState, Prospect,
    load_2026_prospects, draft_result_to_dict,
)
from features import POSITIONS, POS_TO_IDX, NFL_TEAMS, NUM_POSITIONS, normalize_position

# ──────────────────────────────────────────────────────────────────────
# Global state
# ──────────────────────────────────────────────────────────────────────

simulator: Optional[DraftSimulator] = None
prospect_pool: list[Prospect] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup."""
    global simulator, prospect_pool
    print("Starting ML service — loading models...")
    simulator = DraftSimulator()
    try:
        simulator.load_models()
        prospect_pool = load_2026_prospects()
        print(f"ML service ready. {len(prospect_pool)} prospects loaded.")
    except Exception as e:
        print(f"WARNING: Could not load models: {e}")
        print("Run train_draft_model.py first to train models.")
    yield
    print("ML service shutting down.")


app = FastAPI(
    title="Per|Form Draft Simulation ML Service",
    version="1.0.0",
    description="NFL Draft simulation engine powered by XGBoost",
    lifespan=lifespan,
)

import os as _os

_CORS_ORIGINS = _os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ──────────────────────────────────────────────────────────────────────
# Request/Response models
# ──────────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    chaos_factor: int = Field(default=50, ge=0, le=100, description="0=chalk, 100=wild")
    total_picks: int = Field(default=258, ge=1, le=300)
    team_needs: Optional[dict[str, list[float]]] = Field(
        default=None,
        description="Optional {team: [15 need scores 0-10]}"
    )


class PredictPickRequest(BaseModel):
    pick_number: int = Field(ge=1, le=300)
    round: int = Field(ge=1, le=7)
    team: str = Field(description="Team abbreviation (e.g. 'CHI')")
    picks_made: list[dict] = Field(
        default_factory=list,
        description="List of prior picks: [{position, round, pick, team}]"
    )


class PredictTradeRequest(BaseModel):
    pick_number: int = Field(ge=1, le=300)
    round: int = Field(ge=1, le=7)
    team: str
    picks_made: list[dict] = Field(default_factory=list)
    chaos_factor: int = Field(default=50, ge=0, le=100)


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    prospects_count: int
    pick_model: str
    trade_model: str


# ──────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────

@app.get("/ml/health", response_model=HealthResponse)
async def health_check():
    """Health check — verifies models are loaded and ready."""
    models_ok = simulator is not None and simulator._loaded
    return HealthResponse(
        status="ok" if models_ok else "degraded",
        models_loaded=models_ok,
        prospects_count=len(prospect_pool),
        pick_model="pick_predictor.joblib" if models_ok else "NOT LOADED",
        trade_model="trade_predictor.joblib" if models_ok else "NOT LOADED",
    )


@app.post("/ml/simulate")
async def simulate_draft(req: SimulateRequest):
    """
    Run a full 7-round draft simulation.
    Returns all picks, trades, and summary statistics.
    """
    if not simulator or not simulator._loaded:
        raise HTTPException(503, "Models not loaded. Run train_draft_model.py first.")

    if not prospect_pool:
        raise HTTPException(503, "No prospects loaded.")

    start = time.time()

    # Parse team needs if provided
    team_needs = None
    if req.team_needs:
        team_needs = {}
        for team, needs_list in req.team_needs.items():
            if team in NFL_TEAMS and len(needs_list) == NUM_POSITIONS:
                team_needs[team] = np.array(needs_list)

    result = simulator.simulate_draft(
        prospects=prospect_pool,
        chaos_factor=req.chaos_factor,
        team_needs=team_needs,
        total_picks=req.total_picks,
    )

    elapsed = time.time() - start

    response = draft_result_to_dict(result)
    response['elapsed_seconds'] = round(elapsed, 2)

    # Summary stats
    pos_counts = {}
    for p in result.picks:
        pos = p.player.position
        pos_counts[pos] = pos_counts.get(pos, 0) + 1
    response['position_distribution'] = pos_counts

    # Round 1 picks
    response['round1'] = [
        {
            'pick': p.pick_number,
            'team': p.team,
            'player': p.player.name,
            'position': p.player.position,
            'school': p.player.school,
            'is_trade': p.is_trade,
        }
        for p in result.picks if p.round == 1
    ]

    return response


@app.post("/ml/predict-pick")
async def predict_pick(req: PredictPickRequest):
    """
    Given draft state, predict next pick probabilities.
    Returns top 10 position candidates with probabilities.
    """
    if not simulator or not simulator._loaded:
        raise HTTPException(503, "Models not loaded.")

    if req.team not in NFL_TEAMS:
        raise HTTPException(400, f"Unknown team: {req.team}")

    # Get position probabilities
    state = DraftState(prospect_pool[:100], chaos_factor=50)
    probs = simulator.predict_position_probs(state, req.team, req.pick_number, req.round)

    # Top 10 positions by probability
    ranked = sorted(enumerate(probs), key=lambda x: -x[1])[:10]

    results = []
    for idx, prob in ranked:
        pos = POSITIONS[idx]
        # Find top available prospect at this position
        top_prospect = None
        for p in prospect_pool:
            if p.position == pos:
                pid = p.id
                already_picked = any(
                    pm.get('position') == pos and pm.get('pick', 0) <= req.pick_number
                    for pm in req.picks_made
                )
                if not already_picked:
                    top_prospect = {
                        'name': p.name,
                        'school': p.school,
                        'rank': p.overall_rank,
                        'tie_score': p.tie_score,
                    }
                    break

        results.append({
            'position': pos,
            'probability': round(float(prob), 4),
            'top_prospect': top_prospect,
        })

    return {
        'pick_number': req.pick_number,
        'round': req.round,
        'team': req.team,
        'predictions': results,
    }


@app.post("/ml/predict-trade")
async def predict_trade(req: PredictTradeRequest):
    """
    Predict trade probability at current pick.
    """
    if not simulator or not simulator._loaded:
        raise HTTPException(503, "Models not loaded.")

    if req.team not in NFL_TEAMS:
        raise HTTPException(400, f"Unknown team: {req.team}")

    # Build features
    context_feat = simulator.feature_builder.get_pick_context_features(
        req.pick_number, req.round, req.team, 2026
    )
    state_feat = simulator.feature_builder.get_draft_state_features(
        req.picks_made, req.pick_number
    )
    behavior_feat = simulator.feature_builder.get_team_behavior_features(req.team)

    features = np.concatenate([context_feat, state_feat, behavior_feat]).reshape(1, -1)
    trade_prob = float(simulator.trade_model.predict_proba(features)[0][1])

    # Adjust by chaos
    chaos = req.chaos_factor / 100.0
    adjusted = min(0.5, trade_prob * (0.5 + chaos))

    return {
        'pick_number': req.pick_number,
        'round': req.round,
        'team': req.team,
        'trade_probability': round(trade_prob, 4),
        'adjusted_probability': round(adjusted, 4),
        'chaos_factor': req.chaos_factor,
        'likely_direction': 'trade_down' if trade_prob > 0.15 else 'hold',
    }


# ──────────────────────────────────────────────────────────────────────
# Run directly
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
