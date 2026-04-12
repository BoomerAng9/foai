import { NextRequest, NextResponse } from 'next/server';
import { makeUserPick } from '@/lib/draft/simulation-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { player_id } = body;
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 });
  const sim = makeUserPick(id, player_id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found or pick invalid' }, { status: 404 });
  return NextResponse.json({
    status: sim.status, current_pick: sim.current_pick,
    latest_pick: sim.picks[sim.picks.length - 1],
    remaining_prospects: sim.available_prospects.length,
  });
}
