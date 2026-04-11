import { NextRequest, NextResponse } from 'next/server';
import { getAnalyst } from '@/lib/analysts/personas';
import { speakAnalystContent } from '@/lib/voice/tts-router';
import { requireAuth } from '@/lib/auth-guard';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/analysts/[name]/speak
 *  Body: { text: string, engineOverride?: string }
 *  Returns: { audioUrl, engine, contentHash, error? }
 *
 *  Routes to the analyst's configured TTS engine per persona.voice.
 *  Phase 1 returns null audioUrl (stub); Phase 2 wires real engines.
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { name } = await ctx.params;
  const analyst = getAnalyst(name);
  if (!analyst) {
    return NextResponse.json({ error: `Analyst ${name} not found` }, { status: 404 });
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
