import { NextRequest, NextResponse } from 'next/server';
import { getSimulation } from '@/lib/draft/simulation-engine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sim = getSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  return NextResponse.json(sim);
}
