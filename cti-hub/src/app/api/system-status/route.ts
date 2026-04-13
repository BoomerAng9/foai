import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

type Status = 'online' | 'offline' | 'degraded' | 'configured' | 'unconfigured';

interface ComponentStatus {
  id: string;
  status: Status;
  latency?: number;
}

async function probe(url: string, timeout = 5000): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeout) });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

function envConfigured(...keys: string[]): boolean {
  return keys.some(k => !!process.env[k]);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Run health probes in parallel
  const [neonOk, grokOk, elevenOk] = await Promise.all([
    probe(process.env.DATABASE_URL ? 'https://console.neon.tech' : '', 3000),
    probe('https://api.x.ai/v1/models', 3000),
    probe('https://api.elevenlabs.io/v1/voices', 3000),
  ]);

  // Query real DB metrics if available
  let dbMetrics: { users: number; conversations: number; plugRuns: number; lastActivity: string | null } | null = null;
  if (sql) {
    try {
      const [users, convos, runs, activity] = await Promise.all([
        sql`SELECT count(*)::int AS c FROM profiles`.then(r => r[0]?.c ?? 0).catch(() => 0),
        sql`SELECT count(*)::int AS c FROM conversations`.then(r => r[0]?.c ?? 0).catch(() => 0),
        sql`SELECT count(*)::int AS c FROM plug_runs`.then(r => r[0]?.c ?? 0).catch(() => 0),
        sql`SELECT max(created_at) AS t FROM conversations`.then(r => r[0]?.t ?? null).catch(() => null),
      ]);
      dbMetrics = { users, conversations: convos, plugRuns: runs, lastActivity: activity };
    } catch { /* DB query failed — continue with probe-only data */ }
  }

  const statuses: ComponentStatus[] = [
    // Agents — always online if the server is running
    { id: 'acheevy', status: 'online' },
    { id: 'chicken_hawk', status: 'online' },
    { id: 'consult_ang', status: 'online' },
    { id: 'note_ang', status: 'online' },
    { id: 'tps_report_ang', status: 'online' },
    { id: 'betty_anne_ang', status: 'online' },
    { id: 'iller_ang', status: 'online' },

    // BYOK keys — check if env vars are set
    { id: 'key_elevenlabs', status: envConfigured('ELEVENLABS_API_KEY', 'XI_API_KEY') ? 'configured' : 'unconfigured' },
    { id: 'key_deepgram', status: envConfigured('DEEPGRAM_API_KEY') ? 'configured' : 'unconfigured' },
    { id: 'key_openai', status: envConfigured('OPENAI_API_KEY') ? 'configured' : 'unconfigured' },

    // Voice
    { id: 'voice_engine', status: grokOk.ok ? 'online' : 'degraded', latency: grokOk.ms },
    { id: 'stt_engine', status: envConfigured('DEEPGRAM_API_KEY') ? 'online' : 'unconfigured' },

    // Integrations
    { id: 'stripe', status: envConfigured('STRIPE_SECRET_KEY') ? 'configured' : 'unconfigured' },
    { id: 'github', status: envConfigured('GITHUB_TOKEN') ? 'configured' : 'unconfigured' },
    { id: 'neon', status: dbMetrics ? 'online' : envConfigured('DATABASE_URL') ? 'degraded' : 'offline', latency: neonOk.ms },
    { id: 'firebase', status: envConfigured('NEXT_PUBLIC_FIREBASE_API_KEY') ? 'online' : 'offline' },

    // Grammar
    { id: 'grammar_toggle', status: 'online' },
  ];

  const onlineCount = statuses.filter(s => s.status === 'online' || s.status === 'configured').length;
  const totalMonitored = statuses.length;
  const systemHealth = onlineCount === totalMonitored ? 'optimal'
    : onlineCount > totalMonitored * 0.8 ? 'degraded'
    : 'critical';

  return NextResponse.json({
    statuses,
    systemHealth,
    onlineCount,
    totalMonitored,
    dbMetrics,
    timestamp: new Date().toISOString(),
  });
}
