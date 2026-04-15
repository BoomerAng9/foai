/**
 * /cards/generate — Customer-facing card generator
 * ==================================================
 * User inputs name/sport/position/stats. Hits POST /api/cards/grade.
 * Result step shows TIE grade + recommended style + live SamplePreview.
 *
 * No login required. Image generation tier (Recraft/Ideogram via the
 * existing card-generator pipeline) is a separate opt-in step gated by
 * a "Download Card" button — this page only renders the lightweight
 * SVG preview so users can iterate fast.
 */

'use client';

import { useState } from 'react';
import { listAllCardStyles } from '@/lib/images/card-aesthetics';
import { SamplePreview } from '@/components/cards/SamplePreview';
import type { TIEResult } from '@aims/tie-matrix';

const SPORTS = [
  'football', 'basketball', 'baseball', 'soccer', 'track',
  'volleyball', 'softball', 'lacrosse', 'hockey', 'tennis',
  'swimming', 'wrestling', 'golf', 'flag_football', 'other',
] as const;

interface GradeResponse {
  ok: true;
  input: { name: string; position: string; school: string | null; sport: string; vertical: string };
  grade: TIEResult;
  recommendedStyle: { id: string; name: string; description: string; category: 'classic' | 'aesthetic' };
}

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'var(--pf-text)',
  fontSize: 14,
  fontFamily: 'inherit',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--pf-gold)',
  marginBottom: 6,
};

export default function CardGeneratePage() {
  const styles = listAllCardStyles();

  const [name, setName] = useState('');
  const [position, setPosition] = useState('QB');
  const [school, setSchool] = useState('');
  const [sport, setSport] = useState<string>('football');
  const [styleOverride, setStyleOverride] = useState<string>('');
  const [performance, setPerformance] = useState(75);
  const [attributes, setAttributes] = useState(75);
  const [intangibles, setIntangibles] = useState(75);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GradeResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/cards/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, position, school, sport,
          pillars: { performance, attributes, intangibles },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Grading failed');
      } else {
        setResult(json as GradeResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const chosenStyleId = styleOverride || result?.recommendedStyle.id || 'classic_silver';
  const chosenStyleMeta = styles.find((s) => s.id === chosenStyleId);

  return (
    <main
      style={{
        background: 'var(--pf-bg)',
        color: 'var(--pf-text)',
        minHeight: '100vh',
        padding: '64px 24px',
      }}
    >
      <section style={{ maxWidth: 1080, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', color: 'var(--pf-gold)', textTransform: 'uppercase' }}>
            Card Generator
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em', margin: '12px 0 12px' }}>
            Grade your athlete. Get a card.
          </h1>
          <p style={{ maxWidth: 600, margin: '0 auto', color: 'var(--pf-text-muted)', fontSize: 15, lineHeight: 1.6 }}>
            Real TIE grading, any sport. Pick a style or let us recommend one based on the grade.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 480px)', gap: 48, alignItems: 'start' }}>
          {/* ── Input form ── */}
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={LABEL}>Name</label>
              <input style={FIELD} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Athlete name" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Position</label>
                <input style={FIELD} value={position} onChange={(e) => setPosition(e.target.value.toUpperCase())} required />
              </div>
              <div>
                <label style={LABEL}>Sport</label>
                <select style={FIELD} value={sport} onChange={(e) => setSport(e.target.value)}>
                  {SPORTS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={LABEL}>School / Team</label>
              <input style={FIELD} value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Optional" />
            </div>

            <fieldset style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 16px 8px' }}>
              <legend style={{ ...LABEL, padding: '0 8px' }}>TIE Pillars (0–100)</legend>
              {[
                { label: 'Performance / Talent (40%)',  value: performance,  set: setPerformance },
                { label: 'Attributes / Innovation (30%)', value: attributes, set: setAttributes },
                { label: 'Intangibles / Execution (30%)', value: intangibles, set: setIntangibles },
              ].map((p) => (
                <div key={p.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--pf-text-muted)' }}>
                    <span>{p.label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--pf-gold)', fontWeight: 700 }}>
                      {p.value}
                    </span>
                  </div>
                  <input type="range" min={0} max={100} value={p.value} onChange={(e) => p.set(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
                </div>
              ))}
            </fieldset>

            <div>
              <label style={LABEL}>Card style (optional override)</label>
              <select style={FIELD} value={styleOverride} onChange={(e) => setStyleOverride(e.target.value)}>
                <option value="">Recommend by grade</option>
                {styles.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !name}
              style={{
                marginTop: 8,
                padding: '14px 28px',
                borderRadius: 999,
                background: 'var(--pf-gold)',
                color: 'var(--pf-navy-deep)',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: 13,
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading || !name ? 0.5 : 1,
              }}
            >
              {loading ? 'Grading…' : 'Grade & Render'}
            </button>

            {error && (
              <p style={{ color: '#F87171', fontSize: 13 }}>{error}</p>
            )}
          </form>

          {/* ── Preview ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'sticky', top: 32 }}>
            <SamplePreview
              name={result?.input.name || name || 'Your Athlete'}
              position={result?.input.position || position || 'QB'}
              school={result?.input.school || school || 'Your School'}
              sport={result?.input.sport || sport}
              jerseyNumber={undefined}
              score={result?.grade.score ?? Math.round(performance * 0.4 + attributes * 0.3 + intangibles * 0.3)}
              styleName={chosenStyleMeta?.name ?? 'Classic Silver'}
            />
            {result && (
              <div style={{ textAlign: 'center', color: 'var(--pf-text-muted)', fontSize: 13, lineHeight: 1.6, maxWidth: 420 }}>
                <strong style={{ color: 'var(--pf-gold)' }}>{result.grade.label}</strong>
                {' · '}
                {result.grade.context}
                <br />
                Recommended style: <strong style={{ color: 'var(--pf-text)' }}>{result.recommendedStyle.name}</strong>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
