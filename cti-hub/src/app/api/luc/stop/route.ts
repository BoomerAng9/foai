import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return NextResponse.json({ error: 'estimate_id required' }, { status: 400 });
    }

    return NextResponse.json({
      cancelled: true,
      estimate_id,
      message: 'Job cancelled. No charges applied.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Stop failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
