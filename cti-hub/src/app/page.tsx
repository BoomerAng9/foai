'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Send, Loader2, Trash2, Globe, Table, Mic, Camera, Plus, X,
  FileSpreadsheet, Zap, ChevronRight,
} from 'lucide-react';

interface ScrapeResult { source: string; url: string; title: string; content: string; metadata: Record<string, unknown>; scraped_at: string; }
interface CleanedData { columns: string[]; rows: Record<string, unknown>[]; }
type PipelineStep = 'idle' | 'scraping' | 'cleaning' | 'exporting' | 'done';

export default function DeployPlatform() {
  const { user, loading } = useAuth();

  const [urls, setUrls] = useState<string[]>(['']);
  const [engine, setEngine] = useState<'firecrawl' | 'apify' | 'both'>('firecrawl');
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);
  const [columns, setColumns] = useState('institution, course_name, seats_remaining, price, start_date, contact_email');
  const [cleanContext, setCleanContext] = useState('University course listings with open enrollment seats in Savannah, GA area');
  const [cleanedData, setCleanedData] = useState<CleanedData | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetTitle, setSheetTitle] = useState('Deploy Export');
  const [step, setStep] = useState<PipelineStep>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [talkInput, setTalkInput] = useState('');

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0a0a0f]"><div className="w-8 h-8 border-4 border-[#00A3FF] border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="flex h-screen items-center justify-center bg-[#0a0a0f]"><p className="text-slate-500 text-sm">Redirecting...</p></div>;

  async function runScrape() {
    const validUrls = urls.filter(u => u.trim());
    if (validUrls.length === 0) return;
    setStep('scraping'); setErrors([]); setScrapeResults([]); setCleanedData(null); setSheetUrl(null);
    try {
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: validUrls, engine }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScrapeResults(data.results || []);
      if (data.errors?.length > 0) setErrors(data.errors.map((e: { url: string; error: string }) => `${e.url}: ${e.error}`));
    } catch (err: unknown) { setErrors([err instanceof Error ? err.message : 'Research failed']); }
    setStep('idle');
  }

  async function runClean() {
    if (scrapeResults.length === 0) return;
    setStep('cleaning'); setCleanedData(null);
    const rawText = scrapeResults.map(r => `--- ${r.title} (${r.url}) ---\n${r.content}`).join('\n\n');
    const colArray = columns.split(',').map(c => c.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw_data: rawText, columns: colArray, context: cleanContext }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCleanedData({ columns: data.columns, rows: data.rows });
    } catch (err: unknown) { setErrors(prev => [...prev, err instanceof Error ? err.message : 'Organize failed']); }
    setStep('idle');
  }

  async function exportToSheets() {
    if (!cleanedData) return;
    setStep('exporting');
    try {
      const res = await fetch('/api/sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: sheetTitle, columns: cleanedData.columns, rows: cleanedData.rows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSheetUrl(data.spreadsheetUrl); setStep('done');
    } catch (err: unknown) { setErrors(prev => [...prev, err instanceof Error ? err.message : 'Deliver failed']); setStep('idle'); }
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden">
      <aside className="w-72 bg-[#111118] border-r border-white/[0.06] flex flex-col">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00A3FF] flex items-center justify-center text-sm font-black">D</div>
            <span className="text-lg font-bold tracking-tight">Deploy</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Research &middot; Organize &middot; Deliver</p>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Target URLs</label>
            {urls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="url" value={url} onChange={(e) => { const next = [...urls]; next[i] = e.target.value; setUrls(next); }}
                  placeholder="https://..." className="flex-1 h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm focus:outline-none focus:border-[#00A3FF]/50 placeholder:text-slate-600" />
                {urls.length > 1 && <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            <button onClick={() => setUrls([...urls, ''])} className="flex items-center gap-1 text-[11px] text-[#00A3FF] font-bold hover:underline"><Plus className="w-3 h-3" /> Add URL</button>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Engine</label>
            <div className="flex gap-2">
              {(['firecrawl', 'apify', 'both'] as const).map(e => (
                <button key={e} onClick={() => setEngine(e)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${engine === e ? 'bg-[#00A3FF] text-white' : 'bg-white/[0.05] text-slate-400 hover:text-white'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Data Columns</label>
            <textarea value={columns} onChange={(e) => setColumns(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-mono focus:outline-none focus:border-[#00A3FF]/50 resize-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Context</label>
            <textarea value={cleanContext} onChange={(e) => setCleanContext(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs focus:outline-none focus:border-[#00A3FF]/50 resize-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Deliverable Title</label>
            <input value={sheetTitle} onChange={(e) => setSheetTitle(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm focus:outline-none focus:border-[#00A3FF]/50" />
          </div>
        </div>
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          <button onClick={runScrape} disabled={step !== 'idle' || urls.every(u => !u.trim())} className="w-full h-10 rounded-xl bg-[#00A3FF] text-sm font-bold hover:bg-[#0089D9] transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-[#00A3FF]/20">
            {step === 'scraping' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} {step === 'scraping' ? 'Researching...' : 'Research'}
          </button>
          <button onClick={runClean} disabled={step !== 'idle' || scrapeResults.length === 0} className="w-full h-10 rounded-xl bg-[#A855F7] text-sm font-bold hover:bg-[#9333EA] transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-[#A855F7]/20">
            {step === 'cleaning' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />} {step === 'cleaning' ? 'Organizing...' : 'Organize'}
          </button>
          <button onClick={exportToSheets} disabled={step !== 'idle' || !cleanedData} className="w-full h-10 rounded-xl bg-emerald-600 text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
            {step === 'exporting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} {step === 'exporting' ? 'Delivering...' : 'Deliver'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">The Deploy Platform</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-semibold">
              {step === 'scraping' ? 'Researching...' : step === 'cleaning' ? 'Organizing...' : step === 'exporting' ? 'Delivering...' :
               cleanedData ? `${cleanedData.rows.length} rows ready` : scrapeResults.length > 0 ? `${scrapeResults.length} pages gathered` : 'Ready'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sheetUrl && <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-bold"><FileSpreadsheet className="w-3.5 h-3.5" /> Open Deliverable</a>}
            {(scrapeResults.length > 0 || cleanedData) && <button onClick={() => { setScrapeResults([]); setCleanedData(null); setSheetUrl(null); setErrors([]); }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {errors.length > 0 && <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">{errors.map((e, i) => <p key={i} className="text-xs text-red-400 font-mono">{e}</p>)}</div>}

          {scrapeResults.length === 0 && !cleanedData && step === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6"><Zap className="w-10 h-10 text-[#00A3FF]/40" /></div>
              <h2 className="text-xl font-bold text-slate-300 mb-2">Add URLs and hit Research</h2>
              <p className="text-sm text-slate-600 max-w-md">Research gathers the data. Organize structures it. Deliver exports your finished asset.</p>
            </div>
          )}

          {scrapeResults.length > 0 && !cleanedData && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Raw Data ({scrapeResults.length} pages)</h3>
              {scrapeResults.map((r, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-sm font-bold text-white">{r.title}</p>
                  <p className="text-[10px] text-slate-500 font-mono mb-2">{r.url}</p>
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">{r.content.slice(0, 2000)}{r.content.length > 2000 ? '...' : ''}</pre>
                </div>
              ))}
            </div>
          )}

          {cleanedData && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Organized ({cleanedData.rows.length} rows)</h3>
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/[0.03]">{cleanedData.columns.map(col => <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">{col}</th>)}</tr></thead>
                  <tbody>{cleanedData.rows.map((row, i) => <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">{cleanedData.columns.map(col => <td key={col} className="px-4 py-3 text-xs text-slate-300 font-mono">{row[col] != null ? String(row[col]) : <span className="text-slate-600">—</span>}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="h-16 border-t border-white/[0.06] bg-[#111118] px-4 flex items-center gap-3 shrink-0">
          <button type="button" title="Voice" className="w-9 h-9 rounded-xl bg-white/[0.05] text-slate-500 flex items-center justify-center hover:text-[#00A3FF] hover:bg-white/[0.08] transition-all"><Mic className="w-4 h-4" /></button>
          <button type="button" title="Vision" className="w-9 h-9 rounded-xl bg-white/[0.05] text-slate-500 flex items-center justify-center hover:text-[#A855F7] hover:bg-white/[0.08] transition-all"><Camera className="w-4 h-4" /></button>
          <input type="text" value={talkInput} onChange={(e) => setTalkInput(e.target.value)} placeholder="Chat w/ ACHEEVY..." className="flex-1 h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm focus:outline-none focus:border-[#00A3FF]/50 placeholder:text-slate-600" />
          <button type="button" title="Send" disabled={!talkInput.trim()} className="w-9 h-9 rounded-xl bg-[#00A3FF] text-white flex items-center justify-center hover:bg-[#0089D9] transition-all disabled:opacity-30"><Send className="w-4 h-4" /></button>
        </div>
      </main>
    </div>
  );
}
