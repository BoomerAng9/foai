'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ANALYSTS } from '@/lib/analysts/personas';

interface AnalystTake {
  analyst: string;
  color: string;
  archetype: string;
  content: string;
}

const ANALYSTS_STATIC = ANALYSTS.map((a) => ({
  id: a.id,
  name: a.name,
  archetype: a.archetype,
  color: a.color,
}));

function TimerBar({ active, color, duration }: { active: boolean; color: string; duration: number }) {
  return (
    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
      {active && (
        <div
          className="h-full rounded-full"
          style={{
            background: color,
            animation: `shrink ${duration}s linear forwards`,
          }}
        />
      )}
    </div>
  );
}

export default function AroundTheHornPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [takes, setTakes] = useState<AnalystTake[]>([]);
  const [showStarted, setShowStarted] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  const calculateScores = useCallback((takesData: AnalystTake[]) => {
    const newScores: Record<string, number> = {};
    const maxLen = Math.max(...takesData.map(t => t.content.length), 1);
    takesData.forEach((t) => {
      // Score based on response length + randomness for entertainment
      const lenScore = (t.content.length / maxLen) * 7;
      const randomBonus = Math.random() * 3;
      newScores[t.analyst] = Math.round((lenScore + randomBonus) * 10) / 10;
    });
    setScores(newScores);
  }, []);

  useEffect(() => {
    if (!timerActive) return;
    if (countdown <= 0) {
      setTimerActive(false);
      return;
    }
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  async function go() {
    if (!topic.trim()) return;
    setLoading(true);
    setShowStarted(true);
    setTakes([]);
    setScores({});
    setCountdown(30);
    setTimerActive(true);

    try {
      const res = await fetch('/api/studio/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), format: 'around-the-horn' }),
      });
      const data = await res.json();
      if (data.takes) {
        setTakes(data.takes);
        calculateScores(data.takes);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setTimerActive(false);
    }
  }

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const maxScore = winner ? winner[1] : 10;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      {/* Inline keyframes for timer animation */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Header area */}
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 mb-3 rounded" style={{ background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)' }}>
            <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: '#D4A853' }}>SEGMENT</span>
          </div>
          <h1 className="font-outfit text-3xl md:text-5xl font-black tracking-tight text-white">
            AROUND THE HORN
          </h1>
          <p className="mt-2 text-sm font-mono text-white/40">
            Quick-fire takes &mdash; 30 seconds on the clock
          </p>
        </div>

        {/* Countdown overlay */}
        {showStarted && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-lg" style={{ background: countdown > 0 && timerActive ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', border: `1px solid ${countdown > 0 && timerActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: countdown > 0 && timerActive ? '#EF4444' : '#22C55E' }} />
              <span className="font-mono text-2xl font-bold" style={{ color: countdown > 0 && timerActive ? '#EF4444' : '#22C55E' }}>
                {timerActive ? `${countdown}s` : loading ? 'GENERATING...' : 'FINAL'}
              </span>
            </div>
          </div>
        )}

        {/* Topic input */}
        <div className="max-w-xl mx-auto mb-8 flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="Drop a topic... e.g. Is Shedeur Sanders a top-5 pick?"
            className="flex-1 px-4 py-3 rounded-lg text-sm font-mono text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <button
            onClick={go}
            disabled={loading || !topic.trim()}
            className="px-6 py-3 rounded-lg text-xs font-mono font-bold tracking-[0.2em] transition-all"
            style={{
              background: loading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading ? '#D4A853' : '#0A0A0F',
              cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            GO
          </button>
        </div>

        {/* 2x2 Analyst Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ANALYSTS_STATIC.map((analyst) => {
            const take = takes.find(t => t.analyst === analyst.name);
            const score = scores[analyst.name];

            return (
              <div
                key={analyst.id}
                className="relative rounded-lg overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${showStarted ? analyst.color + '30' : 'rgba(255,255,255,0.06)'}`,
                  borderLeft: `3px solid ${analyst.color}`,
                  animation: take ? 'slideIn 0.4s ease-out' : undefined,
                }}
              >
                {/* Panel header */}
                <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: analyst.color, boxShadow: `0 0 8px ${analyst.color}60` }} />
                  <span className="font-outfit text-sm font-bold text-white tracking-wide">{analyst.name.toUpperCase()}</span>
                  <span className="text-[10px] font-mono text-white/25 ml-auto">{analyst.archetype}</span>
                  {score !== undefined && (
                    <span className="text-xs font-mono font-bold ml-2" style={{ color: analyst.color }}>{score}</span>
                  )}
                </div>

                {/* Timer bar */}
                <TimerBar active={showStarted && timerActive} color={analyst.color} duration={30} />

                {/* Content */}
                <div className="px-4 py-3" style={{ minHeight: '100px' }}>
                  {loading && !take && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: analyst.color }} />
                      <span className="text-xs font-mono text-white/20">On the clock...</span>
                    </div>
                  )}
                  {take && (
                    <p className="text-sm text-white/70 leading-relaxed font-sans">{take.content}</p>
                  )}
                  {!showStarted && (
                    <p className="text-xs font-mono text-white/15 italic">Standing by...</p>
                  )}
                </div>

                {/* Live dot */}
                {showStarted && (
                  <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
                    <span className="text-[9px] font-mono text-white/25">LIVE</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scoring bar */}
        {takes.length > 0 && (
          <div className="rounded-lg p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono tracking-[0.2em]" style={{ color: '#D4A853' }}>SCOREBOARD</span>
              <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
              {winner && (
                <span className="text-[10px] font-mono text-white/40">
                  WINNER: <span style={{ color: ANALYSTS_STATIC.find(a => a.name === winner[0])?.color }}>{winner[0].toUpperCase()}</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              {Object.entries(scores)
                .sort((a, b) => b[1] - a[1])
                .map(([name, score]) => {
                  const analyst = ANALYSTS_STATIC.find(a => a.name === name);
                  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-mono text-white/50 text-right">{name.toUpperCase()}</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${analyst?.color}80, ${analyst?.color})`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-xs font-mono font-bold text-right" style={{ color: analyst?.color }}>{score}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
