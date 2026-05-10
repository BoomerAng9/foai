/**
 * Sqwaadrun API key issuance.
 *
 * Called from the Stripe webhook on a successful sqwaadrun checkout.
 * Generates a plaintext key (shown to the customer exactly once via
 * the success-redirect dashboard), stores the HMAC-SHA256 hash, and
 * attempts a best-effort email delivery via SendGrid's v3 HTTP API.
 *
 * Hash pepper is SQWAADRUN_KEY_PEPPER (secret). Keys are prefixed
 * `sqr_live_` so they are recognizable in logs / customer DMs.
 */

import crypto from 'crypto';
import { sql } from '@/lib/insforge';
import {
  SQWAADRUN_TIERS,
  SqwaadrunTierId,
} from '@/lib/billing/plans';

const KEY_PREFIX = 'sqr_live_';
const KEY_BYTES = 32;

export interface IssueKeyInput {
  userId: string;
  userEmail: string;
  tierId: SqwaadrunTierId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  periodStart: string;
  periodEnd: string;
}

export interface IssueKeyResult {
  plaintextKey: string;
  keyPrefix: string;
  rowId: string;
}

function getPepper(): string {
  const pepper = process.env.SQWAADRUN_KEY_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error(
      'SQWAADRUN_KEY_PEPPER must be set to a >=32-char secret value',
    );
  }
  return pepper;
}

export function hashSqwaadrunKey(plaintext: string): string {
  return crypto
    .createHmac('sha256', getPepper())
    .update(plaintext, 'utf8')
    .digest('hex');
}

export function generateSqwaadrunKey(): string {
  const entropy = crypto.randomBytes(KEY_BYTES).toString('hex');
  return `${KEY_PREFIX}${entropy}`;
}

/**
 * Create a new API key row and return the plaintext exactly once.
 * If an active (revoked_at IS NULL) key already exists for this
 * subscription, it is revoked first so each subscription has at
 * most one live key at a time.
 */
export async function issueSqwaadrunKey(
  input: IssueKeyInput,
): Promise<IssueKeyResult> {
  if (!sql) {
    throw new Error('Database unavailable for Sqwaadrun key issuance');
  }

  const tier = SQWAADRUN_TIERS[input.tierId];
  const plaintext = generateSqwaadrunKey();
  const keyHash = hashSqwaadrunKey(plaintext);
  const keyPrefix = plaintext.slice(0, 12);

  // Revoke any existing live keys for this subscription
  if (input.stripeSubscriptionId) {
    await sql`
      UPDATE sqwaadrun_api_keys
      SET revoked_at = NOW()
      WHERE stripe_subscription_id = ${input.stripeSubscriptionId}
        AND revoked_at IS NULL
    `;
  }

  const rows = await sql<{ id: string }[]>`
    INSERT INTO sqwaadrun_api_keys (
      user_id, key_hash, key_prefix, tier,
      stripe_customer_id, stripe_subscription_id,
      monthly_quota, period_start, period_end
    ) VALUES (
      ${input.userId}, ${keyHash}, ${keyPrefix}, ${input.tierId},
      ${input.stripeCustomerId}, ${input.stripeSubscriptionId},
      ${tier.monthly_missions}, ${input.periodStart}, ${input.periodEnd}
    )
    RETURNING id
  `;

  return {
    plaintextKey: plaintext,
    keyPrefix,
    rowId: rows[0]?.id ?? '',
  };
}

/**
 * Best-effort SendGrid delivery of the plaintext key. Returns true on
 * accepted (202), false on skip or failure. Never throws — webhook
 * idempotency matters more than email success. The dashboard is the
 * canonical delivery surface; email is a convenience copy.
 */
export async function emailSqwaadrunKey(
  toEmail: string,
  plaintextKey: string,
  tierName: string,
): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL ?? 'ops@achievemor.io';

  if (!apiKey) {
    return false;
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail }],
        subject: `Your Sqwaadrun API key — ${tierName}`,
      },
    ],
    from: { email: fromEmail, name: 'Sqwaadrun' },
    content: [
      {
        type: 'text/plain',
        value: [
          `Welcome to Sqwaadrun ${tierName}.`,
          '',
          'Your API key:',
          plaintextKey,
          '',
          'Keep it safe — it will not be shown again outside your dashboard.',
          'Gateway: https://sqwaadrun.foai.cloud',
          '',
          'Send:  Authorization: Bearer <key>  with every request.',
          '',
          'Dashboard: https://deploy.foai.cloud/hawks/dashboard',
          '',
          'No Job Too Big or Too Small.',
        ].join('\n'),
      },
    ],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.status === 202;
  } catch {
    return false;
  }
}
