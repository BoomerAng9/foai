'use client';

import { useState } from 'react';
import { BookOpen, Youtube, Globe, Upload, Loader2, ChevronRight, CheckCircle2 } from 'lucide-react';

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

const SOURCE_OPTIONS: { id: SourceType; label: string; icon: typeof Youtube; placeholder: string }[] = [
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'Paste a YouTube URL...' },
  { id: 'web', label: 'Web', icon: Globe, placeholder: 'Optional — paste a URL or leave blank to auto-search' },
  { id: 'pdf', label: 'Upload', icon: Upload, placeholder: 'Paste text content from your PDF...' },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Progress bar */}
      <div className="bg-bg-surface border border-border rounded-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="font-mono text-[11px] tracking-wider text-fg-secondary">EXTRACTING KNOWLEDGE...</span>
        </div>
        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full bg-accent/60 rounded-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
      </div>
      {/* Skeleton cards */}
      <div className="bg-bg-surface border border-border rounded-sm p-5 space-y-4">
        <div className="h-5 bg-bg rounded w-2/3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-3 bg-bg rounded-sm border border-border">
            <div className="w-8 h-8 bg-border rounded shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-border rounded w-full" />
              <div className="h-3 bg-border/60 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowToPage() {
  const [topic, setTopic] = useState('');
  const [source, setSource] = useState<SourceType>('youtube');
  const [urlOrContent, setUrlOrContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');

  const currentSource = SOURCE_OPTIONS.find((s) => s.id === source)!;

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
        <div className="w-10 h-10 flex items-center justify-center bg-accent/10 border border-accent">
          <BookOpen className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold tracking-wide text-fg">HOW TO</h1>
          <p className="text-xs font-mono text-fg-secondary">XTRAC_ANG — Extract knowledge from any source</p>
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-sm p-5 space-y-4 bg-bg-surface border border-border">
        {/* Topic */}
        <div>
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5 text-fg-secondary">
            WHAT DO YOU WANT TO LEARN?
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How to build a REST API with Node.js"
            className="input-field w-full px-3 py-2.5 text-sm font-mono rounded-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleLearn()}
          />
        </div>

        {/* Source Toggle */}
        <div>
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5 text-fg-secondary">
            SOURCE
          </label>
          <div className="flex gap-1.5">
            {SOURCE_OPTIONS.map((opt) => {
              const active = source === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setSource(opt.id); setUrlOrContent(''); setError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-medium tracking-wide transition-all rounded-sm border ${
                    active
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-bg text-fg-secondary border-border hover:border-fg-tertiary'
                  }`}
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
          <label className="block text-[10px] font-mono font-semibold tracking-wider mb-1.5 text-fg-secondary">
            {source === 'pdf' ? 'PASTE CONTENT' : source === 'web' ? 'SOURCE URL (optional)' : 'SOURCE URL'}
          </label>
          {source === 'pdf' ? (
            <textarea
              value={urlOrContent}
              onChange={(e) => setUrlOrContent(e.target.value)}
              placeholder={currentSource.placeholder}
              rows={5}
              className="input-field w-full px-3 py-2.5 text-sm font-mono rounded-sm resize-y"
            />
          ) : (
            <input
              type="text"
              value={urlOrContent}
              onChange={(e) => setUrlOrContent(e.target.value)}
              placeholder={currentSource.placeholder}
              className="input-field w-full px-3 py-2.5 text-sm font-mono rounded-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleLearn()}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs font-mono text-signal-error">{error}</p>
        )}

        {/* Learn Button */}
        <button
          onClick={handleLearn}
          disabled={loading}
          className="btn-solid w-full h-11 text-sm font-mono font-bold tracking-wider rounded-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              EXTRACTING...
            </span>
          ) : (
            'LEARN'
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Tutorial Steps */}
          {result.tutorial ? (
            <div className="rounded-sm p-5 space-y-4 bg-bg-surface border border-border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-signal-live shrink-0" />
                <h2 className="text-lg font-mono font-bold tracking-wide text-accent">
                  {result.tutorial.title}
                </h2>
              </div>

              {/* Step counter */}
              <div className="flex items-center gap-2 text-fg-tertiary font-mono text-[10px] tracking-wider">
                <span>{result.tutorial.steps.length} STEPS</span>
                <span className="text-border">|</span>
                <span>{result.extracted.length.toLocaleString()} CHARS EXTRACTED</span>
              </div>

              <div className="space-y-3">
                {result.tutorial.steps.map((step, idx) => (
                  <div
                    key={step.step_number}
                    className="flex gap-3 p-3 rounded-sm bg-bg border border-border hover:border-accent/20 transition-colors"
                  >
                    {/* Step Number */}
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-xs font-mono font-bold bg-accent/10 border border-accent text-accent">
                      {String(step.step_number).padStart(2, '0')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed text-fg">{step.instruction}</p>
                      <p className="text-[10px] font-mono mt-1.5 flex items-center gap-1 text-fg-tertiary">
                        <ChevronRight className="w-3 h-3" />
                        {step.visual_description}
                      </p>
                    </div>

                    {/* Step progress indicator */}
                    <div className="hidden sm:flex items-start pt-1">
                      <span className="font-mono text-[9px] text-fg-ghost">
                        {idx + 1}/{result.tutorial!.steps.length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-sm bg-accent/5 border border-accent/20">
                <p className="text-[10px] font-mono font-semibold tracking-wider mb-1.5 text-accent">SUMMARY</p>
                <p className="text-sm text-fg leading-relaxed">{result.tutorial.summary}</p>
              </div>
            </div>
          ) : null}

          {/* Raw Extraction */}
          <details className="rounded-sm bg-bg-surface border border-border group">
            <summary className="px-4 py-3 text-[11px] font-mono font-medium tracking-wide cursor-pointer select-none text-fg-secondary hover:text-fg transition-colors">
              RAW EXTRACTION ({result.extracted.length.toLocaleString()} chars)
            </summary>
            <div className="px-4 pb-4 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto text-fg-tertiary">
              {result.extracted}
            </div>
          </details>

          {/* Metadata */}
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <details className="rounded-sm bg-bg-surface border border-border group">
              <summary className="px-4 py-3 text-[10px] font-mono font-medium tracking-wider cursor-pointer select-none text-fg-tertiary hover:text-fg-secondary transition-colors">
                METADATA
              </summary>
              <div className="px-4 pb-4">
                <div className="bg-bg rounded-sm border border-border p-3">
                  <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap text-fg-tertiary">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
