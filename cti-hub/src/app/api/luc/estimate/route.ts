import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { generateEstimate } from '@/lib/luc/estimator';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { message, tier = 'premium', attachments = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const estimate = await generateEstimate({
      message,
      tier,
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
    });

    return NextResponse.json({ estimate });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Estimation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
