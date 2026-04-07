import { NextRequest, NextResponse } from 'next/server';
import { getAnalyst } from '@/lib/analysts/personas';
import { speakAnalystContent } from '@/lib/voice/tts-router';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/analysts/[id]/speak
 *  Body: { text: string, engineOverride?: string }
 *  Returns: { audioUrl, engine, contentHash, error? }
 *
 *  Routes to the analyst's configured TTS engine per persona.voice.
 *  Phase 1 returns null audioUrl (stub); Phase 2 wires real engines.
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const analyst = getAnalyst(id);
  if (!analyst) {
    return NextResponse.json({ error: `Analyst ${id} not found` }, { status: 404 });
  }

  try {
    const body = await req.json();
    const text = (body.text || '').toString();
    if (!text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const result = await speakAnalystContent({
      analyst,
      text,
      engineOverride: body.engineOverride,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'speak failed' },
      { status: 500 },
    );
  }
}
