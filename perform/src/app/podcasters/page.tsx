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

const TIER_ORDER: PlanTier[] = ['free', 'bmc', 'premium', 'bucket_list', 'lfg'];

const TIER_ACCENT: Record<PlanTier, string> = {
  free: '#8B94A8',
  bmc: '#22D3EE',
  premium: '#FFD700',
  bucket_list: '#F97316',
  lfg: '#D40028',
};

const FEATURES = [
  {
    title: 'War Room',
    description: 'Your team data command center. Rosters, depth charts, cap numbers, injury reports — all in one broadcast-grade dashboard.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Workbench',
    description: 'AI-assisted script editor. Talking points, segment outlines, stat-backed takes — write show prep in minutes, not hours.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    title: 'Distribution',
    subtitle: 'Coming Soon',
    description: 'Clip generation, social posts, and cross-platform scheduling. Create once, publish everywhere.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    title: 'Hawks',
    description: 'AI data squadrons that scrape, summarize, and deliver intel straight to your War Room. Your research team on autopilot.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
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
            href="/podcasters/onboarding"
            className="opacity-80 hover:opacity-100 transition"
            style={{ color: T.gold }}
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <header className="relative overflow-hidden" style={{ background: T.surface }}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 mb-5">
            <span
              className="px-2.5 py-1 text-[10px] font-bold tracking-[0.2em] rounded"
              style={{ background: T.red, color: '#FFFFFF' }}
            >
              NEW
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: T.textMuted }}>
              Per|Form Platform
            </span>
          </div>
          <h1
            className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight"
            style={{ color: T.text }}
          >
            Your Draft
            <br />
            <span style={{ color: T.gold }}>Command Center</span>
          </h1>
          <p className="text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed" style={{ color: T.textMuted }}>
            AI-powered show prep, team data, and content creation for sports podcasters.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/podcasters/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:shadow-lg hover:shadow-yellow-900/20"
              style={{ background: T.gold, color: T.bg }}
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══ FEATURE CARDS ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Everything You Need</h2>
          <p className="mt-3 text-sm" style={{ color: T.textMuted }}>
            Built for sports podcasters who take their content seriously.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-8 transition-all hover:shadow-lg hover:shadow-yellow-900/10"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <div className="mb-5">{f.icon}</div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-bold">{f.title}</h3>
                {f.subtitle && (
                  <span
                    className="px-2 py-0.5 text-[9px] font-bold tracking-wider rounded"
                    style={{ background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}` }}
                  >
                    {f.subtitle}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PLAN TIERS ═══ */}
      <section className="py-20" style={{ background: T.surface }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Choose Your Tier</h2>
            <p className="mt-3 text-sm" style={{ color: T.textMuted }}>
              Start free. Scale when you are ready.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIER_ORDER.map((tier) => {
              const plan = PLAN_FEATURES[tier];
              const accent = TIER_ACCENT[tier];
              return (
                <div
                  key={tier}
                  className="rounded-xl p-6 flex flex-col"
                  style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderTop: `3px solid ${accent}`,
                  }}
                >
                  <div
                    className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
                    style={{ color: accent }}
                  >
                    {plan.name}
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

      {/* ═══ FOOTER CTA ═══ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Ready to Level Up Your Show?
          </h2>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: T.textMuted }}>
            Join the draft. Get access to the same data tools the pros use.
          </p>
          <Link
            href="/podcasters/onboarding"
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:shadow-lg hover:shadow-yellow-900/20"
            style={{ background: T.gold, color: T.bg }}
          >
            Join the Draft
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

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
