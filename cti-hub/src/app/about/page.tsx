'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, Zap, Brain, Shield, Users, Monitor, Package, Menu, X, Mic, FileText, CreditCard, Building2, Plug } from 'lucide-react';

export default function AboutPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  const toggleFlip = (name: string) => {
    setFlippedCard(flippedCard === name ? null : name);
  };

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Inter', sans-serif", background: '#0A0A0F' }}>
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        /* ---- Keyframes ---- */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpStagger1 {
          0%, 10% { opacity: 0; transform: translateY(40px); }
          40%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpStagger2 {
          0%, 25% { opacity: 0; transform: translateY(40px); }
          55%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUpStagger3 {
          0%, 40% { opacity: 0; transform: translateY(40px); }
          70%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes blink {
          50% { border-color: transparent; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(30px, -20px) scale(1.1); opacity: 0.5; }
          50% { transform: translate(-10px, -40px) scale(0.9); opacity: 0.4; }
          75% { transform: translate(-30px, -10px) scale(1.05); opacity: 0.35; }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          33% { transform: translate(-40px, -30px) scale(1.15); opacity: 0.4; }
          66% { transform: translate(20px, -50px) scale(0.85); opacity: 0.3; }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(50px, 20px) scale(1.2); opacity: 0.45; }
        }
        @keyframes drawLine {
          from { width: 0; }
          to { width: 80px; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes rotateBorder {
          0% { --border-angle: 0deg; }
          100% { --border-angle: 360deg; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(232,160,32,0.2); }
          50% { box-shadow: 0 0 40px rgba(232,160,32,0.4), 0 0 80px rgba(232,160,32,0.1); }
        }
        @keyframes cyanGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,229,204,0.15); }
          50% { box-shadow: 0 0 35px rgba(0,229,204,0.3); }
        }
        @keyframes badgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,160,32,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(232,160,32,0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scrollReveal {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---- Scroll-driven animation (with fallback) ---- */
        .scroll-reveal {
          animation: scrollReveal 0.6s ease-out both;
          animation-timeline: view();
          animation-range: entry 0% entry 30%;
        }
        @supports not (animation-timeline: view()) {
          .scroll-reveal {
            animation: slideUp 0.7s ease-out both;
          }
        }

        /* ---- Glass tile ---- */
        .glass-tile {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-tile:hover {
          transform: translateY(-4px);
          border-color: rgba(232,160,32,0.4);
          box-shadow: 0 8px 40px rgba(232,160,32,0.1), 0 0 0 1px rgba(232,160,32,0.15);
        }
        .glass-tile:hover .tile-icon {
          transform: scale(1.15);
          color: #E8A020;
        }

        /* ---- Card flip ---- */
        .flip-card { perspective: 800px; }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 12px;
        }
        .flip-card-back { transform: rotateY(180deg); }

        /* ---- Rotating glow border ---- */
        .glow-border {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
        }
        .glow-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 14px;
          background: conic-gradient(from var(--angle, 0deg), transparent 40%, #E8A020 50%, transparent 60%);
          animation: spin 3s linear infinite;
          z-index: -1;
        }
        @keyframes spin {
          to { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        /* ---- Gold glow for Iller_Ang ---- */
        .gold-glow {
          animation: glowPulse 3s ease-in-out infinite;
          border: 1px solid rgba(232,160,32,0.3);
        }

        /* ---- Section divider line ---- */
        .section-line::before {
          content: '';
          display: block;
          height: 2px;
          width: 0;
          background: linear-gradient(90deg, #E8A020, transparent);
          animation: drawLine 1s ease-out forwards;
          animation-timeline: view();
          animation-range: entry 0% entry 20%;
          margin-bottom: 2rem;
        }
        @supports not (animation-timeline: view()) {
          .section-line::before {
            animation: drawLine 1s ease-out forwards;
          }
        }

        /* ---- Pulsing label ---- */
        .pulse-label {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }

        /* ---- Badge tooltip ---- */
        .badge-wrap { position: relative; }
        .badge-tooltip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) scale(0.9);
          opacity: 0;
          pointer-events: none;
          transition: all 0.25s ease-out;
          white-space: nowrap;
          background: rgba(20,20,30,0.95);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.8);
          z-index: 20;
        }
        .badge-wrap:hover .badge-tooltip {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
        .badge-wrap:hover .feature-badge {
          transform: scale(1.1);
        }

        /* ---- Hero text ---- */
        .hero-line-1 { animation: slideUpStagger1 1.2s ease-out both; }
        .hero-line-2 { animation: slideUpStagger2 1.2s ease-out both; }
        .hero-subtitle {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #E8A020;
          animation: typewriter 2s steps(50, end) 0.8s both, blink 0.75s step-end infinite;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .hero-subtitle {
            white-space: normal;
            overflow: visible;
            border-right: none;
            animation: slideUpStagger3 1.2s ease-out both;
          }
        }

        /* ---- Orbs ---- */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
        }

        /* ---- Smooth scrollbar ---- */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0A0F; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* Navigation - KEPT AS-IS */}
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        {/* Floating orbs */}
        <div className="orb" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(232,160,32,0.15), transparent)', top: '10%', left: '5%', animation: 'floatOrb 12s ease-in-out infinite' }} />
        <div className="orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,229,204,0.1), transparent)', top: '50%', right: '10%', animation: 'floatOrb2 15s ease-in-out infinite' }} />
        <div className="orb" style={{ width: 250, height: 250, background: 'radial-gradient(circle, rgba(232,160,32,0.08), transparent)', bottom: '10%', left: '40%', animation: 'floatOrb3 10s ease-in-out infinite' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 md:px-8 py-20">
          <p className="pulse-label mb-6" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E8A020' }}>
            About The Deploy Platform
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif" }} className="mb-6">
            <span className="hero-line-1 block text-4xl md:text-6xl lg:text-7xl font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
              Scale your business.
            </span>
            <span className="hero-line-2 block text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mt-2" style={{ color: '#E8A020', fontFamily: "'Permanent Marker', 'Outfit', cursive" }}>
              Skip the hiring.
            </span>
          </h1>
          <div className="flex justify-center">
            <p className="hero-subtitle text-base md:text-lg" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 600 }}>
              Scaling is expensive. Hiring is slow. Managing is exhausting. The Deploy Platform gives you an AI workforce that builds, ships, and operates — so you can grow without the headcount.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: WHAT YOU GET (aiPLUGs)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-28 px-4 md:px-8" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto scroll-reveal section-line">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 md:gap-16 items-center">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/acheevy-deploy-hero.svg" alt="ACHEEVY" className="w-40 h-40 object-contain mb-4" style={{ filter: 'drop-shadow(0 0 30px rgba(232,160,32,0.2))' }} />
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                ai<span style={{ color: '#E8A020' }}>PLUG</span>s
              </h2>
              <p className="pulse-label mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
                What you actually get
              </p>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: 15 }}>
              <p className="mb-4">
                An aiPLUG is the finished product you walk away with. It could be a live website,
                an API, a sales dashboard, a data pipeline, or a full application. You describe what
                you need. It gets built, tested, and deployed for you.
              </p>
              <p className="mb-4">
                No Figma mockups to approve. No sprint planning meetings. No &quot;we&apos;ll circle back next week.&quot;
                Every aiPLUG goes through a 10-stage pipeline — from intake to delivery — and you
                watch progress in real time. When it ships, you get the BAMARAM: your confirmation
                that the job is done and live.
              </p>
              <p>
                Every aiPLUG you&apos;ve ever built lives in your <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Plug Bin</strong> — your personal
                library of everything that&apos;s been shipped to your workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: TWO PATHS (Manage It / Guide Me)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-4 md:px-8" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto scroll-reveal section-line">
          <div className="mb-10 md:mb-16">
            <p className="pulse-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
              Two ways to build
            </p>
            <h2 className="mt-3" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
              Hands-off or hands-on. Your call.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manage It */}
            <div className="glass-tile p-8 md:p-10" style={{ borderRadius: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-manage-it.png" alt="" className="w-12 h-12 object-contain mb-6" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                Let ACHEEVY <span style={{ color: '#E8A020' }}>Manage It</span>
              </h3>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 16 }}>
                2-5 MINUTES
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Tell ACHEEVY what you want in plain English. The platform takes it from there:
                scoping your project, picking the right approach, and kicking off the build.
                You sit back and watch progress in real time.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Fully autonomous — you describe, it delivers', 'Smart checkpoints before big decisions', 'You approve only when it matters', 'Full paper trail for everything built'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5CC', flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Animated Divider - visible on md+ */}
            {/* Guide Me */}
            <div className="glass-tile p-8 md:p-10" style={{ borderRadius: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-guide-me.png" alt="" className="w-12 h-20 object-contain object-left mb-6" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                Let ACHEEVY <span style={{ color: '#E8A020' }}>Guide Me</span>
              </h3>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 16 }}>
                4-10 MINUTES
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Not sure exactly what you need? ACHEEVY walks you through it.
                Share your idea, get clarity on risks and audience, then watch it
                turn into a validated plan — with use cases, risk analysis, and a
                clear build path.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Guided discovery — no blank-page anxiety', 'Validates your idea before building', 'Risk analysis built into every plan', 'Fewer surprises, fewer revisions'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5CC', flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: MEET ACHEEVY
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 md:py-28 px-4 md:px-8 overflow-hidden">
        {/* Parallax-like glow behind image */}
        <div style={{ position: 'absolute', top: '20%', right: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(232,160,32,0.08), transparent)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div className="max-w-5xl mx-auto scroll-reveal section-line relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 md:gap-16 items-center">
            <div>
              <p className="pulse-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
                The Digital CEO
              </p>
              <h2 className="mt-3 mb-6" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.95)' }}>
                Meet <span style={{ color: '#E8A020' }}>ACHEEVY</span>
              </h2>
              <div style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: 15 }}>
                <p className="mb-4">
                  ACHEEVY is the Digital CEO. You describe your problem, ACHEEVY figures out
                  what needs to happen, who needs to do it, and makes sure it gets done right.
                  No forms. No workflows. No babysitting. The solution shows up — auditable,
                  compliant, and ready to deploy.
                </p>
                <p className="mb-4">
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
                style={{ filter: 'drop-shadow(0 8px 60px rgba(232,160,32,0.25))', animation: 'float 4s ease-in-out infinite' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: FEATURE GRID (6 motion tiles)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-4 md:px-8" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto section-line">
          <div className="mb-10 md:mb-16 scroll-reveal">
            <p className="pulse-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
              Capabilities
            </p>
            <h2 className="mt-3" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
              Everything under the hood
            </h2>
          </div>

          {/* Feature Badges (floating) */}
          <div className="flex flex-wrap gap-4 justify-center mb-12 scroll-reveal">
            {[
              { label: 'Voice-First', icon: <Mic className="w-4 h-4" />, desc: 'Talk to your business, don\'t type' },
              { label: 'Grammar', icon: <Brain className="w-4 h-4" />, desc: 'Plain English to precise instructions' },
              { label: 'NURD Cards', icon: <CreditCard className="w-4 h-4" />, desc: 'Your portable digital identity' },
              { label: 'Agent HQ', icon: <Monitor className="w-4 h-4" />, desc: 'Live operations floor' },
              { label: 'MCP', icon: <Plug className="w-4 h-4" />, desc: 'One URL, every tool and IDE' },
              { label: 'Autonomous', icon: <Building2 className="w-4 h-4" />, desc: 'Zero payroll, full output' },
            ].map((badge, i) => (
              <div key={badge.label} className="badge-wrap" style={{ animation: `badgeFloat 3s ease-in-out ${i * 0.3}s infinite` }}>
                <div className="badge-tooltip">{badge.desc}</div>
                <div
                  className="feature-badge"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 100,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)',
                    cursor: 'default', transition: 'all 0.25s ease',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <span style={{ color: '#E8A020' }}>{badge.icon}</span>
                  {badge.label}
                </div>
              </div>
            ))}
          </div>

          {/* 6 Glass Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Mic className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'Voice-First AI', accent: 'Talk to your business', desc: 'ACHEEVY listens, understands, and executes. Voice commands drive everything — from research to deployment. It\'s like having a CEO you can call anytime.' },
              { icon: <Brain className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'Smart Translate', accent: 'Say it plain, we build it right', desc: 'Say what you mean, even if you\'re not technical. We translate your plain English into precise instructions the platform can act on. No jargon. No spec documents.' },
              { icon: <CreditCard className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'NURD Profile Cards', accent: 'Your digital identity', desc: 'Your digital identity across Web 2.0 and 3.0. Customize your profile card, mint it as an NFT, and carry your reputation everywhere. Portable via Unstoppable Domains.' },
              { icon: <Monitor className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'Operations Floor', accent: 'See everything. In real time.', desc: 'Your live view into everything happening. Every agent working, every task in progress, every pipeline stage — updated in real time across eight departments.' },
              { icon: <Plug className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'MCP Gateway', accent: 'One URL. Every tool.', desc: 'Connect your agents to any IDE. One URL, instant access from Cursor, VS Code, Claude Code, or any MCP-compatible tool. The Deploy Platform goes wherever you code.' },
              { icon: <Building2 className="w-7 h-7 tile-icon" style={{ transition: 'all 0.35s ease' }} />, title: 'The Autonomous Company', accent: 'Zero payroll. Full output.', desc: 'Build a 10-person organization with zero employees. Research, content, sales, operations, engineering — they work 24/7. You set the direction. The platform runs the business.' },
            ].map((tile, i) => (
              <div
                key={tile.title}
                className="glass-tile scroll-reveal p-6 md:p-8"
                style={{ borderRadius: 16, animationDelay: `${i * 0.08}s` }}
              >
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{tile.icon}</div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                  {tile.title}
                </h3>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8A020', marginBottom: 14 }}>
                  {tile.accent}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.7 }}>
                  {tile.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: THE WORKFORCE — Agent Cards with flip
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-4 md:px-8" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto section-line">
          <div className="mb-10 md:mb-16 scroll-reveal">
            <p className="pulse-label" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
              Your AI Workforce
            </p>
            <h2 className="mt-3" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
              The Boomer_Angs
            </h2>
            <p className="mt-3" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 560, lineHeight: 1.7 }}>
              Think of them as your employees — except they work 24/7, never call in sick,
              and each one is a specialist. ACHEEVY assigns them work automatically.
              You never manage them directly.
            </p>
          </div>

          {/* Iller_Ang Featured Card */}
          <div className="mb-10 scroll-reveal">
            <div
              className="gold-glow glass-tile p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10"
              style={{ borderRadius: 16, background: 'rgba(232,160,32,0.04)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/iller-ang.png"
                alt="Iller_Ang"
                className="w-28 h-28 md:w-36 md:h-36 object-contain"
                style={{ filter: 'drop-shadow(0 0 40px rgba(232,160,32,0.3))' }}
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8A020' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.9)' }}>Iller_Ang</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, background: 'rgba(232,160,32,0.2)', color: '#E8A020', padding: '2px 8px', borderRadius: 4 }}>CREATIVE DIRECTOR</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, maxWidth: 500 }}>
                  The creative visionary behind every visual system. Iller_Ang designs the interfaces,
                  brand systems, motion graphics, and visual identity. This page? Iller_Ang&apos;s work.
                  PMO-PRISM design methodology — dark mode first, glass morphism, holographic accents.
                </p>
              </div>
            </div>
          </div>

          {/* Agent Team Pages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link
              href="/agents/house-of-ang"
              className="border border-white/10 p-6 hover:border-[#E8A020]/40 transition-all group"
              style={{ borderRadius: 12, background: 'rgba(232,160,32,0.03)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span style={{ fontSize: 24 }}>&#x1F3E0;</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: '#E8A020' }}>The House of ANG</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                Meet the Boomer_Angs — 7 executive AI agents that handle research, content, sales, operations, education, finance, and design. They plan before they act and remember what worked.
              </p>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#E8A020', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }} className="group-hover:translate-x-1 transition-transform">
                EXPLORE &#x2192;
              </span>
            </Link>
            <Link
              href="/agents/chicken-hawk"
              className="border border-white/10 p-6 hover:border-[#E8A020]/40 transition-all group"
              style={{ borderRadius: 12, background: 'rgba(232,160,32,0.03)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span style={{ fontSize: 24 }}>&#x1F985;</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: '#E8A020' }}>Chicken Hawk &amp; the Sqwaad</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                The tactical execution layer. Chicken Hawk commands, the Lil_Hawks swarm. BuildSmith, Picker_Ang, Code_Ang, Iller_Ang MCP — 11 specialized micro-agents that get it done.
              </p>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#E8A020', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }} className="group-hover:translate-x-1 transition-transform">
                EXPLORE &#x2192;
              </span>
            </Link>
          </div>

          {/* Boomer_Angs Grid with Flip Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: 'Scout_Ang', role: 'Research', desc: 'Finds leads, scrapes the web, pulls market data, and digs up opportunities you\'d spend hours hunting for manually.', back: 'Scout_Ang operates 24/7 across web sources, databases, and market feeds. Every finding is verified, scored for relevance, and delivered with source attribution.' },
              { name: 'Content_Ang', role: 'Content & Creative', desc: 'Writes proposals, marketing copy, presentations, docs — anything that needs words on a page, polished and on-brand.', back: 'From brand voice guides to investor decks, Content_Ang adapts tone and format to match your audience. Every piece is reviewed for clarity, grammar, and strategic alignment.' },
              { name: 'Edu_Ang', role: 'Education & Training', desc: 'Manages course enrollment, tracks learning pipelines, and handles education partnerships on your behalf.', back: 'Edu_Ang integrates with learning platforms, tracks certifications, manages curricula, and ensures your training pipeline stays on schedule and on budget.' },
              { name: 'Ops_Ang', role: 'Operations', desc: 'Deploys your projects, monitors uptime, runs health checks, and keeps your infrastructure humming without you touching a terminal.', back: 'Infrastructure management, CI/CD pipelines, uptime monitoring, and incident response. Ops_Ang keeps the lights on while you focus on strategy.' },
              { name: 'Biz_Ang', role: 'Business Development', desc: 'Revenue analysis, client proposals, partnership outreach, financial modeling. Your BD team without the salary overhead.', back: 'Biz_Ang runs competitive analysis, drafts partnership proposals, models revenue scenarios, and identifies growth opportunities automatically.' },
              { name: 'Hermes', role: 'Performance & Quality', desc: 'Reviews how every agent is performing each week. Scores output, flags problems, and keeps the whole workforce accountable.', back: 'Weekly performance reviews, quality scoring, anomaly detection, and continuous improvement recommendations. Hermes ensures standards never slip.' },
            ].map((agent) => (
              <div
                key={agent.name}
                className={`flip-card scroll-reveal${flippedCard === agent.name ? ' flipped' : ''}`}
                style={{ height: 240, cursor: 'pointer', animationDelay: '0.05s' }}
                onClick={() => toggleFlip(agent.name)}
              >
                <div className="flip-card-inner">
                  {/* Front */}
                  <div className="flip-card-front glass-tile p-6" style={{ borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5CC' }} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)' }}>{agent.name}</span>
                      </div>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#E8A020', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{agent.role}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.6 }}>{agent.desc}</p>
                    </div>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Click to flip</p>
                  </div>
                  {/* Back */}
                  <div className="flip-card-back p-6" style={{ borderRadius: 12, background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: '#E8A020', marginBottom: 10, letterSpacing: '0.08em' }}>{agent.name} — Deep Dive</p>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.7 }}>{agent.back}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: CHICKEN HAWK + LIL_HAWKS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-4 md:px-8" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto scroll-reveal section-line">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Chicken Hawk */}
            <div className="glass-tile p-8" style={{ borderRadius: 16 }}>
              <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <Shield className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 6 }}>
                Chicken Hawk
              </h3>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8A020', marginBottom: 16 }}>
                The Operations Manager
              </p>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7 }}>
                <p className="mb-3">
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

            {/* Lil_Hawks */}
            <div className="glass-tile p-8" style={{ borderRadius: 16, animation: 'cyanGlow 4s ease-in-out infinite' }}>
              <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'rgba(0,229,204,0.05)', border: '1px solid rgba(0,229,204,0.15)', marginBottom: 20 }}>
                <Users className="w-6 h-6" style={{ color: '#00E5CC' }} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: 6 }}>
                Lil_Hawks
              </h3>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00E5CC', marginBottom: 16 }}>
                The Task Runners
              </p>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7 }}>
                <p className="mb-3">
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 8: CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-32 px-4 md:px-8 text-center overflow-hidden">
        {/* Background orbs */}
        <div className="orb" style={{ width: 350, height: 350, background: 'radial-gradient(circle, rgba(232,160,32,0.1), transparent)', top: '20%', left: '15%', animation: 'floatOrb 10s ease-in-out infinite' }} />
        <div className="orb" style={{ width: 250, height: 250, background: 'radial-gradient(circle, rgba(0,229,204,0.08), transparent)', bottom: '10%', right: '20%', animation: 'floatOrb2 13s ease-in-out infinite' }} />

        <div className="relative z-10 scroll-reveal">
          <p className="pulse-label mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8A020' }}>
            Ready to scale without hiring?
          </p>
          <h2 className="mb-4" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, color: 'rgba(255,255,255,0.95)' }}>
            Your AI workforce is waiting.
          </h2>
          <p className="mb-10" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 480, margin: '0 auto 40px' }}>
            Stop interviewing. Stop onboarding. Start shipping.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2"
            style={{
              height: 52,
              padding: '0 36px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #E8A020, #D4901A)',
              color: '#0A0A0F',
              borderRadius: 10,
              textDecoration: 'none',
              animation: 'ctaPulse 2s ease-in-out infinite',
              transition: 'all 0.3s ease',
            }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-between px-4 md:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          The Deploy Platform &middot; ACHIEVEMOR
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>&copy; 2026</span>
      </footer>
    </div>
  );
}
