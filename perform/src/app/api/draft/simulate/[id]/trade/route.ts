import { NextRequest, NextResponse } from 'next/server';
import { getSimulation } from '@/lib/draft/simulation-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const sim = getSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  if (sim.mode !== 'war-room') {
    return NextResponse.json({ error: 'Trades only available in War Room mode' }, { status: 400 });
  }
  return NextResponse.json({
    status: 'acknowledged', action,
    message: action === 'propose'
      ? 'Trade proposal sent. Full trade negotiation coming in v2.'
      : `Trade ${action}ed.`,
    simulation_status: sim.status,
  });
}
