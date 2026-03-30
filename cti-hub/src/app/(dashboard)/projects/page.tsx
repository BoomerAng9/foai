'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, FileSpreadsheet, Globe, FileText, Video, Code, ExternalLink } from 'lucide-react';
import PipelineTracker from '@/components/pipeline/PipelineTracker';

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
  scrape: Globe, clean: FileText, export: FileSpreadsheet, video: Video, build: Code,
};

const STATUS_LED: Record<string, string> = {
  done: 'led-live', running: 'bg-signal-info', pending: 'led-idle', failed: 'led-error',
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
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              My <span className="font-bold">Projects</span>
            </h1>
          </div>
          <p className="label-mono">Every deliverable, export, and build</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-fg-tertiary">{totalTokens.toLocaleString()} TOKENS</span>
          <span className="font-mono text-[10px] text-fg-tertiary">${totalCost.toFixed(4)}</span>
        </div>
      </div>

      {/* ── Active Pipeline ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="led bg-accent animate-pulse-dot" />
          <h2 className="label-mono text-fg-secondary">Active Pipeline</h2>
        </div>
        <div className="card">
          <PipelineTracker />
        </div>
      </section>

      {/* ── Completed Jobs ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="led led-live" />
          <h2 className="label-mono text-fg-secondary">Completed Jobs</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="font-mono text-xs text-fg-tertiary animate-pulse-dot">Loading...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="card text-center py-16">
            <FolderOpen className="w-10 h-10 text-fg-ghost mx-auto mb-4" />
            <p className="font-mono text-xs text-fg-tertiary">No projects yet. Start a conversation to create your first.</p>
          </div>
        ) : (
          <div className="border border-border bg-bg-surface overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_80px_80px_80px_auto] gap-4 px-5 py-3 border-b border-border min-w-[600px]">
              {['', 'Project', 'Status', 'Tokens', 'Cost', ''].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {jobs.map(job => {
              const Icon = TYPE_ICONS[job.job_type] || FileText;
              const ledClass = STATUS_LED[job.status] || 'led-idle';
              const sheetUrl = (job.output as Record<string, string>)?.spreadsheetUrl;

              return (
                <div key={job.id} className="grid grid-cols-[auto_1fr_80px_80px_80px_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors items-center min-w-[600px]">
                  <Icon className="w-4 h-4 text-fg-tertiary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(job.input as Record<string, string>)?.title || `${job.job_type} job`}
                    </p>
                    <p className="font-mono text-[10px] text-fg-ghost">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`led ${ledClass}`} />
                    <span className="font-mono text-[10px] uppercase text-fg-secondary">{job.status}</span>
                  </div>
                  <span className="font-mono text-xs">{(job.tokens_in + job.tokens_out).toLocaleString()}</span>
                  <span className="font-mono text-xs">${(job.cost_usd || 0).toFixed(4)}</span>
                  <div>
                    {sheetUrl && (
                      <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn-bracket text-[9px]">
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
