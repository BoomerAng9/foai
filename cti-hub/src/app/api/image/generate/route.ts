import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { generateImage } from '@/lib/image/generate';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, style, aspect } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 });
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
