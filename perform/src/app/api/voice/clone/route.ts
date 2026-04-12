import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { asyncCloneVoice } from '@/lib/voice/async-client';

/**
 * POST /api/voice/clone
 * Clone a voice from a 3-second audio sample via Async API.
 * Body: multipart/form-data with audio file + name + description
 * Returns: { voiceId, name }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const formData = await req.formData();
  const file = formData.get('audio') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;

  if (!file) return NextResponse.json({ error: 'Audio sample required (3+ seconds)' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'Voice name required' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Minimum 3 seconds of audio (~48KB at 128kbps)
  if (buffer.length < 10000) {
    return NextResponse.json({ error: 'Audio too short — need at least 3 seconds' }, { status: 400 });
  }

  const voiceId = await asyncCloneVoice({
    name: name.trim(),
    audioSample: buffer,
    description: description || undefined,
  });

  return NextResponse.json({ voiceId, name: name.trim(), provider: 'async' });
}
