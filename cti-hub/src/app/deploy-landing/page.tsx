'use client';

import Link from 'next/link';
import { ArrowRight, Users, Brain, Shield, Zap, BarChart3, Globe, Mic, CreditCard, Building2, MessageCircle } from 'lucide-react';
import { LiveSandbox } from '@/components/landing/LiveSandbox';

const USE_CASES = [
  {
    title: 'Run Your Business Without Hiring',
    description: 'Deploy ACHEEVY as your Digital CEO with Boomer_Angs handling sales, operations, content, and business development. Every agent plans before it acts, remembers what worked, and improves over time.',
    icon: Building2,
    tag: 'MOST POPULAR',
  },
  {
    title: 'Autonomous Content That Learns',
    description: 'Content_Ang generates SEO content, remembers what topics performed, and stops repeating itself. Plug it into your domain — autonomous content team that gets better every week.',
    icon: Brain,
  },
  {
    title: 'Lead-to-Close Pipeline on Autopilot',
    description: 'Scout_Ang finds opportunities. Biz_Ang tracks your pipeline. Edu_Ang closes deals. They share memory — every discovery feeds the funnel. The whole pipeline runs itself.',
    icon: BarChart3,
  },
  {
    title: 'Education Revenue Operations',
    description: 'Enrollment generation through commission tracking with zero human operators. Scout_Ang sources contracts, Edu_Ang handles affiliates, Biz_Ang tracks pipeline — all measured against KPIs.',
    icon: Users,
  },
  {
    title: 'Research That Remembers Everything',
    description: 'Scout_Ang scrapes the web, stores findings in semantic memory, and recalls past research on demand. Ask naturally — get cross-validated intelligence from your entire research history.',
    icon: Globe,
  },
  {
    title: 'White-Label Workforce for Your Clients',
    description: 'Deploy the entire agent workforce for multiple clients simultaneously. Each gets their own memory, plans, KPIs, and evaluations. Tenant isolation. Stripe billing. Your brand.',
    icon: Shield,
  },
];

const FEATURES = [
  { name: 'Voice-First', desc: 'Talk to ACHEEVY. Every response speaks back. Bidirectional voice with Gemini 3.1 Flash Live.', icon: Mic },
  { name: 'NTNTN Engine', desc: 'Say what you mean in plain words. The NTNTN Engine translates it into precise technical specs. Access it via the + button in chat.', icon: Brain },
  { name: 'NURD Profile Cards', desc: 'Your digital identity across Web 2.0 and 3.0. Customize, mint as NFT, carry everywhere. Coming soon.', icon: CreditCard },
  { name: 'Agent HQ', desc: '16 agents across 12 departments. Watch them work in real time. Click any agent to see their status and capabilities.', icon: Users },
  { name: 'MCP Gateway', desc: 'One URL, every agent. Connect from Cursor, VS Code, Claude Code — your workforce in your IDE.', icon: Zap },
  { name: 'Autonomous Personas', desc: 'Agents run on their own. They research, create, and communicate. You watch. Visitors hire.', icon: Building2 },
];

export default function DeployLanding() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#E8A020] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase">The Deploy Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-xs text-white/50 hover:text-white transition-colors">Sign In</Link>
          <Link href="/chat" className="h-9 px-5 bg-[#E8A020] text-black text-[10px] font-bold flex items-center gap-1.5">
            GET STARTED <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] sm:text-xs tracking-[0.3em] text-[#E8A020] uppercase mb-6">What will we DEPLOY today?</p>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Run a <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>company</span>.<br />
            Without the <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>company</span>.
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto mb-4">
            Not a chatbot. Not an automation tool. A fully governed, self-measuring, memory-driven autonomous workforce that runs your business the way a real organization does.
          </p>

          <p className="text-sm text-white/30 max-w-xl mx-auto mb-10">
            Hierarchy. Planning. Memory. Measurement. Accountability. Every agent knows its role, plans its work, remembers its history, and is evaluated against KPIs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/chat" className="h-12 px-8 bg-[#E8A020] text-black text-sm font-bold flex items-center gap-2 hover:bg-[#D4901A] transition-colors w-full sm:w-auto justify-center">
              Deploy Your Workforce <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/chat" className="h-12 px-8 border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center">
              <MessageCircle className="w-4 h-4" /> Chat w/ ACHEEVY
            </Link>
          </div>
        </div>
      </section>

      {/* Live Sandbox — The Proof */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-2">Live right now</p>
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">
              An autonomous company. <span className="font-bold">Running below.</span>
            </h2>
            <p className="text-xs text-white/30 mt-2 max-w-xl mx-auto">
              These agents are real. They research, generate leads, create content, and communicate — all without human prompting. Click any agent to interact.
            </p>
          </div>
          <LiveSandbox />
        </div>
      </section>

      {/* The Differentiator */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-4">The difference</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-6">
            Every AI platform can generate text.<br />
            <span className="font-bold">This one runs like a real <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>company</span>.</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            22 live services. 6 Boomer_Angs. 11 Lil_Hawks. A Digital CEO that delegates, not generates.
            Agents that plan before they act, remember what worked, and are measured against KPIs —
            the same way a Fortune 500 manages its workforce. The difference is this workforce never sleeps,
            scales infinitely, and improves through semantic memory.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-3 text-center">What you can deploy</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-12 text-center">
            Top use cases — <span className="font-bold">ready now</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map(uc => (
              <div key={uc.title} className="border border-white/10 p-6 hover:border-[#E8A020]/30 transition-colors relative">
                {uc.tag && (
                  <span className="absolute top-3 right-3 font-mono text-[8px] bg-[#E8A020] text-black px-2 py-0.5 font-bold">
                    {uc.tag}
                  </span>
                )}
                <uc.icon className="w-5 h-5 text-[#E8A020] mb-3" />
                <h3 className="font-bold text-sm mb-2">{uc.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-3 text-center">Platform capabilities</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-12 text-center">
            Built different. <span className="font-bold">Ships different.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.name} className="flex items-start gap-3 p-5 border border-white/5 hover:border-white/10 transition-colors">
                <f.icon className="w-4 h-4 text-[#E8A020] mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wider mb-1">{f.name.toUpperCase()}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Workforce */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-3">The workforce</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-8">
            <span className="font-bold">ACHEEVY</span> runs it all.
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { name: 'ACHEEVY', role: 'Digital CEO' },
              { name: 'Chicken Hawk', role: 'Tactical Commander' },
              { name: 'Scout_Ang', role: 'Research' },
              { name: 'Content_Ang', role: 'Content' },
              { name: 'Edu_Ang', role: 'Sales' },
              { name: 'Biz_Ang', role: 'Growth' },
              { name: 'Ops_Ang', role: 'Operations' },
              { name: 'CFO_Ang', role: 'Finance' },
            ].map(a => (
              <div key={a.name} className="border border-white/10 p-3 text-center">
                <p className="font-mono text-[10px] font-bold text-[#E8A020]">{a.name}</p>
                <p className="text-[9px] text-white/30">{a.role}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/30">
            + 11 Lil_Hawks for tactical execution: coding, automation, integrations, 3D, memory, and more.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5 text-center">
        <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-4">
          Your autonomous workforce<br />
          <span className="font-bold">is waiting.</span>
        </h2>
        <p className="text-sm text-white/30 mb-8">$7 gets you in the door. The cost of a mint tea coconut latte.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link href="/chat" className="inline-flex h-12 px-10 bg-[#E8A020] text-black text-sm font-bold items-center gap-2 hover:bg-[#D4901A] transition-colors">
            START DEPLOYING <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/chat" className="inline-flex h-12 px-8 border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/40 transition-colors items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Chat w/ ACHEEVY
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 border-t border-white/5 flex items-center justify-between">
        <span className="font-mono text-[9px] text-white/20 tracking-widest">THE DEPLOY PLATFORM</span>
        <span className="font-mono text-[9px] text-white/20">&copy; 2026</span>
      </footer>
    </div>
  );
}
