'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Zap, Brain, Shield, Users, Monitor, Package, Menu, X, Mic, FileText, CreditCard, Building2, Plug } from 'lucide-react';

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
            Scale your business.{' '}
            <span style={{ color: '#E8A020', fontFamily: "'Permanent Marker', cursive" }}>Skip the hiring.</span>
          </h1>
          <p className="text-fg-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            Scaling is expensive. Hiring is slow. Managing is exhausting.
            The Deploy Platform gives you an AI workforce that builds, ships, and operates
            — so you can grow without the headcount.
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
              <p className="label-mono mb-3">What you actually get</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                An aiPLUG is the finished product you walk away with. It could be a live website,
                an API, a sales dashboard, a data pipeline, or a full application. You describe what
                you need. It gets built, tested, and deployed for you.
              </p>
              <p>
                No Figma mockups to approve. No sprint planning meetings. No &quot;we&apos;ll circle back next week.&quot;
                Every aiPLUG goes through a 10-stage pipeline — from intake to delivery — and you
                watch progress in real time. When it ships, you get the BAMARAM: your confirmation
                that the job is done and live.
              </p>
              <p>
                Every aiPLUG you&apos;ve ever built lives in your <strong>Plug Bin</strong> — your personal
                library of everything that&apos;s been shipped to your workspace.
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
              Hands-off or hands-on. Your call.
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
                Tell ACHEEVY what you want in plain English. The platform takes it from there:
                scoping your project, picking the right approach, and kicking off the build.
                You sit back and watch progress in real time.
              </p>
              <ul className="space-y-2">
                {['Fully autonomous — you describe, it delivers', 'Smart checkpoints before big decisions', 'You approve only when it matters', 'Full paper trail for everything built'].map(item => (
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
                Not sure exactly what you need? ACHEEVY walks you through it.
                Share your idea, get clarity on risks and audience, then watch it
                turn into a validated plan — with use cases, risk analysis, and a
                clear build path.
              </p>
              <ul className="space-y-2">
                {['Guided discovery — no blank-page anxiety', 'Validates your idea before building', 'Risk analysis built into every plan', 'Fewer surprises, fewer revisions'].map(item => (
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

      {/* Voice-First AI */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-center">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Mic className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Voice-First <span style={{ color: '#E8A020' }}>AI</span>
              </h2>
              <p className="label-mono">Talk to your business</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                Talk to your business, don&apos;t type. ACHEEVY listens, understands, and executes.
                Voice commands drive everything — from research to deployment.
              </p>
              <p>
                It&apos;s like having a CEO you can call anytime. Describe what you need out loud,
                and watch the platform turn your words into action. No keyboard required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grammar (NTNTN) — The Intention Engine */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16 items-center">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Grammar <span style={{ color: '#E8A020' }}>(NTNTN)</span>
              </h2>
              <p className="label-mono mb-4">The Intention Engine</p>
              <div className="space-y-4 text-fg-secondary leading-relaxed">
                <p>
                  Say what you mean, even if you&apos;re not technical. Grammar translates your
                  plain English into precise instructions the platform can act on.
                </p>
                <p>
                  You describe the outcome. The platform figures out the how. No jargon.
                  No spec documents. Just tell it what you want to happen, and it happens.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 border border-border flex items-center justify-center">
                <FileText className="w-16 h-16 text-fg-ghost" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Boomer_Angs */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 md:mb-14">
            <p className="label-mono mb-3">Your AI Workforce</p>
            <h2 className="text-3xl font-bold tracking-tight">
              The Boomer_Angs
            </h2>
            <p className="text-fg-secondary text-sm mt-3 max-w-xl">
              Think of them as your employees — except they work 24/7, never call in sick,
              and each one is a specialist. ACHEEVY assigns them work automatically.
              You never manage them directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Scout_Ang', role: 'Research', desc: 'Finds leads, scrapes the web, pulls market data, and digs up opportunities you\'d spend hours hunting for manually.' },
              { name: 'Content_Ang', role: 'Content & Creative', desc: 'Writes proposals, marketing copy, presentations, docs — anything that needs words on a page, polished and on-brand.' },
              { name: 'Edu_Ang', role: 'Education & Training', desc: 'Manages course enrollment, tracks learning pipelines, and handles education partnerships on your behalf.' },
              { name: 'Ops_Ang', role: 'Operations', desc: 'Deploys your projects, monitors uptime, runs health checks, and keeps your infrastructure humming without you touching a terminal.' },
              { name: 'Biz_Ang', role: 'Business Development', desc: 'Revenue analysis, client proposals, partnership outreach, financial modeling. Your BD team without the salary overhead.' },
              { name: 'Hermes', role: 'Performance & Quality', desc: 'Reviews how every agent is performing each week. Scores output, flags problems, and keeps the whole workforce accountable.' },
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
              <p className="label-mono mb-4">The Operations Manager</p>
              <div className="space-y-3 text-fg-secondary text-sm leading-relaxed">
                <p>
                  If ACHEEVY is the CEO, Chicken Hawk is the operations manager
                  who makes sure things actually get done. It takes ACHEEVY&apos;s plan
                  and breaks it into tasks, assigns the right agents, tracks progress,
                  and catches problems before they become yours.
                </p>
                <p>
                  You never interact with Chicken Hawk directly. It works behind the scenes
                  so you can focus on your business, not on managing AI.
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
              <p className="label-mono mb-4">The Task Runners</p>
              <div className="space-y-3 text-fg-secondary text-sm leading-relaxed">
                <p>
                  Lil_Hawks handle the small stuff — individual tasks inside a bigger job.
                  Need to call an API, convert a file, validate some data, or push a quick
                  update? A Lil_Hawk spins up, does the job, reports back, and disappears.
                </p>
                <p>
                  Fast, focused, and disposable. They&apos;re the interns who actually deliver.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Autonomous Company */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-center">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                The Autonomous <span style={{ color: '#E8A020' }}>Company</span>
              </h2>
              <p className="label-mono">Zero payroll. Full output.</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                Build a 10-person organization with zero employees. ACHEEVY delegates to
                specialized AI agents — research, content, sales, operations, engineering.
                They work 24/7. No PTO. No payroll. Just results.
              </p>
              <p>
                This isn&apos;t a chatbot with a fancy wrapper. It&apos;s a full operating company
                that runs on your behalf. You set the direction. The platform runs the business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NURD Profile Cards */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16 items-center">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <CreditCard className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                NURD <span style={{ color: '#E8A020' }}>Profile Cards</span>
              </h2>
              <p className="label-mono mb-4">Your digital identity</p>
              <div className="space-y-4 text-fg-secondary leading-relaxed">
                <p>
                  Your digital identity across Web 2.0 and 3.0. Customize your profile card,
                  mint it as an NFT, and carry your reputation everywhere.
                </p>
                <p>
                  Coming soon: portable identity via Unstoppable Domains. One card. Every platform.
                  Your credentials, your brand, your proof of work — all in one place.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 border border-border flex items-center justify-center">
                <CreditCard className="w-16 h-16 text-fg-ghost" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Gateway */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-center">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Plug className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                MCP <span style={{ color: '#E8A020' }}>Gateway</span>
              </h2>
              <p className="label-mono">One URL. Every tool.</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                Connect your agents to any IDE. One URL, instant access to the full agent
                workforce from Cursor, VS Code, Claude Code, or any MCP-compatible tool.
              </p>
              <p>
                If you&apos;re technical, this is your bridge. If you&apos;re not, don&apos;t worry about it —
                everything works through the chat interface too. But for power users who live
                in their editor, the MCP Gateway means the Deploy Platform goes wherever you code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PMO Office */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-start">
            <div>
              <div className="w-14 h-14 border border-border flex items-center justify-center mb-6">
                <Monitor className="w-7 h-7 text-fg-secondary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Operations Floor
              </h2>
              <p className="label-mono">See everything. In real time.</p>
            </div>
            <div className="space-y-4 text-fg-secondary leading-relaxed">
              <p>
                The Operations Floor is your live view into everything happening across
                your projects. Every agent working, every task in progress, every pipeline
                stage — updated in real time as work happens.
              </p>
              <p>
                Think of it as walking into your company&apos;s office and seeing everyone at
                their desk, working. Except nobody needs coffee breaks, and you can see
                exactly what each person is doing at a glance.
              </p>
              <p>
                Eight departments keep things organized: launch, research, content,
                education, business development, infrastructure, evaluation, and governance.
                Each one runs independently. All of them report to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-24 px-4 md:px-8 text-center">
        <p className="label-mono mb-4">Ready to scale without hiring?</p>
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">
          Your AI workforce is waiting.
        </h2>
        <p className="text-fg-secondary text-base mb-8 max-w-lg mx-auto">
          Stop interviewing. Stop onboarding. Start shipping.
        </p>
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
