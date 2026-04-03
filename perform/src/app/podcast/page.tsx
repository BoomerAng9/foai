'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface AnalystInfo {
  id: string;
  name: string;
  archetype: string;
  color: string;
}

const ANALYST_OPTIONS = [
  { id: 'analyst-1', label: 'Analyst 1 — Smooth, iconic, poetic' },
  { id: 'analyst-2', label: 'Analyst 2 — Bold, confident, no-filter' },
  { id: 'analyst-3', label: 'Analyst 3 — Film room grinder' },
  { id: 'analyst-4', label: 'Analyst 4 — Hot-take energy' },
];

const DURATION_OPTIONS = ['3min', '5min', '10min'];

function renderScript(script: string) {
  // Split into lines and highlight production cues
  return script.split('\n').map((line, i) => {
    // Highlight [PAUSE]
    let rendered = line.replace(
      /\[PAUSE\]/g,
      '<span style="color:#F59E0B;font-weight:700;font-size:10px;letter-spacing:0.1em">[PAUSE]</span>',
    );
    // Highlight [EMPHASIS]
    rendered = rendered.replace(
      /\[EMPHASIS\]/g,
      '<span style="color:#D4A853;font-weight:700;font-size:10px;letter-spacing:0.1em">[EMPHASIS]</span>',
    );
    // Highlight [GRAPHIC: ...]
    rendered = rendered.replace(
      /\[GRAPHIC:\s*([^\]]+)\]/g,
      '<span style="color:#60A5FA;font-weight:700;font-size:10px;letter-spacing:0.1em">[GRAPHIC: $1]</span>',
    );
    return (
      <p
        key={i}
        className="text-sm text-white/70 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: rendered || '&nbsp;' }}
      />
    );
  });
}

export default function PodcastPage() {
  const [topic, setTopic] = useState('');
  const [analystId, setAnalystId] = useState('analyst-1');
  const [duration, setDuration] = useState('5min');
  const [script, setScript] = useState('');
  const [analyst, setAnalyst] = useState<AnalystInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generateScript() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setScript('');
    setAnalyst(null);

    try {
      const res = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analystId, topic, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setScript(data.script || '');
      setAnalyst(data.analyst || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest text-center mb-1" style={{ color: '#D4A853' }}>
          PODCAST ENGINE
        </h1>
        <p className="text-center text-xs text-white/30 font-mono mb-8">
          AI-GENERATED SPORTS PODCAST SCRIPTS
        </p>

        {/* Input panel */}
        <div className="rounded-lg p-5 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Topic */}
          <label className="block text-[10px] font-mono text-white/40 tracking-wider mb-1.5">TOPIC</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Is the 2026 QB class deep enough to justify 3 first-round picks?"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/80 placeholder-white/20 font-mono focus:outline-none focus:border-[#D4A853]/40 resize-none mb-4"
          />

          {/* Analyst + Duration row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-mono text-white/40 tracking-wider mb-1.5">ANALYST</label>
              <select
                value={analystId}
                onChange={e => setAnalystId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-white/70 focus:outline-none focus:border-[#D4A853]/40"
              >
                {ANALYST_OPTIONS.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#0A0A0F]">{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-white/40 tracking-wider mb-1.5">DURATION</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-white/70 focus:outline-none focus:border-[#D4A853]/40"
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d} className="bg-[#0A0A0F]">{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateScript}
            disabled={loading || !topic.trim()}
            className="mt-4 px-6 py-2 rounded font-mono text-sm font-bold tracking-wider transition-all disabled:opacity-40"
            style={{
              background: 'rgba(212,168,83,0.15)',
              color: '#D4A853',
              border: '1px solid rgba(212,168,83,0.3)',
            }}
          >
            {loading ? 'GENERATING...' : 'GENERATE SCRIPT'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
            <p className="text-xs font-mono text-white/30 mt-3">GENERATING PODCAST SCRIPT...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm font-mono text-red-400">{error}</p>
          </div>
        )}

        {/* Script output */}
        {!loading && script && (
          <div className="rounded-lg p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {analyst && (
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: analyst.color }} />
                <span className="text-xs font-mono text-white/50">{analyst.name}</span>
                <span className="text-[10px] font-mono text-white/25">{analyst.archetype}</span>
              </div>
            )}
            <div className="space-y-1">{renderScript(script)}</div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
