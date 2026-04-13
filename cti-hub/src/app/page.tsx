'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Menu, X, Moon, Sun } from 'lucide-react';

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('cti-theme-preference', next ? 'dark' : 'light');
  }

  const bg = dark ? '#000000' : '#FFFFFF';
  const fg = dark ? '#FFFFFF' : '#111111';
  const fgMuted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const fgGhost = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const surface = dark ? '#0A0A0A' : '#FAFAFA';
  const accent = '#E8A020';

  return (
    <div className="min-h-screen font-sans transition-colors duration-300" style={{ background: bg, color: fg }}>

      {/* NAV */}
      <nav className="h-14 flex items-center justify-between px-4 md:px-8 relative" style={{ borderBottom: `1px solid ${border}`, background: surface }}>
        <div className="flex items-center gap-3">
          <Image src="/brand/cti-shield-day.png" alt="CTI" width={28} height={34} className="object-contain" />
          <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: fg }}>
            Coastal Talent &amp; Innovation
          </span>
        </div>

        <div className="hidden md:flex items-center gap-5">
          <a href="#services" className="text-xs font-medium tracking-wide hover:opacity-70 transition" style={{ color: fgMuted }}>Services</a>
          <a href="#platform" className="text-xs font-medium tracking-wide hover:opacity-70 transition" style={{ color: fgMuted }}>Platform</a>
          <a href="#agents" className="text-xs font-medium tracking-wide hover:opacity-70 transition" style={{ color: fgMuted }}>Team</a>
          <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition" style={{ color: fgMuted }}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/auth/login" className="text-xs font-medium tracking-wide hover:opacity-70 transition" style={{ color: fgMuted }}>Sign In</Link>
          <Link href="/chat" className="h-9 px-5 text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 rounded transition-all hover:brightness-110" style={{ background: accent, color: '#000' }}>
            Get Started <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center" style={{ color: fgMuted }}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ color: fgMuted }}>
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="absolute top-14 left-0 right-0 z-50 md:hidden p-4 space-y-3" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
            <a href="#services" onClick={() => setMobileNavOpen(false)} className="block text-sm" style={{ color: fgMuted }}>Services</a>
            <a href="#platform" onClick={() => setMobileNavOpen(false)} className="block text-sm" style={{ color: fgMuted }}>Platform</a>
            <a href="#agents" onClick={() => setMobileNavOpen(false)} className="block text-sm" style={{ color: fgMuted }}>Team</a>
            <Link href="/auth/login" onClick={() => setMobileNavOpen(false)} className="block text-sm" style={{ color: fgMuted }}>Sign In</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-4 sm:px-8">
          <Image
            src="/brand/cti-shield-day.png"
            alt="Coastal Talent and Innovation"
            width={200}
            height={240}
            className="mx-auto mb-8 object-contain"
            style={{ filter: 'drop-shadow(0 8px 40px rgba(232,160,32,0.15))' }}
            priority
          />

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
            Coastal Talent
            <br />
            <span style={{ color: accent }}>&amp; Innovation</span>
          </h1>

          <p className="text-base sm:text-lg mt-6 mb-2 font-light tracking-wide" style={{ color: fgMuted }}>
            AI-managed solutions for businesses that move fast.
          </p>
          <p className="text-base sm:text-lg font-semibold tracking-wide mb-8" style={{ color: fg }}>
            Let ACHEEVY manage it.
          </p>

          <p className="text-sm leading-relaxed mb-12 max-w-md mx-auto" style={{ color: fgGhost }}>
            Research, build, deploy, and monitor — with governance at every gate.
            Your autonomous operations platform.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/chat" className="h-12 px-8 text-sm font-bold tracking-wide inline-flex items-center gap-2 rounded-md transition-all hover:brightness-110"
              style={{ background: accent, color: '#000', boxShadow: '0 0 30px rgba(232,160,32,0.15)' }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#services" className="h-12 px-8 text-sm font-medium tracking-wide inline-flex items-center rounded-md transition-colors hover:opacity-70"
              style={{ border: `1px solid ${border}` }}>
              Learn More
            </a>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.3em] mt-16" style={{ color: fgGhost }}>
            Powered by ACHIEVEMOR
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-16 md:py-24 px-4 md:px-8" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: fgGhost }}>What we do</p>
          <h2 className="text-3xl font-light tracking-tight mb-12">
            AI that <span className="font-bold">manages solutions.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: border }}>
            <div className="p-8 md:p-10" style={{ background: bg }}>
              <h3 className="text-xl font-bold tracking-tight mb-2">
                Let ACHEEVY <span style={{ color: accent }}>Manage It</span>
              </h3>
              <p className="font-mono text-[10px] tracking-wider mb-4" style={{ color: fgGhost }}>2-5 MINUTES</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: fgMuted }}>
                Give a single prompt. The system analyzes, architects, builds, and deploys —
                with human approval at every critical gate.
              </p>
              <Link href="/chat" className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase" style={{ color: accent }}>
                Get Started <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-8 md:p-10" style={{ background: bg }}>
              <h3 className="text-xl font-bold tracking-tight mb-2">
                Let ACHEEVY <span style={{ color: accent }}>Guide Me</span>
              </h3>
              <p className="font-mono text-[10px] tracking-wider mb-4" style={{ color: fgGhost }}>4-10 MINUTES</p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: fgMuted }}>
                Structured consultation: share your idea, assess risks, validate audience,
                then the pipeline builds it with fewer change orders.
              </p>
              <Link href="/chat" className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase" style={{ color: fgMuted }}>
                Begin Consultation <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" className="py-16 md:py-24 px-4 md:px-8" style={{ background: surface, borderTop: `1px solid ${border}` }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: fgGhost }}>The platform</p>
          <h2 className="text-3xl font-light tracking-tight mb-12">
            Autonomous. Governed. <span className="font-bold" style={{ color: accent }}>Transparent.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Agent Fleet', desc: '15+ specialized agents across 8 departments' },
              { label: 'Memory', desc: 'Semantic recall across all conversations' },
              { label: 'Video Studio', desc: 'Generate, edit, composite, and publish' },
              { label: 'Analytics', desc: 'Scouting reports, draft analysis, insights' },
              { label: 'Multi-Channel', desc: 'Telegram, WhatsApp, Discord, Email' },
              { label: 'Cost Tracking', desc: 'Every token counted, every dollar tracked' },
              { label: 'Deployments', desc: 'Conversation to live URL. No devops.' },
              { label: 'Governance', desc: 'IP protection. Human-in-the-loop gates.' },
            ].map((cap, i) => (
              <div key={i} className="p-5 rounded-md transition-colors" style={{ border: `1px solid ${border}` }}>
                <p className="font-mono text-[10px] font-bold tracking-wider mb-1.5" style={{ color: accent }}>{cap.label.toUpperCase()}</p>
                <p className="text-xs leading-relaxed" style={{ color: fgMuted }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="py-16 md:py-24 px-4 md:px-8" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: fgGhost }}>The workforce</p>
          <h2 className="text-3xl font-light tracking-tight mb-12">
            Your team. <span className="font-bold" style={{ color: accent }}>Always on.</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'ACHEEVY', role: 'Digital CEO', color: '#E8A020' },
              { name: 'Scout_Ang', role: 'Research & Intel', color: '#3B82F6' },
              { name: 'Chicken Hawk', role: 'Tactical Ops', color: '#DC2626' },
              { name: 'Biz_Ang', role: 'Business Strategy', color: '#10B981' },
              { name: 'Content_Ang', role: 'Content & Copy', color: '#8B5CF6' },
              { name: 'Edu_Ang', role: 'Training & Onboarding', color: '#F97316' },
              { name: 'Ops_Ang', role: 'Operations', color: '#84CC16' },
              { name: 'Iller_Ang', role: 'Design & Web3', color: '#EC4899' },
            ].map(agent => (
              <div key={agent.name} className="flex items-center gap-3 p-4 rounded-md transition-colors" style={{ border: `1px solid ${border}` }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: agent.color }} />
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wider">{agent.name}</p>
                  <p className="text-[10px]" style={{ color: fgMuted }}>{agent.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 px-4 md:px-8 text-center" style={{ borderTop: `1px solid ${border}` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] mb-6" style={{ color: fgGhost }}>Ready to start?</p>
        <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-8">
          Start a conversation.<br />
          <span className="font-bold">Ship something real.</span>
        </h2>
        <Link href="/chat" className="h-12 px-10 text-xs font-bold tracking-wider uppercase inline-flex items-center gap-2 rounded-md transition-all hover:brightness-110" style={{ background: accent, color: '#000' }}>
          Talk to ACHEEVY <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="h-14 flex items-center justify-between px-4 md:px-8" style={{ borderTop: `1px solid ${border}` }}>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: fgGhost }}>
          Coastal Talent &amp; Innovation &middot; ACHIEVEMOR
        </span>
        <span className="font-mono text-[10px]" style={{ color: fgGhost }}>&copy; 2026</span>
      </footer>
    </div>
  );
}
