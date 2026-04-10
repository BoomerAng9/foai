'use client';

/**
 * /plug/sqwaadrun — The Sqwaadrun Mini SaaS landing
 * ====================================================
 * Lives on deploy.foai.cloud (and sqwaadrun.foai.cloud subdomain).
 *
 * Brand: Sqwaadrun palette — navy port + gold #F5A623 + cyan #22D3EE
 * + orange #F97316. NOT Deploy Platform's flat black + #E8A020.
 * Inspired by the 8 Chicken Hawk reference frames (port at night,
 * A.I.M.S. shipping containers, golden mech, chibi Lil_Hawks).
 *
 * Sqwaadrun is a SEPARATE FEE from Deploy plans. Customers select a
 * Sqwaadrun tier (Solo / Sqwaad / Commander) and deploy missions
 * gated by their tier.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import { HawkCard, type HawkCardData } from '@/components/hawks/HawkCard';
import {
  CORE_HAWKS,
  EXPANSION_HAWKS,
  SPECIALIST_HAWKS,
} from '@/lib/hawks/roster';
import { COMMAND_PROFILES } from '@/lib/hawks/characters';

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

export default function SqwaadrunPage() {
  const { user } = useAuth();
  const [live, setLive] = useState<LiveRoster | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);

  // Owner short-circuit — never show the pricing tiles to the owner.
  // Send straight to the authenticated control surface.
  useEffect(() => {
    if (user && isOwner(user.email)) {
      window.location.replace('/sqwaadrun');
    }
  }, [user]);

  useEffect(() => {
    fetch('/api/sqwaadrun/live')
      .then((r) => r.json())
      .then((d) => {
        setHealthy(d.healthy ?? false);
        setLive(d.roster ?? null);
      })
      .catch(() => setHealthy(false));
  }, []);

  // Inject live stats into card data
  const enrich = (cards: HawkCardData[]): HawkCardData[] =>
    cards.map((c) => {
      const m = live?.hawks.find((h) => h.name === c.profile.callsign);
      if (!m) return c;
      return {
        ...c,
        status: m.status,
        tasksCompleted: m.tasks_completed,
        tasksFailed: m.tasks_failed,
      };
    });

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          'radial-gradient(ellipse at top, #0B1220 0%, #050810 60%, #050810 100%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* ═══ NAV ═══ */}
      <nav
        className="h-14 flex items-center justify-between px-5 border-b"
        style={{ borderColor: 'rgba(245,166,35,0.15)', background: 'rgba(5,8,16,0.7)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 flex items-center justify-center text-black font-black text-sm"
              style={{
                background: '#F5A623',
                clipPath:
                  'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              }}
            >
              ✦
            </div>
            <span
              className="font-mono text-xs font-bold tracking-[0.25em] uppercase group-hover:text-[#F5A623] transition"
            >
              The Sqwaadrun
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/plug" className="text-xs text-white/50 hover:text-white transition">
            All Plugs
          </Link>
          <Link
            href="/auth/login"
            className="text-xs text-white/50 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="#deploy"
            className="h-9 px-5 text-[10px] font-bold tracking-[0.15em] flex items-center gap-1.5 transition"
            style={{
              background: '#F5A623',
              color: '#050810',
              borderRadius: '2px',
            }}
          >
            DEPLOY THE SQWAAD →
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* A.I.M.S. container slat backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            background:
              'repeating-linear-gradient(90deg, transparent 0px, transparent 28px, #22D3EE 28px, #22D3EE 30px)',
          }}
        />
        {/* Gold radial */}
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-[0.07] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #F5A623 0%, transparent 70%)' }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <p
            className="font-mono text-[10px] tracking-[0.35em] uppercase mb-5"
            style={{ color: '#F5A623' }}
          >
            ACHIEVEMOR · DEPLOY PLATFORM · WEB INTELLIGENCE FLEET
          </p>

          <h1
            className="text-5xl sm:text-6xl md:text-8xl font-black leading-[0.95] mb-6 tracking-tighter"
          >
            No Job Too Big.
            <br />
            <span style={{ color: '#F5A623' }}>No Job Too Small.</span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-3xl mx-auto leading-snug mb-3"
            style={{ color: '#CBD5E1' }}
          >
            Seventeen specialized agents under one command. The Sqwaadrun deploys
            for scraping, monitoring, structured data extraction, scheduled jobs,
            and the kind of web intelligence work that runs in the background
            while you sleep.
          </p>
          <p className="text-sm max-w-2xl mx-auto" style={{ color: '#64748B' }}>
            Pure compute. Zero language-model overhead. Pay for missions, not tokens.
          </p>

          {/* Live status */}
          <div
            className="mt-8 inline-flex items-center gap-3 px-4 py-2 border"
            style={{
              borderColor: 'rgba(245,166,35,0.3)',
              background: 'rgba(245,166,35,0.05)',
              borderRadius: '2px',
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: healthy ? '#22D3EE' : healthy === false ? '#EF4444' : '#64748B',
                boxShadow: healthy ? '0 0 10px #22D3EE' : 'none',
              }}
            />
            <span
              className="text-[10px] font-mono tracking-[0.2em] uppercase"
              style={{ color: '#F1F5F9' }}
            >
              {healthy === null
                ? 'Pinging fleet...'
                : healthy && live
                ? `Fleet armed · ${live.hawks.filter((h) => h.status === 'active').length}/${live.total_hawks} active`
                : healthy
                ? 'Fleet armed'
                : 'Fleet awaiting dispatch'}
            </span>
          </div>

          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            <Link
              href="#deploy"
              className="h-12 px-8 font-bold text-sm flex items-center gap-2 transition"
              style={{ background: '#F5A623', color: '#050810', borderRadius: '2px' }}
            >
              DEPLOY THE SQWAAD →
            </Link>
            <Link
              href="#roster"
              className="h-12 px-8 border text-sm flex items-center gap-2 transition"
              style={{
                borderColor: 'rgba(34,211,238,0.5)',
                color: '#22D3EE',
                borderRadius: '2px',
              }}
            >
              MEET THE FLEET
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ COMMAND TIER ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: 'rgba(245,166,35,0.15)' }}>
        <div className="text-center mb-10">
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
            style={{ color: '#F5A623' }}
          >
            / COMMAND
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            The Family
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {COMMAND_PROFILES.map((profile) => (
            <CommandCard key={profile.slug} profile={profile} />
          ))}
        </div>
      </section>

      {/* ═══ ROSTER ═══ */}
      <section
        id="roster"
        className="max-w-7xl mx-auto px-6 py-16 border-t"
        style={{ borderColor: 'rgba(245,166,35,0.15)' }}
      >
        <div className="text-center mb-12">
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
            style={{ color: '#F5A623' }}
          >
            / THE 17-HAWK ROSTER
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            Meet the Hawks
          </h2>
          <p className="text-sm mt-3 max-w-2xl mx-auto" style={{ color: '#64748B' }}>
            Each Hawk owns a single responsibility. Tap any card to flip the dossier.
          </p>
        </div>

        <RosterRow title="Core Hawks" subtitle="Squad foundation" hawks={enrich(CORE_HAWKS)} />
        <RosterRow title="Expansion Hawks" subtitle="Specialized operators" hawks={enrich(EXPANSION_HAWKS)} />
        <RosterRow title="Specialist Hawks" subtitle="Advanced tradecraft" hawks={enrich(SPECIALIST_HAWKS)} />
      </section>

      {/* ═══ DEPLOYMENT TIERS ═══ */}
      <section
        id="deploy"
        className="max-w-6xl mx-auto px-6 py-16 border-t"
        style={{ borderColor: 'rgba(245,166,35,0.15)' }}
      >
        <div className="text-center mb-12">
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
            style={{ color: '#22D3EE' }}
          >
            / DEPLOYMENT TIERS
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            Pick Your Loadout
          </h2>
          <p className="text-sm mt-3 max-w-2xl mx-auto" style={{ color: '#64748B' }}>
            Sqwaadrun tiers are <span className="font-bold" style={{ color: '#F5A623' }}>separate</span> from your Deploy
            Platform plan. Pay only for the fleet you actually deploy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <TierCard
            tierId="lil_hawk_solo"
            name="Lil_Hawk Solo"
            tagline="Solo operators, prototyping, lightweight research"
            price="$19"
            features={[
              '2,000 missions / month',
              'RECON & SURVEY missions only',
              '6 Core Hawks unlocked',
              '24-hour result retention',
              'REST API access',
              'Community support',
            ]}
            cta="DEPLOY SOLO"
            color="#22D3EE"
          />
          <TierCard
            tierId="sqwaad"
            name="Sqwaad"
            tagline="Production teams, monitoring, structured extraction"
            price="$79"
            featured
            features={[
              '25,000 missions / month',
              'All mission types except SWEEP & BATCH_OPS',
              'All 17 Hawks unlocked',
              'Scheduled jobs via Sched_Hawk',
              'Change monitoring via Diff_Hawk',
              '30-day result retention',
              'Priority support',
            ]}
            cta="DEPLOY THE SQWAAD"
            color="#F5A623"
          />
          <TierCard
            tierId="sqwaadrun_commander"
            name="Sqwaadrun Commander"
            tagline="Enterprise data factory, white-label, dedicated"
            price="$299"
            features={[
              '250,000 missions / month',
              'All mission types — SWEEP, HARVEST, BATCH_OPS',
              'Custom Hawk requests',
              'Indefinite retention',
              'Dedicated gateway instance',
              '99.9% SLA',
              'White-label dashboard',
              'Slack + dedicated engineer',
            ]}
            cta="ASSUME COMMAND"
            color="#F97316"
          />
        </div>

        <p className="text-center text-[10px] font-mono mt-8" style={{ color: '#475569' }}>
          DEPLOY PLATFORM CUSTOMERS RECEIVE 20% OFF SQWAADRUN TIERS · APPLIED AT CHECKOUT
        </p>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t" style={{ borderColor: 'rgba(245,166,35,0.15)' }}>
        <div className="text-center mb-12">
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
            style={{ color: '#22D3EE' }}
          >
            / COMMAND FLOW
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            One call. Full mission.
          </h2>
        </div>

        <div
          className="border p-6 font-mono text-sm overflow-x-auto"
          style={{
            background: '#0B1220',
            borderColor: 'rgba(245,166,35,0.3)',
            borderRadius: '2px',
          }}
        >
          <div className="opacity-50 mb-3" style={{ color: '#22D3EE' }}>
            {'// Single intent → full orchestration'}
          </div>
          <pre className="leading-relaxed" style={{ color: '#F1F5F9' }}>
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
      <footer
        className="border-t py-10 text-center text-[10px] font-mono tracking-[0.25em]"
        style={{ borderColor: 'rgba(245,166,35,0.15)', color: '#475569' }}
      >
        ACHIEVEMOR · DEPLOY PLATFORM · THE SQWAADRUN v2.0 · A.I.M.S.
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function CommandCard({ profile }: { profile: typeof COMMAND_PROFILES[number] }) {
  return (
    <div
      className="relative overflow-hidden border p-6"
      style={{
        background: 'linear-gradient(165deg, #0B1220, #050810)',
        borderColor: `${profile.signatureColor}50`,
        borderRadius: '2px',
        boxShadow: `0 12px 32px rgba(0,0,0,0.6), 0 0 24px ${profile.signatureColor}25`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${profile.signatureColor}, transparent)`,
          boxShadow: `0 0 8px ${profile.signatureColor}`,
        }}
      />
      <div
        className="text-[9px] font-mono tracking-[0.3em] uppercase mb-2"
        style={{ color: profile.signatureColor }}
      >
        {profile.rank}
      </div>
      <h3 className="text-2xl font-black mb-2">{profile.callsign}</h3>
      <p
        className="text-xs italic mb-4 leading-relaxed"
        style={{ color: '#94A3B8', borderLeft: `2px solid ${profile.signatureColor}`, paddingLeft: '0.75rem' }}
      >
        &ldquo;{profile.catchphrase}&rdquo;
      </p>
      <div className="flex flex-wrap gap-1.5">
        {profile.gear.map((g) => (
          <span
            key={g}
            className="text-[9px] font-mono px-2 py-0.5"
            style={{
              color: '#22D3EE',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: '2px',
            }}
          >
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}

function RosterRow({
  title,
  subtitle,
  hawks,
}: {
  title: string;
  subtitle: string;
  hawks: HawkCardData[];
}) {
  return (
    <div className="mb-14">
      <div
        className="flex items-baseline gap-4 mb-6 pb-3 border-b"
        style={{ borderColor: 'rgba(245,166,35,0.15)' }}
      >
        <h3 className="text-2xl font-black">{title}</h3>
        <div className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: '#22D3EE' }}>
          {subtitle}
        </div>
      </div>
      <div className="flex flex-wrap gap-6 justify-center md:justify-start">
        {hawks.map((h, i) => (
          <motion.div
            key={h.profile.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          >
            <HawkCard data={h} size="md" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TierCard({
  tierId,
  name,
  tagline,
  price,
  features,
  featured,
  cta,
  color,
}: {
  tierId: 'lil_hawk_solo' | 'sqwaad' | 'sqwaadrun_commander';
  name: string;
  tagline: string;
  price: string;
  features: string[];
  featured?: boolean;
  cta: string;
  color: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/sqwaadrun/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });
      const data = await res.json();

      // Owner bypass — server returns owner_bypass:true and we redirect
      // to the dashboard without any Stripe interaction (Phase 0).
      if (data?.owner_bypass) {
        window.location.href = data.redirect_url ?? '/smelter-os';
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = '/auth/login?next=/plug/sqwaadrun';
      } else {
        alert(data?.error || 'Checkout failed. Try again.');
      }
    } catch {
      alert('Checkout failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`p-7 border relative ${featured ? 'md:scale-105' : ''}`}
      style={{
        borderColor: featured ? color : `${color}40`,
        background: featured
          ? `linear-gradient(180deg, ${color}10, transparent)`
          : 'rgba(11,18,32,0.5)',
        borderRadius: '3px',
        boxShadow: featured ? `0 0 40px ${color}25` : 'none',
        borderWidth: featured ? '2px' : '1px',
      }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[9px] font-mono tracking-[0.25em] font-bold whitespace-nowrap"
          style={{ background: color, color: '#050810', borderRadius: '2px' }}
        >
          MOST POPULAR
        </div>
      )}
      <div className="text-xl font-black mb-1" style={{ color: '#F1F5F9' }}>
        {name}
      </div>
      <div className="text-[11px] mb-5" style={{ color: '#64748B' }}>
        {tagline}
      </div>
      <div className="text-4xl font-black mb-1" style={{ color }}>
        {price}
        <span className="text-base opacity-60 font-bold"> / mo</span>
      </div>
      <div
        className="h-px w-full my-5"
        style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }}
      />
      <ul className="space-y-2.5 mb-6">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-[12px]" style={{ color: '#CBD5E1' }}>
            <span style={{ color }}>▸</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        className="w-full py-3 font-bold text-[11px] tracking-[0.15em] disabled:opacity-50"
        onClick={handleCheckout}
        disabled={loading}
        style={{
          background: featured ? color : 'transparent',
          color: featured ? '#050810' : color,
          border: `1px solid ${color}`,
          borderRadius: '2px',
        }}
      >
        {loading ? 'OPENING CHECKOUT...' : cta}
      </button>
    </div>
  );
}
