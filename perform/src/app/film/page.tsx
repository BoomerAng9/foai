'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type AnalysisType = 'full_game' | 'highlights' | 'specific_plays';

interface Play {
  timestamp: string;
  duration: number;
  confidence: string;
  description: string;
}

interface FilmResult {
  analysis: string;
  plays: Play[];
  grade: number;
}

const ANALYSIS_TYPES: { value: AnalysisType; label: string; desc: string }[] = [
  { value: 'full_game', label: 'FULL GAME', desc: 'Complete film breakdown' },
  { value: 'highlights', label: 'HIGHLIGHTS', desc: 'Best plays & big moments' },
  { value: 'specific_plays', label: 'SPECIFIC PLAYS', desc: 'Key technique moments' },
];

function gradeColor(grade: number): string {
  if (grade >= 90) return '#22C55E';
  if (grade >= 75) return '#D4A853';
  if (grade >= 60) return '#F97316';
  return '#EF4444';
}

export default function FilmRoomPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('full_game');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilmResult | null>(null);
  const [error, setError] = useState('');

  async function breakDownFilm() {
    if (!youtubeUrl.trim() || !playerName.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/film/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          playerName: playerName.trim(),
          analysisType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error — could not reach the film analysis service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 mb-3 rounded" style={{ background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)' }}>
            <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: '#D4A853' }}>VIDEO INTELLIGENCE</span>
          </div>
          <h1 className="font-outfit text-4xl md:text-6xl font-black tracking-tight text-white">
            FILM ROOM
          </h1>
          <p className="mt-2 text-sm font-mono text-white/40">
            Break down game tape like a 30-year veteran scout
          </p>
          <div className="mt-4 mx-auto w-48 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }} />
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-10 space-y-4">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube URL... e.g. https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 rounded-lg text-sm font-mono text-white placeholder-white/25 outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name... e.g. Caleb Williams"
            className="w-full px-4 py-3 rounded-lg text-sm font-mono text-white placeholder-white/25 outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />

          {/* Analysis Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            {ANALYSIS_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setAnalysisType(t.value)}
                className="rounded-lg px-3 py-3 text-center transition-all"
                style={{
                  background: analysisType === t.value ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${analysisType === t.value ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="text-xs font-mono font-bold tracking-[0.15em]" style={{ color: analysisType === t.value ? '#D4A853' : 'rgba(255,255,255,0.5)' }}>
                  {t.label}
                </div>
                <div className="text-[10px] font-mono text-white/25 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={breakDownFilm}
            disabled={loading || !youtubeUrl.trim() || !playerName.trim()}
            className="w-full px-6 py-4 rounded-lg text-sm font-mono font-bold tracking-[0.25em] transition-all"
            style={{
              background: loading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading ? '#D4A853' : '#0A0A0F',
              cursor: loading || !youtubeUrl.trim() || !playerName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'ANALYZING FILM...' : 'BREAK DOWN FILM'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto text-center py-12">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg" style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.15)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4A853' }} />
              <span className="text-xs font-mono text-white/40">Processing film through video intelligence pipeline...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-sm font-mono" style={{ color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* TIE Grade */}
            <div className="flex items-center justify-between rounded-lg px-6 py-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-[10px] font-mono text-white/30 tracking-[0.3em] mb-1">TIE GRADE RECOMMENDATION</div>
                <div className="font-outfit text-sm text-white/50">{playerName}</div>
              </div>
              <div className="text-right">
                <div className="font-outfit text-5xl font-black" style={{ color: gradeColor(result.grade) }}>
                  {result.grade}
                </div>
                <div className="text-[10px] font-mono text-white/25 tracking-wider">/ 100</div>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#D4A853' }} />
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-white/60">ANALYST COMMENTARY</span>
              </div>
              <div className="px-5 py-4">
                <div className="text-sm text-white/70 leading-relaxed font-sans whitespace-pre-wrap">
                  {result.analysis}
                </div>
              </div>
            </div>

            {/* Key Plays */}
            {result.plays.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} />
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-white/60">KEY PLAYS IDENTIFIED</span>
                  <span className="ml-auto text-[10px] font-mono text-white/25">{result.plays.length} plays</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {result.plays.map((play, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-4">
                      <div className="shrink-0 w-16 text-center">
                        <span className="font-mono text-sm font-bold" style={{ color: '#60A5FA' }}>{play.timestamp}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/60 font-sans truncate">{play.description}</p>
                      </div>
                      <div className="shrink-0 text-[10px] font-mono text-white/20">
                        {play.duration}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
