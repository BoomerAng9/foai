import { NextRequest, NextResponse } from 'next/server';
import { createTokenCheckout, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { package_id } = body;

    if (!package_id || !TOKEN_PACKAGES[package_id]) {
      return NextResponse.json(
        { error: 'Invalid package. Choose: single, pack, war-room, or unlimited' },
        { status: 400 },
      );
    }

    const userId = req.headers.get('x-user-id')
      || req.headers.get('x-forwarded-for')
      || 'anonymous';

    const { url, error } = await createTokenCheckout(package_id, userId);

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
