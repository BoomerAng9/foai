/**
 * /cards/[style] — Per-Style Sample Showcase
 * ============================================
 * One indexable page per card style. Renders sample cards for each
 * sport in the SAMPLE_ROSTER so search engines have unique content
 * to crawl per (style × sport) combination.
 */

import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listAllCardStyles, type AnyCardStyle } from '@/lib/images/card-aesthetics';
import { SAMPLE_ROSTER } from '@/lib/cards/sample-roster';
import { buildTIEResult } from '@aims/tie-matrix';
import { SamplePreview } from '@/components/cards/SamplePreview';

interface RouteParams {
  params: Promise<{ style: string }>;
}

export async function generateStaticParams() {
  return listAllCardStyles().map((s) => ({ style: s.id }));
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { style } = await params;
  const meta = listAllCardStyles().find((s) => s.id === style);
  if (!meta) return { title: 'Card style · Per|Form' };
  return {
    title: `${meta.name} · Per|Form Player Cards`,
    description: meta.description,
    alternates: { canonical: `/cards/${style}` },
    openGraph: {
      title: `${meta.name} · Per|Form Player Cards`,
      description: meta.description,
      type: 'article',
    },
  };
}

export default async function CardStylePage({ params }: RouteParams) {
  const { style } = await params;
  const meta = listAllCardStyles().find((s) => s.id === style);
  if (!meta) notFound();

  const styleId = meta.id as AnyCardStyle;

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
        <Link
          href="/cards"
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--pf-gold)',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← All styles
        </Link>

        <header style={{ margin: '24px 0 48px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.3em',
              color: 'var(--pf-gold)',
              textTransform: 'uppercase',
            }}
          >
            {meta.category} card style
          </p>
          <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-0.02em', margin: '12px 0 16px' }}>
            {meta.name}
          </h1>
          <p style={{ maxWidth: 720, margin: '0 auto', color: 'var(--pf-text-muted)', fontSize: 16, lineHeight: 1.6 }}>
            {meta.description}
          </p>
          <div style={{ marginTop: 24 }}>
            <Link
              href={`/cards/generate?style=${styleId}`}
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
              Use this style →
            </Link>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 32,
          }}
        >
          {SAMPLE_ROSTER.map((p) => {
            const grade = buildTIEResult({
              vertical: 'SPORTS',
              performance: p.performance,
              attributes: p.attributes,
              intangibles: p.intangibles,
            });
            return (
              <article key={p.slug} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <SamplePreview
                  name={p.name}
                  position={p.position}
                  school={p.school}
                  sport={p.sport}
                  jerseyNumber={p.jerseyNumber}
                  score={grade.score}
                  styleName={meta.name}
                />
                <div style={{ textAlign: 'center', maxWidth: 320 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{p.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--pf-text-muted)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {p.position} · {p.sport.replace('_', ' ')}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--pf-text-muted)', margin: '12px 0 0', lineHeight: 1.55 }}>
                    {p.bio}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <footer style={{ marginTop: 64, textAlign: 'center', fontSize: 11, color: 'var(--pf-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Sample athletes — not real prospects.
        </footer>
      </section>
    </main>
  );
}
