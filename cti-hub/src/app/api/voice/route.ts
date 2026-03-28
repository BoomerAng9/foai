import { NextRequest, NextResponse } from 'next/server';
import { listVoiceVendors, synthesizeVoice, type VoiceVendorId } from '@/lib/voice/vendors';
import { applyRateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedRequest } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'voice-catalog', {
      maxRequests: 30,
      windowMs: 5 * 60 * 1000,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const vendors = await listVoiceVendors();
    return NextResponse.json({ vendors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load voice vendors.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const rateLimitResponse = applyRateLimit(request, 'voice-synthesis', {
      maxRequests: 12,
      windowMs: 5 * 60 * 1000,
      subject: authResult.context.user.uid,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const vendor = body.vendor as VoiceVendorId;
    const text = typeof body.text === 'string' ? body.text : '';
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId : undefined;
    const modelId = typeof body.modelId === 'string' ? body.modelId : undefined;

    if (!vendor || !['elevenlabs', 'nvidia-personaplex', 'grok'].includes(vendor)) {
      return NextResponse.json({ error: 'A valid voice vendor is required.' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Text is required for synthesis.' }, { status: 400 });
    }

    if (text.trim().length > 5000) {
      return NextResponse.json({ error: 'Text is too long for a single voice reply.' }, { status: 400 });
    }

    const result = await synthesizeVoice({
      vendor,
      text,
      voiceId,
      modelId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Voice synthesis failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
