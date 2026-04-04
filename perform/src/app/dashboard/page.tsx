'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const SECTIONS = [
  {
    title: 'Draft Board',
    description: '50+ prospects graded and ranked by TIE',
    href: '/draft',
    icon: '🏈',
  },
  {
    title: 'Mock Draft',
    description: 'Full 7-round projections with Bull & Bear cases',
    href: '/draft/mock',
    icon: '📋',
  },
  {
    title: 'Analysts',
    description: 'Four autonomous voices delivering daily coverage',
    href: '/analysts',
    icon: '🎙',
  },
  {
    title: 'Podcast Engine',
    description: 'AI-generated audio breakdowns and debates',
    href: '/podcast',
    icon: '🎧',
  },
  {
    title: 'Flag Football',
    description: '2028 Olympics tracking — athletes, combines, rosters',
    href: '/flag-football',
    icon: '🏁',
  },
  {
    title: 'NFT Cards',
    description: 'Digital collectible card generation API',
    href: '/api/nft/card',
    icon: '🃏',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-20 max-w-6xl mx-auto w-full">
        {/* Title */}
        <div className="mb-16">
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            COMMAND CENTER
          </p>
          <h1
            className="font-outfit text-4xl md:text-5xl font-extrabold tracking-[0.15em]"
            style={{ color: '#D4A853' }}
          >
            DASHBOARD
          </h1>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl p-6 flex flex-col gap-4 transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '#D4A853';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              {/* Icon */}
              <span className="text-3xl">{section.icon}</span>

              {/* Title */}
              <h2 className="font-outfit text-lg font-bold tracking-wider text-white group-hover:text-[#D4A853] transition-colors">
                {section.title}
              </h2>

              {/* Description */}
              <p className="text-xs font-mono text-white/40 leading-relaxed">
                {section.description}
              </p>

              {/* Arrow */}
              <div className="mt-auto pt-2">
                <span
                  className="text-xs font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#D4A853' }}
                >
                  OPEN &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
