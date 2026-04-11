import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { planNarrative, generateShot, estimateVideoCost } from '@/lib/video/pipeline';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    if (!rateLimit(auth.userId, 5, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
    }

    const { brief, duration, action, shots, reference_url, shot } = await request.json();

    // Step 1: Plan narrative
    if (action === 'plan' || !action) {
      if (!brief) return NextResponse.json({ error: 'brief required' }, { status: 400 });

      if (typeof brief === 'string' && brief.length > 5000) {
        return NextResponse.json({ error: 'Brief too long (max 5,000 characters)', code: 'VALIDATION_ERROR' }, { status: 400 });
      }

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
      if (!shot) return NextResponse.json({ error: 'shot required' }, { status: 400 });

      const result = await generateShot(shot, reference_url);
      return NextResponse.json({ scene_number: shot.scene_number, ...result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Video generation failed' }, { status: 500 });
  }
}
