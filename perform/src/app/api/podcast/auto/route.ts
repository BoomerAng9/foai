import { NextRequest, NextResponse } from 'next/server';
import { ANALYSTS } from '@/lib/analysts/personas';

const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') || '';
  if (PIPELINE_KEY && authHeader !== `Bearer ${PIPELINE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const results: { analyst: string; success: boolean; episodeId?: number; error?: string }[] = [];

  const episodeTypes: Array<'daily_take' | 'player_spotlight' | 'mock_draft_update' | 'debate'> = [
    'daily_take',
    'player_spotlight',
    'mock_draft_update',
    'daily_take',
    'debate',
    'mock_draft_update',
  ];

  // Generate one episode per analyst sequentially to avoid rate limits
  for (let i = 0; i < ANALYSTS.length; i++) {
    const analyst = ANALYSTS[i];
    const type = episodeTypes[i % episodeTypes.length];

    try {
      const res = await fetch(`${baseUrl}/api/podcast/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PIPELINE_KEY}`,
        },
        body: JSON.stringify({
          analyst: analyst.id,
          type,
          // No topic — generate route will auto-select from news
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        results.push({ analyst: analyst.id, success: false, error: data.error });
      } else {
        results.push({ analyst: analyst.id, success: true, episodeId: data.episodeId });
      }
    } catch (err) {
      results.push({
        analyst: analyst.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    generated: successCount,
    total: ANALYSTS.length,
    results,
  });
}
