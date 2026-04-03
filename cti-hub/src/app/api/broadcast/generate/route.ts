import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { generateShotUniversal, checkShotStatus, checkVeoStatus, estimateVideoCost } from '@/lib/video/pipeline';
import type { ShotPlan, VideoEngine } from '@/lib/video/pipeline';

/**
 * POST /api/broadcast/generate — Generate a video scene
 * Body: { description, camera, lens, aperture, movement, profile, duration, engine }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      description,
      camera = 'static',
      mood = 'cinematic',
      duration = 5,
      engine = 'seedance' as VideoEngine,
      referenceUrl,
    } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Scene description required' }, { status: 400 });
    }

    // Build shot plan from Grammar/Iller_Ang specs
    const shot: ShotPlan = {
      scene_number: 1,
      description: description.trim(),
      duration_seconds: Math.min(duration, 10),
      camera,
      mood,
      transition: 'cut',
      audio_note: '',
    };

    // Estimate cost
    const cost = estimateVideoCost([shot], engine);

    // Submit generation
    const result = await generateShotUniversal(shot, engine, referenceUrl);

    return NextResponse.json({
      generation_id: result.generation_id,
      engine: result.engine,
      status: result.status,
      estimated_cost: cost.estimated_cost,
      duration: shot.duration_seconds,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/broadcast/generate?id=xxx&engine=seedance — Check generation status
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const id = req.nextUrl.searchParams.get('id');
    const engine = (req.nextUrl.searchParams.get('engine') || 'seedance') as VideoEngine;

    if (!id) {
      return NextResponse.json({ error: 'Generation ID required' }, { status: 400 });
    }

    const result = engine === 'veo'
      ? await checkVeoStatus(id)
      : await checkShotStatus(id);

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Status check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
