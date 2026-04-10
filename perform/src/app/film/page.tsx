'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import PaywallGate from '@/components/PaywallGate';
import { getGradeColor } from '@/lib/tie/grades';

type Source = 'youtube' | 'web' | 'upload';

interface YouTubeVid {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  channelTitle: string;
}

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
  return getGradeColor(grade);
}

export default function FilmRoomPage() {
  const [playerName, setPlayerName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [source, setSource] = useState<Source>('youtube');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilmResult | null>(null);
  const [error, setError] = useState('');
  const [ytVideos, setYtVideos] = useState<YouTubeVid[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVid | null>(null);

  /** Search YouTube for videos when source is YouTube */
  async function searchYT() {
    if (!playerName.trim() || source !== 'youtube') return;
    setYtLoading(true);
    setYtVideos([]);
    setSelectedVideo(null);
    setResult(null);
    setError('');
    try {
      const res = await fetch(`/api/youtube?type=player&player=${encodeURIComponent(playerName.trim())}`);
      const json = await res.json();
      setYtVideos((json.videos || []).slice(0, 6));
    } catch {
      setError('YouTube search failed.');
    } finally {
      setYtLoading(false);
    }
  }

  async function analyze() {
    if (!playerName.trim()) return;

    // If YouTube source but no search done yet, search first
    if (source === 'youtube' && ytVideos.length === 0 && !ytLoading) {
      await searchYT();
      return;
    }

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
          youtubeUrl: youtubeUrl.trim() || selectedVideo?.url || undefined,
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
    <PaywallGate>
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

          {/* Direct YouTube URL input */}
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste YouTube URL (optional)..."
            className="w-full px-5 py-3 rounded-lg text-sm font-mono text-white/60 placeholder-white/20 outline-none"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
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

          {/* YouTube video picker */}
          {source === 'youtube' && ytVideos.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 tracking-wider">SELECT A VIDEO TO ANALYZE</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ytVideos.map((vid) => (
                  <button
                    key={vid.videoId}
                    onClick={() => setSelectedVideo(vid)}
                    className="rounded-lg overflow-hidden text-left transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: selectedVideo?.videoId === vid.videoId
                        ? '2px solid #D4A853'
                        : '1px solid rgba(255,255,255,0.06)',
                      outline: 'none',
                    }}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                      />
                      {selectedVideo?.videoId === vid.videoId && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(212,168,83,0.2)' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#D4A853' }}>
                            <span className="text-black text-sm font-bold">&#10003;</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-mono text-white/50 leading-snug line-clamp-2">{vid.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {ytLoading && (
            <div className="text-center py-4">
              <span className="text-xs font-mono text-white/30 animate-pulse">Searching YouTube...</span>
            </div>
          )}

          <button
            onClick={analyze}
            disabled={loading || ytLoading || !playerName.trim()}
            className="w-full px-6 py-4 rounded-lg text-sm font-outfit font-bold tracking-wider transition-all"
            style={{
              background: loading || ytLoading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading || ytLoading ? '#D4A853' : '#0A0A0F',
              cursor: loading || ytLoading || !playerName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'ANALYZING...' : ytLoading ? 'SEARCHING...' : source === 'youtube' && ytVideos.length === 0 ? 'SEARCH YOUTUBE' : 'STUDY PLAYER'}
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
    </PaywallGate>
  );
}
