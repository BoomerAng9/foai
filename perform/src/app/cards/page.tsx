/**
 * /cards — Player Card Style Index
 * ==================================
 * Public landing page. Lists all 17 card styles (12 classic + 5 aesthetic)
 * with a live SVG preview each. SEO-indexable static render — no client
 * JS required for the cards to display.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { listAllCardStyles } from '@/lib/images/card-aesthetics';
import { SAMPLE_ROSTER } from '@/lib/cards/sample-roster';
import { recommendCardStyle } from '@/lib/cards/recommend-style';
import { buildTIEResult } from '@aims/tie-matrix';
import { SamplePreview } from '@/components/cards/SamplePreview';

export const metadata: Metadata = {
  title: 'Player Cards · Per|Form',
  description:
    'Generate a Per|Form Player Card for any sport. 17 visual styles, 12 classic and 5 aesthetic. Real TIE grading from real performance data.',
  alternates: { canonical: '/cards' },
  openGraph: {
    title: 'Player Cards · Per|Form',
    description: '17 card styles, any sport, real TIE grading.',
    type: 'website',
  },
};

function pickSampleForStyle(styleId: string) {
  // Prefer a sample whose recommended style matches; fall back to the first.
  for (const p of SAMPLE_ROSTER) {
    const grade = buildTIEResult({
      vertical: 'SPORTS',
      performance: p.performance,
      attributes: p.attributes,
      intangibles: p.intangibles,
    });
    if (recommendCardStyle(grade.tier, p.sport) === styleId) {
      return { player: p, score: grade.score };
    }
  }
  const p = SAMPLE_ROSTER[0]!;
  const grade = buildTIEResult({
    vertical: 'SPORTS',
    performance: p.performance,
    attributes: p.attributes,
    intangibles: p.intangibles,
  });
  return { player: p, score: grade.score };
}

export default function CardsIndexPage() {
  const styles = listAllCardStyles();

  return (
    <main
      style={{
        background: 'var(--pf-bg)',
        color: 'var(--pf-text)',
        minHeight: '100vh',
        padding: '64px 24px',
      }}
    >
      <section style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.3em',
              color: 'var(--pf-gold)',
              textTransform: 'uppercase',
            }}
          >
            Per|Form Player Cards
          </p>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: '12px 0 16px',
            }}
          >
            17 styles. Any sport. One grading engine.
          </h1>
          <p style={{ maxWidth: 640, margin: '0 auto', color: 'var(--pf-text-muted)', fontSize: 16, lineHeight: 1.6 }}>
            Every card is graded by the Talent &amp; Innovation Engine — the same scale
            we use for NFL Draft prospects, scaled for any sport, any level. Pick a style,
            grade your athlete, ship a shareable card.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link
              href="/cards/generate"
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                borderRadius: 999,
                background: 'var(--pf-gold)',
                color: 'var(--pf-navy-deep)',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: 13,
              }}
            >
              Grade Your Athlete →
            </Link>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {styles.map((s) => {
            const { player, score } = pickSampleForStyle(s.id);
            return (
              <Link
                key={s.id}
                href={`/cards/${s.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <SamplePreview
                    name={player.name}
                    position={player.position}
                    school={player.school}
                    sport={player.sport}
                    jerseyNumber={player.jerseyNumber}
                    score={score}
                    styleName={s.name}
                  />
                </div>
                <div style={{ padding: '12px 4px 0' }}>
                  <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--pf-text)' }}>
                    {s.name}
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--pf-text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: s.category === 'aesthetic' ? 'var(--pf-gold)' : 'var(--pf-text-muted)',
                    }}
                  >
                    {s.category}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
