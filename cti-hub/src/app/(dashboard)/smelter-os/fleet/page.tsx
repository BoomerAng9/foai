'use client';

/**
 * /smelter-os/fleet — Aggregate agent roster
 * ==============================================
 * Command tier, Boomer_Angs, and the full 17-Hawk Sqwaadrun in one
 * view. Owner-only. Shows gateway health + per-hawk task counters.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface Agent {
  callsign: string;
  role: string;
  status: string;
}

interface HawkLive {
  name: string;
  status: 'active' | 'standby';
  tasks_completed: number;
  tasks_failed: number;
}

interface FleetResponse {
  command: Agent[];
  boomer_angs: Agent[];
  sqwaadrun: {
    gateway_url: string | null;
    gateway_healthy: boolean;
    roster: {
      total_hawks: number;
      hawks: HawkLive[];
      chicken_hawk: string;
    } | null;
  };
}

export default function FleetPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FleetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOwner(user.email)) return;
    fetch('/api/smelter-os/fleet')
      .then((r) => (r.ok ? r.json() : null))
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
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / FLEET
          </div>
          <h1 className="text-4xl font-black tracking-tight">Agent Roster</h1>
          <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>
            Every agent tier. Live status pulled from the Sqwaadrun gateway when reachable.
          </p>
        </div>

        {loading && <div className="text-[11px] font-mono opacity-50 py-8 text-center">Loading fleet...</div>}

        {!loading && data && (
          <>
            {/* Gateway health strip */}
            <div
              className="p-4 border mb-8 flex items-center justify-between"
              style={{
                borderColor: data.sqwaadrun.gateway_healthy
                  ? 'rgba(34,211,238,0.4)'
                  : 'rgba(239,68,68,0.4)',
                background: data.sqwaadrun.gateway_healthy
                  ? 'rgba(34,211,238,0.05)'
                  : 'rgba(239,68,68,0.05)',
                borderRadius: '2px',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: data.sqwaadrun.gateway_healthy ? '#22D3EE' : '#EF4444',
                    boxShadow: data.sqwaadrun.gateway_healthy ? '0 0 10px #22D3EE' : 'none',
                  }}
                />
                <div>
                  <div className="text-[10px] font-mono tracking-[0.25em] opacity-60">
                    SQWAADRUN GATEWAY
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: data.sqwaadrun.gateway_healthy ? '#22D3EE' : '#EF4444' }}
                  >
                    {data.sqwaadrun.gateway_healthy ? 'ARMED' : 'OFFLINE'}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono opacity-50">
                {data.sqwaadrun.gateway_url || 'no url configured'}
              </div>
            </div>

            {/* Command tier */}
            <FleetSection title="Command Tier" subtitle="ACHEEVY + Chicken_Hawk" accent="#ff5722">
              {data.command.map((a) => (
                <AgentCard key={a.callsign} agent={a} accent="#ff5722" />
              ))}
            </FleetSection>

            {/* Boomer_Angs */}
            <FleetSection title="Boomer_Angs" subtitle="Executive function" accent="#F97316">
              {data.boomer_angs.map((a) => (
                <AgentCard key={a.callsign} agent={a} accent="#F97316" />
              ))}
            </FleetSection>

            {/* Sqwaadrun Lil_Hawks */}
            <FleetSection
              title="Sqwaadrun"
              subtitle={
                data.sqwaadrun.roster
                  ? `${data.sqwaadrun.roster.hawks.filter((h) => h.status === 'active').length}/${data.sqwaadrun.roster.total_hawks} active`
                  : 'gateway offline'
              }
              accent="#22D3EE"
            >
              {data.sqwaadrun.roster ? (
                data.sqwaadrun.roster.hawks.map((h) => (
                  <HawkCard key={h.name} hawk={h} />
                ))
              ) : (
                <div
                  className="col-span-full p-4 text-[11px] font-mono text-center"
                  style={{ color: '#94A3B8' }}
                >
                  Gateway unreachable — deploy the Sqwaadrun VM and set SQWAADRUN_GATEWAY_URL to
                  see the 17-Hawk roster here.
                </div>
              )}
            </FleetSection>
          </>
        )}
      </div>
    </div>
  );
}

function FleetSection({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div
        className="flex items-baseline gap-4 mb-4 pb-3 border-b"
        style={{ borderColor: `${accent}25` }}
      >
        <h2 className="text-2xl font-black">{title}</h2>
        <div className="text-[10px] font-mono tracking-wider" style={{ color: accent }}>
          {subtitle}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function AgentCard({ agent, accent }: { agent: Agent; accent: string }) {
  const isActive = agent.status === 'active';
  return (
    <div
      className="p-3 border"
      style={{
        borderColor: `${accent}30`,
        background: `${accent}06`,
        borderRadius: '2px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: isActive ? accent : '#64748B',
            boxShadow: isActive ? `0 0 6px ${accent}` : 'none',
          }}
        />
        <div className="text-[9px] font-mono tracking-wider uppercase opacity-60">
          {agent.status}
        </div>
      </div>
      <div className="text-sm font-bold" style={{ color: '#F1F5F9' }}>
        {agent.callsign}
      </div>
      <div className="text-[10px] font-mono mt-0.5 opacity-70" style={{ color: accent }}>
        {agent.role}
      </div>
    </div>
  );
}

function HawkCard({ hawk }: { hawk: HawkLive }) {
  const isActive = hawk.status === 'active';
  return (
    <div
      className="p-3 border"
      style={{
        borderColor: isActive ? 'rgba(34,211,238,0.3)' : 'rgba(100,116,139,0.2)',
        background: isActive ? 'rgba(34,211,238,0.05)' : 'rgba(11,18,32,0.4)',
        borderRadius: '2px',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isActive ? '#22D3EE' : '#64748B',
              boxShadow: isActive ? '0 0 6px #22D3EE' : 'none',
            }}
          />
          <div className="text-[9px] font-mono tracking-wider uppercase opacity-60">
            {hawk.status}
          </div>
        </div>
        <div className="text-[9px] font-mono opacity-50">
          {hawk.tasks_completed}✓
          {hawk.tasks_failed > 0 && (
            <span className="ml-1" style={{ color: '#EF4444' }}>
              {hawk.tasks_failed}✗
            </span>
          )}
        </div>
      </div>
      <div className="text-sm font-bold" style={{ color: '#F1F5F9' }}>
        {hawk.name.replace(/_/g, ' ')}
      </div>
    </div>
  );
}
