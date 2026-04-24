'use client';

/**
 * /plug/sqwaadrun/cyber-hawks — The Shield Division (Cyber Hawks) deep-dive
 * =========================================================================
 * Cinematic tactical-realistic aesthetic. 32 Hawks (100% Landed).
 * 
 * DESIGN: Stitch Weaving (Retro-futurism, Mr. Robot tension, Lo-fi grit)
 * DATA: Neon DB Integrated (Nullifier tracking & Audit logs)
 * ASSETS: GPT Image 2 (FT Priority) -> OpenRouter -> Fal.ai -> KIE.ai Failover | Recraft V4 (Vector)
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, Shield, Crosshair, Zap, Lock, Terminal, 
  Database, Activity, Eye, ShieldCheck, Cloud, GitBranch 
} from 'lucide-react';
import { HawkCard } from '@/components/hawks/HawkCard';
import { 
  SHIELD_DIVISION 
} from '@/lib/hawks/shield-characters';

export default function CyberHawksPage() {
  const [auditLogs, setAuditLogs] = useState<{ id: string, event: string, timestamp: string }[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');

  // Filter for Cyber squads (Black & Blue)
  const getCyberSquad = (squadName: string) => 
    SHIELD_DIVISION.filter(h => h.squad === squadName).map(p => ({
      profile: { 
        name: p.name,
        callsign: p.name, 
        slug: p.slug, 
        rank: 'specialist', 
        catchphrase: p.personality, 
        avatar: `/hawks/${p.slug}.png`, 
        themeColor: '#22C55E' 
      },
      role: p.role,
      capabilities: [p.unit, p.personality],
      sampleMission: `Deploy for ${p.unit} operations.`
    }));

  // ... (keep effects)

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden selection:bg-[#22C55E]/30"
      style={{
        background: '#050704',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* ... (keep texture and nav) */}

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 pb-20 px-6 border-b border-white/5">
        {/* ... */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/60">
                    Sovereign Tactical Units
                  </p>
                </div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-8">
                  CYBER <br />
                  <span className="text-transparent" style={{ WebkitTextStroke: '2px #22C55E' }}>HAWKS</span>
                </h1>
                <p className="text-xl text-white/40 max-w-2xl leading-relaxed">
                  The Black and Blue squads of the Shield Division. Specialized 
                  in kinetic execution and deep-telemetry defense. 
                  Engineered in GPT Image 2 (FT Priority) with failover to OpenRouter, 
                  Fal.ai, and KIE.ai.
                </p>
              </motion.div>
            </div>
            {/* ... (keep audit logs) */}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mt-16">
            <StatBlock label="TOTAL UNITS" value="12" />
            <StatBlock label="STATUS" value="DEPLOYED" color="#22C55E" />
            <StatBlock label="GOVERNANCE" value="NEON_ACTIVE" />
            <StatBlock label="COMMAND" value="CRYPT_ANG" />
          </div>
        </div>
      </section>

      {/* ═══ SQUAD GRID ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        
        <SquadHeader title="Black Squad" subtitle="KINETIC REMEDIATION / ATTACK" icon={<Crosshair size={20} />} accent="#22C55E" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {getCyberSquad('Black').map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="Blue Squad" subtitle="TELEMETRY / THREAT HUNTING" icon={<Shield size={20} />} accent="#1E90FF" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {getCyberSquad('Blue').map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

      </section>

      {/* ... (keep the rest of the page) */}
    </div>
  );
}

      {/* ═══ ENTERPRISE GOVERNANCE LAYER ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
        <div className="text-center mb-16">
          <p className="font-mono text-[10px] tracking-[0.5em] uppercase mb-4 text-[#22C55E]">
             GOVERNANCE CHECKLIST [VERIFIED]
          </p>
          <h2 className="text-4xl font-black tracking-tight mb-6">Gemini Enterprise Architecture</h2>
          <div className="h-1 w-24 bg-[#22C55E] mx-auto mb-8" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GovBox title="Agent Gateway" desc="Secure authentication entry points." />
          <GovBox title="Agent Identity" desc="Cryptographic proof & SAT co-signing." />
          <GovBox title="Agent Registry" desc="Centralized unit tracking & status." />
          <GovBox title="Anomaly Detection" desc="Real-time behavioral monitoring." />
          <GovBox title="Model Armor" desc="Shielding against prompt injection." />
          <GovBox title="Agent Policy" desc="Formal verification of boundaries." />
          <GovBox title="Agent Security" desc="Zero-trust kinetic sandboxing." />
          <GovBox title="Agent Compliance" desc="Automated audit trail & compliance." />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-20 border-t border-white/5 text-center bg-black">
        <div className="mb-8 opacity-20 hover:opacity-100 transition-opacity">
           <span className="font-black text-4xl tracking-tighter italic">ACHIEVEMOR</span>
        </div>
        <p className="font-mono text-[10px] tracking-[0.4em] text-white/20 uppercase">
          SHIELD DIVISION · CYBER HAWKS · NEON_DB INTEGRATED · v3.3.0
        </p>
      </footer>
    </div>
  );
}

function StatBlock({ label, value, color = 'white' }: { label: string, value: string, color?: string }) {
  return (
    <div className="p-4 border border-white/10 bg-white/[0.02] rounded-[2px]">
      <p className="font-mono text-[8px] tracking-widest text-white/40 uppercase mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

function SquadHeader({ title, subtitle, icon, accent }: { title: string, subtitle: string, icon: React.ReactNode, accent: string }) {
  return (
    <div className="flex items-center gap-4 mb-10 pb-4 border-b border-white/5">
       <div className="p-3 bg-white/5 rounded-[2px]" style={{ color: accent }}>{icon}</div>
       <div>
         <h2 className="text-3xl font-black tracking-tighter uppercase">{title}</h2>
         <p className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">{subtitle}</p>
       </div>
    </div>
  );
}

function GovBox({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-6 border border-white/5 bg-white/[0.02] rounded-[2px] hover:border-[#22C55E]/30 transition group">
      <div className="mb-4 text-[#22C55E] group-hover:scale-110 transition-transform"><ShieldCheck size={20} /></div>
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      <p className="text-[11px] text-white/40 leading-relaxed font-mono">{desc}</p>
    </div>
  );
}
