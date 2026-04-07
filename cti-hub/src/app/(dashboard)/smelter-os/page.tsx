'use client';

/**
 * /smelter-os — SmelterOS Bridge (owner ops)
 * ==============================================
 * Aggregate operator view of Puter + Fleet + Chronicle + Doctrine.
 * Owner-only per middleware. Lives on cti.foai.cloud (never exposed
 * on deploy.foai.cloud).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface FleetResponse {
  command: Array<{ callsign: string; role: string; status: string }>;
  boomer_angs: Array<{ callsign: string; role: string; status: string }>;
  sqwaadrun: {
    gateway_healthy: boolean;
    roster: {
      total_hawks: number;
      hawks: Array<{ name: string; status: string; tasks_completed: number }>;
    } | null;
  };
}

interface DoctrineResponse {
  stats: {
    total: number;
    completed: number;
    failed: number;
    general_signed: number;
    auto_dispatched: number;
    trcc_auto: number;
  };
  returned: number;
}

export default function SmelterOSPage() {
  const { user } = useAuth();
  const [fleet, setFleet] = useState<FleetResponse | null>(null);
  const [doctrine, setDoctrine] = useState<DoctrineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/smelter-os/fleet').then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/smelter-os/doctrine?limit=1').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([f, d]) => {
      setFleet(f);
      setDoctrine(d);
      setLoading(false);
    });
  }, [user]);

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  const hawksOnline = fleet?.sqwaadrun.roster?.hawks.filter((h) => h.status === 'active').length ?? 0;
  const hawksTotal = fleet?.sqwaadrun.roster?.total_hawks ?? 17;
  const gatewayHealthy = fleet?.sqwaadrun.gateway_healthy ?? false;
  const totalAgents = (fleet?.command.length ?? 0) + (fleet?.boomer_angs.length ?? 0) + hawksTotal;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-3"
            style={{ color: '#F5A623' }}
          >
            / OWNER OPS
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
            SmelterOS Bridge
          </h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            Live operator view across file system, fleet, chronicle, and doctrine.
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatTile
            label="GATEWAY"
            value={gatewayHealthy ? 'ARMED' : 'OFFLINE'}
            accent={gatewayHealthy ? '#22D3EE' : '#EF4444'}
            pulse={gatewayHealthy}
          />
          <StatTile
            label="HAWKS"
            value={`${hawksOnline}/${hawksTotal}`}
            accent="#F5A623"
          />
          <StatTile
            label="AGENT TIERS"
            value={String(totalAgents)}
            accent="#F97316"
          />
          <StatTile
            label="MISSIONS"
            value={loading ? '—' : String(doctrine?.stats.total ?? 0)}
            accent="#22D3EE"
          />
        </div>

        {/* Nav tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <NavTile
            href="/smelter-os/files"
            label="FILES"
            title="Puter File Tree"
            description="Browse /smelter-os/ root. Ingots, missions, chronicle, media, agents, doctrine."
            icon="📁"
            accent="#F5A623"
          />
          <NavTile
            href="/smelter-os/fleet"
            label="FLEET"
            title="Agent Roster"
            description="Command tier, Boomer_Angs, and the full 17-Hawk Sqwaadrun with live gateway status."
            icon="🦅"
            accent="#22D3EE"
          />
          <NavTile
            href="/smelter-os/chronicle"
            label="CHRONICLE"
            title="Ledger + Charter"
            description="Internal audit (heartbeats, mission events) and customer-facing activity log."
            icon="📖"
            accent="#F97316"
          />
          <NavTile
            href="/smelter-os/doctrine"
            label="DOCTRINE"
            title="Mission Audit"
            description="General_Ang's full mission journal — who dispatched, what ran, what succeeded, what needed sign-off."
            icon="⚖️"
            accent="#E91E63"
          />
        </div>

        {/* Footer — backend wiring summary */}
        <div
          className="mt-12 pt-6 border-t"
          style={{ borderColor: 'rgba(245,166,35,0.15)' }}
        >
          <div
            className="text-[9px] font-mono tracking-[0.3em] mb-3 opacity-60"
            style={{ color: '#F5A623' }}
          >
            / BACKEND WIRING
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
            <WireStatus
              label="Puter (Smelter OS native)"
              target="/smelter-os/"
              healthy={false}
              detail="Self-hosted container on Hostinger. Primary for missions, ingots, chronicle, doctrine."
            />
            <WireStatus
              label="GCS (scale + CDN)"
              target="foai-sqwaadrun-artifacts, foai-ingots, foai-media, foai-backups"
              healthy={false}
              detail="4 buckets in foai-aims. Write-through secondary. 90-day lifecycle on raw artifacts."
            />
            <WireStatus
              label="Neon (structured)"
              target="sqwaadrun_staging + public.profiles"
              healthy={false}
              detail="Mission logs, athlete enrichment, NIL signals, profile quota state."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatTile({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="p-4 border-2"
      style={{
        borderColor: `${accent}40`,
        background: `${accent}06`,
        borderRadius: '3px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {pulse && (
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        )}
        <div className="text-[9px] font-mono tracking-[0.25em] opacity-60">{label}</div>
      </div>
      <div className="text-2xl font-black" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function NavTile({
  href,
  label,
  title,
  description,
  icon,
  accent,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 border-2 transition hover:scale-[1.01]"
      style={{
        borderColor: `${accent}30`,
        background: `linear-gradient(165deg, ${accent}08, transparent)`,
        borderRadius: '3px',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[9px] font-mono tracking-[0.3em] mb-1"
            style={{ color: accent }}
          >
            {label}
          </div>
          <div className="text-xl font-black mb-1 truncate">{title}</div>
          <div className="text-[11px] leading-snug" style={{ color: '#94A3B8' }}>
            {description}
          </div>
        </div>
        <div className="shrink-0 opacity-40 text-lg">→</div>
      </div>
    </Link>
  );
}

function WireStatus({
  label,
  target,
  healthy,
  detail,
}: {
  label: string;
  target: string;
  healthy: boolean;
  detail: string;
}) {
  return (
    <div
      className="p-3 border"
      style={{
        borderColor: 'rgba(245,166,35,0.15)',
        background: 'rgba(11,18,32,0.4)',
        borderRadius: '2px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: healthy ? '#22D3EE' : '#64748B',
            boxShadow: healthy ? '0 0 6px #22D3EE' : 'none',
          }}
        />
        <div
          className="text-[10px] font-mono tracking-wider font-bold"
          style={{ color: '#F1F5F9' }}
        >
          {label}
        </div>
      </div>
      <div
        className="text-[9px] font-mono opacity-60 mb-1 truncate"
        style={{ color: '#22D3EE' }}
      >
        {target}
      </div>
      <div className="text-[10px] leading-snug" style={{ color: '#64748B' }}>
        {detail}
      </div>
    </div>
  );
}

function OwnerGate() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050810' }}
    >
      <div className="text-center max-w-md px-6">
        <div
          className="text-[10px] font-mono tracking-[0.3em] mb-3"
          style={{ color: '#F5A623' }}
        >
          / OWNER OPS
        </div>
        <h1 className="text-3xl font-black mb-4 text-white">SmelterOS Bridge</h1>
        <p className="text-sm text-white/60 mb-8">
          This surface is owner-only. Sign in with an owner-allowlisted email to access the
          file tree, fleet roster, chronicle, and doctrine audit.
        </p>
        <Link
          href="/auth/login?next=/smelter-os"
          className="inline-block px-6 py-3 font-bold text-sm tracking-wider"
          style={{
            background: '#F5A623',
            color: '#050810',
            borderRadius: '2px',
          }}
        >
          SIGN IN →
        </Link>
      </div>
    </div>
  );
}
