import { NextRequest, NextResponse } from 'next/server';
import { generateMarketingAsset } from '@/lib/images/card-generator';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/images/generate
 *  Generate marketing visuals via Recraft V4
 *
 *  Body: { type: 'hero'|'mockup'|'banner'|'social', subject, context? }
 * ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || token !== PIPELINE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, subject, context } = body as {
      type: 'hero' | 'mockup' | 'banner' | 'social';
      subject: string;
      context?: string;
    };

    if (!type || !subject) {
      return NextResponse.json({ error: 'type and subject required' }, { status: 400 });
    }

    const result = await generateMarketingAsset(type, subject, context);

    if (!result) {
      return NextResponse.json({
        error: 'RECRAFT_API_KEY not configured',
      }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Image generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
