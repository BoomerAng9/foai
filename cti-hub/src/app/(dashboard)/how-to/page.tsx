'use client';

import { useState } from 'react';
import { BookOpen, Youtube, Globe, Upload, Loader2, ChevronRight } from 'lucide-react';

type SourceType = 'youtube' | 'web' | 'pdf';

interface TutorialStep {
  step_number: number;
  instruction: string;
  visual_description: string;
}

interface Tutorial {
  title: string;
  steps: TutorialStep[];
  summary: string;
}

interface ExtractResult {
  extracted: string;
  tutorial: Tutorial | null;
  metadata: Record<string, unknown>;
}

const C = {
  bg: '#0A0D10',
  surface: '#12161B',
  surfaceHover: '#1A1F27',
  border: '#1F2733',
  borderFocus: '#C9A227',
  accent: '#C9A227',
  accentGlow: 'rgba(201,162,39,0.12)',
  accentDim: '#7A6318',
  text: '#E4E8ED',
  textSoft: '#94A3B8',
  textDim: '#4B5C72',
  success: '#10B981',
};

const SOURCE_OPTIONS: { id: SourceType; label: string; icon: typeof Youtube; placeholder: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'Paste a YouTube URL...' },
  { id: 'web', label: 'Web', icon: Globe, placeholder: 'Optional — paste a URL or leave blank to auto-search' },
  { id: 'pdf', label: 'Upload', icon: Upload, placeholder: 'Paste text content from your PDF...' },
];

export default function HowToPage() {
  const [topic, setTopic] = useState('');
  const [source, setSource] = useState<SourceType>('youtube');
  const [urlOrContent, setUrlOrContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');

  const currentSource = SOURCE_OPTIONS.find((s) => s.id === source)!;

  // URL is only required for YouTube. Web uses topic as search query if no URL given.
  const needsUrl = source === 'youtube';
  const needsContent = source === 'pdf';

  async function handleLearn() {
    if (!topic.trim()) {
      setError('Tell us what you want to learn.');
      return;
    }
    if (needsUrl && !urlOrContent.trim()) {
      setError('Paste a YouTube URL to extract from.');
      return;
    }
    if (needsContent && !urlOrContent.trim()) {
      setError('Paste your document content.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, string> = { source, topic: topic.trim() };
      if (source === 'pdf') {
        body.content = urlOrContent.trim();
      } else if (source === 'web' && !urlOrContent.trim()) {
        // No URL provided — use topic as a web search via Brave
        body.url = `https://www.google.com/search?q=${encodeURIComponent(topic.trim())}`;
      } else {
        body.url = urlOrContent.trim();
      }

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Extraction failed');
        return;
      }

      setResult(data);
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 flex items-center justify-center"
          style={{ background: C.accentGlow, border: `1px solid ${C.accent}` }}
        >
          <BookOpen className="w-5 h-5" style={{ color: C.accent }} />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold tracking-wide" style={{ color: C.text }}>
            HOW TO
          </h1>
          <p className="text-xs font-mono" style={{ color: C.textSoft }}>
            XTRAC_ANG — Extract knowledge from any source
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div
        className="rounded-sm p-5 space-y-4"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        {/* Topic */}
        <div>
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5" style={{ color: C.textSoft }}>
            WHAT DO YOU WANT TO LEARN?
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How to build a REST API with Node.js"
            className="w-full px-3 py-2.5 text-sm font-mono rounded-sm outline-none transition-colors"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              color: C.text,
            }}
            onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
            onKeyDown={(e) => e.key === 'Enter' && handleLearn()}
          />
        </div>

        {/* Source Toggle */}
        <div>
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5" style={{ color: C.textSoft }}>
            SOURCE
          </label>
          <div className="flex gap-1.5">
            {SOURCE_OPTIONS.map((opt) => {
              const active = source === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setSource(opt.id); setUrlOrContent(''); setError(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all rounded-sm"
                  style={{
                    background: active ? C.accent : C.bg,
                    color: active ? C.bg : C.textSoft,
                    border: `1px solid ${active ? C.accent : C.border}`,
                  }}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* URL / Content Input */}
        <div>
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5" style={{ color: C.textSoft }}>
            {source === 'pdf' ? 'PASTE CONTENT' : source === 'web' ? 'SOURCE URL (optional)' : 'SOURCE URL'}
          </label>
          {source === 'pdf' ? (
            <textarea
              value={urlOrContent}
              onChange={(e) => setUrlOrContent(e.target.value)}
              placeholder={currentSource.placeholder}
              rows={5}
              className="w-full px-3 py-2.5 text-sm font-mono rounded-sm outline-none resize-y"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          ) : (
            <input
              type="text"
              value={urlOrContent}
              onChange={(e) => setUrlOrContent(e.target.value)}
              placeholder={currentSource.placeholder}
              className="w-full px-3 py-2.5 text-sm font-mono rounded-sm outline-none transition-colors"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
              onKeyDown={(e) => e.key === 'Enter' && handleLearn()}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs font-mono" style={{ color: '#EF4444' }}>
            {error}
          </p>
        )}

        {/* Learn Button */}
        <button
          onClick={handleLearn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-mono font-bold tracking-wider rounded-sm transition-all"
          style={{
            background: loading ? C.accentDim : C.accent,
            color: C.bg,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              EXTRACTING...
            </>
          ) : (
            'LEARN'
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Tutorial Steps */}
          {result.tutorial ? (
            <div
              className="rounded-sm p-5 space-y-4"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <h2 className="text-lg font-mono font-bold tracking-wide" style={{ color: C.accent }}>
                {result.tutorial.title}
              </h2>

              <div className="space-y-3">
                {result.tutorial.steps.map((step) => (
                  <div
                    key={step.step_number}
                    className="flex gap-3 p-3 rounded-sm transition-colors"
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {/* Step Number */}
                    <div
                      className="w-8 h-8 flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                      style={{
                        background: C.accentGlow,
                        border: `1px solid ${C.accent}`,
                        color: C.accent,
                      }}
                    >
                      {String(step.step_number).padStart(2, '0')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                        {step.instruction}
                      </p>
                      <p className="text-[10px] font-mono mt-1.5 flex items-center gap-1" style={{ color: C.textDim }}>
                        <ChevronRight className="w-3 h-3" />
                        {step.visual_description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div
                className="p-3 rounded-sm"
                style={{ background: C.accentGlow, border: `1px solid ${C.accentDim}` }}
              >
                <p className="text-[10px] font-mono font-semibold tracking-wider mb-1" style={{ color: C.accent }}>
                  SUMMARY
                </p>
                <p className="text-sm" style={{ color: C.text }}>
                  {result.tutorial.summary}
                </p>
              </div>
            </div>
          ) : null}

          {/* Raw Extraction */}
          <details
            className="rounded-sm"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <summary
              className="px-4 py-3 text-[11px] font-mono font-medium tracking-wide cursor-pointer select-none"
              style={{ color: C.textSoft }}
            >
              RAW EXTRACTION ({result.extracted.length.toLocaleString()} chars)
            </summary>
            <div
              className="px-4 pb-4 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto"
              style={{ color: C.textDim }}
            >
              {result.extracted}
            </div>
          </details>

          {/* Metadata */}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <details
              className="rounded-sm"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <summary
                className="px-4 py-3 text-[10px] font-mono font-medium tracking-wider cursor-pointer select-none"
                style={{ color: C.textDim }}
              >
                METADATA
              </summary>
              <div className="px-4 pb-4">
                <pre
                  className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap"
                  style={{ color: C.textDim }}
                >
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
