'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NFL_TEAMS } from '@/lib/podcasters/team-assets';
import { PLAN_FEATURES, type PlanTier } from '@/lib/podcasters/plans';
import TeamSelector from './TeamSelector';

/* ── Theme tokens ──────────────────────────────────────── */
const T = {
  bg: '#0a0a0f',
  surface: '#111118',
  surfaceAlt: '#1a1a24',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.4)',
  gold: '#D4A853',
  goldDim: 'rgba(212,168,83,0.15)',
  goldBorder: 'rgba(212,168,83,0.3)',
  error: '#EF4444',
  green: '#22C55E',
};

const TOTAL_STEPS = 7;

const PLATFORMS = [
  'YouTube',
  'Spotify',
  'Apple Podcasts',
  'iHeartRadio',
  'Amazon Music',
  'Other',
];

type DisplayTier = PlanTier | 'free';

const TIER_ORDER: DisplayTier[] = ['free', 'bmc', 'premium', 'bucket_list', 'lfg'];

const TIER_ACCENT: Record<DisplayTier, string> = {
  free: '#8B94A8',
  bmc: '#22D3EE',
  premium: '#FFD700',
  bucket_list: '#F97316',
  lfg: '#D40028',
};

const FREE_PLAN = {
  name: 'Free',
  description: 'Limited preview. Upgrade to BMC for full access.',
  warRoom: false,
  workbench: false,
  distribution: false,
  customHawks: false,
  whiteLabel: false,
  maxScriptsPerMonth: 0,
  maxClipsPerMonth: 0,
  maxEpisodePackages: 0,
  hawkScrapesPerMonth: 0,
  dailyBriefing: false,
  guestResearch: false,
  sponsorScan: false,
  clipsPerEpisode: 0,
};

const FEATURE_LABELS: { key: keyof typeof FREE_PLAN; label: string }[] = [
  { key: 'warRoom', label: 'War Room' },
  { key: 'workbench', label: 'Workbench' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'customHawks', label: 'Custom Hawks' },
  { key: 'whiteLabel', label: 'White Label' },
];

interface FormData {
  podcaster_name: string;
  podcast_name: string;
  location: string;
  subscriber_count: number;
  primary_platforms: string[];
  primary_vertical: string;
  addon_vertical: string | null;
  mission: string;
  vision: string;
  objectives: [string, string, string];
  needs_analysis: string;
  selected_team: string | null;
  plan_tier: DisplayTier;
}

function sanitize(val: string): string {
  return val.replace(/[<>]/g, '').trim();
}

export default function OnboardingStepper() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    podcaster_name: '',
    podcast_name: '',
    location: '',
    subscriber_count: 0,
    primary_platforms: [],
    primary_vertical: '',
    addon_vertical: null,
    mission: '',
    vision: '',
    objectives: ['', '', ''],
    needs_analysis: '',
    selected_team: null,
    plan_tier: 'free',
  });

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const togglePlatform = useCallback((platform: string) => {
    setForm((prev) => {
      const platforms = prev.primary_platforms.includes(platform)
        ? prev.primary_platforms.filter((p) => p !== platform)
        : [...prev.primary_platforms, platform];
      return { ...prev, primary_platforms: platforms };
    });
  }, []);

  const updateObjective = useCallback((idx: number, val: string) => {
    setForm((prev) => {
      const objs: [string, string, string] = [...prev.objectives];
      objs[idx] = val;
      return { ...prev, objectives: objs };
    });
  }, []);

  /* ── Validation ──────────────────────────────────────── */
  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!form.podcaster_name.trim()) errs.podcaster_name = 'Your name is required';
      if (!form.podcast_name.trim()) errs.podcast_name = 'Podcast name is required';
    }
    if (s === 2) {
      if (!form.primary_vertical) errs.primary_vertical = 'Select a league';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    // Skip step 3 if vertical is nba or mlb (shouldn't happen but guard)
    let nextStep = step + 1;
    if (nextStep === 3 && !['nfl', 'cfb'].includes(form.primary_vertical)) {
      nextStep = 4;
    }
    setStep(Math.min(nextStep, TOTAL_STEPS));
  }

  function back() {
    let prevStep = step - 1;
    if (prevStep === 3 && !['nfl', 'cfb'].includes(form.primary_vertical)) {
      prevStep = 2;
    }
    setStep(Math.max(prevStep, 1));
  }

  /* ── Submit ──────────────────────────────────────────── */
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        podcaster_name: sanitize(form.podcaster_name),
        podcast_name: sanitize(form.podcast_name),
        location: sanitize(form.location),
        subscriber_count: Math.max(0, Math.floor(form.subscriber_count)),
        primary_platforms: form.primary_platforms,
        primary_vertical: form.primary_vertical,
        addon_vertical: form.addon_vertical,
        selected_team: form.selected_team,
        plan_tier: form.plan_tier,
        mission: sanitize(form.mission),
        vision: sanitize(form.vision),
        objectives: form.objectives.map(sanitize).filter(Boolean),
        needs_analysis: sanitize(form.needs_analysis),
      };

      const res = await fetch('/api/podcasters/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/podcasters/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step indicator ──────────────────────────────────── */
  function StepIndicator() {
    const labels = ['Account', 'League', 'Add-On', 'Mission', 'Team', 'Plan', 'Launch'];
    return (
      <div className="flex items-center justify-center gap-1 mb-10">
        {labels.map((label, i) => {
          const num = i + 1;
          const isActive = num === step;
          const isDone = num < step;
          return (
            <div key={num} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className="w-6 h-px"
                  style={{ background: isDone ? T.gold : T.border }}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: isActive ? T.gold : isDone ? T.goldDim : T.surface,
                    color: isActive ? T.bg : isDone ? T.gold : T.textMuted,
                    border: `1.5px solid ${isActive ? T.gold : isDone ? T.goldBorder : T.border}`,
                  }}
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    num
                  )}
                </div>
                <span
                  className="text-[9px] font-bold tracking-[0.15em] uppercase hidden sm:block"
                  style={{ color: isActive ? T.gold : T.textMuted }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Field helpers ───────────────────────────────────── */
  function FieldError({ field }: { field: string }) {
    if (!errors[field]) return null;
    return (
      <p className="text-xs mt-1.5 font-medium" style={{ color: T.error }}>
        {errors[field]}
      </p>
    );
  }

  function inputStyle(field?: string): React.CSSProperties {
    return {
      background: T.surfaceAlt,
      color: T.text,
      border: `1px solid ${field && errors[field] ? T.error : T.border}`,
    };
  }

  /* ── Step 1: Account Info ────────────────────────────── */
  function Step1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Account Info
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Tell us about you and your podcast.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
              Your Name *
            </label>
            <input
              type="text"
              value={form.podcaster_name}
              onChange={(e) => updateField('podcaster_name', e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50"
              style={inputStyle('podcaster_name')}
              maxLength={100}
            />
            <FieldError field="podcaster_name" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
              Podcast Name *
            </label>
            <input
              type="text"
              value={form.podcast_name}
              onChange={(e) => updateField('podcast_name', e.target.value)}
              placeholder="The Draft Room"
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50"
              style={inputStyle('podcast_name')}
              maxLength={150}
            />
            <FieldError field="podcast_name" />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Atlanta, GA"
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50"
              style={inputStyle()}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
              Subscriber Count
            </label>
            <input
              type="number"
              value={form.subscriber_count || ''}
              onChange={(e) => updateField('subscriber_count', parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50"
              style={inputStyle()}
              min={0}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-3" style={{ color: T.textMuted }}>
            Primary Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const checked = form.primary_platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: checked ? T.goldDim : T.surface,
                    color: checked ? T.gold : T.textMuted,
                    border: `1px solid ${checked ? T.goldBorder : T.border}`,
                  }}
                >
                  {checked && (
                    <svg className="inline w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: League Selection ────────────────────────── */
  function Step2() {
    const leagues = [
      { id: 'nfl', label: 'NFL', sub: 'National Football League', enabled: true },
      { id: 'cfb', label: 'College Football', sub: 'NCAA Division I FBS', enabled: true },
      { id: 'nba', label: 'NBA', sub: 'National Basketball Association', enabled: false },
      { id: 'mlb', label: 'MLB', sub: 'Major League Baseball', enabled: false },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Choose Your League
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Select the league you cover.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leagues.map((league) => {
            const isSelected = form.primary_vertical === league.id;
            return (
              <button
                key={league.id}
                type="button"
                onClick={() => league.enabled && updateField('primary_vertical', league.id)}
                disabled={!league.enabled}
                className="relative text-left rounded-xl p-6 transition-all"
                style={{
                  background: T.surface,
                  border: isSelected
                    ? `2px solid ${T.gold}`
                    : `1px solid ${T.border}`,
                  opacity: league.enabled ? 1 : 0.5,
                  cursor: league.enabled ? 'pointer' : 'not-allowed',
                  boxShadow: isSelected ? `0 0 24px ${T.goldDim}` : 'none',
                }}
              >
                {!league.enabled && (
                  <span
                    className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold tracking-wider rounded"
                    style={{ background: T.goldDim, color: T.gold }}
                  >
                    COMING SOON
                  </span>
                )}
                <div className="text-xl font-black" style={{ color: isSelected ? T.gold : T.text }}>
                  {league.label}
                </div>
                <div className="text-xs mt-1" style={{ color: T.textMuted }}>
                  {league.sub}
                </div>
              </button>
            );
          })}
        </div>
        <FieldError field="primary_vertical" />
      </div>
    );
  }

  /* ── Step 3: Add-On Offer ────────────────────────────── */
  function Step3() {
    const isPrimNfl = form.primary_vertical === 'nfl';
    const addonId = isPrimNfl ? 'cfb' : 'nfl';
    const addonLabel = isPrimNfl ? 'College Football' : 'NFL';
    const addonDesc = isPrimNfl
      ? 'Add College Football for draft scouting? Track prospects from campus to combine.'
      : 'Add NFL coverage? Follow your college players into the pros.';
    const hasAddon = form.addon_vertical === addonId;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Add-On Coverage
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Expand your command center with a second league.
          </p>
        </div>

        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: T.surface,
            border: `1px solid ${hasAddon ? T.goldBorder : T.border}`,
          }}
        >
          <div className="text-3xl font-black mb-2" style={{ color: T.text }}>
            {addonLabel}
          </div>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: T.textMuted }}>
            {addonDesc}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => updateField('addon_vertical', addonId)}
              className="px-8 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all"
              style={{
                background: hasAddon ? T.gold : 'transparent',
                color: hasAddon ? T.bg : T.gold,
                border: `1.5px solid ${T.gold}`,
              }}
            >
              {hasAddon ? 'Added' : 'Add It'}
            </button>
            <button
              type="button"
              onClick={() => updateField('addon_vertical', null)}
              className="px-8 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all"
              style={{
                background: 'transparent',
                color: T.textMuted,
                border: `1.5px solid ${T.border}`,
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 4: Mission/Vision/Objectives ───────────────── */
  function Step4() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Mission & Vision
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Help your AI Hawks understand what matters to your show.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
            Mission Statement
          </label>
          <textarea
            value={form.mission}
            onChange={(e) => updateField('mission', e.target.value)}
            placeholder="What does your podcast stand for?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 resize-none"
            style={inputStyle()}
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
            Vision
          </label>
          <textarea
            value={form.vision}
            onChange={(e) => updateField('vision', e.target.value)}
            placeholder="Where do you want your show to be in 3 years?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 resize-none"
            style={inputStyle()}
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-3" style={{ color: T.textMuted }}>
            Goals
          </label>
          <div className="space-y-3">
            {(['3-Month', '6-Month', '12-Month'] as const).map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase w-20 flex-shrink-0 text-right"
                  style={{ color: T.gold }}
                >
                  {label}
                </span>
                <input
                  type="text"
                  value={form.objectives[i]}
                  onChange={(e) => updateObjective(i, e.target.value)}
                  placeholder={`${label} goal...`}
                  className="flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50"
                  style={inputStyle()}
                  maxLength={200}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-wider uppercase mb-2" style={{ color: T.textMuted }}>
            What tools do you need?
          </label>
          <textarea
            value={form.needs_analysis}
            onChange={(e) => updateField('needs_analysis', e.target.value)}
            placeholder="Script writing, stat tracking, clip generation, social scheduling..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 resize-none"
            style={inputStyle()}
            maxLength={500}
          />
        </div>
      </div>
    );
  }

  /* ── Step 5: Team Selection ──────────────────────────── */
  function Step5() {
    const showNfl = form.primary_vertical === 'nfl' || form.addon_vertical === 'nfl';
    const showCfb = form.primary_vertical === 'cfb' || form.addon_vertical === 'cfb';

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Select Your Team
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Choose the team your show covers. This powers your War Room data.
          </p>
        </div>

        {showNfl && (
          <TeamSelector
            teams={NFL_TEAMS}
            selected={form.selected_team}
            onSelect={(abbrev) => updateField('selected_team', abbrev)}
          />
        )}

        {showCfb && !showNfl && (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <div className="text-lg font-bold mb-2" style={{ color: T.text }}>
              College Football Conference Selection
            </div>
            <p className="text-sm" style={{ color: T.textMuted }}>
              Coming soon. Your CFB data will be configured after onboarding.
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ── Step 6: Plan Selection ──────────────────────────── */
  function Step6() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Choose Your Plan
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Start free. Scale when you are ready.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIER_ORDER.map((tier) => {
            const plan = tier === 'free' ? FREE_PLAN : PLAN_FEATURES[tier as PlanTier];
            const accent = TIER_ACCENT[tier];
            const isSelected = form.plan_tier === tier;

            return (
              <button
                key={tier}
                type="button"
                onClick={() => updateField('plan_tier', tier)}
                className="relative text-left rounded-xl p-5 flex flex-col transition-all"
                style={{
                  background: T.surface,
                  border: isSelected ? `2px solid ${T.gold}` : `1px solid ${T.border}`,
                  borderTop: `3px solid ${accent}`,
                  boxShadow: isSelected ? `0 0 20px ${T.goldDim}` : 'none',
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: T.gold }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
                <div
                  className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
                  style={{ color: accent }}
                >
                  {plan.name}
                </div>
                <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: T.textMuted }}>
                  {plan.description}
                </p>
                <div className="space-y-1.5">
                  {FEATURE_LABELS.map(({ key, label }) => {
                    const has = plan[key] as boolean;
                    return (
                      <div key={key} className="flex items-center gap-2 text-[11px]">
                        {has ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                        <span style={{ color: has ? T.text : T.textMuted }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Step 7: Confirmation ────────────────────────────── */
  function Step7() {
    const team = NFL_TEAMS.find((t) => t.abbrev === form.selected_team);
    const plan = form.plan_tier === 'free' ? FREE_PLAN : PLAN_FEATURES[form.plan_tier as PlanTier];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
            Launch Your Command Center
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textMuted }}>
            Review your setup and hit launch.
          </p>
        </div>

        <div className="space-y-4">
          {/* Summary cards */}
          <SummaryRow label="Podcaster" value={form.podcaster_name} />
          <SummaryRow label="Podcast" value={form.podcast_name} />
          {form.location && <SummaryRow label="Location" value={form.location} />}
          {form.subscriber_count > 0 && (
            <SummaryRow label="Subscribers" value={form.subscriber_count.toLocaleString()} />
          )}
          {form.primary_platforms.length > 0 && (
            <SummaryRow label="Platforms" value={form.primary_platforms.join(', ')} />
          )}
          <SummaryRow label="League" value={form.primary_vertical.toUpperCase()} />
          {form.addon_vertical && (
            <SummaryRow label="Add-On" value={form.addon_vertical.toUpperCase()} />
          )}
          {team && (
            <SummaryRow label="Team" value={`${team.city} ${team.name}`} />
          )}
          <SummaryRow label="Plan" value={plan.name} />
          {form.mission && <SummaryRow label="Mission" value={form.mission} />}
        </div>

        {submitError && (
          <div
            className="rounded-lg p-4 text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: T.error, border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {submitError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-lg text-sm font-bold tracking-wider uppercase transition-all hover:shadow-lg hover:shadow-[#D4A853]/20 disabled:opacity-50"
          style={{
            background: T.gold,
            color: T.bg,
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Launching...
            </span>
          ) : (
            'Launch My Command Center'
          )}
        </button>
      </div>
    );
  }

  function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
      <div
        className="flex items-start gap-4 rounded-lg px-5 py-3"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <span
          className="text-[10px] font-bold tracking-[0.2em] uppercase w-24 flex-shrink-0 pt-0.5"
          style={{ color: T.textMuted }}
        >
          {label}
        </span>
        <span className="text-sm font-medium" style={{ color: T.text }}>
          {value}
        </span>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */
  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1 />,
    2: <Step2 />,
    3: <Step3 />,
    4: <Step4 />,
    5: <Step5 />,
    6: <Step6 />,
    7: <Step7 />,
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <StepIndicator />

      {/* Step content */}
      <div
        className="rounded-2xl p-8 md:p-10"
        style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
      >
        {stepContent[step]}
      </div>

      {/* Nav buttons */}
      {step < TOTAL_STEPS && (
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="px-6 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all disabled:opacity-20"
            style={{
              background: 'transparent',
              color: T.textMuted,
              border: `1px solid ${T.border}`,
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            className="px-8 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all hover:shadow-lg hover:shadow-[#D4A853]/20"
            style={{
              background: T.gold,
              color: T.bg,
            }}
          >
            Next
          </button>
        </div>
      )}
      {step === TOTAL_STEPS && step > 1 && (
        <div className="flex items-center mt-6">
          <button
            type="button"
            onClick={back}
            className="px-6 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all"
            style={{
              background: 'transparent',
              color: T.textMuted,
              border: `1px solid ${T.border}`,
            }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
