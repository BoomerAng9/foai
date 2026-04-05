'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AGENTS, DEPARTMENTS, type AgentProfile } from '@/lib/agents/registry';
import { Rocket, Shield, Zap, ArrowRight, MessageSquare } from 'lucide-react';

// ── Partition agents by tier ──────────────────────────────
const boomerAngs = AGENTS.filter(a => a.tier === 'strategic');
const lilHawks = AGENTS.filter(a => a.tier === 'tactical' || a.tier === 'specialist')
  .filter(a => a.id.startsWith('lil_'));
const commandAgents = AGENTS.filter(a => a.tier === 'command');

function getDeptColor(deptId: string): string {
  return DEPARTMENTS.find(d => d.id === deptId)?.color ?? '#E8A020';
}

// ── Boomer_Ang Card ───────────────────────────────────────
function BoomerCard({ agent }: { agent: AgentProfile }) {
  const deptColor = getDeptColor(agent.department);
  return (
    <div className="bg-[#111] border border-[#222] hover:border-[#E8A020]/40 transition-all flex flex-col">
      {/* Header */}
      <div className="p-5 pb-3 flex items-start gap-4">
        <Image
          src={agent.avatar}
          alt={agent.name}
          width={56}
          height={56}
          className="rounded-full object-contain bg-[#0A0A0A] border border-[#222] shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-sm font-bold text-white tracking-wide">{agent.name}</h3>
          <p className="font-mono text-[11px] mt-0.5" style={{ color: deptColor }}>{agent.role}</p>
          <p className="text-xs text-[#888] mt-1 leading-relaxed">{agent.persona}</p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="px-5 pb-4 flex-1">
        <p className="font-mono text-[10px] text-[#555] uppercase tracking-wider mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map(cap => (
            <span
              key={cap}
              className="font-mono text-[10px] px-2 py-0.5 bg-[#1a1a1a] border border-[#222] text-[#999]"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#222] flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-[#E8A020]">
          ${agent.individualPrice}/mo
        </span>
        <Link
          href={`/billing?hire=${agent.id}&plan=bucket_list`}
          className="font-mono text-[11px] font-bold tracking-wider bg-[#E8A020] text-[#0A0A0A] px-4 py-1.5 hover:bg-[#F0B030] transition-colors"
        >
          DEPLOY
        </Link>
      </div>
    </div>
  );
}

// ── Lil_Hawk Card ─────────────────────────────────────────
function HawkCard({ agent }: { agent: AgentProfile }) {
  const deptColor = getDeptColor(agent.department);
  return (
    <div className="bg-[#111] border border-[#222] hover:border-[#06B6D4]/40 transition-all p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <Image
          src={agent.avatar}
          alt={agent.name}
          width={36}
          height={36}
          className="rounded-full object-contain bg-[#0A0A0A] border border-[#222] shrink-0"
        />
        <div className="min-w-0">
          <h4 className="font-mono text-xs font-bold text-white tracking-wide">{agent.name}</h4>
          <p className="font-mono text-[10px]" style={{ color: deptColor }}>{agent.role}</p>
        </div>
      </div>
      <p className="text-[11px] text-[#777] leading-relaxed mb-3 flex-1">{agent.persona}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {agent.capabilities.slice(0, 3).map(cap => (
          <span
            key={cap}
            className="font-mono text-[9px] px-1.5 py-0.5 bg-[#1a1a1a] border border-[#222] text-[#888]"
          >
            {cap}
          </span>
        ))}
      </div>
      <span className="inline-block font-mono text-[10px] font-bold tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-2 py-1 self-start">
        INCLUDED WITH GROWTH
      </span>
    </div>
  );
}

// ── Command Card ──────────────────────────────────────────
function CommandCard({ agent, note }: { agent: AgentProfile; note: string }) {
  const deptColor = getDeptColor(agent.department);
  return (
    <div className="bg-[#111] border border-[#E8A020]/30 p-5 flex items-start gap-4">
      <Image
        src={agent.avatar}
        alt={agent.name}
        width={48}
        height={48}
        className="rounded-full object-contain bg-[#0A0A0A] border border-[#E8A020]/30 shrink-0"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-mono text-sm font-bold text-white tracking-wide">{agent.name}</h3>
          <Shield className="w-3.5 h-3.5 text-[#E8A020]" />
        </div>
        <p className="font-mono text-[11px]" style={{ color: deptColor }}>{agent.role}</p>
        <p className="text-xs text-[#888] mt-1.5 leading-relaxed">{agent.persona}</p>
        <p className="font-mono text-[10px] text-[#E8A020]/70 mt-2">{note}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function DeployAgentPage() {
  const acheevy = commandAgents.find(a => a.id === 'acheevy')!;
  const chickenHawk = commandAgents.find(a => a.id === 'chicken_hawk')!;

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-16">
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6">
        <div className="relative w-full h-[340px] sm:h-[420px] overflow-hidden" style={{ background: 'linear-gradient(180deg, #0D0D12 0%, #111118 40%, #0A0A0F 100%)' }}>
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(232,160,32,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,32,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          {/* Radial glow behind logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20" style={{
            background: 'radial-gradient(circle, rgba(232,160,32,0.3) 0%, transparent 70%)',
          }} />
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            {/* AIMS logo mark — cropped to hide text */}
            <div className="w-20 h-20 mb-6 overflow-hidden rounded-xl" style={{ filter: 'drop-shadow(0 0 20px rgba(232,160,32,0.4))' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aims-logo-gold.png" alt="" className="w-full h-auto object-cover object-top" style={{ marginTop: '-5%', transform: 'scale(1.15)' }} />
            </div>
            <p className="text-[10px] font-mono tracking-[0.5em] uppercase mb-4" style={{ color: 'rgba(232,160,32,0.5)' }}>
              AI-Managed Solutions
            </p>
            <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
              Deploy Your Workforce
            </h1>
            <p className="text-sm sm:text-base text-[#777] max-w-xl leading-relaxed mb-8">
              Boomer_Angs handle strategy. Lil_Hawks handle execution. You handle the vision.
            </p>
            <div className="flex gap-4">
              <a
                href="/meet/house-of-ang"
                className="font-mono text-xs font-bold tracking-wider bg-[#E8A020] text-[#0A0A0A] px-6 py-2.5 hover:bg-[#F0B030] transition-colors flex items-center gap-2"
              >
                BROWSE THE ROSTER <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/chat"
                className="font-mono text-xs font-bold tracking-wider px-6 py-2.5 transition-colors flex items-center gap-2"
                style={{ border: '1px solid rgba(232,160,32,0.4)', color: '#E8A020' }}
              >
                CHAT WITH ACHEEVY
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOOMER_ANGS ROSTER ───────────────────────── */}
      <section id="roster">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-5 h-5 text-[#E8A020]" />
          <h2 className="font-mono text-lg font-bold text-white tracking-wide">Boomer_Angs</h2>
          <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">Strategic Tier</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boomerAngs.map(agent => (
            <BoomerCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── LIL_HAWKS ROSTER ─────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-5 h-5 text-[#06B6D4]" />
          <h2 className="font-mono text-lg font-bold text-white tracking-wide">Lil_Hawks</h2>
          <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">Tactical &amp; Specialist</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {lilHawks.map(agent => (
            <HawkCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── COMMAND SECTION ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-[#E8A020]" />
          <h2 className="font-mono text-lg font-bold text-[#0A0A0A] dark:text-white tracking-wide">Command</h2>
          <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">Leadership</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CommandCard agent={acheevy} note="Included with every plan" />
          <CommandCard agent={chickenHawk} note="Available with Growth tier" />
        </div>
        <p className="text-sm text-[#888] text-center max-w-lg mx-auto leading-relaxed">
          ACHEEVY delegates. Chicken Hawk dispatches. You just describe what you need.
        </p>
      </section>

      {/* ── CTA SECTION ──────────────────────────────── */}
      <section className="text-center border border-[#222] bg-[#111] py-12 px-6">
        <h2 className="font-mono text-xl sm:text-2xl font-bold text-white mb-3">
          Ready to deploy your workforce?
        </h2>
        <p className="text-sm text-[#888] mb-8 max-w-md mx-auto">
          Pick a plan to unlock the full roster, or talk to ACHEEVY to figure out what you need.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/billing"
            className="font-mono text-xs font-bold tracking-wider bg-[#E8A020] text-[#0A0A0A] px-6 py-2.5 hover:bg-[#F0B030] transition-colors flex items-center gap-2"
          >
            VIEW PLANS <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/chat"
            className="font-mono text-xs font-bold tracking-wider border border-[#333] text-[#999] px-6 py-2.5 hover:border-[#E8A020] hover:text-white transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5" /> TALK TO ACHEEVY
          </Link>
        </div>
      </section>
    </div>
  );
}
