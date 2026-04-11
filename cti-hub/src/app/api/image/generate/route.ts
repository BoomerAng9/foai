import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit-simple';
import { generateImage } from '@/lib/image/generate';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    if (!rateLimit(auth.userId, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, style, aspect } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt too long (max 2,000 characters)', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const result = await generateImage(prompt, { style, aspect });

    return NextResponse.json({
      image: `data:${result.mime_type};base64,${result.image_base64}`,
      prompt_used: result.prompt_used,
      model: result.model,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Image generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
