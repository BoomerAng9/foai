import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getTokenBalance, deductToken, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const record = await getTokenBalance(auth.userId);
    return NextResponse.json({
      tokens: record.is_unlimited ? -1 : record.balance,
      is_unlimited: record.is_unlimited,
      unlimited_until: record.unlimited_until,
      total_purchased: record.total_purchased,
      user_id: auth.userId,
      pricing: Object.fromEntries(
        Object.entries(TOKEN_PACKAGES).map(([k, v]) => [
          k, { tokens: v.tokens, price: v.price_cents / 100, name: v.name, recurring: v.recurring },
        ]),
      ),
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'db_unavailable') {
      return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'deduct') {
    try {
      const { success, record } = await deductToken(auth.userId);
      if (!success) return NextResponse.json({ error: 'Insufficient tokens', tokens: 0 }, { status: 402 });
      return NextResponse.json({ tokens: record.is_unlimited ? -1 : record.balance, message: 'Token deducted' });
    } catch (err) {
      if (err instanceof Error && err.message === 'db_unavailable') {
        return NextResponse.json({ error: 'db_unavailable' }, { status: 503 });
      }
      throw err;
    }
  }
  return NextResponse.json({ error: 'Invalid action. Use deduct.' }, { status: 400 });
}
