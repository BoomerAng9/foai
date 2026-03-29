import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return NextResponse.json({ error: 'estimate_id required' }, { status: 400 });
    }

    return NextResponse.json({
      accepted: true,
      estimate_id,
      message: 'Estimate accepted. Execution starting.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Accept failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
