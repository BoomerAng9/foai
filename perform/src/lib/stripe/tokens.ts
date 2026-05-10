/**
 * Per|Form Stripe Token Purchase Integration (DB-backed as of migration 018).
 *
 * Packages:
 *   single    — $2.99  (1 simulation token)
 *   pack      — $9.99  (5 tokens)
 *   war-room  — $19.99 (10 tokens)
 *   unlimited — $49.99/mo (unlimited)
 *
 * Token balances persist in the `draft_tokens` Postgres table. A container
 * restart never loses paid balances — fix for the Gate 4 blocker where the
 * previous `new Map()` store discarded everything on deploy.
 */

import { sql } from '@/lib/db';

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
// DB-backed token store (replaces the volatile Map from v1)
// ---------------------------------------------------------------------------

import type { Tier } from '@/lib/billing/tiers';

export interface TokenRecord {
  user_id: string;
  balance: number;
  total_purchased: number;
  is_unlimited: boolean;
  unlimited_until: string | null;
  tier: Tier;
  subscription_status: 'none' | 'active' | 'cancel_scheduled' | 'cancelled';
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 3 free starter tokens on first contact — matches v1 behavior. */
const STARTER_BALANCE = 3;

function requireSql(): NonNullable<typeof sql> {
  if (!sql) throw new Error('db_unavailable');
  return sql;
}

type Row = {
  user_id: string;
  balance: number;
  total_purchased: number;
  is_unlimited: boolean;
  unlimited_until: string | null;
  tier: Tier;
  subscription_status: TokenRecord['subscription_status'];
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

const ROW_COLUMNS = 'user_id, balance, total_purchased, is_unlimited, unlimited_until, tier, subscription_status, stripe_subscription_id, created_at, updated_at';

async function ensureRecord(userId: string): Promise<TokenRecord> {
  const db = requireSql();
  await db`
    INSERT INTO draft_tokens (user_id, balance, total_purchased, is_unlimited, tier, subscription_status)
    VALUES (${userId}, ${STARTER_BALANCE}, 0, FALSE, 'free', 'none')
    ON CONFLICT (user_id) DO NOTHING
  `;
  const rows = await db<Row[]>`
    SELECT ${db.unsafe(ROW_COLUMNS)}
    FROM draft_tokens WHERE user_id = ${userId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) throw new Error('record_missing_after_upsert');

  // Lazy expiry: if the unlimited window has elapsed, demote the account
  // in-place. Status transitions in one shot:
  //   'cancel_scheduled' → 'cancelled'  (user opted out; now fully off)
  //   'active'           → 'cancelled'  (renewal failed; Stripe will retry,
  //                                       but until it does, no access)
  if (r.is_unlimited && r.unlimited_until && new Date(r.unlimited_until) < new Date()) {
    const demoted = await db<Row[]>`
      UPDATE draft_tokens
      SET is_unlimited = FALSE,
          unlimited_until = NULL,
          subscription_status = 'cancelled',
          tier = CASE WHEN total_purchased > 0 THEN 'standard' ELSE 'free' END,
          updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING ${db.unsafe(ROW_COLUMNS)}
    `;
    return normalize(demoted[0]);
  }

  return normalize(r);
}

function normalize(r: Row): TokenRecord {
  return {
    user_id: r.user_id,
    balance: Number(r.balance),
    total_purchased: Number(r.total_purchased),
    is_unlimited: !!r.is_unlimited,
    unlimited_until: r.unlimited_until,
    tier: r.tier,
    subscription_status: r.subscription_status,
    stripe_subscription_id: r.stripe_subscription_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function getTokenBalance(userId: string): Promise<TokenRecord> {
  return ensureRecord(userId);
}

export async function creditTokens(userId: string, packageId: string): Promise<TokenRecord> {
  const db = requireSql();
  const pkg = TOKEN_PACKAGES[packageId];
  if (!pkg) return ensureRecord(userId);

  // Make sure the row exists before the atomic update.
  await ensureRecord(userId);

  if (pkg.tokens === -1) {
    // Unlimited subscription — set flag + extend the window by 30 days from
    // now (or from the existing expiry if it's still in the future, so
    // renewals stack cleanly). Also flips tier to premium and status to
    // active — the fresh subscription erases a prior cancel_scheduled state.
    const rows = await db<Row[]>`
      UPDATE draft_tokens
      SET is_unlimited = TRUE,
          unlimited_until = GREATEST(
            COALESCE(unlimited_until, NOW()),
            NOW()
          ) + INTERVAL '30 days',
          tier = 'premium',
          subscription_status = 'active',
          updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING ${db.unsafe(ROW_COLUMNS)}
    `;
    return normalize(rows[0]);
  }

  // Bundle purchase — credit tokens, bump tier to standard if still free.
  const rows = await db<Row[]>`
    UPDATE draft_tokens
    SET balance = balance + ${pkg.tokens},
        total_purchased = total_purchased + ${pkg.tokens},
        tier = CASE WHEN tier = 'free' THEN 'standard' ELSE tier END,
        updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING ${db.unsafe(ROW_COLUMNS)}
  `;
  return normalize(rows[0]);
}

/**
 * Lifecycle: cancel an active unlimited subscription (SHIP-CHECKLIST Gate 4 · Item 22).
 * Per Code_Ang gate rule "downgrade → feature lockout at period end, NOT
 * immediately": we flip subscription_status to 'cancel_scheduled' and leave
 * unlimited_until in place. The lazy expiry in ensureRecord() demotes the
 * account when that date passes.
 */
export async function cancelSubscription(userId: string): Promise<TokenRecord> {
  const db = requireSql();
  await ensureRecord(userId);
  const rows = await db<Row[]>`
    UPDATE draft_tokens
    SET subscription_status = 'cancel_scheduled',
        updated_at = NOW()
    WHERE user_id = ${userId}
      AND is_unlimited = TRUE
      AND subscription_status != 'cancelled'
    RETURNING ${db.unsafe(ROW_COLUMNS)}
  `;
  if (rows.length === 0) {
    // User has no active subscription — idempotent no-op, return current state.
    return ensureRecord(userId);
  }
  return normalize(rows[0]);
}

/**
 * Lifecycle: resume a cancelled-but-not-yet-expired subscription.
 * Flips status back to 'active' as long as the grace window hasn't elapsed.
 */
export async function resumeSubscription(userId: string): Promise<TokenRecord> {
  const db = requireSql();
  await ensureRecord(userId);
  const rows = await db<Row[]>`
    UPDATE draft_tokens
    SET subscription_status = 'active',
        updated_at = NOW()
    WHERE user_id = ${userId}
      AND is_unlimited = TRUE
      AND subscription_status = 'cancel_scheduled'
      AND unlimited_until > NOW()
    RETURNING ${db.unsafe(ROW_COLUMNS)}
  `;
  if (rows.length === 0) {
    return ensureRecord(userId);
  }
  return normalize(rows[0]);
}

export async function deductToken(
  userId: string,
): Promise<{ success: boolean; record: TokenRecord }> {
  const record = await ensureRecord(userId);
  if (record.is_unlimited) return { success: true, record };
  if (record.balance <= 0) return { success: false, record };

  const db = requireSql();
  // Atomic decrement — WHERE balance > 0 guards against a concurrent spend
  // that would drive the balance negative. If the row was spent down between
  // the read above and this update, rows = [] and we fall back to "no credit".
  const rows = await db<Row[]>`
    UPDATE draft_tokens
    SET balance = balance - 1, updated_at = NOW()
    WHERE user_id = ${userId} AND is_unlimited = FALSE AND balance > 0
    RETURNING ${db.unsafe(ROW_COLUMNS)}
  `;
  if (rows.length === 0) {
    return { success: false, record: await ensureRecord(userId) };
  }
  return { success: true, record: normalize(rows[0]) };
}

/** Idempotency-safe webhook credit — records the Stripe session so retries
 * don't double-credit. Returns the updated balance and whether the credit
 * actually happened (false for duplicate). */
export async function creditFromStripeSession(params: {
  sessionId: string;
  userId: string;
  packageId: string;
}): Promise<{ credited: boolean; record: TokenRecord }> {
  const db = requireSql();
  const pkg = TOKEN_PACKAGES[params.packageId];
  if (!pkg) return { credited: false, record: await ensureRecord(params.userId) };

  // Claim the session row atomically. If it was already completed,
  // INSERT fails the UNIQUE, and UPDATE only flips 'created' → 'completed'
  // on first touch.
  await db`
    INSERT INTO stripe_checkout_sessions (session_id, user_id, package_id, status, amount_cents, recurring)
    VALUES (${params.sessionId}, ${params.userId}, ${params.packageId}, 'created', ${pkg.price_cents}, ${pkg.recurring})
    ON CONFLICT (session_id) DO NOTHING
  `;
  const claimed = await db<Array<{ session_id: string }>>`
    UPDATE stripe_checkout_sessions
    SET status = 'completed', completed_at = NOW()
    WHERE session_id = ${params.sessionId} AND status = 'created'
    RETURNING session_id
  `;

  if (claimed.length === 0) {
    // Duplicate webhook delivery — already credited.
    return { credited: false, record: await ensureRecord(params.userId) };
  }

  const record = await creditTokens(params.userId, params.packageId);
  return { credited: true, record };
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
): Promise<{ url: string | null; error?: string; via?: 'stepper' | 'stripe' }> {
  const pkg = TOKEN_PACKAGES[packageId];
  if (!pkg) return { url: null, error: `Unknown package: ${packageId}` };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Stepper-first routing per canonical billing spine ("Stripe→Stepper→
  // Taskade→plug APIs, Stripe NEVER called directly"). Fall back to direct
  // Stripe only when Stepper isn't configured yet — lets the migration land
  // gradually without breaking checkout during the Taskade workflow buildout.
  const { stepperBillingConfigured, createCheckoutViaStepper } = await import('@/lib/billing/stepper-billing');
  if (stepperBillingConfigured()) {
    const stepperRes = await createCheckoutViaStepper({
      userId,
      packageId,
      pkg,
      returnUrl: `${baseUrl}/draft?purchase=success&package=${packageId}`,
    });
    if (stepperRes.url) return { url: stepperRes.url, via: 'stepper' };
    // If Stepper is configured but errored, prefer visible failure over silent
    // fallback — the owner wants traffic on Stepper and a silent fall-through
    // would hide that the Taskade workflow is broken.
    return { url: null, error: stepperRes.error || 'stepper_failed', via: 'stepper' };
  }

  const stripe = await getStripe();
  if (!stripe) {
    return {
      url: null,
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in env.',
    };
  }

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

    // Record the pending session before returning the URL — lets us detect
    // webhook duplicates AND reconcile if the webhook never arrives.
    if (sql) {
      await sql`
        INSERT INTO stripe_checkout_sessions
          (session_id, user_id, package_id, status, amount_cents, recurring)
        VALUES (${session.id}, ${userId}, ${packageId}, 'created', ${pkg.price_cents}, ${pkg.recurring})
        ON CONFLICT (session_id) DO NOTHING
      `;
    }

    return { url: session.url, via: 'stripe' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe checkout creation failed';
    return { url: null, error: msg, via: 'stripe' };
  }
}
