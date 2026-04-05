'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Zap,
  Search,
  Code2,
  Copy,
  Check,
} from 'lucide-react';

type Mode = 'analyze' | 'improve' | 'security';

interface CodeIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion: string;
}

interface AnalyzeResult {
  mode: 'analyze' | 'security';
  score: number;
  issues: CodeIssue[];
  summary: string;
}

interface ImproveResult {
  mode: 'improve';
  research: {
    findings: { title: string; snippet: string; url: string }[];
    synthesis: string;
  };
  improvements: string;
  improvedCode: string;
}

type Result = AnalyzeResult | ImproveResult;

const LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'html',
  'css',
  'bash',
  'yaml',
  'json',
  'dockerfile',
  'terraform',
  'text',
];

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    icon: AlertTriangle,
    label: 'CRITICAL',
  },
  warning: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    label: 'WARNING',
  },
  info: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Info,
    label: 'INFO',
  },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-400 border-emerald-500/40'
      : score >= 50
        ? 'text-amber-400 border-amber-500/40'
        : 'text-red-400 border-red-500/40';

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 border font-mono text-2xl font-bold ${color}`}>
      {score >= 80 ? (
        <CheckCircle className="w-6 h-6" />
      ) : (
        <AlertTriangle className="w-6 h-6" />
      )}
      {score}/100
    </div>
  );
}

export default function CodeAngPage() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const ownerEmail = user?.email || '';
  if (!isOwner(ownerEmail)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-fg-tertiary text-sm">Owner access required.</p>
      </div>
    );
  }

  async function runAnalysis(mode: Mode) {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/code-ang/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data as Result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  function copyImprovedCode(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isImproveResult = (r: Result): r is ImproveResult => r.mode === 'improve';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent flex items-center justify-center">
          <Shield className="w-5 h-5 text-bg" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-bold tracking-wide">CODE_ANG</h1>
          <p className="font-mono text-xs text-fg-tertiary tracking-wide">
            Code Quality &amp; Verification
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="border border-border bg-bg-surface">
        {/* Controls bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <label className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-bg border border-border px-2 py-1 font-mono text-xs text-fg focus:outline-none focus:border-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <span className="font-mono text-[10px] text-fg-tertiary">
            {code.split('\n').length} lines
          </span>
        </div>

        {/* Code input */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          className="w-full h-64 bg-bg px-4 py-3 font-mono text-sm text-fg placeholder:text-fg-tertiary focus:outline-none resize-y"
          spellCheck={false}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={() => runAnalysis('analyze')}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-bg font-mono text-xs font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Code2 className="w-3.5 h-3.5" />
            ANALYZE
          </button>

          <button
            onClick={() => runAnalysis('improve')}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-mono text-xs font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" />
            IMPROVE
          </button>

          <button
            onClick={() => runAnalysis('security')}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-mono text-xs font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Search className="w-3.5 h-3.5" />
            SECURITY SCAN
          </button>

          {loading && (
            <div className="flex items-center gap-2 ml-3">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
              <span className="font-mono text-xs text-fg-tertiary">Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !isImproveResult(result) && (
        <div className="space-y-4">
          {/* Score + Summary */}
          <div className="border border-border bg-bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider">
                {result.mode === 'security' ? 'Security Scan' : 'Code Analysis'} Result
              </span>
              <ScoreBadge score={result.score} />
            </div>
            <p className="font-mono text-sm text-fg-secondary leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider px-1">
                Issues ({result.issues.length})
              </h3>
              {result.issues.map((issue, i) => {
                const cfg = SEVERITY_CONFIG[issue.severity];
                const Icon = cfg.icon;
                return (
                  <div
                    key={i}
                    className={`border ${cfg.bg} p-3 space-y-1`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className={`font-mono text-[10px] font-bold tracking-wider ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {issue.line && (
                        <span className="font-mono text-[10px] text-fg-tertiary">
                          Line {issue.line}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-fg">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="font-mono text-xs text-fg-secondary">
                        Fix: {issue.suggestion}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {result.issues.length === 0 && result.score >= 80 && (
            <div className="border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-mono text-sm text-emerald-400">
                No issues found. Code looks solid.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Improve Results */}
      {result && isImproveResult(result) && (
        <div className="space-y-4">
          {/* Research Findings */}
          {result.research.findings.length > 0 && (
            <div className="border border-border bg-bg-surface p-4 space-y-3">
              <h3 className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider">
                Research Sources ({result.research.findings.length})
              </h3>
              <div className="space-y-2">
                {result.research.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-fg-tertiary shrink-0">[{i + 1}]</span>
                    <div>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {f.title}
                      </a>
                      <p className="font-mono text-[11px] text-fg-tertiary mt-0.5">
                        {f.snippet}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Synthesis */}
          <div className="border border-border bg-bg-surface p-4 space-y-2">
            <h3 className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider">
              Research Synthesis
            </h3>
            <p className="font-mono text-xs text-fg-secondary leading-relaxed whitespace-pre-wrap">
              {result.research.synthesis}
            </p>
          </div>

          {/* Improvements */}
          <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <h3 className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
              Improvements Applied
            </h3>
            <p className="font-mono text-xs text-fg-secondary leading-relaxed whitespace-pre-wrap">
              {result.improvements}
            </p>
          </div>

          {/* Improved Code */}
          <div className="border border-border bg-bg-surface">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="font-mono text-[10px] text-fg-tertiary uppercase tracking-wider">
                Improved Code
              </span>
              <button
                onClick={() => copyImprovedCode(result.improvedCode)}
                className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] text-fg-tertiary hover:text-fg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> COPIED
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> COPY
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-fg overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result.improvedCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
