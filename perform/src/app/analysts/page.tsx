'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ANALYSTS } from '@/lib/analysts/personas';

export default function AnalystsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-20 max-w-6xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-16">
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ANALYST COVERAGE
          </p>
          <h1
            className="font-outfit text-4xl md:text-5xl font-extrabold tracking-[0.15em] mb-4"
            style={{ color: '#D4A853' }}
          >
            THE ANALYST DESK
          </h1>
          <p className="text-sm font-mono text-white/40 tracking-wider">
            Four autonomous voices. Zero human writers.
          </p>
        </div>

        {/* Analyst Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ANALYSTS.map((analyst) => (
            <div
              key={analyst.id}
              className="rounded-xl p-6 flex flex-col gap-4 transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = analyst.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              {/* Color dot + Name */}
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: analyst.color }}
                />
                <h2 className="font-outfit text-lg font-bold tracking-wider text-white">
                  {analyst.name}
                </h2>
              </div>

              {/* Archetype */}
              <p
                className="text-xs font-mono italic leading-relaxed"
                style={{ color: analyst.color, opacity: 0.8 }}
              >
                {analyst.archetype}
              </p>

              {/* Specialty */}
              <p className="text-xs font-mono text-white/40 leading-relaxed">
                {analyst.specialty}
              </p>

              {/* Voice Style */}
              <p className="text-[11px] font-mono text-white/25 leading-relaxed">
                {analyst.voiceStyle}
              </p>

              {/* CTA */}
              <Link
                href={`/analysts/${analyst.id}`}
                className="mt-auto inline-block text-center px-4 py-2.5 rounded-md text-xs font-outfit font-bold tracking-[0.15em] transition-all hover:brightness-110"
                style={{ background: analyst.color, color: '#0A0A0F' }}
              >
                VIEW FEED
              </Link>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
