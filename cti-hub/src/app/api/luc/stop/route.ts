import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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
