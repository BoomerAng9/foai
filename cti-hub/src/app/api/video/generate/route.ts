import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { planNarrative, generateShot, estimateVideoCost } from '@/lib/video/pipeline';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try { return (await getAdminAuth().verifyIdToken(token)).uid; } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { brief, duration, action } = await request.json();

    // Step 1: Plan narrative
    if (action === 'plan' || !action) {
      if (!brief) return NextResponse.json({ error: 'brief required' }, { status: 400 });

      const shots = await planNarrative(brief, duration || 30);
      const cost = estimateVideoCost(shots);

      return NextResponse.json({
        shots,
        estimate: cost,
        message: `Planned ${shots.length} shots, ${cost.total_seconds}s total. Estimated cost: $${cost.estimated_cost.toFixed(2)}`,
      });
    }

    // Step 2: Generate shots
    if (action === 'generate') {
      const { shots, reference_url } = await request.json();
      if (!shots || !Array.isArray(shots)) return NextResponse.json({ error: 'shots array required' }, { status: 400 });

      const results = [];
      for (const shot of shots) {
        try {
          const result = await generateShot(shot, reference_url);
          results.push({ scene_number: shot.scene_number, ...result });
        } catch (err: unknown) {
          results.push({
            scene_number: shot.scene_number,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Generation failed',
          });
        }
      }

      return NextResponse.json({ results });
    }

    // Step 3: Regenerate single shot
    if (action === 'regenerate') {
      const { shot, reference_url } = await request.json();
      if (!shot) return NextResponse.json({ error: 'shot required' }, { status: 400 });

      const result = await generateShot(shot, reference_url);
      return NextResponse.json({ scene_number: shot.scene_number, ...result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Video generation failed' }, { status: 500 });
  }
}
