import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { synthesizeVoice, type VoiceVendorId } from '@/lib/voice/vendors';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { text, vendor, voiceId, modelId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 chars)' }, { status: 400 });
    }

    const selectedVendor: VoiceVendorId = vendor || 'elevenlabs';

    const result = await synthesizeVoice({
      vendor: selectedVendor,
      text: text.slice(0, 5000),
      voiceId,
      modelId,
    });

    return NextResponse.json({
      audio: `data:${result.mimeType};base64,${result.audioBase64}`,
      vendor: result.vendor,
      voiceId: result.voiceId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Voice synthesis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
