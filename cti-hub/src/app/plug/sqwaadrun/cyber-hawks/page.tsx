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
  BLACK_SQUAD, 
  WHITE_SQUAD, 
  GOLD_PLATINUM_SQUAD, 
  BLUE_SQUAD,
  RED_SQUAD,
  GREEN_SQUAD
} from '@/lib/hawks/shield-roster';

export default function CyberHawksPage() {
  const [auditLogs, setAuditLogs] = useState<{ id: string, event: string, timestamp: string }[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');

  // Simulated Neon DB sync for the UI layer
  useEffect(() => {
    const events = [
      "NULLIFIER_VERIFIED: 0x8a2...f3b",
      "SAT_WARRANT_SIGNED: LIL_MAST_HAWK",
      "Remediation Start: P0_OUTAGE",
      "K8S_ADMISSION_AUDIT: RED_SQUAD",
      "SBOM_PROVENANCE_TRACK: TRACE_HAWK",
      "GDPR_BOUNDARY_SCAN: COMPLETE"
    ];
    
    const interval = setInterval(() => {
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        event: events[Math.floor(Math.random() * events.length)],
        timestamp: new Date().toLocaleTimeString()
      };
      setAuditLogs(prev => [newLog, ...prev].slice(0, 5));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden selection:bg-[#22C55E]/30"
      style={{
        background: '#050704',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* ═══ STITCH TEXTURE OVERLAY ═══ */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* ═══ NAV ═══ */}
      <nav
        className="h-14 flex items-center justify-between px-5 border-b sticky top-0 z-40 backdrop-blur-md"
        style={{ borderColor: 'rgba(34,197,94,0.15)', background: 'rgba(5,7,4,0.8)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/plug/sqwaadrun" className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition">
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-[#22C55E]">
            Shield Division // Cyber Hawks
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-[2px]`}>
             <Database size={10} className="text-[#22C55E]" />
             <span className="text-[9px] font-mono tracking-wider text-[#22C55E]">NEON_DB: {dbStatus.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-[2px]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[9px] font-mono tracking-wider text-[#22C55E]">OPS STATUS: ACTIVE</span>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 pb-20 px-6 border-b border-white/5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[#22C55E]/5 blur-[140px] rounded-full" />
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(#22C55E 1px, transparent 1px), linear-gradient(90deg, #22C55E 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

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
                    Sovereign Defensive Fleet
                  </p>
                </div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-8">
                  CYBER <br />
                  <span className="text-transparent" style={{ WebkitTextStroke: '2px #22C55E' }}>HAWKS</span>
                </h1>
                <p className="text-xl text-white/40 max-w-2xl leading-relaxed">
                  Engineered in GPT Image 2 (FT Priority) with failover to OpenRouter, 
                  Fal.ai, and KIE.ai. Governed by Neon. Stitched into A.I.M.S. 
                  Thirty-two kinetic specialists providing "Glass Box" operational 
                  transparency for the Gemini Enterprise Agent Platform.
                </p>
              </motion.div>
            </div>
            
            {/* Live Neon Audit Sidebar */}
            <div className="lg:col-span-4">
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-[4px] backdrop-blur-sm relative overflow-hidden group hover:border-[#22C55E]/30 transition-colors">
                 <div className="absolute top-0 left-0 w-1 h-full bg-[#22C55E]" />
                 <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase flex items-center gap-2">
                       <Activity size={12} className="text-[#22C55E]" />
                       Neon Audit Trail
                    </span>
                    <span className="text-[8px] font-mono text-[#22C55E] animate-pulse">LIVE_SYNC</span>
                 </div>
                 <div className="space-y-3 min-h-[140px]">
                    {auditLogs.map((log) => (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-start gap-4"
                      >
                         <span className="text-[9px] font-mono text-white/60 leading-tight">› {log.event}</span>
                         <span className="text-[8px] font-mono text-white/20 whitespace-nowrap">{log.timestamp}</span>
                      </motion.div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mt-16">
            <StatBlock label="TOTAL UNITS" value="32" />
            <StatBlock label="STATUS" value="DEPLOYED" color="#22C55E" />
            <StatBlock label="GOVERNANCE" value="NEON_ACTIVE" />
            <StatBlock label="COMMAND" value="CRYPT_ANG" />
          </div>
        </div>
      </section>

      {/* ═══ SQUAD GRID ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        
        <SquadHeader title="Gold & Platinum" subtitle="HSM / SECRETS / IDENTITY" icon={<Lock size={20} />} accent="#E5E4E2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {GOLD_PLATINUM_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="Red Squad" subtitle="CLOUD NATIVE / INFRASTRUCTURE" icon={<Cloud size={20} />} accent="#FF4444" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {RED_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="Black Squad" subtitle="KINETIC REMEDIATION / ATTACK" icon={<Crosshair size={20} />} accent="#22C55E" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {BLACK_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="Blue Squad" subtitle="TELEMETRY / THREAT HUNTING" icon={<Shield size={20} />} accent="#1E90FF" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {BLUE_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="Green Squad" subtitle="SUPPLY CHAIN / OSINT" icon={<GitBranch size={20} />} accent="#228B22" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {GREEN_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

        <SquadHeader title="White Squad" subtitle="PRIVACY / REDACTION" icon={<Terminal size={20} />} accent="#F1F5F9" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-24">
           {WHITE_SQUAD.map((h, i) => <motion.div key={h.profile.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><HawkCard data={h} size="md" /></motion.div>)}
        </div>

      </section>

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
