/**
 * Per|Form Stripe Token Purchase Integration
 *
 * Packages:
 *   single    — $2.99  (1 simulation token)
 *   pack      — $9.99  (5 tokens)
 *   war-room  — $19.99 (10 tokens)
 *   unlimited — $49.99/mo (unlimited)
 */

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number; // -1 = unlimited
  price_cents: number;
  recurring: boolean;
  stripe_price_id: string | null; // set via env or Stripe dashboard
}

export const TOKEN_PACKAGES: Record<string, TokenPackage> = {
  single: {
    id: 'single',
    name: 'Single Simulation',
    tokens: 1,
    price_cents: 299,
    recurring: false,
    stripe_price_id: process.env.STRIPE_PRICE_SINGLE || null,
  },
  pack: {
    id: 'pack',
    name: '5-Pack',
    tokens: 5,
    price_cents: 999,
    recurring: false,
    stripe_price_id: process.env.STRIPE_PRICE_PACK || null,
  },
  'war-room': {
    id: 'war-room',
    name: 'War Room Bundle',
    tokens: 10,
    price_cents: 1999,
    recurring: false,
    stripe_price_id: process.env.STRIPE_PRICE_WAR_ROOM || null,
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited Monthly',
    tokens: -1,
    price_cents: 4999,
    recurring: true,
    stripe_price_id: process.env.STRIPE_PRICE_UNLIMITED || null,
  },
};

// ---------------------------------------------------------------------------
// In-memory token store (v1). Replace with Neon `draft_tokens` table in v2.
// ---------------------------------------------------------------------------
interface TokenRecord {
  user_id: string;
  balance: number;
  total_purchased: number;
  is_unlimited: boolean;
  created_at: string;
  updated_at: string;
}

const tokenStore = new Map<string, TokenRecord>();

function ensureRecord(userId: string): TokenRecord {
  if (!tokenStore.has(userId)) {
    const now = new Date().toISOString();
    tokenStore.set(userId, {
      user_id: userId,
      balance: 3, // 3 free tokens for new users
      total_purchased: 0,
      is_unlimited: false,
      created_at: now,
      updated_at: now,
    });
  }
  return tokenStore.get(userId)!;
}

export function getTokenBalance(userId: string): TokenRecord {
  return ensureRecord(userId);
}

export function creditTokens(userId: string, packageId: string): TokenRecord {
  const record = ensureRecord(userId);
  const pkg = TOKEN_PACKAGES[packageId];
  if (!pkg) return record;

  const now = new Date().toISOString();
  if (pkg.tokens === -1) {
    record.is_unlimited = true;
  } else {
    record.balance += pkg.tokens;
    record.total_purchased += pkg.tokens;
  }
  record.updated_at = now;
  return record;
}

export function deductToken(userId: string): { success: boolean; record: TokenRecord } {
  const record = ensureRecord(userId);
  if (record.is_unlimited) return { success: true, record };
  if (record.balance <= 0) return { success: false, record };
  record.balance -= 1;
  record.updated_at = new Date().toISOString();
  return { success: true, record };
}

// ---------------------------------------------------------------------------
// Stripe Checkout session creation
// ---------------------------------------------------------------------------
let _stripe: unknown = null;

async function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    const { default: Stripe } = await import('stripe');
    _stripe = new Stripe(key);
    return _stripe;
  } catch {
    console.warn('[Stripe] stripe package not installed or key missing');
    return null;
  }
}

export async function createTokenCheckout(
  packageId: string,
  userId: string,
): Promise<{ url: string | null; error?: string }> {
  const pkg = TOKEN_PACKAGES[packageId];
  if (!pkg) return { url: null, error: `Unknown package: ${packageId}` };

  const stripe = await getStripe();
  if (!stripe) {
    return {
      url: null,
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in env.',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = stripe as any;
    const sessionParams: Record<string, unknown> = {
      payment_method_types: ['card'],
      mode: pkg.recurring ? 'subscription' : 'payment',
      success_url: `${baseUrl}/draft?purchase=success&package=${packageId}`,
      cancel_url: `${baseUrl}/draft?purchase=cancelled`,
      metadata: { user_id: userId, package_id: packageId, tokens: String(pkg.tokens) },
      line_items: [
        pkg.stripe_price_id
          ? { price: pkg.stripe_price_id, quantity: 1 }
          : {
              price_data: {
                currency: 'usd',
                product_data: { name: `Per|Form Draft — ${pkg.name}` },
                unit_amount: pkg.price_cents,
                ...(pkg.recurring ? { recurring: { interval: 'month' } } : {}),
              },
              quantity: 1,
            },
      ],
    };

    const session = await s.checkout.sessions.create(sessionParams);
    return { url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe checkout creation failed';
    return { url: null, error: msg };
  }
}
