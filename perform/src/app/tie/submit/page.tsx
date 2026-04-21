'use client';

/**
 * /tie/submit — Per|Form TIE Submission (NIL Valuation)
 * =======================================================
 * Flagship user-facing write surface: players, schools, teams, agents
 * upload a player profile and receive a TIE grade + NIL cohort
 * valuation (median + P10/P90) within the same tier.
 *
 * POSTs to /api/tie/submit. Validation is enforced server-side; this
 * form surfaces the canonical inputs and collects required consents.
 *
 * Oddy Paradigm: glass morphism, Framer Motion springs, Bebas Neue
 * headers, Geist Mono for metric labels, orange (#FF6B00) + gold
 * (#D4A853) accents.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Role = 'player' | 'school' | 'team' | 'agent' | 'parent';

interface FormState {
  email: string;
  role: Role;
  org: string;
  name: string;
  school: string;
  position: string;
  classYear: string;
  heightInches: string;
  weightLbs: string;

  // Performance (0-100 self/scout scale)
  pffGrade: string;
  efficiency: string;

  // Attributes (combine measurements)
  fortyYard: string;
  verticalJump: string;
  benchPress: string;
  broadJump: string;

  // Intangibles (0-100)
  footballIQ: string;
  workEthic: string;
  competitiveness: string;
  leadership: string;
  offFieldCharacter: string;

  // Consents
  nilDisclosure: boolean;
  publicVisibility: boolean;
  transferPortal: boolean;
}

const EMPTY: FormState = {
  email: '', role: 'player', org: '',
  name: '', school: '', position: 'RB', classYear: '2026',
  heightInches: '', weightLbs: '',
  pffGrade: '', efficiency: '',
  fortyYard: '', verticalJump: '', benchPress: '', broadJump: '',
  footballIQ: '', workEthic: '', competitiveness: '', leadership: '', offFieldCharacter: '',
  nilDisclosure: false, publicVisibility: false, transferPortal: false,
};

interface SubmitResult {
  submissionId: string;
  tie: { score: number; grade: string; tier: string; label: string; components: { performance: number; attributes: number; intangibles: number } };
  nil: { valuationUsd: number; cohortKey: string; cohortSize: number; cohortMedianUsd: number; cohortP10Usd: number; cohortP90Usd: number };
  matched?: { performPlayerId: number } | null;
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'EDGE', 'DL', 'LB', 'CB', 'S'];
const ROLES: Role[] = ['player', 'school', 'team', 'agent', 'parent'];

export default function SubmitPage(): React.JSX.Element {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setForm(f => ({ ...f, [key]: value }));

  const toNum = (s: string): number | undefined => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        submitter: { email: form.email, role: form.role, org: form.org || undefined },
        player: {
          name: form.name,
          school: form.school || undefined,
          position: form.position,
          classYear: form.classYear,
          heightInches: toNum(form.heightInches),
          weightLbs: toNum(form.weightLbs),
        },
        performance: {
          ...(toNum(form.pffGrade) != null ? { pffGrade: toNum(form.pffGrade) } : {}),
          ...(toNum(form.efficiency) != null ? { efficiency: toNum(form.efficiency) } : {}),
        },
        attributes: {
          ...(toNum(form.fortyYard) != null ? { fortyYard: toNum(form.fortyYard) } : {}),
          ...(toNum(form.verticalJump) != null ? { verticalJump: toNum(form.verticalJump) } : {}),
          ...(toNum(form.benchPress) != null ? { benchPress: Math.round(toNum(form.benchPress) ?? 0) } : {}),
          ...(toNum(form.broadJump) != null ? { broadJump: toNum(form.broadJump) } : {}),
        },
        intangibles: {
          ...(toNum(form.footballIQ) != null ? { footballIQ: toNum(form.footballIQ) } : {}),
          ...(toNum(form.workEthic) != null ? { workEthic: toNum(form.workEthic) } : {}),
          ...(toNum(form.competitiveness) != null ? { competitiveness: toNum(form.competitiveness) } : {}),
          ...(toNum(form.leadership) != null ? { leadership: toNum(form.leadership) } : {}),
          ...(toNum(form.offFieldCharacter) != null ? { offFieldCharacter: toNum(form.offFieldCharacter) } : {}),
        },
        consents: {
          nilDisclosure: form.nilDisclosure,
          publicVisibility: form.publicVisibility,
          transferPortal: form.transferPortal,
        },
      };
      const res = await fetch('/api/tie/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const j = (await res.json()) as SubmitResult;
      setResult(j);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('network_error');
    } finally {
      setSubmitting(false);
    }
  }

  function reset(): void { setResult(null); setForm(EMPTY); }

  return (
    <div className="min-h-screen bg-[#05060A] text-white" style={{ fontFamily: 'var(--font-geist-sans, system-ui)' }}>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05060A]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', letterSpacing: '0.06em' }} className="text-[#D4A853]">
              PER|FORM
            </span>
            <span className="text-white/60 uppercase text-[11px] tracking-[0.32em]">Submit · TIE + NIL</span>
          </div>
          <a href="/draft/center" className="text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80" style={{ fontFamily: 'Geist Mono, monospace' }}>
            ← Draft Center
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {result ? (
            <ResultCard key="result" result={result} onReset={reset} />
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              onSubmit={onSubmit}
              className="space-y-8"
            >
              <div>
                <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '44px', letterSpacing: '0.04em' }} className="text-[#D4A853]">
                  UPLOAD A PLAYER
                </h1>
                <p className="text-white/55 mt-1 text-[13px] max-w-2xl leading-relaxed">
                  Players, schools, teams, and agents can submit a profile to run it through Per|Form's TIE engine.
                  Get a grade, tier, and NIL-cohort valuation (median + P10/P90) anchored to peers at the same position and tier.
                </p>
              </div>

              <Section title="Submitter">
                <Grid>
                  <Field label="Email" required>
                    <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Role" required>
                    <select required value={form.role} onChange={e => set('role', e.target.value as Role)} className={INPUT}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Organization (school / team / agency)" hint="Optional for solo player submissions">
                    <input value={form.org} onChange={e => set('org', e.target.value)} className={INPUT} />
                  </Field>
                </Grid>
              </Section>

              <Section title="Player">
                <Grid>
                  <Field label="Name" required>
                    <input required value={form.name} onChange={e => set('name', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="School / Team">
                    <input value={form.school} onChange={e => set('school', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Position" required>
                    <select required value={form.position} onChange={e => set('position', e.target.value)} className={INPUT}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Class Year" required hint="e.g. 2026, 2027, HS, Portal">
                    <input required value={form.classYear} onChange={e => set('classYear', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Height (inches)">
                    <input type="number" min={48} max={90} value={form.heightInches} onChange={e => set('heightInches', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Weight (lbs)">
                    <input type="number" min={120} max={400} value={form.weightLbs} onChange={e => set('weightLbs', e.target.value)} className={INPUT} />
                  </Field>
                </Grid>
              </Section>

              <Section title="Performance" accent="#FF6B00" subtitle="40% of the TIE grade">
                <Grid>
                  <Field label="PFF Grade" hint="0-100 overall grade">
                    <input type="number" min={0} max={100} value={form.pffGrade} onChange={e => set('pffGrade', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Efficiency" hint="0-100 composite (coach/scout)">
                    <input type="number" min={0} max={100} value={form.efficiency} onChange={e => set('efficiency', e.target.value)} className={INPUT} />
                  </Field>
                </Grid>
              </Section>

              <Section title="Attributes" accent="#D4A853" subtitle="30% of the TIE grade — combine / pro day measurements">
                <Grid>
                  <Field label="40-yard Dash (sec)" hint="4.20–5.80">
                    <input type="number" step="0.01" min={4.0} max={6.0} value={form.fortyYard} onChange={e => set('fortyYard', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Vertical Jump (inches)" hint="20–50">
                    <input type="number" step="0.5" min={20} max={50} value={form.verticalJump} onChange={e => set('verticalJump', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Bench Press (reps)" hint="0–50">
                    <input type="number" min={0} max={50} value={form.benchPress} onChange={e => set('benchPress', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Broad Jump (inches)" hint="90–150">
                    <input type="number" step="0.5" min={90} max={150} value={form.broadJump} onChange={e => set('broadJump', e.target.value)} className={INPUT} />
                  </Field>
                </Grid>
              </Section>

              <Section title="Intangibles" accent="#93C5FD" subtitle="30% of the TIE grade — rate 0-100 each">
                <Grid>
                  <Field label="Football IQ"><input type="number" min={0} max={100} value={form.footballIQ} onChange={e => set('footballIQ', e.target.value)} className={INPUT} /></Field>
                  <Field label="Work Ethic"><input type="number" min={0} max={100} value={form.workEthic} onChange={e => set('workEthic', e.target.value)} className={INPUT} /></Field>
                  <Field label="Competitiveness"><input type="number" min={0} max={100} value={form.competitiveness} onChange={e => set('competitiveness', e.target.value)} className={INPUT} /></Field>
                  <Field label="Leadership"><input type="number" min={0} max={100} value={form.leadership} onChange={e => set('leadership', e.target.value)} className={INPUT} /></Field>
                  <Field label="Off-Field Character"><input type="number" min={0} max={100} value={form.offFieldCharacter} onChange={e => set('offFieldCharacter', e.target.value)} className={INPUT} /></Field>
                </Grid>
              </Section>

              <Section title="Consents" subtitle="All three required to submit">
                <div className="space-y-3">
                  <Consent label="NIL Disclosure — I authorize Per|Form to calculate + store an NIL valuation for this player."
                    checked={form.nilDisclosure} onChange={v => set('nilDisclosure', v)} />
                  <Consent label="Public Visibility — I authorize the player profile to be shown on the public platform."
                    checked={form.publicVisibility} onChange={v => set('publicVisibility', v)} />
                  <Consent label="Transfer Portal Signal — I authorize the profile to participate in transfer-portal matching."
                    checked={form.transferPortal} onChange={v => set('transferPortal', v)} />
                </div>
              </Section>

              {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-[13px]">Error: {error}</div>}

              <div className="flex items-center justify-between pt-4">
                <span className="text-[11px] text-white/35" style={{ fontFamily: 'Geist Mono, monospace' }}>
                  All fields normalize through the canonical TIE engine (40/30/30).
                </span>
                <button
                  type="submit"
                  disabled={submitting || !form.nilDisclosure || !form.publicVisibility || !form.transferPortal}
                  className="px-8 py-3 rounded-xl uppercase tracking-[0.12em] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                    fontFamily: 'Bebas Neue, sans-serif',
                    fontSize: '18px',
                    letterSpacing: '0.1em',
                    background: 'linear-gradient(135deg, #FF6B00 0%, #D4A853 100%)',
                    color: '#1A0F00',
                    boxShadow: '0 0 32px rgba(255,107,0,0.28)',
                  }}
                >
                  {submitting ? 'Grading…' : 'Run TIE + NIL'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Atoms ────────────────────────────────────────────────────────── */

const INPUT =
  'w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/90 outline-none focus:border-[#D4A853]/60 focus:bg-white/[0.06] transition-colors';

function Section({ title, subtitle, accent = '#D4A853', children }: { title: string; subtitle?: string; accent?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', letterSpacing: '0.08em', color: accent }}>
          {title}
        </h2>
        {subtitle && <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]" style={{ fontFamily: 'Geist Mono, monospace' }}>{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="block">
      <div className="text-[11px] text-white/60 uppercase tracking-[0.18em] mb-1" style={{ fontFamily: 'Geist Mono, monospace' }}>
        {label}{required && <span className="text-[#FF6B00] ml-1">*</span>}
      </div>
      {children}
      {hint && <div className="text-[10px] text-white/30 mt-1" style={{ fontFamily: 'Geist Mono, monospace' }}>{hint}</div>}
    </label>
  );
}

function Consent({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-[#FF6B00] focus:ring-[#FF6B00]/40 cursor-pointer"
      />
      <span className="text-[12px] text-white/75 leading-snug">{label}</span>
    </label>
  );
}

/* ── Result card ──────────────────────────────────────────────────── */

function ResultCard({ result, onReset }: { result: SubmitResult; onReset: () => void }): React.JSX.Element {
  const { tie, nil } = result;
  const isPrime = tie.tier === 'PRIME';
  const accent = isPrime ? '#F4D47A' : tie.tier.startsWith('A') ? '#D4A853' : tie.tier.startsWith('B') ? '#93C5FD' : '#A1A1AA';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="space-y-6"
    >
      {/* TIE Hero */}
      <div
        className="rounded-2xl border overflow-hidden backdrop-blur-xl p-6"
        style={{
          borderColor: isPrime ? 'rgba(244,212,122,0.45)' : 'rgba(255,255,255,0.05)',
          background: isPrime
            ? 'linear-gradient(135deg, rgba(244,212,122,0.14) 0%, rgba(255,107,0,0.06) 100%)'
            : 'rgba(255,255,255,0.02)',
          boxShadow: isPrime ? '0 0 48px rgba(244,212,122,0.25)' : '0 0 28px rgba(212,168,83,0.15)',
        }}
      >
        <div className="flex items-baseline justify-between mb-4 gap-4">
          <div>
            <div className="text-[11px] text-white/50 uppercase tracking-[0.28em]" style={{ fontFamily: 'Geist Mono, monospace' }}>Per|Form TIE Result</div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '68px', letterSpacing: '0.03em', color: accent, lineHeight: 1 }}>
              {tie.grade} {isPrime && '🛸'}
            </h2>
            <div className="text-[14px] text-white/70 mt-1">{tie.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/50 uppercase tracking-[0.28em]" style={{ fontFamily: 'Geist Mono, monospace' }}>Score</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '54px', color: accent, lineHeight: 1 }}>{tie.score}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Pillar label="Performance" color="#FF6B00" value={tie.components.performance} />
          <Pillar label="Attributes"  color="#D4A853" value={tie.components.attributes}  />
          <Pillar label="Intangibles" color="#93C5FD" value={tie.components.intangibles} />
        </div>
      </div>

      {/* NIL Cohort */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '26px', letterSpacing: '0.08em' }} className="text-[#D4A853]">
            NIL VALUATION
          </h2>
          <span className="text-[10px] text-white/40 uppercase tracking-[0.24em]" style={{ fontFamily: 'Geist Mono, monospace' }}>
            Cohort · {nil.cohortKey} · n={nil.cohortSize}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <NilStat label="Your projection" value={nil.valuationUsd} accent="#FF6B00" featured />
          <NilStat label="P10 floor" value={nil.cohortP10Usd} />
          <NilStat label="Cohort median" value={nil.cohortMedianUsd} />
          <NilStat label="P90 ceiling" value={nil.cohortP90Usd} />
        </div>
        <p className="text-[11px] text-white/40 mt-4 leading-relaxed" style={{ fontFamily: 'Geist Mono, monospace' }}>
          Anchored to class {nil.cohortKey.split('_')[0]} · {nil.cohortKey.split('_')[1]}s in the {nil.cohortKey.split('_').slice(2).join(' ')} tier.
          Projection uses a rank-weighted power-law calibrated to published On3 NIL rankings.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/35" style={{ fontFamily: 'Geist Mono, monospace' }}>Submission id {result.submissionId.slice(0, 8)}…</span>
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl border border-white/15 text-white/80 hover:bg-white/[0.04] transition-colors text-[13px] uppercase tracking-[0.12em]"
          style={{ fontFamily: 'Geist Mono, monospace' }}
        >
          Submit another
        </button>
      </div>
    </motion.div>
  );
}

function Pillar({ label, color, value }: { label: string; color: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: 'Geist Mono, monospace', color }}>{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', color, lineHeight: 1 }}>{value.toFixed(1)}</span>
        <span className="text-[10px] text-white/30">/100</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
    </div>
  );
}

function NilStat({ label, value, accent = '#D4A853', featured = false }: { label: string; value: number; accent?: string; featured?: boolean }): React.JSX.Element {
  const fmt = (n: number): string =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${Math.round(n).toLocaleString()}`;
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: featured ? `linear-gradient(135deg, ${accent}1c 0%, rgba(255,255,255,0.02) 100%)` : 'rgba(255,255,255,0.02)',
        borderColor: featured ? `${accent}66` : 'rgba(255,255,255,0.05)',
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/55" style={{ fontFamily: 'Geist Mono, monospace' }}>{label}</div>
      <div className="mt-1" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: featured ? '36px' : '26px', color: featured ? accent : '#FFFFFF', lineHeight: 1 }}>
        {fmt(value)}
      </div>
    </div>
  );
}
