'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Play, Save, Plus, Cpu, Volume2, Code2, FileText, BarChart3,
  AlertCircle, CheckCircle, Clock, Loader2, ChevronRight, Search,
} from 'lucide-react';

/* ── types ─────────────────────────────────────────────── */

type ChamberMode = 'testing' | 'workbench';

interface TestResult {
  id: string;
  status: number;
  latency: number;
  output: string;
  timestamp: Date;
  logs: { level: 'info' | 'warn' | 'error'; msg: string }[];
}

/* ── saved tools (stub — will source from pricing-matrix) */

const QUICK_TOOLS = [
  { id: 'fast-intel', label: 'Fast Intelligence', sector: 'llm' },
  { id: 'standard-chat', label: 'Standard Chat', sector: 'llm' },
  { id: 'precision-code', label: 'Precision Code', sector: 'llm' },
  { id: 'voice-premium', label: 'Voice Premium', sector: 'tts' },
  { id: 'voice-standard', label: 'Voice Standard', sector: 'tts' },
  { id: 'vector-engine', label: 'Vector Engine', sector: 'image' },
  { id: 'video-prime', label: 'Video Prime', sector: 'video' },
  { id: 'transcription', label: 'Transcription', sector: 'stt' },
];

const SAVED_PROJECTS = [
  { id: 'p1', name: 'Voice Agent Test', tool: 'voice-standard', lastRun: '2 hours ago' },
  { id: 'p2', name: 'Image Gen Pipeline', tool: 'vector-engine', lastRun: 'Yesterday' },
  { id: 'p3', name: 'Intelligence Comparison', tool: 'fast-intel', lastRun: '3 days ago' },
];

/* ── page ──────────────────────────────────────────────── */

function ChamberContent() {
  const searchParams = useSearchParams();
  const preloadTool = searchParams.get('tool') || '';

  const [mode, setMode] = useState<ChamberMode>('testing');
  const [selectedTool, setSelectedTool] = useState(preloadTool || '');
  const [scenarioName, setScenarioName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('POST');
  const [headers, setHeaders] = useState('{"Content-Type": "application/json"}');
  const [body, setBody] = useState('{"text": "Hello, test this tool."}');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [toolSearch, setToolSearch] = useState('');

  const filteredTools = toolSearch
    ? QUICK_TOOLS.filter(t => t.label.toLowerCase().includes(toolSearch.toLowerCase()))
    : QUICK_TOOLS;

  async function runTest() {
    if (!selectedTool) return;
    setRunning(true);
    try {
      const res = await fetch('/api/the-chamber/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolId: selectedTool, body }) });
      const data = await res.json();
      setResults(prev => [{ id: data.id, status: data.status ?? res.status, latency: data.latency ?? 0, output: data.output ?? 'No output', timestamp: new Date(data.timestamp ?? Date.now()), logs: data.logs ?? [{ level: 'info', msg: 'Complete' }] }, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setResults(prev => [{ id: `test-${Date.now()}`, status: 0, latency: 0, output: msg, timestamp: new Date(), logs: [{ level: 'error', msg }] }, ...prev]);
    } finally { setRunning(false); }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface">
        <div className="flex items-center gap-3">
          <Cpu className="w-4 h-4 text-accent" />
          <h1 className="font-mono text-sm font-bold tracking-wider uppercase">The Chamber</h1>
        </div>
        <div className="flex items-center gap-1 bg-bg-elevated border border-border p-0.5">
          <button
            onClick={() => setMode('testing')}
            className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider transition-colors ${
              mode === 'testing' ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'
            }`}
          >
            TESTING
          </button>
          <button
            onClick={() => setMode('workbench')}
            className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider transition-colors ${
              mode === 'workbench' ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'
            }`}
          >
            WORKBENCH
          </button>
        </div>
      </div>

      {/* Responsive layout — stacks on mobile, 3-col on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Tools & APIs */}
        <div className="hidden md:block w-48 lg:w-56 border-r border-border bg-bg-surface overflow-y-auto shrink-0">
          <div className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-ghost" />
              <input
                type="text"
                placeholder="Find tool..."
                value={toolSearch}
                onChange={e => setToolSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-[10px] font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none"
              />
            </div>

            <p className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider mb-2">Available Tools</p>
            <div className="space-y-1 mb-4">
              {filteredTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`w-full text-left px-2 py-1.5 text-[10px] font-mono transition-colors flex items-center gap-2 ${
                    selectedTool === tool.id
                      ? 'bg-accent/10 border border-accent/30 text-accent'
                      : 'hover:bg-bg-elevated text-fg-secondary border border-transparent'
                  }`}
                >
                  <span className="font-mono text-[8px] uppercase text-fg-ghost w-6">{tool.sector}</span>
                  <span className="flex-1">{tool.label}</span>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {mode === 'workbench' && (
              <>
                <p className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider mb-2">My Projects</p>
                <div className="space-y-1">
                  {SAVED_PROJECTS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedTool(p.tool); setScenarioName(p.name); }}
                      className="w-full text-left px-2 py-1.5 border border-border hover:border-fg-ghost transition-colors"
                    >
                      <span className="text-[10px] font-semibold text-fg block">{p.name}</span>
                      <span className="text-[8px] text-fg-ghost">{p.lastRun}</span>
                    </button>
                  ))}
                  <button className="w-full flex items-center justify-center gap-1 px-2 py-2 border border-dashed border-border hover:border-accent/50 text-[9px] font-mono text-fg-ghost hover:text-accent transition-colors">
                    <Plus className="w-3 h-3" /> New Project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center — Scenario Creation */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-xl space-y-4">
            <div>
              <label className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1">Scenario Name</label>
              <input
                type="text"
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                placeholder="e.g. Live STT Test"
                className="w-full px-3 py-2 text-sm font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1">Tool</label>
                <input
                  type="text"
                  value={selectedTool}
                  onChange={e => setSelectedTool(e.target.value)}
                  placeholder="Select from left panel"
                  className="w-full px-3 py-2 text-xs font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1">Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none"
                >
                  <option>POST</option>
                  <option>GET</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1">Headers</label>
              <textarea
                value={headers}
                onChange={e => setHeaders(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none resize-y"
              />
            </div>

            <div>
              <label className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1">Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-xs font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none resize-y"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={runTest}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2 btn-solid font-mono text-[10px] tracking-wider disabled:opacity-50"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {running ? 'RUNNING...' : 'RUN TEST'}
              </button>
              {mode === 'workbench' && (
                <button className="flex items-center gap-2 px-4 py-2 border border-border font-mono text-[10px] tracking-wider text-fg-secondary hover:text-fg hover:border-fg-ghost transition-colors">
                  <Save className="w-3.5 h-3.5" /> SAVE SCENARIO
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="hidden lg:block w-72 xl:w-80 border-l border-border bg-bg-surface overflow-y-auto shrink-0">
          <div className="p-3 border-b border-border">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg">Real-Time Results</p>
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-[10px] text-fg-ghost font-mono">Run a test to see results here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map(r => (
                <div key={r.id} className="p-3">
                  {/* Status line */}
                  <div className="flex items-center gap-2 mb-2">
                    {r.status < 300 ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className={`font-mono text-[10px] font-bold ${r.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.status} {r.status < 300 ? 'OK' : 'ERROR'}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-fg-ghost">
                      <Clock className="w-3 h-3" /> {r.latency}ms
                    </span>
                  </div>

                  {/* Output */}
                  <p className="text-[10px] text-fg-secondary mb-2 bg-bg-elevated p-2 border border-border font-mono">{r.output}</p>

                  {/* Logs */}
                  <div className="space-y-0.5">
                    {r.logs.map((log, i) => (
                      <div key={i} className="flex items-center gap-1 font-mono text-[9px]">
                        <span className={
                          log.level === 'error' ? 'text-red-500' :
                          log.level === 'warn' ? 'text-amber-500' : 'text-fg-ghost'
                        }>[{log.level}]</span>
                        <span className="text-fg-secondary">{log.msg}</span>
                      </div>
                    ))}
                  </div>

                  <p className="font-mono text-[8px] text-fg-ghost mt-2">
                    {r.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TheChamberPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-fg-ghost font-mono text-sm">
        Loading The Chamber...
      </div>
    }>
      <ChamberContent />
    </Suspense>
  );
}
