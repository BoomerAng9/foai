'use client';

/**
 * TIE Badge Showcase
 * ====================
 * Visual reference for all 9 canonical grade tiers + stamp press demo.
 */

import { useState } from 'react';
import { GradeBadge, TIER_SCORES } from '@/components/tie/GradeBadge';
import { GradeStamp } from '@/components/tie/GradeStamp';
import { getGradeBand } from '@/lib/draft/tie-scale';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

export default function BadgesShowcasePage() {
  const [stampTrigger, setStampTrigger] = useState(false);
  const [demoScore, setDemoScore] = useState(103);

  function replay(score: number) {
    setStampTrigger(false);
    setDemoScore(score);
    setTimeout(() => setStampTrigger(true), 50);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 py-3 flex items-center text-[11px] font-bold tracking-[0.18em] uppercase" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <BackHomeNav />
        <span className="opacity-70">TIE Badge Showcase</span>
      </div>
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">TIE Grade Badges</h1>
        <p className="text-white/60 font-mono text-sm mb-12">
          Canonical ACHIEVEMOR 40/30/30 scale · 9 tiers · press stamp animation
        </p>

        {/* Badge grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-8 mb-16">
          {TIER_SCORES.map((tier) => {
            const band = getGradeBand(tier.score);
            return (
              <div
                key={tier.label}
                className="flex flex-col items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => replay(tier.score)}
              >
                <GradeBadge score={tier.score} size={140} />
                <div className="text-center">
                  <div className="text-[10px] font-mono text-white/50 tracking-wider">
                    {band.minScore === 0 ? '<60' : band.minScore === 101 ? '101+' : `${band.minScore}-${Math.floor(band.maxScore)}`}
                  </div>
                  <div className="text-xs text-white/80 font-semibold mt-0.5">
                    {band.projection}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stamp demo */}
        <div className="border-t border-white/10 pt-12">
          <h2 className="text-2xl font-bold mb-4">Press Stamp Animation</h2>
          <p className="text-white/60 text-sm mb-6">Click any badge above to replay the press.</p>

          <div className="relative w-[360px] aspect-[3/4] rounded-2xl overflow-hidden mx-auto bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border border-white/10">
            {/* Placeholder "card" surface */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/20 text-6xl font-black tracking-tighter">CARD</div>
            </div>

            {/* The stamp — with ghost for dual-grade demo */}
            <GradeStamp
              score={demoScore}
              ghostScore={demoScore >= 88 ? demoScore + 3.3 : undefined}
              trigger={stampTrigger}
              size={110}
              corner="tr"
              delay={200}
            />
          </div>

          <div className="text-center mt-6">
            <button
              className="px-6 py-3 rounded-lg bg-white text-black font-bold tracking-wider text-sm hover:bg-white/90"
              onClick={() => replay(demoScore)}
            >
              ▸ REPLAY STAMP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
