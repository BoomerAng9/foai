'use client';

/**
 * /smelter-os — SmelterOS Bridge (owner ops)
 * ==============================================
 * Landing page. Matches the "FORGE THE FUTURE OF INTELLIGENCE"
 * guide image. Ported visual language from the smelteros-starter
 * Vite project into Next.js:
 *   - Doto pixel display font
 *   - Molten orange (#FF5722) + obsidian (#050505) + charcoal
 *   - Glass-card headers with backdrop blur
 *   - Ember radial background
 *   - smelter-glow text-shadow
 *
 * Owner-only per middleware + per-route isOwner() checks.
 * Wires the essentials: Sqwaadrun access + Puter memory access.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  ArrowRight,
  Bot,
  FolderTree,
  BookOpen,
  Scale,
  Bird,
  Radio,
  Database,
  Cpu,
  Brain,
  ClipboardList,
  Palette,
  Award,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface FleetResponse {
  command: Array<{ callsign: string; role: string; status: string }>;
  boomer_angs: Array<{ callsign: string; status: string }>;
  sqwaadrun: {
    gateway_healthy: boolean;
    roster: {
      total_hawks: number;
      hawks: Array<{ name: string; status: string }>;
    } | null;
  };
}

interface DoctrineStats {
  stats: {
    total: number;
    completed: number;
    failed: number;
  };
}

export default function SmelterOSLanding() {
  const { user } = useAuth();
  const [fleet, setFleet] = useState<FleetResponse | null>(null);
  const [doctrine, setDoctrine] = useState<DoctrineStats | null>(null);
  const [puterHealthy, setPuterHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !isOwner(user.email)) return;
    Promise.all([
      fetch('/api/smelter-os/fleet').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/smelter-os/doctrine?limit=1').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/smelter-os/files?path=').then((r) => r.ok).catch(() => false),
    ]).then(([f, d, p]) => {
      setFleet(f);
      setDoctrine(d);
      setPuterHealthy(p);
    });
  }, [user]);

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  const hawksOnline =
    fleet?.sqwaadrun.roster?.hawks.filter((h) => h.status === 'active').length ?? 0;
  const hawksTotal = fleet?.sqwaadrun.roster?.total_hawks ?? 17;
  const gatewayHealthy = fleet?.sqwaadrun.gateway_healthy ?? false;
  const totalMissions = doctrine?.stats.total ?? 0;

  return (
    <div
      className="min-h-screen text-white selection:bg-[#ff5722] selection:text-white overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ═══ NAV — glass-card header pill ═══ */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between smelter-glass px-5 sm:px-6 py-3 rounded-xl">
          <Link href="/smelter-os" className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-lg border"
              style={{
                background: 'rgba(255,87,34,0.1)',
                borderColor: 'rgba(255,87,34,0.35)',
              }}
            >
              <Flame className="w-5 h-5" style={{ color: '#ff5722' }} />
            </div>
            <span className="font-doto text-lg tracking-tight font-black">SmelterOS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            <SmelterNavLink href="/smelter-os/files">MEMORY</SmelterNavLink>
            <SmelterNavLink href="/smelter-os/fleet">FLEET</SmelterNavLink>
            <SmelterNavLink href="/smelter-os/doctrine">DOCTRINE</SmelterNavLink>
          </nav>

          <Link
            href="/chat"
            className="flex items-center gap-2 text-xs font-medium tracking-widest smelter-glass smelter-glass-hover px-4 py-2 rounded-lg transition-all"
          >
            CHAT <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center pt-24 px-4 sm:px-6 smelter-ember-bg overflow-hidden">
        {/* Furnace radial overlay */}
        <div
          className="absolute inset-0 z-0 opacity-25 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 85% 55%, rgba(255,87,34,0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,87,34,0.15) 0%, transparent 40%)',
          }}
        />
        <EmberLayer />

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="flex flex-col gap-6">
            {/* System Online pill */}
            <div
              className="inline-flex items-center gap-3 smelter-glass px-4 py-1.5 rounded-full border w-fit"
              style={{ borderColor: 'rgba(255,87,34,0.4)' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full smelter-ember-pulse"
                style={{ background: '#ff5722' }}
              />
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: '#ff5722' }}
              >
                System Online · v2.4
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-doto font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight uppercase max-w-5xl">
              FORGE THE
              <br />
              FUTURE <span className="opacity-40">OF</span>
              <br />
              <span className="smelter-glow" style={{ color: '#ff5722' }}>
                INTELLIGENCE
              </span>
            </h1>

            {/* Tagline */}
            <div className="flex gap-5 items-start max-w-2xl mt-2">
              <div
                className="w-0.5 h-20 shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #ff5722 0%, transparent 100%)',
                  opacity: 0.6,
                }}
              />
              <p className="text-base sm:text-lg text-white/70 leading-relaxed">
                The world&apos;s first{' '}
                <span className="text-white font-semibold">
                  Alchemical AI-native Operating System
                </span>
                . Transmute raw data into golden insights with SmelterOS.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href="/sqwaadrun"
                className="font-bold tracking-wider text-sm flex items-center gap-3 px-7 py-3.5 transition-all"
                style={{
                  background: '#ff5722',
                  color: 'white',
                  boxShadow: '0 0 30px rgba(255,87,34,0.4), 0 0 60px rgba(255,87,34,0.15)',
                }}
              >
                <Flame className="w-5 h-5" /> ENTER THE FOUNDRY
              </Link>
              <Link
                href="/chat"
                className="smelter-glass smelter-glass-hover font-bold tracking-wider text-sm flex items-center gap-3 px-7 py-3.5 transition-all"
              >
                <Bot className="w-5 h-5" /> CONSULT ACHEEVY
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LIVE STATUS STRIP ═══ */}
      <section
        className="relative px-4 sm:px-6 py-10 border-y"
        style={{
          borderColor: 'rgba(255,87,34,0.15)',
          background: 'rgba(18,18,18,0.8)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-5 uppercase"
            style={{ color: '#ff5722' }}
          >
            / System telemetry
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusTile
              label="Sqwaadrun Gateway"
              value={gatewayHealthy ? 'ARMED' : 'OFFLINE'}
              active={gatewayHealthy}
              icon={Bird}
            />
            <StatusTile
              label="Hawks Active"
              value={`${hawksOnline} / ${hawksTotal}`}
              active={hawksOnline > 0}
              icon={Cpu}
            />
            <StatusTile
              label="Puter Memory"
              value={puterHealthy === null ? '…' : puterHealthy ? 'ONLINE' : 'OFFLINE'}
              active={puterHealthy === true}
              icon={Database}
            />
            <StatusTile
              label="Missions Dispatched"
              value={String(totalMissions)}
              active={totalMissions > 0}
              icon={Radio}
            />
          </div>
        </div>
      </section>

      {/* ═══ ESSENTIALS — Command Surfaces ═══ */}
      <section className="relative px-4 sm:px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <div
              className="text-[10px] font-mono tracking-[0.3em] mb-3 uppercase"
              style={{ color: '#ff5722' }}
            >
              / Command Surfaces
            </div>
            <h2 className="font-doto font-black text-3xl md:text-5xl uppercase leading-tight">
              THE <span style={{ color: '#ff5722' }}>ESSENTIALS</span>
            </h2>
            <p className="text-sm text-white/50 mt-3 max-w-2xl">
              Direct lines into the fleet, the memory stores, and the doctrine audit. Every surface
              gated to owner access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SurfaceCard
              href="/sqwaadrun"
              icon={Flame}
              label="THE FOUNDRY"
              title="Sqwaadrun"
              description="Deploy the 17-Hawk fleet. Dispatch missions, view results, manage quota."
              accent="#ff5722"
              highlight
            />
            <SurfaceCard
              href="/smelter-os/files"
              icon={FolderTree}
              label="MEMORY"
              title="Puter File Tree"
              description="Browse /smelter-os/ — missions, ingots, media, chronicle, doctrine."
              accent="#ff7a45"
            />
            <SurfaceCard
              href="/smelter-os/fleet"
              icon={Bird}
              label="FLEET"
              title="Agent Roster"
              description="Command tier, Boomer_Angs, 17 Lil_Hawks with live gateway status."
              accent="#ffa76b"
            />
            <SurfaceCard
              href="/smelter-os/chronicle"
              icon={BookOpen}
              label="CHRONICLE"
              title="Ledger + Charter"
              description="Internal audit (heartbeats, mission events) and customer-facing log."
              accent="#ff9555"
            />
            <SurfaceCard
              href="/smelter-os/doctrine"
              icon={Scale}
              label="DOCTRINE"
              title="Mission Audit"
              description="General_Ang's full mission journal across every tenant."
              accent="#ff8340"
            />
            <SurfaceCard
              href="/chat"
              icon={Bot}
              label="ACHEEVY"
              title="Digital CEO"
              description="Delegate, don't generate. Talk to the Digital CEO of the platform."
              accent="#ffb078"
            />
            <SurfaceCard
              href="/smelter-os/create"
              icon={Brain}
              label="OPEN MIND · SPECIALIST"
              title="Creation Harness"
              description="Only for building what doesn't exist yet — new systems, architectures, products, strategies. NOT for routine work, bug fixes, config changes, or data retrieval — those go straight to ACHEEVY."
              accent="#ffc49a"
            />
            <SurfaceCard
              href="/smelter-os/forms"
              icon={ClipboardList}
              label="FORMS"
              title="Intake Builder"
              description="Onboarding, needs analysis, feedback, booking, payment forms via Pipedream MCP. Tenant-scoped submission storage."
              accent="#ffa76b"
            />
            <SurfaceCard
              href="/smelter-os/creative"
              icon={Palette}
              label="ILLER_ANG"
              title="Creative Studio"
              description="13 output categories — player cards, broadcast graphics, character art, NFT cards, motion landing pages."
              accent="#ff8340"
            />
            <SurfaceCard
              href="/smelter-os/tie"
              icon={Award}
              label="TIE ENGINE"
              title="Talent & Innovation Engine"
              description="Platform-wide talent grading framework. Three pillars (T/I/E) across six domains — Sports, Workforce, Student, Contractor, Founder, Creative. One canonical scale: Prime 🛸 to UDFA."
              accent="#ffb078"
            />
          </div>
        </div>
      </section>

      {/* ═══ BACKEND WIRING — honest health strip ═══ */}
      <section
        className="relative px-4 sm:px-6 py-10 border-t"
        style={{ borderColor: 'rgba(255,87,34,0.15)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-5 uppercase"
            style={{ color: '#ff5722' }}
          >
            / Backend Wiring
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <WireStatus
              label="Puter"
              sub="Smelter OS native storage"
              healthy={puterHealthy === true}
              detail="Self-hosted Docker container. Primary for missions, ingots, chronicle, doctrine."
            />
            <WireStatus
              label="GCS"
              sub="Scalable CDN + backup"
              healthy={false}
              detail="Four buckets in foai-aims. Write-through secondary. Public CDN on ingots + media."
            />
            <WireStatus
              label="Neon"
              sub="Structured queryable data"
              healthy={doctrine !== null}
              detail="sqwaadrun_staging + public.profiles. Mission log, enrichment, quota state."
            />
          </div>

          {(!gatewayHealthy || !puterHealthy) && (
            <div
              className="mt-6 p-4 border-l-2 text-[11px] font-mono"
              style={{
                borderColor: '#ff5722',
                background: 'rgba(255,87,34,0.06)',
                color: '#ffaa88',
              }}
            >
              ⚠ One or more backends offline. Run{' '}
              <code className="text-white">./smelter-os/sqwaadrun/deploy/deploy-master.sh</code> to
              wire everything up. See{' '}
              <code className="text-white">deploy/BACKEND_WIRING.md</code> for the 9-step sequence.
            </div>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="relative px-4 sm:px-6 py-8 border-t"
        style={{ borderColor: 'rgba(255,87,34,0.1)' }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <div
            className="text-[9px] font-mono tracking-[0.35em] uppercase opacity-40"
            style={{ color: '#ff5722' }}
          >
            ACHIEVEMOR · Smelter OS v2.4 · Forge the Future
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function SmelterNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[11px] font-medium tracking-[0.2em] uppercase transition-colors hover:text-[#ff5722]"
      style={{ color: 'rgba(255,255,255,0.85)' }}
    >
      {children}
    </Link>
  );
}

function StatusTile({
  label,
  value,
  active,
  icon: Icon,
}: {
  label: string;
  value: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="smelter-glass p-4 border-t"
      style={{
        borderTopColor: active ? '#ff5722' : 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon
          className="w-4 h-4"
          style={{ color: active ? '#ff5722' : 'rgba(255,255,255,0.3)' }}
        />
        {active && (
          <div
            className="w-1.5 h-1.5 rounded-full smelter-ember-pulse"
            style={{ background: '#ff5722' }}
          />
        )}
      </div>
      <div className="text-[9px] font-mono tracking-[0.25em] uppercase opacity-60 mb-1">{label}</div>
      <div
        className={`font-doto font-black text-2xl ${active ? 'smelter-glow-soft' : ''}`}
        style={{ color: active ? '#ff5722' : 'rgba(255,255,255,0.4)' }}
      >
        {value}
      </div>
    </div>
  );
}

function SurfaceCard({
  href,
  icon: Icon,
  label,
  title,
  description,
  accent,
  highlight,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  title: string;
  description: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block smelter-glass smelter-glass-hover p-6 transition-all"
      style={{
        borderRadius: '3px',
        borderTop: `2px solid ${accent}${highlight ? '80' : '40'}`,
        boxShadow: highlight ? `0 -4px 30px -10px ${accent}80` : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-lg border"
          style={{
            background: `${accent}15`,
            borderColor: `${accent}40`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <ArrowRight
          className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
          style={{ color: accent }}
        />
      </div>
      <div
        className="text-[9px] font-mono tracking-[0.25em] uppercase mb-1"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="font-doto font-black text-xl mb-2 uppercase tracking-tight">{title}</div>
      <div className="text-xs text-white/55 leading-relaxed">{description}</div>
    </Link>
  );
}

function WireStatus({
  label,
  sub,
  healthy,
  detail,
}: {
  label: string;
  sub: string;
  healthy: boolean;
  detail: string;
}) {
  return (
    <div className="smelter-glass p-4" style={{ borderRadius: '2px' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: healthy ? '#ff5722' : 'rgba(255,255,255,0.2)',
            boxShadow: healthy ? '0 0 6px #ff5722' : 'none',
          }}
        />
        <div
          className="text-[11px] font-bold tracking-wide"
          style={{ color: healthy ? '#ff5722' : 'rgba(255,255,255,0.5)' }}
        >
          {label}
        </div>
        <div className="text-[9px] font-mono opacity-50 ml-auto">
          {healthy ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>
      <div className="text-[10px] font-mono opacity-60 mb-1">{sub}</div>
      <div className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {detail}
      </div>
    </div>
  );
}

function EmberLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50" aria-hidden>
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full smelter-ember-pulse"
          style={{
            background: '#ff5722',
            left: `${(i * 8.3 + 15) % 100}%`,
            top: `${(i * 13.7 + 20) % 100}%`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}

function OwnerGate() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 smelter-ember-bg"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="text-center max-w-md">
        <div
          className="inline-flex items-center gap-3 smelter-glass px-4 py-1.5 rounded-full border mb-6"
          style={{ borderColor: 'rgba(255,87,34,0.4)' }}
        >
          <Flame className="w-3 h-3" style={{ color: '#ff5722' }} />
          <span
            className="text-[10px] font-bold tracking-[0.3em] uppercase"
            style={{ color: '#ff5722' }}
          >
            Owner Access Required
          </span>
        </div>
        <h1 className="font-doto font-black text-4xl md:text-5xl mb-4 uppercase leading-tight">
          SMELTER<span style={{ color: '#ff5722' }}>OS</span>
        </h1>
        <p className="text-sm text-white/60 mb-8">
          The foundry is owner-only. Sign in with an allowlisted email to access the fleet, the
          memory stores, and the doctrine audit.
        </p>
        <Link
          href="/auth/login?next=/smelter-os"
          className="inline-flex items-center gap-2 font-bold text-sm tracking-wider px-7 py-3.5"
          style={{
            background: '#ff5722',
            color: 'white',
            boxShadow: '0 0 30px rgba(255,87,34,0.35)',
          }}
        >
          SIGN IN <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
