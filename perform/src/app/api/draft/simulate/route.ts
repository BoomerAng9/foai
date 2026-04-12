import { NextRequest, NextResponse } from 'next/server';
import { createSimulation } from '@/lib/draft/simulation-engine';
import type { SimulationConfig } from '@/lib/draft/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<SimulationConfig>;
    const config: SimulationConfig = {
      mode: body.mode || 'auto',
      team: body.team,
      chaos_factor: Math.max(0, Math.min(100, body.chaos_factor ?? 30)),
      speed: body.speed || 'fast',
      rounds: Math.max(1, Math.min(7, body.rounds ?? 7)),
    };
    if ((config.mode === 'pick-team' || config.mode === 'war-room') && !config.team) {
      return NextResponse.json({ error: 'Team selection required for this mode' }, { status: 400 });
    }
    const simulation = await createSimulation(config);
    return NextResponse.json({
      simulation_id: simulation.id, status: simulation.status, mode: simulation.mode,
      total_picks: simulation.total_picks, current_pick: simulation.current_pick,
      first_pick: simulation.picks[0] || null,
      picks_count: simulation.picks.length, trades_count: simulation.trades.length,
    });
  } catch (err) {
    console.error('Simulation error:', err);
    return NextResponse.json({ error: 'Failed to start simulation' }, { status: 500 });
  }
}
