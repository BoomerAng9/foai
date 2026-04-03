'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Shield, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      {/* Permanent Marker font loaded via globals.css @font-face */}
      {/* Navigation */}
      <nav className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-surface relative">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-bg" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase">The Deploy Platform</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="btn-bracket">Features</a>
          <a href="#capabilities" className="btn-bracket">Capabilities</a>
          <Link href="/about" className="btn-bracket">About</Link>
          <Link href="/auth/login" className="btn-bracket">Sign In</Link>
          <Link href="/chat" className="btn-solid h-9 text-[10px]">
            START TALKING <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden text-fg-secondary hover:text-fg"
          aria-label="Toggle menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="absolute top-14 left-0 right-0 bg-bg-surface border-b border-border z-50 md:hidden">
            <div className="flex flex-col p-4 space-y-3">
              <a href="#features" onClick={() => setMobileNavOpen(false)} className="btn-bracket">Features</a>
              <a href="#capabilities" onClick={() => setMobileNavOpen(false)} className="btn-bracket">Capabilities</a>
              <Link href="/about" onClick={() => setMobileNavOpen(false)} className="btn-bracket">About</Link>
              <Link href="/auth/login" onClick={() => setMobileNavOpen(false)} className="btn-bracket">Sign In</Link>
              <Link href="/chat" onClick={() => setMobileNavOpen(false)} className="btn-solid h-9 text-[10px] inline-flex w-fit">
                START TALKING <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Subtle radial glow behind logo */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-4 sm:px-8">
          {/* ACHEEVY Hero */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/acheevy-deploy-hero.svg"
            alt="ACHEEVY at the Deploy desk"
            className="w-80 h-auto sm:w-[480px] mx-auto mb-6 object-contain animate-materialize"
            style={{ filter: 'drop-shadow(0 8px 40px rgba(232,160,32,0.25))' }}
          />

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-2 leading-[1.05]">
            <span className="text-fg">THE </span>
            <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>DEPLOY</span>
            <span className="text-fg"> PLATFORM</span>
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl md:text-2xl font-light tracking-wide mt-6 mb-2 text-fg-secondary">
            Think It. Prompt It.
          </p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide mb-8">
            Let ACHEEVY Manage It.
          </p>

          {/* Subtitle */}
          <p className="text-fg-tertiary text-sm leading-relaxed mb-12 max-w-lg mx-auto">
            AI-native application factory for autonomous deployment,
            governance, and delivery.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/chat" className="h-12 px-8 text-sm font-bold tracking-wide inline-flex items-center justify-center gap-2 transition-all"
              style={{ background: '#E8A020', color: '#000', borderRadius: '6px', boxShadow: '0 0 30px rgba(232,160,32,0.2)' }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="h-12 px-8 text-sm font-medium tracking-wide inline-flex items-center justify-center border border-border hover:border-fg-ghost transition-colors"
              style={{ borderRadius: '6px' }}>
              Learn More
            </a>
          </div>

          {/* Built by */}
          <p className="font-mono text-[10px] text-fg-ghost uppercase tracking-[0.3em] mt-16">
            Built by ACHIEVEMOR
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 md:py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="label-mono mb-3">The future of AI platforms</p>
            <h2 className="text-3xl font-light tracking-tight">
              AI that <span className="font-bold">manages solutions.</span>
            </h2>
            <p className="text-fg-secondary text-sm mt-3 max-w-lg">
              Not another chatbot. An autonomous operations platform that researches, builds,
              deploys, and monitors — with human-in-the-loop governance at every gate.
            </p>
          </div>

          {/* Two Paths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {/* Manage It */}
            <div className="bg-bg-surface p-6 md:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-manage-it.png" alt="" className="w-12 h-12 object-contain mb-6" />
              <h3 className="text-xl font-bold tracking-tight mb-2">
                Let ACHEEVY <span style={{ color: '#E8A020' }}>Manage It</span>
              </h3>
              <p className="label-mono mb-4">2-5 minutes</p>
              <p className="text-fg-secondary text-sm leading-relaxed mb-6">
                Give ACHEEVY a single prompt describing what you want. The system takes over:
                analyzing your request, selecting the right tier, mapping the architecture,
                generating use cases, and kicking off the 10-stage build pipeline. You watch
                progress in real time on the pipeline tracker.
              </p>
              <ul className="space-y-2 mb-8">
                {['Fully autonomous execution', 'Confidence-gated decisions', 'Human approval at critical gates', 'Full audit trail via ICAR/ACP'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led led-live" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/chat" className="btn-solid h-10 text-[10px] inline-flex gap-2">
                GET STARTED <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Guide Me */}
            <div className="bg-bg-surface p-6 md:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-guide-me.png" alt="" className="w-12 h-20 object-contain object-left mb-6" />
              <h3 className="text-xl font-bold tracking-tight mb-2">
                Let ACHEEVY <span style={{ color: '#E8A020' }}>Guide Me</span>
              </h3>
              <p className="label-mono mb-4">4-10 minutes</p>
              <p className="text-fg-secondary text-sm leading-relaxed mb-6">
                ACHEEVY walks you through a structured consultation: Share Your Idea,
                Clarity &amp; Risk, Audience Resonance, and Expert Lens. The output is a
                validated Assessment Ledger with use cases, risk analysis, and a tier
                recommendation — then the pipeline builds it.
              </p>
              <ul className="space-y-2 mb-8">
                {['4-phase needs analysis', 'Use case validation', 'Risk assessment built in', 'Fewer change orders during build'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led bg-signal-info" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/chat" className="btn-ghost h-10 text-[10px] inline-flex gap-2">
                LET&apos;S BEGIN <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Broad|Cast Studio */}
      <section className="py-12 md:py-24 px-4 md:px-8 border-t border-border" style={{ background: '#0A0A0F' }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: '#D4A853' }}>New</p>
            <h2 className="text-3xl font-light tracking-tight text-white">
              <span className="font-extrabold" style={{ color: '#D4A853' }}>BROAD<span style={{ color: '#C0C0C0' }}>|</span>CAST</span> Studio
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-lg">
              A full video production platform. Describe your vision — AI generates, edits, and publishes. Camera menu, timeline editor, Remotion compositing, 4K export.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'AI GENERATION', desc: 'Describe a scene in plain English. Grammar converts to cinematic specs. Seedance 2.0 renders.' },
              { label: 'VISUAL EDITING', desc: 'Multi-track timeline with transitions. Drag clips, add text overlays, export to 7+ social formats.' },
              { label: 'SPORTS ANALYTICS', desc: 'Index game film, segment players, generate scouting reports and broadcast graphics.' },
            ].map((item, i) => (
              <div key={i} className="p-6 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <p className="font-mono text-[10px] font-bold tracking-wider mb-2" style={{ color: '#D4A853' }}>{item.label}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/broadcast" className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wider" style={{ background: '#D4A853', color: '#0A0A0F' }}>
              OPEN STUDIO <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Agent Workforce */}
      <section className="py-12 md:py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="label-mono mb-3">The workforce</p>
            <h2 className="text-3xl font-light tracking-tight">
              Your team. <span className="font-bold" style={{ color: '#E8A020' }}>Always on.</span>
            </h2>
            <p className="text-fg-secondary text-sm mt-3 max-w-lg">
              Every task is handled by specialized agents. You see who&apos;s working, what they&apos;re doing, and when it&apos;s done.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'ACHEEVY', role: 'Digital CEO', color: '#E8A020' },
              { name: 'Scout_Ang', role: 'Research & Intel', color: '#3B82F6' },
              { name: 'Code_Ang', role: 'Engineering', color: '#F43F5E' },
              { name: 'Iller_Ang', role: 'Creative Director', color: '#F97316' },
              { name: 'Biz_Ang', role: 'Business Strategy', color: '#10B981' },
              { name: 'Content_Ang', role: 'Content & Copy', color: '#8B5CF6' },
              { name: 'LUC', role: 'Cost Analyst', color: '#84CC16' },
              { name: 'Chicken Hawk', role: 'Tactical Ops', color: '#DC2626' },
            ].map(agent => (
              <div key={agent.name} className="flex items-center gap-3 p-4 border border-border hover:border-fg-ghost transition-colors">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: agent.color }} />
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wider">{agent.name}</p>
                  <p className="text-[10px] text-fg-tertiary">{agent.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="py-12 md:py-24 px-4 md:px-8 border-t border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="label-mono mb-3">Under the hood</p>
            <h2 className="text-3xl font-light tracking-tight">
              Autonomous. Governed. <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>Transparent.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[
              { label: 'AGENT FLEET', value: '15+ specialized agents across 8 departments routing your work' },
              { label: 'MEMORY', value: 'Semantic recall across all conversations. Nothing is forgotten' },
              { label: 'VIDEO PRODUCTION', value: 'Broad|Cast Studio — generate, edit, composite, and publish video' },
              { label: 'SPORTS ANALYTICS', value: 'Per|Form — scouting reports, draft analysis, podcast production' },
              { label: 'MULTI-CHANNEL', value: 'Telegram, WhatsApp, Discord, Email — ACHEEVY meets you wherever you are' },
              { label: 'COST TRACKING', value: 'Every token counted, every dollar tracked. LUC manages your budget' },
              { label: 'DEPLOYMENTS', value: 'From conversation to live URL. No devops required' },
              { label: 'GOVERNANCE', value: 'MIM-governed context. IP protection. Human-in-the-loop gates' },
            ].map((cap, i) => (
              <div key={i} className="flex items-start gap-4 p-6 border border-border hover:border-fg-ghost transition-colors">
                <Shield className="w-4 h-4 text-fg-tertiary mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wider mb-1.5">{cap.label}</p>
                  <p className="text-fg-secondary text-sm leading-relaxed">{cap.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Plugs */}
      <section className="py-12 md:py-24 px-4 md:px-8 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="label-mono mb-3">Ready-to-deploy solutions</p>
            <h2 className="text-3xl font-light tracking-tight">
              Plug in. <span className="font-bold">Go live.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Teacher Twin', desc: 'Multilingual classroom assistant with grading, lesson plans, and student analytics.', href: '/plug/teacher', agent: 'Learn_Ang' },
              { name: 'SMB Marketing', desc: 'Campaign planning, ad copy, content calendars, and performance analytics.', href: '/plug/smb-marketing', agent: 'Biz_Ang' },
              { name: 'Finance Analyst', desc: 'Cash flow analysis, budget forecasting, pricing strategy, and financial modeling.', href: '/plug/finance', agent: 'LUC' },
            ].map(plug => (
              <Link key={plug.name} href={plug.href} className="p-6 border border-border hover:border-fg-ghost transition-colors group">
                <p className="font-mono text-[10px] text-fg-ghost mb-1">{plug.agent}</p>
                <p className="font-bold text-sm mb-2 group-hover:text-accent transition-colors">{plug.name}</p>
                <p className="text-fg-secondary text-xs leading-relaxed">{plug.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-32 px-4 md:px-8 border-t border-border text-center relative overflow-hidden crosshair-bg">
        <div className="relative z-10">
          <p className="font-mono text-[11px] text-fg-tertiary uppercase tracking-[0.3em] mb-6">
            Ready to deploy?
          </p>
          <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-8">
            Start a conversation.<br />
            <span className="font-bold">Ship something real.</span>
          </h2>
          <Link href="/chat" className="btn-solid h-12 px-10 text-xs inline-flex gap-2">
            OPEN DEPLOY <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-between px-4 md:px-8 border-t border-border">
        <span className="font-mono text-[10px] text-fg-ghost uppercase tracking-widest">
          The Deploy Platform &middot; ACHIEVEMOR
        </span>
        <span className="font-mono text-[10px] text-fg-ghost">&copy; 2026</span>
      </footer>
    </div>
  );
}
