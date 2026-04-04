'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function FlagFootballPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* Hero */}
      <section className="relative py-20 px-6 flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">
        <div className="flex-1">
          <h1 className="font-outfit text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            FLAG FOOTBALL<br />
            <span style={{ color: '#D4A853' }}>GOES GLOBAL</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            Flag football makes its Olympic debut at the <strong className="text-white">2028 Los Angeles Games</strong> — the first time the sport will be featured on the world&apos;s biggest stage.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-6">
            From NFL FLAG leagues to international competition, the game is growing faster than any sport in history. Youth participation is exploding. Professional leagues are forming. National teams are competing for Olympic berths. And Per|Form is tracking every athlete, every combine, every roster decision.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            We grade and rank flag football players using the same TIE system that powers our NFL Draft and college coverage. Performance. Attributes. Intangibles. Every player scored. Every team tracked. The road to LA 2028 starts here.
          </p>
          <div className="flex gap-4">
            <Link href="/draft" className="px-6 py-3 text-sm font-mono font-bold tracking-wider" style={{ background: '#D4A853', color: '#0A0A0F' }}>
              VIEW ATHLETES
            </Link>
            <Link href="/" className="px-6 py-3 text-sm font-mono font-bold tracking-wider border" style={{ borderColor: '#D4A853', color: '#D4A853' }}>
              BACK TO HOME
            </Link>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="relative w-[300px] h-[500px]">
            <Image
              src="/flag-football/hero.png"
              alt="Flag Football Athlete"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </section>

      {/* Key Facts */}
      <section className="py-16 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-outfit text-2xl font-bold text-white mb-8 text-center">THE ROAD TO LA 2028</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: '2028', label: 'Olympic Debut', desc: 'Los Angeles Games — flag football joins the program for the first time' },
              { stat: '100+', label: 'Countries', desc: 'International Federation of American Football member nations fielding teams' },
              { stat: '20M+', label: 'Youth Players', desc: 'Fastest growing youth sport in America — NFL FLAG participation surging' },
            ].map((item, i) => (
              <div key={i} className="p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="font-outfit text-3xl font-extrabold block" style={{ color: '#D4A853' }}>{item.stat}</span>
                <span className="text-sm font-mono font-bold text-white/80 block mt-1">{item.label}</span>
                <span className="text-xs text-white/40 block mt-2">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="py-16 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-outfit text-2xl font-bold text-white mb-4">PER|FORM FLAG COVERAGE</h2>
          <p className="text-white/40 text-sm mb-8">Coming with college football season — full TIE grading for flag football athletes</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['TIE Grades', 'Player Cards', 'Team Rankings', 'Combine Data', 'Recruiting', 'NIL Tracking', 'Podcast Coverage', 'Olympic Qualifiers'].map(feature => (
              <div key={feature} className="py-3 px-4 text-xs font-mono text-white/50" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
