'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, FileSpreadsheet, Globe, FileText, Video, Code, Clock, Coins, ExternalLink, Download } from 'lucide-react';

interface WorkspaceJob {
  id: string;
  job_type: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  model_used: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
  completed_at: string | null;
}

const TYPE_ICONS: Record<string, typeof FileSpreadsheet> = {
  scrape: Globe,
  clean: FileText,
  export: FileSpreadsheet,
  video: Video,
  build: Code,
};

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-slate-50 text-slate-500 border-slate-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
};

export default function MyProjects() {
  const [jobs, setJobs] = useState<WorkspaceJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspace')
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTokens = jobs.reduce((sum, j) => sum + j.tokens_in + j.tokens_out, 0);
  const totalCost = jobs.reduce((sum, j) => sum + (j.cost_usd || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
            <p className="text-sm text-slate-500">Every deliverable, export, and build — permanently stored.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> {totalTokens.toLocaleString()} tokens</span>
          <span className="flex items-center gap-1">${totalCost.toFixed(4)} total</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-3 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-300 mb-1">No projects yet</h2>
          <p className="text-xs text-slate-400">Your deliverables will appear here after you run your first pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const Icon = TYPE_ICONS[job.job_type] || FileText;
            const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.pending;
            const sheetUrl = (job.output as Record<string, string>)?.spreadsheetUrl;
            const previewUrl = (job.output as Record<string, string>)?.previewUrl;

            return (
              <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-[#00A3FF]/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {(job.input as Record<string, string>)?.title || `${job.job_type} job`}
                    </p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${statusStyle}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                    </span>
                    <span>{(job.tokens_in + job.tokens_out).toLocaleString()} tokens</span>
                    <span>${(job.cost_usd || 0).toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sheetUrl && (
                    <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition-all border border-emerald-200">
                      <FileSpreadsheet className="w-3 h-3" /> Sheet
                    </a>
                  )}
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-all border border-blue-200">
                      <ExternalLink className="w-3 h-3" /> Preview
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
