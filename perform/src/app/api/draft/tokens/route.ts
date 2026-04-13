import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance, deductToken, creditTokens, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'anonymous';
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const record = getTokenBalance(userId);
  return NextResponse.json({
    tokens: record.is_unlimited ? -1 : record.balance,
    is_unlimited: record.is_unlimited,
    total_purchased: record.total_purchased,
    user_id: userId,
    pricing: Object.fromEntries(
      Object.entries(TOKEN_PACKAGES).map(([k, v]) => [
        k, { tokens: v.tokens, price: v.price_cents / 100, name: v.name, recurring: v.recurring },
      ]),
    ),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { action } = body;

  if (action === 'deduct') {
    const { success, record } = deductToken(userId);
    if (!success) return NextResponse.json({ error: 'Insufficient tokens', tokens: 0 }, { status: 402 });
    return NextResponse.json({ tokens: record.is_unlimited ? -1 : record.balance, message: 'Token deducted' });
  }
  if (action === 'add') {
    const packageId = body.package_id || 'single';
    const record = creditTokens(userId, packageId);
    return NextResponse.json({ tokens: record.balance, message: `Tokens credited (${packageId})` });
  }
  return NextResponse.json({ error: 'Invalid action. Use deduct or add.' }, { status: 400 });
}
