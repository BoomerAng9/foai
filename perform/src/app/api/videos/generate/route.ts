import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, generateDraftHero, generatePlayerHighlight, isVideoConfigured, type VideoUseCase } from '@/lib/images/video-router';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/videos/generate
 *  Generate video via fal.ai multi-model router
 *
 *  Body: { useCase, prompt, imageUrl?, duration?, aspectRatio?, tier?, audioPrompt? }
 *  Shortcuts: { shortcut: 'draft_hero' | 'player_highlight', playerName?, headshot? }
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isVideoConfigured()) {
    return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();

    // Shortcut: draft day hero
    if (body.shortcut === 'draft_hero') {
      const result = await generateDraftHero();
      return NextResponse.json(result || { error: 'Generation failed' });
    }

    // Shortcut: player highlight
    if (body.shortcut === 'player_highlight') {
      if (!body.playerName || !body.headshot) {
        return NextResponse.json({ error: 'playerName and headshot required' }, { status: 400 });
      }
      const result = await generatePlayerHighlight(
        body.playerName,
        body.position || 'player',
        body.headshot,
        body.action || 'in action',
      );
      return NextResponse.json(result || { error: 'Generation failed' });
    }

    // Full request
    const { useCase, prompt, imageUrl, duration, aspectRatio, tier, audioPrompt } = body;

    if (!useCase || !prompt) {
      return NextResponse.json({ error: 'useCase and prompt required' }, { status: 400 });
    }

    const result = await generateVideo({
      useCase: useCase as VideoUseCase,
      prompt,
      imageUrl,
      duration,
      aspectRatio,
      tier,
      audioPrompt,
    });

    if (!result) {
      return NextResponse.json({ error: 'Generation failed or timed out' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Video generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
