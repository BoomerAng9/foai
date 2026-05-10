import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedEmail } from '@/lib/auth-guard';
import { createTokenCheckout, TOKEN_PACKAGES } from '@/lib/stripe/tokens';

export async function POST(req: NextRequest) {
  try {
    // Gate 2 · Item 13: paid actions require verified email (owner bypass).
    // Returns 403 with code: 'email_unverified' + resend CTA when unverified.
    const auth = await requireVerifiedEmail(req);
    if (!auth.ok) return auth.response;

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
