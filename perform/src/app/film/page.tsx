'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type Source = 'youtube' | 'web' | 'upload';

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

function gradeColor(grade: number): string {
  if (grade >= 90) return '#22C55E';
  if (grade >= 75) return '#D4A853';
  if (grade >= 60) return '#F97316';
  return '#EF4444';
}

export default function FilmRoomPage() {
  const [playerName, setPlayerName] = useState('');
  const [source, setSource] = useState<Source>('youtube');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilmResult | null>(null);
  const [error, setError] = useState('');

  async function analyze() {
    if (!playerName.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/film/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          source,
          analysisType: 'full_game',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Could not reach the film analysis service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="font-outfit text-4xl md:text-5xl font-black tracking-tight text-white">
            FILM ROOM
          </h1>
          <p className="mt-3 text-sm font-mono text-white/40">
            Now you too can break down film and study your favorite players.
          </p>
        </div>

        {/* Simple input */}
        <div className="max-w-xl mx-auto mb-10 space-y-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            placeholder="Enter player name..."
            className="w-full px-5 py-4 rounded-lg text-base font-mono text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />

          {/* Source toggle */}
          <div className="flex gap-2">
            {([
              { id: 'youtube' as Source, label: 'YouTube' },
              { id: 'web' as Source, label: 'Web' },
              { id: 'upload' as Source, label: 'Upload Film' },
            ]).map((s) => (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all"
                style={{
                  background: source === s.id ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${source === s.id ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: source === s.id ? '#D4A853' : 'rgba(255,255,255,0.4)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {source === 'upload' && (
            <p className="text-[10px] font-mono text-white/25 text-center">
              First breakdown is free. Additional uploads are pay-per-use.
            </p>
          )}

          <button
            onClick={analyze}
            disabled={loading || !playerName.trim()}
            className="w-full px-6 py-4 rounded-lg text-sm font-outfit font-bold tracking-wider transition-all"
            style={{
              background: loading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading ? '#D4A853' : '#0A0A0F',
              cursor: loading || !playerName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'ANALYZING...' : 'STUDY PLAYER'}
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg" style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.15)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4A853' }} />
              <span className="text-xs font-mono text-white/40">Processing film...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mb-8 px-4 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-sm font-mono" style={{ color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {result && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between rounded-lg px-6 py-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-[10px] font-mono text-white/30 tracking-wider mb-1">GRADE</div>
                <div className="font-outfit text-sm text-white/50">{playerName}</div>
              </div>
              <div className="font-outfit text-5xl font-black" style={{ color: gradeColor(result.grade) }}>
                {result.grade}
              </div>
            </div>

            <div className="rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4">
                <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {result.analysis}
                </div>
              </div>
            </div>

            {result.plays.length > 0 && (
              <div className="rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs font-mono text-white/40 tracking-wider">{result.plays.length} KEY PLAYS</span>
                </div>
                {result.plays.map((play, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="font-mono text-sm font-bold shrink-0 w-14" style={{ color: '#60A5FA' }}>{play.timestamp}</span>
                    <span className="text-sm text-white/50 flex-1">{play.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
