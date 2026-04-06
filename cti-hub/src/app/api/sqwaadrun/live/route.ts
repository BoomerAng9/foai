import { NextResponse } from 'next/server';

/**
 * GET /api/sqwaadrun/live
 * Proxies to the Sqwaadrun gateway for live roster + health.
 * Env: SQWAADRUN_GATEWAY_URL (default http://localhost:7700)
 *      SQWAADRUN_API_KEY     (optional)
 */
export async function GET() {
  const baseUrl = process.env.SQWAADRUN_GATEWAY_URL || 'http://localhost:7700';
  const apiKey = process.env.SQWAADRUN_API_KEY || '';
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const healthRes = await fetch(`${baseUrl}/health`, {
      headers,
      cache: 'no-store',
    });
    if (!healthRes.ok) {
      return NextResponse.json({ healthy: false, roster: null });
    }

    const rosterRes = await fetch(`${baseUrl}/roster`, {
      headers,
      cache: 'no-store',
    });
    const roster = rosterRes.ok ? await rosterRes.json() : null;

    return NextResponse.json({ healthy: true, roster });
  } catch {
    return NextResponse.json({ healthy: false, roster: null });
  }
}
