'use client';

/**
 * Customer Sqwaadrun Dashboard
 * ==============================
 * Authenticated view at /sqwaadrun on deploy.foai.cloud. Shows the
 * customer's current Sqwaadrun tier, mission quota usage, recent
 * missions, and a deploy CTA gated by their tier's allowed mission
 * types.
 *
 * Pulls live data from:
 *   - /api/profile               → tier + quota columns
 *   - /api/sqwaadrun/live        → fleet roster + health
 *   - /api/sqwaadrun/recent      → last N missions for this user
 */

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SQWAADRUN_TIERS,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';
import { MissionBuilder } from '@/components/sqwaadrun/MissionBuilder';

interface ProfileSqwaadrunSlice {
  sqwaadrun_tier: SqwaadrunTierId | null;
  sqwaadrun_status: string | null;
  sqwaadrun_monthly_quota: number;
  sqwaadrun_missions_used: number;
  sqwaadrun_period_end: string | null;
}

interface RecentMission {
  mission_id: string;
  mission_type: string;
  status: string;
  primary_domain: string | null;
  results_count: number;
  throughput_pps: number;
  created_at: string;
  error: string | null;
}

interface LiveRoster {
  total_hawks: number;
  hawks: Array<{ name: string; status: 'active' | 'standby'; tasks_completed: number }>;
}

function SqwaadrunDashboardPageInner() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [recent, setRecent] = useState<RecentMission[] | null>(null);
  const [live, setLive] = useState<LiveRoster | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const liveAbortRef = useRef<AbortController | null>(null);

  const slice: ProfileSqwaadrunSlice = useMemo(() => {
    const p = (profile || {}) as Record<string, unknown>;
    return {
      sqwaadrun_tier: (p.sqwaadrun_tier as SqwaadrunTierId | null) || null,
      sqwaadrun_status: (p.sqwaadrun_status as string | null) || null,
      sqwaadrun_monthly_quota: Number(p.sqwaadrun_monthly_quota || 0),
      sqwaadrun_missions_used: Number(p.sqwaadrun_missions_used || 0),
      sqwaadrun_period_end: (p.sqwaadrun_period_end as string | null) || null,
    };
  }, [profile]);

  // Owner detection via server-side /api/me — no email leak to client
  const [isOwnerUser, setIsOwnerUser] = useState(false);
  useEffect(() => {
    if (!user) return;
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.isOwner) setIsOwnerUser(true); })
      .catch(() => {});
  }, [user]);
  const dbTier = slice.sqwaadrun_tier ? SQWAADRUN_TIERS[slice.sqwaadrun_tier] : null;
  // Owners always active — bypass ALL tier checks with unlimited Commander-level access
  const isActive = isOwnerUser || (slice.sqwaadrun_status === 'active' && dbTier !== null);
  const tier = dbTier || (isOwnerUser ? { id: 'sqwaadrun_commander' as const, name: 'Commander (Owner)', tagline: 'Unlimited', price_monthly: 0, monthly_missions: -1, allowed_mission_types: ['recon', 'sweep', 'deep_scan', 'monitor', 'custom'], hawks_unlocked: 17, features: ['*'], color: '#E8A020' } : null);

  const refresh = useCallback(async (): Promise<RecentMission[]> => {
    if (!user) return [];

    // Cancel any in-flight refresh
    liveAbortRef.current?.abort();
    const controller = new AbortController();
    liveAbortRef.current = controller;

    const [liveData, recentData] = await Promise.all([
      fetch('/api/sqwaadrun/live', { signal: controller.signal })
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/sqwaadrun/recent', { signal: controller.signal })
        .then((r) => r.json())
        .catch(() => ({ missions: [] })),
    ]);

    if (controller.signal.aborted) return [];
    const missions = (recentData?.missions ?? []) as RecentMission[];
    setHealthy(liveData?.healthy ?? false);
    setLive(liveData?.roster ?? null);
    setRecent(missions);
    setLoading(false);
    return missions;
  }, [user]);

  useEffect(() => {
    refresh();
    return () => {
      liveAbortRef.current?.abort();
    };
  }, [refresh]);

  // ── Profile refresh after Stripe success ──
  // The webhook updates profile.sqwaadrun_* server-side, but the
  // in-memory profile from the Firebase listener is stale. Force a
  // hard reload to a clean URL so the profile gets re-fetched fresh.
  // Sessionstorage flag prevents reload loops.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (searchParams?.get('success') !== 'true') return;
    if (sessionStorage.getItem('sqwaadrun_post_checkout_reload') === '1') return;
    sessionStorage.setItem('sqwaadrun_post_checkout_reload', '1');
    window.location.replace('/sqwaadrun');
  }, [searchParams]);

  // Clear the reload flag once the page has rendered with fresh data
  useEffect(() => {
    if (typeof window !== 'undefined' && profile) {
      sessionStorage.removeItem('sqwaadrun_post_checkout_reload');
    }
  }, [profile]);

  // ── Poll-until-found for new mission after dispatch ──
  // Replaces the old setTimeout(refresh, 500) race. Polls /recent
  // up to 5 times until the new mission_id appears in the freshly
  // returned data (NOT the closure-captured state, which would be
  // stale and never match).
  const waitForMission = useCallback(
    async (missionId: string) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const missions = await refresh();
        if (missions.some((m) => m.mission_id === missionId)) return;
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
    [refresh],
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] font-mono tracking-[0.3em] opacity-60 mb-4" style={{ color: '#F5A623' }}>
            AUTHENTICATION REQUIRED
          </p>
          <Link href="/auth/login?next=/sqwaadrun" className="px-6 py-3 bg-[#F5A623] text-[#050810] font-bold text-sm">
            SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] mb-3" style={{ color: '#F5A623' }}>
              / SQWAADRUN COMMAND
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
              Hawk Bay
            </h1>
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              {user.email} · your fleet status, quota, and recent missions
            </p>
          </div>

          {isActive && (
            <button
              onClick={() => setBuilderOpen(true)}
              className="px-6 py-3 text-[11px] font-mono tracking-[0.15em] font-bold flex items-center gap-2 shrink-0"
              style={{
                background: '#F5A623',
                color: '#050810',
                borderRadius: '2px',
                boxShadow: '0 0 24px rgba(245,166,35,0.25)',
              }}
            >
              ⚡ DISPATCH MISSION
            </button>
          )}
        </div>

        <MissionBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          tierId={slice.sqwaadrun_tier}
          onComplete={(result) => {
            if (result.mission_id) {
              waitForMission(result.mission_id).catch(() => {
                refresh();
              });
            } else {
              refresh();
            }
          }}
        />

        {/* Inactive state */}
        {!isActive && (
          <div
            className="border-2 p-8 mb-8"
            style={{
              borderColor: 'rgba(245,166,35,0.4)',
              background: 'rgba(245,166,35,0.05)',
              borderRadius: '3px',
            }}
          >
            <div className="text-[10px] font-mono tracking-[0.25em] mb-2" style={{ color: '#F5A623' }}>
              NO ACTIVE TIER
            </div>
            <h2 className="text-2xl font-black mb-3">The Sqwaadrun is grounded.</h2>
            <p className="text-sm mb-6 max-w-2xl" style={{ color: '#94A3B8' }}>
              You do not have an active Sqwaadrun subscription. Pick a tier on the
              landing page to deploy the fleet for missions.
            </p>
            <Link
              href="/plug/sqwaadrun#deploy"
              className="inline-block px-6 py-3 font-bold text-[11px] tracking-[0.15em]"
              style={{ background: '#F5A623', color: '#050810', borderRadius: '2px' }}
            >
              CHOOSE A TIER →
            </Link>
          </div>
        )}

        {/* Active dashboard */}
        {isActive && tier && (
          <>
            {/* Quota strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Stat label="ACTIVE TIER" value={tier.name} accent={tier.color} />
              <Stat
                label="MISSIONS USED"
                value={`${slice.sqwaadrun_missions_used.toLocaleString()} / ${slice.sqwaadrun_monthly_quota.toLocaleString()}`}
                accent="#22D3EE"
              />
              <Stat
                label="QUOTA RESETS"
                value={
                  slice.sqwaadrun_period_end
                    ? new Date(slice.sqwaadrun_period_end).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'
                }
                accent="#F97316"
              />
              <Stat
                label="HAWKS UNLOCKED"
                value={`${tier.hawks_unlocked} / 17`}
                accent="#F5A623"
              />
            </div>

            {/* Quota bar */}
            <div className="mb-10">
              <div className="text-[9px] font-mono tracking-[0.25em] mb-2 opacity-60">QUOTA USAGE</div>
              <div
                className="h-3 w-full overflow-hidden border"
                style={{ borderColor: 'rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.06)' }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (slice.sqwaadrun_missions_used / Math.max(1, slice.sqwaadrun_monthly_quota)) * 100)}%`,
                    background: 'linear-gradient(90deg, #F5A623, #F97316)',
                    boxShadow: '0 0 12px rgba(245,166,35,0.4)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-mono opacity-60">
                <span>0</span>
                <span>{slice.sqwaadrun_monthly_quota.toLocaleString()}</span>
              </div>
            </div>

            {/* Mission types unlocked */}
            <div className="mb-10">
              <div className="text-[9px] font-mono tracking-[0.25em] mb-3 opacity-60">
                MISSION TYPES UNLOCKED ON {tier.name.toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['recon', 'survey', 'harvest', 'patrol', 'intercept', 'sweep', 'batch_ops'] as const).map((m) => {
                  const allowed = tier.allowed_mission_types.includes(m);
                  return (
                    <span
                      key={m}
                      className="text-[10px] font-mono tracking-wider px-3 py-1.5 uppercase border"
                      style={{
                        borderColor: allowed ? '#22D3EE' : 'rgba(255,255,255,0.1)',
                        background: allowed ? 'rgba(34,211,238,0.06)' : 'transparent',
                        color: allowed ? '#22D3EE' : 'rgba(255,255,255,0.25)',
                        textDecoration: allowed ? 'none' : 'line-through',
                        borderRadius: '2px',
                      }}
                    >
                      {m.replace('_', ' ')}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Recent missions + fleet status side by side */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
              {/* Recent missions */}
              <div
                className="border p-5"
                style={{
                  borderColor: 'rgba(245,166,35,0.2)',
                  background: 'rgba(245,166,35,0.03)',
                  borderRadius: '3px',
                }}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <div className="text-[9px] font-mono tracking-[0.25em]" style={{ color: '#F5A623' }}>
                    RECENT MISSIONS
                  </div>
                  <Link href="/chat" className="text-[10px] font-mono opacity-60 hover:opacity-100">
                    NEW MISSION →
                  </Link>
                </div>

                {loading && (
                  <div className="text-[10px] font-mono opacity-50 py-8 text-center">Loading missions...</div>
                )}

                {!loading && recent && recent.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-[10px] font-mono opacity-50 mb-3">No missions yet.</div>
                    <Link
                      href="/chat"
                      className="inline-block px-4 py-2 text-[10px] font-mono tracking-wider"
                      style={{
                        border: '1px solid #F5A623',
                        color: '#F5A623',
                        borderRadius: '2px',
                      }}
                    >
                      DEPLOY THE SQWAAD
                    </Link>
                  </div>
                )}

                {!loading && recent && recent.length > 0 && (
                  <div className="space-y-2">
                    {recent.slice(0, 8).map((m) => (
                      <Link
                        key={m.mission_id}
                        href={`/sqwaadrun/missions/${encodeURIComponent(m.mission_id)}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 border-l-2 hover:bg-white/[0.04] transition"
                        style={{
                          borderLeftColor:
                            m.status === 'completed' ? '#22D3EE' : m.status === 'failed' ? '#EF4444' : '#F5A623',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono truncate" style={{ color: '#F5A623' }}>
                            {m.mission_id}
                          </div>
                          <div className="text-[9px] font-mono opacity-50 mt-0.5">
                            {m.mission_type.toUpperCase()} · {m.primary_domain || '—'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono" style={{ color: '#22D3EE' }}>
                            {m.results_count} results
                          </div>
                          <div className="text-[9px] font-mono opacity-50">
                            {m.throughput_pps?.toFixed(1) || '—'} pps
                          </div>
                        </div>
                        <div className="text-[12px] opacity-40 shrink-0 ml-1">→</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Fleet status */}
              <div
                className="border p-5"
                style={{
                  borderColor: 'rgba(34,211,238,0.2)',
                  background: 'rgba(34,211,238,0.03)',
                  borderRadius: '3px',
                }}
              >
                <div className="text-[9px] font-mono tracking-[0.25em] mb-4" style={{ color: '#22D3EE' }}>
                  FLEET STATUS
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: healthy ? '#22D3EE' : '#EF4444',
                      boxShadow: healthy ? '0 0 8px #22D3EE' : 'none',
                    }}
                  />
                  <span className="text-[10px] font-mono uppercase">
                    {healthy === null ? 'pinging...' : healthy ? 'gateway online' : 'gateway offline'}
                  </span>
                </div>

                {live && (
                  <>
                    <div className="text-2xl font-black mb-1" style={{ color: '#F5A623' }}>
                      {live.hawks.filter((h) => h.status === 'active').length}/{live.total_hawks}
                    </div>
                    <div className="text-[9px] font-mono opacity-60 mb-4">HAWKS ACTIVE</div>

                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {live.hawks.map((h) => (
                        <div key={h.name} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="opacity-80 truncate">{h.name.replace(/_/g, ' ')}</span>
                          <span
                            className="opacity-60 shrink-0 ml-2"
                            style={{ color: h.status === 'active' ? '#22D3EE' : '#64748B' }}
                          >
                            {h.tasks_completed}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Manage subscription */}
            <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] font-mono opacity-50">
                Manage subscription, billing history, or cancel
              </div>
              <Link
                href="/billing"
                className="text-[10px] font-mono px-4 py-2 border opacity-60 hover:opacity-100"
                style={{ borderColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }}
              >
                BILLING →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="p-4 border"
      style={{
        borderColor: `${accent}30`,
        background: `${accent}05`,
        borderRadius: '3px',
      }}
    >
      <div className="text-[9px] font-mono tracking-[0.25em] opacity-60 mb-1">{label}</div>
      <div className="text-xl font-black" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Next.js 14/15 requires that any client component using useSearchParams()
 * be wrapped in a Suspense boundary so the page can be statically rendered.
 * The inner component does the work; this default export is the boundary.
 */
export default function SqwaadrunDashboardPage() {
  return (
    <Suspense fallback={null}>
      <SqwaadrunDashboardPageInner />
    </Suspense>
  );
}
