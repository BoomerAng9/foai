'use client';

/**
 * The Sqwaadrun — Mini SaaS landing + live roster
 * ==================================================
 * Deploy Platform public-facing page for the 17-Hawk web intelligence
 * fleet. Hero + pricing + flip-card roster + live status pull from the
 * gateway. Agent-forward branding; no internal tool names surfaced.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HawkCard, type HawkProfile } from '@/components/hawks/HawkCard';
import {
  SQWAADRUN_ROSTER,
  CORE_HAWKS,
  EXPANSION_HAWKS,
  SPECIALIST_HAWKS,
} from '@/lib/hawks/roster';

interface LiveHawk {
  name: string;
  status: 'active' | 'standby';
  tasks_completed: number;
  tasks_failed: number;
}

interface LiveRoster {
  total_hawks: number;
  hawks: LiveHawk[];
  chicken_hawk: string;
}

export default function HawksPage() {
  const [live, setLive] = useState<LiveRoster | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/sqwaadrun/live')
      .then((r) => r.json())
      .then((d) => {
        setHealthy(d.healthy ?? false);
        setLive(d.roster ?? null);
      })
      .catch(() => setHealthy(false));
  }, []);

  // Merge live stats into profile
  const enrich = (profiles: HawkProfile[]): HawkProfile[] =>
    profiles.map((p) => {
      const match = live?.hawks.find((h) => h.name === p.name);
      if (!match) return p;
      return {
        ...p,
        status: match.status,
        tasksCompleted: match.tasks_completed,
        tasksFailed: match.tasks_failed,
      };
    });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: 'radial-gradient(circle at 50% 30%, #FFD70020, transparent 55%)',
        }} />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="text-[10px] font-mono tracking-[0.35em] opacity-60 mb-3">
            ACHIEVEMOR · DEPLOY PLATFORM · WEB INTELLIGENCE
          </div>
          <h1 className="text-6xl md:text-7xl font-black leading-none tracking-tighter mb-4">
            The Sqwaadrun
          </h1>
          <p className="text-xl md:text-2xl font-light text-white/70 max-w-3xl mx-auto leading-snug">
            17 specialized agents. One command. Zero language-model overhead.
            Built for real production scraping, monitoring, and data enrichment.
          </p>

          {/* Live ops status pill */}
          <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-full border"
            style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: healthy ? '#10FF80' : healthy === false ? '#FF6B6B' : '#888',
                boxShadow: healthy ? '0 0 10px #10FF80' : 'none',
              }}
            />
            <span className="text-xs font-mono tracking-wider uppercase opacity-80">
              {healthy === null
                ? 'Pinging fleet...'
                : healthy
                ? `Fleet online · ${live?.hawks.filter((h) => h.status === 'active').length ?? 0} active`
                : 'Fleet offline'}
            </span>
          </div>

          <div className="mt-10 flex gap-4 justify-center">
            <Link
              href="#pricing"
              className="px-8 py-3.5 rounded-lg bg-white text-black font-bold text-sm tracking-wider hover:bg-white/90"
            >
              REQUEST ACCESS
            </Link>
            <Link
              href="#roster"
              className="px-8 py-3.5 rounded-lg border border-white/20 text-white font-bold text-sm tracking-wider hover:bg-white/5"
            >
              MEET THE SQWAADRUN
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ VALUE PROPS ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ValueProp
            label="NO MODEL COSTS"
            title="Pure execution"
            body="No LLM calls. No inference tokens. The intelligence lives in the code — parsing rules, extraction schemas, diff engines, priority queues. Zero per-request AI cost."
          />
          <ValueProp
            label="PRODUCTION SCALE"
            title="Built for throughput"
            body="Async all the way down. SQLite-WAL caching. Content-hash dedup. 17 specialized agents pipelining work through a single dispatcher. Handles the real web, not a demo."
          />
          <ValueProp
            label="COMMAND LAYER"
            title="One intent, full mission"
            body='Drop a natural-language intent and target URLs. Our command tier routes it to the right mission type — reconnaissance, sweep, harvest, patrol — and returns structured results.'
          />
        </div>
      </section>

      {/* ═══ ROSTER ═══ */}
      <section id="roster" className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-3">
            / THE ROSTER
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Meet the Hawks</h2>
          <p className="text-white/50 mt-3 max-w-2xl mx-auto">
            Each Hawk owns a single responsibility. Tap any card to flip the dossier.
          </p>
        </div>

        <RosterRow title="Core Hawks" subtitle="Squad foundation" hawks={enrich(CORE_HAWKS)} />
        <RosterRow title="Expansion Hawks" subtitle="Specialized operators" hawks={enrich(EXPANSION_HAWKS)} />
        <RosterRow title="Specialist Hawks" subtitle="Advanced tradecraft" hawks={enrich(SPECIALIST_HAWKS)} />
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-3">
            / PLANS
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Flight tiers</h2>
          <p className="text-white/50 mt-3">Start with the Hunter tier. Scale to Sqwaadrun Commander when you're ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <PricingCard
            name="Hunter"
            tagline="Solo operators, research, prototyping"
            price="$29"
            features={[
              '5,000 missions / month',
              'All 17 Hawks available',
              'RECON, SURVEY, INTERCEPT missions',
              '24-hour result retention',
              'REST API access',
              'Community support',
            ]}
          />
          <PricingCard
            name="Hawker"
            tagline="Teams, production pipelines, monitoring"
            price="$149"
            featured
            features={[
              '100,000 missions / month',
              'All mission types including SWEEP & HARVEST',
              'Scheduled jobs via Sched Hawk',
              '30-day result retention',
              'Change monitoring via Diff Hawk',
              'Priority support',
              'Custom extraction schemas',
            ]}
          />
          <PricingCard
            name="Sqwaadrun Commander"
            tagline="Enterprise, data factory, white-label"
            price="Custom"
            features={[
              'Unlimited missions',
              'Dedicated Sqwaadrun instance',
              'Custom Hawks on request',
              'Indefinite retention',
              'SLA with 99.9% uptime',
              'White-label gateway',
              'Slack / dedicated engineer',
            ]}
          />
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-3">
            / COMMAND FLOW
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">One call. Full mission.</h2>
        </div>

        <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl p-6 font-mono text-sm overflow-x-auto">
          <div className="text-white/40 mb-3">// Single intent → full orchestration</div>
          <pre className="text-white/90 leading-relaxed">
{`POST /api/sqwaadrun/mission
{
  "intent": "harvest player stats from this recruiting site",
  "targets": ["https://example-recruiting.com/class/2026"],
  "config": {
    "schema_name": "athlete_page"
  }
}

// Response
{
  "mission_id": "MISSION-0001",
  "type": "harvest",
  "status": "completed",
  "results_count": 247,
  "kpis": {
    "elapsed_seconds": 11.3,
    "throughput_pages_per_sec": 21.9
  }
}`}
          </pre>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-10 text-center text-[10px] font-mono tracking-[0.25em] opacity-40">
        ACHIEVEMOR · DEPLOY PLATFORM · SQWAADRUN v2.0
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function ValueProp({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="text-[9px] font-mono tracking-[0.25em] opacity-60 mb-2" style={{ color: '#FFD700' }}>
        {label}
      </div>
      <div className="text-xl font-bold mb-3">{title}</div>
      <p className="text-sm text-white/60 leading-relaxed">{body}</p>
    </div>
  );
}

function RosterRow({ title, subtitle, hawks }: { title: string; subtitle: string; hawks: HawkProfile[] }) {
  return (
    <div className="mb-14">
      <div className="flex items-baseline gap-4 mb-6 border-b border-white/5 pb-3">
        <h3 className="text-2xl font-black">{title}</h3>
        <div className="text-[10px] font-mono tracking-[0.2em] opacity-50">{subtitle}</div>
      </div>
      <div className="flex flex-wrap gap-6 justify-center md:justify-start">
        {hawks.map((h, i) => (
          <motion.div
            key={h.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          >
            <HawkCard hawk={h} size="md" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PricingCard({
  name,
  tagline,
  price,
  features,
  featured,
}: {
  name: string;
  tagline: string;
  price: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`p-7 rounded-2xl border relative ${featured ? 'scale-105' : ''}`}
      style={{
        borderColor: featured ? '#FFD700' : 'rgba(255,255,255,0.12)',
        background: featured
          ? 'linear-gradient(180deg, rgba(255,215,0,0.08), transparent)'
          : 'rgba(255,255,255,0.02)',
        boxShadow: featured ? '0 0 40px rgba(255,215,0,0.15)' : 'none',
      }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-mono tracking-[0.25em] font-bold"
          style={{ background: '#FFD700', color: '#000' }}
        >
          MOST POPULAR
        </div>
      )}
      <div className="text-xl font-black mb-1">{name}</div>
      <div className="text-xs text-white/50 mb-5">{tagline}</div>
      <div className="text-4xl font-black mb-1">{price}</div>
      <div className="text-[10px] font-mono opacity-50 tracking-wider">{price !== 'Custom' && '/ MONTH'}</div>
      <div className="h-px w-full bg-white/10 my-5" />
      <ul className="space-y-2.5 mb-6">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-white/80">
            <span style={{ color: featured ? '#FFD700' : '#10FF80' }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        className="w-full py-3 rounded-lg font-bold text-sm tracking-wider"
        style={{
          background: featured ? '#FFD700' : 'rgba(255,255,255,0.08)',
          color: featured ? '#000' : '#fff',
          border: featured ? 'none' : '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {price === 'Custom' ? 'CONTACT SALES' : 'GET STARTED'}
      </button>
    </div>
  );
}
