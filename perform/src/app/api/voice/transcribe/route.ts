import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { routeSTT, type STTMode } from '@/lib/voice/stt-router';

/**
 * POST /api/voice/transcribe
 * Unified STT endpoint — routes to Deepgram / Scribe / Gemini based on mode.
 * Body: multipart/form-data with audio file + mode
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get('audio') as File | null;
  const mode = (formData.get('mode') as STTMode) || 'live_chat';
  const language = formData.get('language') as string | null;
  const diarize = formData.get('diarize') === 'true';

  if (!file) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

  const validModes: STTMode[] = ['live_chat', 'podcast_upload', 'workbench', 'multilingual'];
  if (!validModes.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await routeSTT({
    audio: buffer,
    mode,
    language: language || undefined,
    diarize,
  });

  return NextResponse.json(result);
}
