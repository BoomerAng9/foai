import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance, deductToken, creditTokens, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

/**
 * Extract user identity from auth cookie first, then fall back to IP.
 * The x-user-id header is only trusted for internal/server-to-server calls.
 * For browser requests, the firebase-auth-token cookie is the canonical identity.
 */
function getUserId(req: NextRequest): string {
  // Prefer auth cookie (set by Firebase on sign-in)
  const authToken = req.cookies.get('firebase-auth-token')?.value;
  if (authToken) {
    // Use a hash of the token as the user ID to avoid storing the raw token
    // In production, decode the JWT to extract the Firebase UID
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1] || '{}'));
      if (payload.sub || payload.user_id) {
        return payload.sub || payload.user_id;
      }
    } catch {
      // Token decode failed -- fall through
    }
  }
  // Fall back to IP-based identity for unauthenticated preview
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';
  return `anon_${ip}`;
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
