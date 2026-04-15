import { NextRequest, NextResponse } from 'next/server';
import { getSimulation } from '@/lib/draft/simulation-engine';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sim = getSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  return NextResponse.json(sim);
}
