import { NextRequest, NextResponse } from 'next/server';

const tokenStore = new Map<string, number>();
const DEFAULT_TOKENS = 3;

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'anonymous';
}

function getBalance(userId: string): number {
  if (!tokenStore.has(userId)) tokenStore.set(userId, DEFAULT_TOKENS);
  return tokenStore.get(userId)!;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  return NextResponse.json({
    tokens: getBalance(userId), user_id: userId,
    pricing: {
      single: { tokens: 1, price: 2.99 },
      pack: { tokens: 5, price: 9.99 },
      war_room: { tokens: 10, price: 19.99 },
      unlimited: { tokens: -1, price: 49.99, period: 'month' },
    },
  });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { action } = body;
  const balance = getBalance(userId);

  if (action === 'deduct') {
    if (balance <= 0) return NextResponse.json({ error: 'Insufficient tokens', tokens: 0 }, { status: 402 });
    tokenStore.set(userId, balance - 1);
    return NextResponse.json({ tokens: balance - 1, message: 'Token deducted' });
  }
  if (action === 'add') {
    const amount = body.amount || 1;
    tokenStore.set(userId, balance + amount);
    return NextResponse.json({ tokens: balance + amount, message: `${amount} token(s) added` });
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
