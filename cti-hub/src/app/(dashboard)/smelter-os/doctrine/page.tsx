'use client';

/**
 * /smelter-os/doctrine — General_Ang mission audit
 * =====================================================
 * Owner-only aggregate view across ALL missions (all tenants).
 * Surfaces status breakdown, sign-off attribution, tier-by-tier.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface DoctrineEntry {
  mission_id: string;
  mission_type: string;
  intent: string | null;
  target_count: number;
  status: string;
  signed_off_by: string | null;
  primary_domain: string | null;
  results_count: number;
  elapsed_seconds: number;
  throughput_pps: number;
  error: string | null;
  user_id: string | null;
  tier: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DoctrineResponse {
  entries: DoctrineEntry[];
  stats: {
    total: number;
    completed: number;
    failed: number;
    general_signed: number;
    auto_dispatched: number;
    trcc_auto: number;
  };
  returned: number;
  error?: string;
}

export default function DoctrinePage() {
  const { user } = useAuth();
  const [data, setData] = useState<DoctrineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOwner(user.email)) return;
    fetch('/api/smelter-os/doctrine?limit=100')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || !isOwner(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050810' }}>
        <div className="text-[10px] font-mono text-white/50">Owner access required</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#F5A623' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#E91E63' }}>
            / DOCTRINE
          </div>
          <h1 className="text-4xl font-black tracking-tight">Mission Audit</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>
            General_Ang&apos;s full mission journal across every tenant. Owner-only surface —
            customer-facing views are tenant-filtered in <span className="font-mono">/api/sqwaadrun/recent</span>.
          </p>
        </div>

        {loading && <div className="text-[11px] font-mono opacity-50 py-8 text-center">Loading doctrine...</div>}

        {!loading && data?.error && (
          <div
            className="p-4 border text-[11px] font-mono"
            style={{
              borderColor: 'rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.06)',
              color: '#FCA5A5',
              borderRadius: '2px',
            }}
          >
            Neon unavailable: {data.error}
          </div>
        )}

        {!loading && data && !data.error && (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
              <Stat label="TOTAL" value={data.stats.total} accent="#F5A623" />
              <Stat label="COMPLETED" value={data.stats.completed} accent="#22D3EE" />
              <Stat label="FAILED" value={data.stats.failed} accent="#EF4444" />
              <Stat label="GEN SIGNED" value={data.stats.general_signed} accent="#F97316" />
              <Stat label="AUTO" value={data.stats.auto_dispatched} accent="#B2FF59" />
              <Stat label="TRCC" value={data.stats.trcc_auto} accent="#E91E63" />
            </div>

            {data.entries.length === 0 ? (
              <div
                className="p-8 text-center border text-[11px] font-mono"
                style={{
                  borderColor: 'rgba(245,166,35,0.2)',
                  background: 'rgba(11,18,32,0.4)',
                  color: '#94A3B8',
                  borderRadius: '2px',
                }}
              >
                No missions recorded yet. Dispatch one through /sqwaadrun or wait for the TRCC background jobs.
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((e) => (
                  <MissionRow key={e.mission_id} entry={e} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="p-3 border"
      style={{
        borderColor: `${accent}30`,
        background: `${accent}06`,
        borderRadius: '2px',
      }}
    >
      <div className="text-[8px] font-mono tracking-[0.2em] opacity-60">{label}</div>
      <div className="text-xl font-black mt-0.5" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function MissionRow({ entry }: { entry: DoctrineEntry }) {
  const statusColor =
    entry.status === 'completed' ? '#22D3EE' : entry.status === 'failed' ? '#EF4444' : '#F5A623';

  return (
    <div
      className="p-3 border"
      style={{
        borderColor: `${statusColor}25`,
        background: 'rgba(11,18,32,0.5)',
        borderRadius: '2px',
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-mono tracking-wider font-bold"
              style={{ color: '#F5A623' }}
            >
              {entry.mission_id}
            </span>
            <span
              className="text-[9px] font-mono px-2 py-0.5 uppercase"
              style={{
                color: statusColor,
                background: `${statusColor}10`,
                border: `1px solid ${statusColor}40`,
                borderRadius: '2px',
              }}
            >
              {entry.status}
            </span>
            <span
              className="text-[9px] font-mono tracking-wider opacity-70 uppercase"
              style={{ color: '#22D3EE' }}
            >
              {entry.mission_type}
            </span>
            {entry.signed_off_by && (
              <span className="text-[9px] font-mono opacity-50">
                · signed by {entry.signed_off_by}
              </span>
            )}
          </div>
          {entry.intent && (
            <div className="text-[11px] mt-1 italic opacity-80 truncate" style={{ color: '#CBD5E1' }}>
              &ldquo;{entry.intent}&rdquo;
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5 text-[9px] font-mono opacity-60">
            <span>🎯 {entry.target_count} targets</span>
            <span>📦 {entry.results_count} results</span>
            <span>⏱ {entry.elapsed_seconds.toFixed(1)}s</span>
            <span>⚡ {entry.throughput_pps.toFixed(1)} pps</span>
            {entry.primary_domain && <span>🌐 {entry.primary_domain}</span>}
            {entry.tier && <span>💳 {entry.tier}</span>}
          </div>
        </div>
        <div className="text-[9px] font-mono opacity-50 shrink-0">
          {new Date(entry.created_at).toLocaleString()}
        </div>
      </div>
      {entry.error && (
        <div
          className="mt-2 p-2 text-[10px] font-mono border-l-2"
          style={{
            borderColor: '#EF4444',
            background: 'rgba(239,68,68,0.08)',
            color: '#FCA5A5',
          }}
        >
          ERROR: {entry.error}
        </div>
      )}
    </div>
  );
}
