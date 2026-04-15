import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createTokenCheckout, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { package_id } = body;

    if (!package_id || !TOKEN_PACKAGES[package_id]) {
      return NextResponse.json(
        { error: 'Invalid package. Choose: single, pack, war-room, or unlimited' },
        { status: 400 },
      );
    }

    const { url, error } = await createTokenCheckout(package_id, auth.userId);

    if (!url) {
      return NextResponse.json(
        {
          error: error || 'Could not create checkout session',
          stripe_configured: !!process.env.STRIPE_SECRET_KEY,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ checkout_url: url });
  } catch (err) {
    console.error('[tokens/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
