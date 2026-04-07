import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';
import { isOwner } from '@/lib/allowlist';
import {
  SQWAADRUN_TIERS,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';

/**
 * POST /api/sqwaadrun/mission
 * ----------------------------
 * Authenticated mission dispatch. Pre-checks quota, tags the mission
 * with user_id + tier, forwards to the Sqwaadrun gateway, and
 * increments sqwaadrun_missions_used on success.
 *
 * Body:
 *   { intent, targets[], config? }                       — NL intent path
 *   { mission: { type, targets[], config? } }            — typed path
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;

  const rateLimitResponse = applyRateLimit(req, 'sqwaadrun-mission', {
    maxRequests: 30,
    windowMs: 60 * 1000,
    subject: auth.context.user.uid,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!sql) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const userId = auth.context.user.uid;
  const ownerBypass = isOwner(auth.context.user.email);

  // ── Load profile + quota state ──
  const profileRows = await sql`
    SELECT
      sqwaadrun_tier,
      sqwaadrun_status,
      sqwaadrun_monthly_quota,
      sqwaadrun_missions_used
    FROM profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const profile = profileRows[0];

  if (!ownerBypass && (!profile || profile.sqwaadrun_status !== 'active' || !profile.sqwaadrun_tier)) {
    return NextResponse.json(
      {
        error: 'No active Sqwaadrun subscription. Choose a tier at /plug/sqwaadrun#deploy.',
        code: 'no_subscription',
      },
      { status: 402 },
    );
  }

  // Owners get the highest tier implicitly so every mission type unlocks
  const tierId = (ownerBypass
    ? ('enterprise' as SqwaadrunTierId)
    : (profile.sqwaadrun_tier as SqwaadrunTierId));
  const tier = SQWAADRUN_TIERS[tierId] ?? Object.values(SQWAADRUN_TIERS).slice(-1)[0];
  if (!tier) {
    return NextResponse.json({ error: 'Unknown tier' }, { status: 500 });
  }

  const used = Number(profile?.sqwaadrun_missions_used || 0);
  const quota = Number(profile?.sqwaadrun_monthly_quota || 0);
  if (!ownerBypass && used >= quota) {
    return NextResponse.json(
      {
        error: `Monthly quota exhausted (${used}/${quota}). Upgrade at /plug/sqwaadrun#deploy or wait for reset.`,
        code: 'quota_exhausted',
        used,
        quota,
      },
      { status: 429 },
    );
  }

  // ── Parse body ──
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  // Determine mission type (from explicit mission.type or auto-routed via intent)
  let missionType: string;
  let targets: string[] = [];

  if (body.mission && typeof body.mission === 'object') {
    const m = body.mission as { type?: string; targets?: unknown };
    missionType = String(m.type || '').toLowerCase();
    if (Array.isArray(m.targets)) targets = m.targets as string[];
  } else {
    // Intent path — we don't know the exact type until the gateway
    // routes it. Tier-check against the widest reasonable default.
    missionType = 'recon';
    if (Array.isArray(body.targets)) targets = body.targets as string[];
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: 'targets[] required' }, { status: 400 });
  }

  // ── Tier-gate the mission type ──
  if (!ownerBypass && !tier.allowed_mission_types.includes(missionType)) {
    return NextResponse.json(
      {
        error: `Mission type "${missionType}" not available on ${tier.name}. Upgrade to unlock.`,
        code: 'tier_locked',
        required_types: tier.allowed_mission_types,
      },
      { status: 403 },
    );
  }

  // ── Forward to gateway with user attribution ──
  const baseUrl = process.env.SQWAADRUN_GATEWAY_URL || 'http://localhost:7700';
  const apiKey = process.env.SQWAADRUN_API_KEY || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const endpoint = body.mission ? '/mission' : '/scrape';

  // Inject user attribution into config so Chicken_Hawk + the
  // mission_log row can carry who dispatched it
  const enriched = { ...body };
  const existingConfig =
    (body.config as Record<string, unknown>) ||
    ((body.mission as { config?: Record<string, unknown> })?.config) ||
    {};
  const attributedConfig = {
    ...existingConfig,
    user_id: userId,
    user_email: auth.context.user.email,
    tier: tierId,
  };

  if (body.mission) {
    (enriched.mission as Record<string, unknown>).config = attributedConfig;
  } else {
    enriched.config = attributedConfig;
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(enriched),
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
    const result = await res.json();

    // ── Increment quota on successful dispatch (skip for owners) ──
    if (!ownerBypass && res.ok && result.status !== 'failed' && result.status !== 'rejected') {
      try {
        await sql`
          UPDATE profiles
          SET sqwaadrun_missions_used = sqwaadrun_missions_used + 1
          WHERE user_id = ${userId}
        `;
      } catch {
        // non-fatal — the mission ran
      }
    }

    // Owner gets an unlimited-marker payload; tier'd users get real quota
    const quotaPayload = ownerBypass
      ? { used: null, limit: null, remaining: null, unlimited: true }
      : {
          used: used + 1,
          limit: quota,
          remaining: Math.max(0, quota - used - 1),
        };

    return NextResponse.json(
      {
        ...result,
        quota: quotaPayload,
      },
      { status: res.status },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'gateway unreachable' },
      { status: 503 },
    );
  }
}
