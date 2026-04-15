import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/smelter-os/fleet
 * --------------------------
 * Owner-only aggregate fleet roster:
 *   - Sqwaadrun: 17 Lil_Hawks + Chicken_Hawk from the gateway
 *   - Boomer_Angs: from the ACHEEVY agent registry (placeholder for now)
 *
 * Returns {sqwaadrun: {hawks[], gateway_healthy}, boomer_angs: [...]}
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedRequest(req);
  if (!auth.ok) return auth.response;
  if (!isOwner(auth.context.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const gatewayUrl = (process.env.SQWAADRUN_GATEWAY_URL || '').replace(/\/$/, '');
  const gatewayKey = process.env.SQWAADRUN_API_KEY || '';

  // ── Sqwaadrun fleet ──
  let sqwaadrunRoster: Record<string, unknown> | null = null;
  let gatewayHealthy = false;

  if (gatewayUrl) {
    const headers: Record<string, string> = {};
    if (gatewayKey) headers.Authorization = `Bearer ${gatewayKey}`;

    try {
      const health = await fetch(`${gatewayUrl}/health`, {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      gatewayHealthy = health.ok;
    } catch {
      gatewayHealthy = false;
    }

    if (gatewayHealthy) {
      try {
        const res = await fetch(`${gatewayUrl}/roster`, {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          sqwaadrunRoster = await res.json();
        }
      } catch {
        /* gateway unreachable */
      }
    }
  }

  // ── Boomer_Angs + command tier (curated list) ──
  // Pulled from the character canon and agent registry. When an
  // agents table lands in Neon, swap to a real query.
  const boomerAngs = [
    { callsign: 'General_Ang', role: 'Sqwaadrun supervisor', status: 'active' },
    { callsign: 'Scout_Ang', role: 'Institutional sourcing', status: 'active' },
    { callsign: 'Content_Ang', role: 'Writing + editorial', status: 'active' },
    { callsign: 'Analytics_Ang', role: 'KPI + measurement', status: 'active' },
    { callsign: 'Edu_Ang', role: 'Enrollment + commissions', status: 'active' },
    { callsign: 'Biz_Ang', role: 'Client growth', status: 'active' },
    { callsign: 'Ops_Ang', role: 'Reporting + uptime', status: 'active' },
    { callsign: 'Iller_Ang', role: 'Creative direction', status: 'active' },
  ];

  const commandTier = [
    { callsign: 'ACHEEVY', role: 'AI operations manager', status: 'active' },
    { callsign: 'Chicken_Hawk', role: 'Sqwaadrun dispatcher (2IC/COO)', status: gatewayHealthy ? 'active' : 'standby' },
  ];

  return NextResponse.json({
    command: commandTier,
    boomer_angs: boomerAngs,
    sqwaadrun: {
      gateway_url: gatewayUrl || null,
      gateway_healthy: gatewayHealthy,
      roster: sqwaadrunRoster,
    },
  });
}
