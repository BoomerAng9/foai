'use client';

import Link from 'next/link';
import { ArrowRight, Users, Brain, Shield, Zap, BarChart3, Globe, Mic, CreditCard, Building2, MessageCircle } from 'lucide-react';
import { LiveSandbox } from '@/components/landing/LiveSandbox';
import { VerbSpinner } from '@/components/landing/VerbSpinner';
import { PlugGallery } from '@/components/landing/PlugGallery';
import { PlugChrome } from '@/components/plug/PlugChrome';

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
  { name: 'Voice-First', desc: 'Talk to ACHEEVY. Every response speaks back. Bidirectional real-time voice — just talk.', icon: Mic },
  { name: 'Smart Translate', desc: 'Say what you mean in plain words. We translate it into precise technical specs. Just talk naturally — toggle it on via the + button in chat.', icon: Brain },
  { name: 'NURD Profile Cards', desc: 'Your digital identity across Web 2.0 and 3.0. Customize, mint as NFT, carry everywhere. Coming soon.', icon: CreditCard },
  { name: 'Agent HQ', desc: '16 agents across 12 departments. Watch them work in real time. Click any agent to see their status and capabilities.', icon: Users },
  { name: 'MCP Gateway', desc: 'One URL, every agent. Connect from Cursor, VS Code, Claude Code — your workforce in your IDE.', icon: Zap },
  { name: 'Autonomous Personas', desc: 'Agents run on their own. They research, create, and communicate. You watch. Visitors hire.', icon: Building2 },
];

export default function DeployLanding() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PlugChrome
        title="The Deploy Platform"
        tagline="AI Managed Solutions"
        icon={<Zap className="w-5 h-5" />}
        accentColor="#E8A020"
        backHref="https://foai.cloud/"
        backLabel="Back to FOAI.CLOUD"
        rightSlot={
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-xs text-white/50 hover:text-white transition-colors">Sign In</Link>
            <Link href="/chat" className="h-9 px-5 bg-[#E8A020] text-black text-[10px] font-bold flex items-center gap-1.5">
              GET STARTED <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        }
      />

      {/* Hero — night port aesthetic (#11) */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Night port background image — drops in when /deploy/night-port-hero.jpg exists */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/deploy/night-port-hero.jpg')" }}
          aria-hidden="true"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-[#0A0A0A]/85" aria-hidden="true" />
        {/* Cyan circuit grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} aria-hidden="true" />
        {/* Gold radial glow behind title */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] sm:text-xs tracking-[0.3em] text-white/60 uppercase mb-6">
            What will we <VerbSpinner /> today?
          </p>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Run a <span className="text-[#E8A020] font-black">company</span>.<br />
            Without the <span className="text-[#E8A020] font-black">company</span>.
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

      {/* Sample Plug Gallery */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <PlugGallery />
        </div>
      </section>

      {/* The Differentiator */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-4">The difference</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-6">
            Every AI platform can generate text.<br />
            <span className="font-bold">This one runs like a real <span className="text-[#E8A020] font-black">company</span>.</span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed">
            22 live services. 6 Boomer_Angs. 17 Lil_Hawks in the Sqwaadrun. A Digital CEO that delegates, not generates.
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

      {/* The Workforce — Strategic Tier Boomer_Ang Roster (#13 sunset overlay) */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 border-t border-white/5 overflow-hidden">
        {/* Sunset port patrol background — drops in when /deploy/sunset-port-overlay.jpg exists */}
        <div
          className="absolute inset-0 opacity-[0.12] bg-cover bg-center"
          style={{ backgroundImage: "url('/deploy/sunset-port-overlay.jpg')" }}
          aria-hidden="true"
        />
        {/* Warm sunset gradient overlay — visible even without the image */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3) 0%, rgba(232,160,32,0.2) 40%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-3">Deploy Your Workforce</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              Strategic Tier <span style={{ color: '#E8A020' }}>Boomer_Angs</span>
            </h2>
            <p className="text-sm text-white/40 max-w-2xl mx-auto">
              Seven autonomous agents. Each runs on its own, plans before it acts, and reports every move. Click any agent to see the full capability sheet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {([
              {
                slug: 'q-ang',
                name: 'Q_Ang',
                role: 'Intelligence Analyst',
                persona: 'Methodical, data-driven, always sourcing. Talks like an intelligence analyst. Finds what others miss.',
                price: 97,
                capabilities: ['Web intelligence', 'Opportunity sourcing', 'Competitive research', 'Data intelligence'],
                image: '/agents/scout-ang.png',
              },
              {
                slug: 'content-ang',
                name: 'Content_Ang',
                role: 'Creative Director',
                persona: 'Creative, brand-aware, always on message. Talks like a CMO.',
                price: 127,
                capabilities: ['SEO content', 'Blog posts', 'Landing pages', 'Social media', 'Email campaigns'],
                image: '/agents/content-ang.png',
              },
              {
                slug: 'sales-ang',
                name: 'Sales_Ang',
                role: 'VP of Sales',
                persona: 'Driven, numbers-focused, always closing. ABC mentality.',
                price: 147,
                capabilities: ['Lead qualification', 'Pipeline management', 'Revenue attribution', 'Commission tracking'],
                image: '/agents/edu-ang.png',
              },
              {
                slug: 'biz-ang',
                name: 'Biz_Ang',
                role: 'Growth Strategist',
                persona: 'Big-picture, pipeline-obsessed, relationship builder. Talks like a BD director.',
                price: 97,
                capabilities: ['Pipeline analytics', 'Lead generation', 'Client retention', 'Campaign performance'],
                image: '/agents/biz-ang.png',
              },
              {
                slug: 'ops-ang',
                name: 'Ops_Ang',
                role: 'Operations Chief',
                persona: 'Always watching, never sleeping. Talks like a NOC engineer.',
                price: 197,
                capabilities: ['Fleet monitoring', 'Incident detection', 'Uptime tracking', 'Historical recall'],
                image: '/agents/ops-ang.png',
              },
              {
                slug: 'iller-ang',
                name: 'Iller_Ang',
                role: 'Visual Director',
                persona: "Direct. Visual-first. Doesn't explain — shows. Opinionated about typography, spacing, color.",
                price: 197,
                capabilities: ['Player cards', 'Broadcast graphics', 'Character art', 'NFT assets', 'Merchandise concepts'],
                image: '/agents/iller-ang.png',
              },
              {
                slug: 'cfo-ang',
                name: 'CFO_Ang',
                role: 'Chief Financial Officer',
                persona: 'Every dollar tracked. Every token counted. Receivables, bookkeeping, pricing.',
                price: 147,
                capabilities: ['Budget tracking', 'Cost analysis', 'Revenue optimization', 'Receivables', 'Bookkeeping'],
                image: '/agents/cfo-ang.png',
              },
            ] as const).map(agent => (
              <Link
                key={agent.slug}
                href={`/agents#${agent.slug}`}
                className="group block border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg overflow-hidden hover:border-[#E8A020]/40 hover:bg-white/[0.04] transition-all"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-white/[0.02]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agent.image}
                    alt={agent.name}
                    className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="font-mono text-[11px] font-bold text-[#E8A020]">{agent.name}</p>
                    <p className="text-[10px] text-white/70 font-medium">{agent.role}</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-white/40 leading-relaxed mb-3 line-clamp-2">{agent.persona}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.capabilities.slice(0, 3).map(c => (
                      <span key={c} className="text-[8px] font-mono px-1.5 py-0.5 border border-white/10 text-white/30 rounded">
                        {c}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 text-white/20">
                        +{agent.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between border-t border-white/5 pt-2">
                    <span className="text-lg font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      ${agent.price}
                    </span>
                    <span className="text-[9px] text-white/30 font-mono">/mo</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-white/30 mb-4">
              + 17 Lil_Hawks for tactical execution: web scraping, data processing, content scheduling, and more.
            </p>
            <Link
              href="/agents"
              className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-[#E8A020] hover:text-[#F0B840] transition-colors tracking-wider uppercase"
            >
              VIEW FULL ROSTER <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
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
