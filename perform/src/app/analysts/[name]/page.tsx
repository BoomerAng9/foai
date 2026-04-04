'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getAnalyst } from '@/lib/analysts/personas';

const CONTENT_TYPES = [
  { value: 'scouting_report', label: 'Scouting Report' },
  { value: 'film_breakdown', label: 'Film Breakdown' },
  { value: 'hot_take', label: 'Hot Take' },
  { value: 'ranking_update', label: 'Ranking Update' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['value'];

export default function AnalystFeedPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const analyst = getAnalyst(name);

  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType>('hot_take');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!analyst) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-outfit text-2xl font-bold text-white/60 mb-4">
              Analyst not found
            </h1>
            <Link
              href="/analysts"
              className="text-xs font-mono tracking-wider transition-colors hover:text-white/70"
              style={{ color: '#D4A853' }}
            >
              BACK TO ANALYST DESK
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setGeneratedContent('');

    try {
      const res = await fetch(`/api/analysts/${analyst!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, context: topic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      setGeneratedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-16 max-w-4xl mx-auto w-full">
        {/* Back link */}
        <Link
          href="/analysts"
          className="inline-flex items-center gap-2 text-xs font-mono tracking-wider mb-10 transition-colors hover:text-white/70"
          style={{ color: '#D4A853' }}
        >
          &larr; ANALYST DESK
        </Link>

        {/* Analyst Profile */}
        <div
          className="rounded-xl p-8 mb-12"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${analyst.color}`,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ background: analyst.color }}
            />
            <h1 className="font-outfit text-2xl md:text-3xl font-extrabold tracking-wider text-white">
              {analyst.name}
            </h1>
          </div>
          <p
            className="text-sm font-mono italic mb-2"
            style={{ color: analyst.color }}
          >
            {analyst.archetype}
          </p>
          <p className="text-xs font-mono text-white/40">
            {analyst.specialty}
          </p>
        </div>

        {/* Generate Take Section */}
        <div
          className="rounded-xl p-8 mb-12"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h2
            className="font-outfit text-lg font-bold tracking-[0.15em] mb-6"
            style={{ color: '#D4A853' }}
          >
            GENERATE TAKE
          </h2>

          {/* Topic input */}
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic, player name, or prompt..."
            className="w-full px-4 py-3 rounded-md text-sm font-mono text-white/80 placeholder:text-white/20 mb-4 outline-none transition-colors focus:border-opacity-100"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = analyst.color;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleGenerate();
            }}
          />

          {/* Content type selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setContentType(ct.value)}
                className="px-4 py-2 rounded-md text-xs font-mono tracking-wider transition-all"
                style={{
                  background:
                    contentType === ct.value
                      ? analyst.color
                      : 'rgba(255,255,255,0.04)',
                  color:
                    contentType === ct.value
                      ? '#0A0A0F'
                      : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${
                    contentType === ct.value
                      ? analyst.color
                      : 'rgba(255,255,255,0.08)'
                  }`,
                  fontWeight: contentType === ct.value ? 700 : 400,
                }}
              >
                {ct.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="px-8 py-3 rounded-md text-sm font-outfit font-bold tracking-[0.15em] transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: analyst.color, color: '#0A0A0F' }}
          >
            {loading ? 'GENERATING...' : 'GENERATE'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-md px-4 py-3 mb-8 text-sm font-mono"
            style={{
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.3)',
              color: '#F97316',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: analyst.color }}
            />
            <span className="text-xs font-mono text-white/30">
              {analyst.name} is composing a take...
            </span>
          </div>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <div
            className="rounded-xl p-8"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderLeft: `4px solid ${analyst.color}`,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: analyst.color }}
              />
              <span
                className="text-xs font-mono tracking-wider font-bold"
                style={{ color: analyst.color }}
              >
                {analyst.name.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-white/20">
                {contentType.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-sm font-mono text-white/60 leading-relaxed whitespace-pre-wrap">
              {generatedContent}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
