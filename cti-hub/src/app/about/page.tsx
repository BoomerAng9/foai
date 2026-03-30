'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Zap, Brain, Shield, Users, Monitor, Package, Menu, X } from 'lucide-react';

export default function AboutPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      {/* Permanent Marker font loaded via globals.css @font-face */}

      {/* Navigation */}
      <nav className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-surface relative">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-bg" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase">The Deploy Platform</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="btn-bracket">Features</Link>
          <Link href="/about" className="btn-bracket">About</Link>
          <Link href="/chat" className="btn-solid h-9 text-[10px]">
            GET STARTED <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden text-fg-secondary hover:text-fg"
          aria-label="Toggle menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {mobileNavOpen && (
          <div className="absolute top-14 left-0 right-0 bg-bg-surface border-b border-border z-50 md:hidden">
            <div className="flex flex-col p-4 space-y-3">
              <Link href="/#features" onClick={() => setMobileNavOpen(false)} className="btn-bracket">Features</Link>
              <Link href="/about" onClick={() => setMobileNavOpen(false)} className="btn-bracket">About</Link>
              <Link href="/chat" onClick={() => setMobileNavOpen(false)} className="btn-solid h-9 text-[10px] inline-flex w-fit">
                GET STARTED <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="py-12 md:py-24 px-4 md:px-8 border-b border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="label-mono mb-4">About The Deploy Platform</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-6 leading-[1.1]">
            AI that{' '}
            <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>manages</span>{' '}
            solutions.
          </h1>
          <p className="text-fg-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            From a single prompt to a fully deployed, governed, and delivered application.
            No devops. No waiting. Just results.
          </p>
        </div>
      </section>

      {/* aiPLUGs */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-center">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/acheevy-deploy-hero.svg" alt="ACHEEVY" className="w-40 h-40 object-contain mb-4" />
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                ai<span style={{ color: '#E8A020' }}>PLUG</span>s
              </h2>
              <p className="label-mono mb-3">The delivery unit</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                An aiPLUG is the finished product — a deployed, working asset that ACHEEVY builds and ships for you.
                It could be an API, a dashboard, a data pipeline, a full-stack app, or any digital solution.
              </p>
              <p>
                Every aiPLUG goes through a rigorous 10-stage pipeline: from RFP intake through commercial proposal,
                technical architecture, QA, and delivery. When it ships, you get the BAMARAM — the victory confirmation
                that your plug is live and working.
              </p>
              <p>
                Your completed aiPLUGs live in your <strong>Plug Bin</strong> — a collection of everything
                that&apos;s been deployed to your workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two Paths */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 md:mb-14">
            <p className="label-mono mb-3">Two ways to build</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Choose your speed.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {/* Manage It */}
            <div className="bg-bg p-6 md:p-10">
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
              <ul className="space-y-2">
                {['Fully autonomous execution', 'Confidence-gated decisions', 'Human approval at critical gates', 'Full audit trail via ICAR/ACP'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led led-live" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Guide Me */}
            <div className="bg-bg p-6 md:p-10">
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
              <ul className="space-y-2">
                {['4-phase needs analysis', 'Use case validation', 'Risk assessment built in', 'Fewer change orders during build'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led bg-signal-info" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ACHEEVY */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16 items-start">
            <div>
              <p className="label-mono mb-3">The Digital CEO</p>
              <h2 className="text-3xl font-bold tracking-tight mb-6">
                Meet <span style={{ color: '#E8A020' }}>ACHEEVY</span>
              </h2>
              <div className="space-y-4 text-fg-secondary leading-relaxed">
                <p>
                  ACHEEVY is the Digital CEO. You describe your problem, ACHEEVY figures out
                  what needs to happen, who needs to do it, and makes sure it gets done right.
                  No forms. No workflows. No babysitting. The solution shows up — auditable,
                  compliant, and ready to deploy.
                </p>
                <p>
                  Behind the curtain, ACHEEVY runs a full team of AI specialists: researchers,
                  engineers, operators, creatives, business developers. Each one purpose-built
                  for their job. You never manage them. You never see the wiring. You just say
                  what you want. The plug appears.
                </p>
                <p>
                  ACHEEVY remembers your projects, your preferences, and how you work. Every
                  session picks up where the last one left off.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/acheevy-plug.png"
                alt="ACHEEVY"
                className="w-64 h-64 object-contain"
                style={{ filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.3))' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Boomer_Angs */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 md:mb-14">
            <p className="label-mono mb-3">The Agent Fleet</p>
            <h2 className="text-3xl font-bold tracking-tight">
              Boomer_Angs
            </h2>
            <p className="text-fg-secondary text-sm mt-3 max-w-xl">
              Specialized execution agents dispatched by ACHEEVY. Each handles a different
              domain of work within the pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Scout_Ang', role: 'Research & Discovery', desc: 'Web scraping, data gathering, market research, open seat scanning across institutions.' },
              { name: 'Content_Ang', role: 'Content & Creative', desc: 'Writing, proposals, presentations, marketing copy, documentation, and creative deliverables.' },
              { name: 'Edu_Ang', role: 'Education & Enrollment', desc: 'MindEdge affiliate management, enrollment tracking, course pipeline operations.' },
              { name: 'Ops_Ang', role: 'Operations & Infrastructure', desc: 'Deployment, monitoring, health checks, infrastructure management, CI/CD pipelines.' },
              { name: 'Biz_Ang', role: 'Business Development', desc: 'Revenue analysis, client proposals, partnership outreach, financial modeling.' },
              { name: 'Hermes / LearnAng', role: 'Performance Evaluation', desc: 'Weekly Deep Think analysis of fleet performance. Scores agents, issues directives, tracks ecosystem health.' },
            ].map((agent) => (
              <div key={agent.name} className="p-6 border border-border bg-bg hover:border-fg-ghost transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <span className="led led-live" />
                  <span className="font-mono text-[11px] font-bold tracking-wider">{agent.name}</span>
                </div>
                <p className="text-xs font-medium mb-2" style={{ color: '#E8A020' }}>{agent.role}</p>
                <p className="text-fg-tertiary text-xs leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chicken Hawk & Lil_Hawks */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <div>
              <div className="w-10 h-10 border border-border flex items-center justify-center mb-6">
                <Shield className="w-5 h-5 text-fg-secondary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                Chicken Hawk
              </h2>
              <p className="label-mono mb-4">Tactical Operator</p>
              <div className="space-y-3 text-fg-secondary text-sm leading-relaxed">
                <p>
                  Chicken Hawk is the tactical layer between ACHEEVY and the execution fleet.
                  While ACHEEVY plans and orchestrates at a strategic level, Chicken Hawk
                  handles the ground-level operations: task decomposition, agent dispatch,
                  progress tracking, and quality gates.
                </p>
                <p>
                  Think of Chicken Hawk as the field commander — translating ACHEEVY&apos;s
                  high-level objectives into actionable work units for the Boomer_Angs.
                </p>
              </div>
            </div>
            <div>
              <div className="w-10 h-10 border border-border flex items-center justify-center mb-6">
                <Users className="w-5 h-5 text-fg-secondary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                Lil_Hawks
              </h2>
              <p className="label-mono mb-4">Sub-task Runners</p>
              <div className="space-y-3 text-fg-secondary text-sm leading-relaxed">
                <p>
                  Lil_Hawks are lightweight, ephemeral agents spawned by Chicken Hawk for
                  specific sub-tasks within a larger job. They handle the granular work:
                  individual API calls, file transformations, data validation steps, and
                  micro-deployments.
                </p>
                <p>
                  They spin up, execute their task, report back to Chicken Hawk, and
                  terminate. Fast, focused, and disposable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PMO Office */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-start">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Monitor className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                PMO Office
              </h2>
              <p className="label-mono">Live Look-In</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                The PMO (Project Management Office) is the real-time operations floor.
                It shows every active agent, every running task, and every pipeline stage
                across all your projects — live.
              </p>
              <p>
                The Live Look-In connects via WebSocket to the State Engine, streaming
                task lifecycle events as they happen: agent online, task assigned, progress
                updates, quality gates passed, and delivery confirmations.
              </p>
              <p>
                Eight PMO departments organize the fleet: PMO-LAUNCH for deployment operations,
                PMO-PULSE for research and discovery, PMO-CONTENT for creative work,
                and specialized departments for education, business development,
                infrastructure, evaluation, and governance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-24 px-4 md:px-8 text-center">
        <p className="label-mono mb-4">Ready?</p>
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-8">
          Start building with ACHEEVY.
        </h2>
        <Link href="/chat" className="h-12 px-8 text-sm font-bold tracking-wide inline-flex items-center justify-center gap-2 transition-all"
          style={{ background: '#E8A020', color: '#000', borderRadius: '6px' }}>
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
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
