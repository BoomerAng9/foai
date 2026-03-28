'use client';

import Link from 'next/link';
import { ArrowRight, Terminal, Mic, Zap, Shield, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotation = { tl: 0, tr: 90, bl: -90, br: 180 }[position];
  const pos = {
    tl: 'top-6 left-6',
    tr: 'top-6 right-6',
    bl: 'bottom-6 left-6',
    br: 'bottom-6 right-6',
  }[position];
  return (
    <svg className={`absolute ${pos} w-5 h-5 text-fg-ghost`} style={{ transform: `rotate(${rotation}deg)` }} viewBox="0 0 20 20" fill="none">
      <path d="M0 0v20M0 0h20" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Crosshair() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" fill="none" preserveAspectRatio="xMidYMid meet">
      <circle cx="400" cy="300" r="200" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.3" />
      <circle cx="400" cy="300" r="120" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.2" />
      <circle cx="400" cy="300" r="40" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.15" />
      <line x1="400" y1="50" x2="400" y2="550" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.15" />
      <line x1="150" y1="300" x2="650" y2="300" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="inline-block w-2 h-5 bg-fg ml-0.5 align-text-bottom animate-cursor-blink" />
      )}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      {/* Navigation */}
      <nav className="h-14 flex items-center justify-between px-8 border-b border-border bg-bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-bg" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase">The Deploy Platform</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#features" className="btn-bracket">Features</a>
          <a href="#capabilities" className="btn-bracket">Capabilities</a>
          <Link href="/auth/login" className="btn-bracket">Sign In</Link>
          <Link href="/chat/librechat" className="btn-solid h-9 text-[10px]">
            START TALKING <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-end justify-center pb-24 overflow-hidden logo-watermark-center">
        <Crosshair />
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        {/* Top metadata */}
        <div className="absolute top-8 left-8 space-y-3">
          <div>
            <p className="font-mono text-[10px] text-fg-ghost uppercase tracking-widest">Built by</p>
            <p className="font-mono text-[11px] text-fg-secondary font-medium">ACHIEVEMOR</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-fg-ghost uppercase tracking-widest">Version</p>
            <p className="font-mono text-[11px] text-fg-secondary font-medium">2.0</p>
          </div>
        </div>

        <div className="absolute top-8 right-8 flex gap-4">
          <Link href="/chat/librechat" className="btn-bracket">Launch App</Link>
          <a href="#features" className="btn-bracket">Learn More</a>
        </div>

        {/* Hero Video Container — Remotion Player slot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[270px] border border-border bg-bg-surface flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 border border-border flex items-center justify-center">
              <div className="w-0 h-0 border-l-[8px] border-l-fg border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-1" />
            </div>
            <p className="font-mono text-[10px] text-fg-ghost uppercase tracking-widest">Platform Demo</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto px-8">
          <p className="font-mono text-[11px] text-fg-tertiary uppercase tracking-[0.3em] mb-6">
            <TypewriterText text="~$ NPM LAUNCH THE-DEPLOY-PLATFORM" delay={300} />
          </p>

          <h1 className="text-5xl font-light tracking-tight mb-4 leading-[1.1]">
            Think It. Prompt It.<br />
            <span className="font-bold">Let ACHEEVY Manage It.</span>
          </h1>

          <p className="text-fg-secondary text-base leading-relaxed mb-10 max-w-lg mx-auto">
            AI-native application factory for autonomous deployment,
            governance, and delivery.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/chat/librechat" className="btn-solid h-12 px-8 text-xs gap-2">
              <Mic className="w-4 h-4" /> PROMPT IT
            </Link>
            <Link href="/auth/login" className="btn-ghost h-12 px-8 text-xs">
              SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 border-t border-border">
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
          <div className="grid grid-cols-2 gap-px bg-border">
            {/* Manage It */}
            <div className="bg-bg-surface p-10">
              <div className="w-10 h-10 border border-border flex items-center justify-center mb-6">
                <Zap className="w-5 h-5 text-fg-secondary" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Manage It</h3>
              <p className="label-mono mb-4">Fully autonomous execution</p>
              <p className="text-fg-secondary text-sm leading-relaxed mb-6">
                State your goal and Deploy handles everything: planning, quoting,
                building, and shipping. Uses ACHEEVY protocol for intelligent orchestration.
              </p>
              <ul className="space-y-2 mb-8">
                {['Confidence-gated execution', 'Human approval for critical decisions', 'Full audit trail'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led led-live" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/chat/librechat" className="btn-solid h-10 text-[10px] inline-flex gap-2">
                START AUTONOMOUS CHAT <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Guide Me */}
            <div className="bg-bg-surface p-10">
              <div className="w-10 h-10 border border-border flex items-center justify-center mb-6">
                <Brain className="w-5 h-5 text-fg-secondary" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Guide Me</h3>
              <p className="label-mono mb-4">Step-by-step workflow creation</p>
              <p className="text-fg-secondary text-sm leading-relaxed mb-6">
                Wizard-guided workflow creation with chat assistance. ACHEEVY runs
                a needs analysis consultation, then delegates to the team.
              </p>
              <ul className="space-y-2 mb-8">
                {['Tool warehouse integration', 'Real-time token estimation', 'Preview before execution'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-secondary">
                    <span className="led bg-signal-info" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/chat/librechat" className="btn-ghost h-10 text-[10px] inline-flex gap-2">
                OPEN CHARTER WIZARD <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="py-24 px-8 border-t border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="label-mono mb-3">Under the hood</p>
            <h2 className="text-3xl font-light tracking-tight">
              Autonomous. <span className="font-bold">Governed. Transparent.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'AGENT FLEET', value: '8 PMO offices, 24+ specialized agents routing your work' },
              { label: 'MEMORY', value: 'Semantic recall across all conversations. Nothing is forgotten' },
              { label: 'COST TRACKING', value: 'Every token counted, every dollar tracked. Full transparency' },
              { label: 'DEPLOYMENTS', value: 'From conversation to live Cloud Run URL. No devops required' },
              { label: 'RESEARCH', value: 'Web scraping, data extraction, synthesis — automated' },
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

      {/* CTA */}
      <section className="py-32 px-8 border-t border-border text-center relative overflow-hidden crosshair-bg">
        <div className="relative z-10">
          <p className="font-mono text-[11px] text-fg-tertiary uppercase tracking-[0.3em] mb-6">
            Ready to deploy?
          </p>
          <h2 className="text-4xl font-light tracking-tight mb-8">
            Start a conversation.<br />
            <span className="font-bold">Ship something real.</span>
          </h2>
          <Link href="/chat/librechat" className="btn-solid h-12 px-10 text-xs inline-flex gap-2">
            OPEN DEPLOY <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-between px-8 border-t border-border">
        <span className="font-mono text-[10px] text-fg-ghost uppercase tracking-widest">
          The Deploy Platform &middot; ACHIEVEMOR
        </span>
        <span className="font-mono text-[10px] text-fg-ghost">&copy; 2026</span>
      </footer>
    </div>
  );
}
