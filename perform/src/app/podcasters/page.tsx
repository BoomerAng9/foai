import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { PLAN_FEATURES, type PlanTier } from '@/lib/podcasters/plans';

/* ── Theme tokens (dark broadcast) ──────────────────────── */
const T = {
  bg: '#06122A',
  surface: '#0B1E3F',
  surfaceAlt: '#112A52',
  border: '#1E3A5F',
  text: '#F4F6FA',
  textMuted: '#8B94A8',
  gold: '#FFD700',
  red: '#D40028',
  green: '#22C55E',
  cyan: '#22D3EE',
};

type DisplayTier = PlanTier | 'free';

const TIER_ORDER: DisplayTier[] = ['free', 'bmc', 'premium', 'bucket_list', 'lfg'];

const TIER_ACCENT: Record<DisplayTier, string> = {
  free: '#8B94A8',
  bmc: '#22D3EE',
  premium: '#FFD700',
  bucket_list: '#F97316',
  lfg: '#D40028',
};

const TIER_PRICE: Record<DisplayTier, string> = {
  free: 'Free',
  bmc: '$7/mo',
  premium: '$29/mo',
  bucket_list: '$79/mo',
  lfg: 'Custom',
};

const FREE_PLAN = {
  name: 'Free',
  description: 'Limited preview. Upgrade to BMC for full access.',
  warRoom: false,
  workbench: false,
  distribution: false,
  customHawks: false,
  whiteLabel: false,
};

const FEATURES = [
  {
    tag: 'WAR ROOM',
    title: 'Team Intelligence Dossier',
    description: 'Rosters, depth charts, cap data, injury reports — your team\'s complete intelligence dossier refreshed by Hawk scouts every cycle.',
    preview: 'LIVE ROSTER + DRAFT PICKS + BREAKING NEWS',
    accent: T.red,
  },
  {
    tag: 'WORKBENCH',
    title: 'AI Script Editor',
    description: 'Talking points, segment outlines, stat-backed takes — write show prep in minutes, not hours. Inject War Room data with one click.',
    preview: '5 EPISODE TEMPLATES + MONOSPACE EDITOR',
    accent: T.gold,
  },
  {
    tag: 'DISTRIBUTION',
    title: 'Publish Everywhere',
    subtitle: 'Coming Soon',
    description: 'Clip generation, social posts, and cross-platform scheduling. Create once, publish to YouTube, Instagram, TikTok, and X.',
    preview: 'MULTI-PLATFORM CLIP EXPORT',
    accent: T.cyan,
  },
  {
    tag: 'HAWKS',
    title: 'AI Scout Squadrons',
    description: 'Autonomous data agents that scrape, summarize, and deliver intel straight to your War Room. Your research team on autopilot.',
    preview: 'AUTOMATED INTEL DELIVERY',
    accent: '#F97316',
  },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6478" strokeWidth="3">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function PodcastersLandingPage() {
  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Per|Form for Podcasters</span>
          </div>
          <Link
            href="/podcasters/war-room"
            className="opacity-80 hover:opacity-100 transition"
            style={{ color: T.gold }}
          >
            Browse War Room
          </Link>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <header className="relative overflow-hidden" style={{ background: T.surface }}>
        {/* Diagonal line pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }}
        />
        {/* Red gradient wash */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${T.red}, transparent 70%)`,
          }}
        />
        {/* Gold gradient wash */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background: `radial-gradient(ellipse at 70% 30%, ${T.gold}, transparent 60%)`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <span
              className="px-3 py-1.5 text-[10px] font-black tracking-[0.25em] rounded"
              style={{ background: T.red, color: '#FFFFFF' }}
            >
              LIVE
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: T.textMuted }}>
              Per|Form Platform
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-[0.88] tracking-tight">
            Your Draft
            <br />
            <span style={{ color: T.gold }}>Command Center</span>
          </h1>

          <p className="text-lg md:text-xl mt-8 max-w-2xl mx-auto leading-relaxed" style={{ color: T.textMuted }}>
            AI-powered show prep, real-time team intel, and content creation tools built for sports podcasters who take their craft seriously.
          </p>

          {/* ═══ STATS TICKER ═══ */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mt-12 text-xs font-mono tracking-wider" style={{ color: T.textMuted }}>
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-black" style={{ color: T.gold }}>32</span>
              <span className="mt-1">NFL TEAMS</span>
            </div>
            <div className="w-px h-10" style={{ background: T.border }} />
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-black" style={{ color: T.gold }}>450+</span>
              <span className="mt-1">PROSPECTS</span>
            </div>
            <div className="w-px h-10" style={{ background: T.border }} />
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-black" style={{ color: T.gold }}>24/7</span>
              <span className="mt-1">HAWK INTEL</span>
            </div>
          </div>

          {/* ═══ DUAL CTA ═══ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <Link
              href="/podcasters/war-room"
              className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:shadow-lg"
              style={{ background: 'transparent', color: T.gold, border: `2px solid ${T.gold}` }}
            >
              Browse the War Room
            </Link>
            <Link
              href="/podcasters/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:shadow-lg hover:shadow-yellow-900/20"
              style={{ background: T.gold, color: T.bg }}
            >
              Create Your Command Center
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ FEATURE SEGMENTS ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: T.red }}>
            The Toolkit
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-3">
            Everything You Need
          </h2>
          <p className="mt-4 text-sm" style={{ color: T.textMuted }}>
            Built for sports podcasters who take their content seriously.
          </p>
        </div>

        <div className="space-y-12">
          {FEATURES.map((f, i) => (
            <div
              key={f.tag}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-stretch`}
            >
              {/* Text block */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative pl-7" style={{ borderLeft: `3px solid ${f.accent}` }}>
                  <div
                    className="absolute -left-[7px] top-0 w-3.5 h-3.5 rounded-full"
                    style={{ background: f.accent }}
                  />
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="px-2.5 py-1 text-[9px] font-black tracking-[0.25em] rounded"
                      style={{ background: `${f.accent}20`, color: f.accent, border: `1px solid ${f.accent}40` }}
                    >
                      {f.tag}
                    </span>
                    {f.subtitle && (
                      <span
                        className="px-2 py-0.5 text-[8px] font-bold tracking-wider rounded"
                        style={{ background: T.surfaceAlt, color: T.textMuted }}
                      >
                        {f.subtitle}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-3">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                    {f.description}
                  </p>
                </div>
              </div>

              {/* Preview block */}
              <div className="flex-1">
                <div
                  className="rounded-xl h-full min-h-[200px] flex items-center justify-center text-xs font-mono tracking-wider relative overflow-hidden"
                  style={{
                    background: T.surfaceAlt,
                    border: `1px solid ${T.border}`,
                    color: T.textMuted,
                  }}
                >
                  {/* Accent glow */}
                  <div
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }}
                  />
                  <div className="text-center px-6">
                    <div className="text-[10px] font-black tracking-[0.3em] mb-2 uppercase" style={{ color: f.accent }}>
                      {f.tag}
                    </div>
                    <div className="text-xs" style={{ color: T.textMuted }}>
                      {f.preview}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PLAN TIERS ═══ */}
      <section className="py-24" style={{ background: T.surface }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: T.gold }}>
              Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-3">
              Choose Your Tier
            </h2>
            <p className="mt-4 text-sm" style={{ color: T.textMuted }}>
              Start free. Scale when you are ready.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIER_ORDER.map((tier) => {
              const plan = tier === 'free' ? FREE_PLAN : PLAN_FEATURES[tier];
              const accent = TIER_ACCENT[tier];
              const isPopular = tier === 'premium';
              return (
                <div
                  key={tier}
                  className="rounded-xl p-6 flex flex-col relative"
                  style={{
                    background: T.bg,
                    border: `1px solid ${isPopular ? T.gold : T.border}`,
                    borderTop: `3px solid ${accent}`,
                    boxShadow: isPopular ? `0 0 30px ${T.gold}15` : undefined,
                  }}
                >
                  {isPopular && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[8px] font-black tracking-[0.2em] rounded-full"
                      style={{ background: T.gold, color: T.bg }}
                    >
                      MOST POPULAR
                    </span>
                  )}
                  <div
                    className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1"
                    style={{ color: accent }}
                  >
                    {plan.name}
                  </div>
                  <div className="text-xl font-black mb-2" style={{ color: T.text }}>
                    {TIER_PRICE[tier]}
                  </div>
                  <p className="text-xs leading-relaxed mb-5 flex-1" style={{ color: T.textMuted }}>
                    {plan.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      {plan.warRoom ? <CheckIcon /> : <XIcon />}
                      <span style={{ color: plan.warRoom ? T.text : T.textMuted }}>War Room</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {plan.workbench ? <CheckIcon /> : <XIcon />}
                      <span style={{ color: plan.workbench ? T.text : T.textMuted }}>Workbench</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {plan.distribution ? <CheckIcon /> : <XIcon />}
                      <span style={{ color: plan.distribution ? T.text : T.textMuted }}>Distribution</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {plan.customHawks ? <CheckIcon /> : <XIcon />}
                      <span style={{ color: plan.customHawks ? T.text : T.textMuted }}>Custom Hawks</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {plan.whiteLabel ? <CheckIcon /> : <XIcon />}
                      <span style={{ color: plan.whiteLabel ? T.text : T.textMuted }}>White Label</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Ready to Level Up
            <br />
            <span style={{ color: T.gold }}>Your Show?</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed" style={{ color: T.textMuted }}>
            Join the draft. Get access to the same data tools the pros use.
            <br />
            No paywall — browse everything first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/podcasters/war-room"
              className="px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all"
              style={{ background: 'transparent', color: T.gold, border: `2px solid ${T.gold}` }}
            >
              Browse the War Room
            </Link>
            <Link
              href="/podcasters/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:shadow-lg hover:shadow-yellow-900/20"
              style={{ background: T.gold, color: T.bg }}
            >
              Join the Draft
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <div
        className="py-4 text-center text-[10px] font-bold tracking-[0.25em] uppercase"
        style={{ background: T.surfaceAlt, color: T.textMuted, borderTop: `1px solid ${T.border}` }}
      >
        Powered by Per|Form · Published by ACHIEVEMOR
      </div>

      {/* ═══ FOOTER BAR ═══ */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em]"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM FOR PODCASTERS · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
