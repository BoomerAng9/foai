'use client';

/**
 * MissionBuilder — modal for dispatching a Sqwaadrun mission
 * ==============================================================
 * Collects intent + targets + mission type. Respects the current
 * tier's allowed_mission_types (locks unavailable types with a
 * cross-out). Submits to /api/sqwaadrun/mission and streams the
 * result back inline.
 *
 * Sqwaadrun brand palette throughout.
 */

import { useEffect, useState } from 'react';
import {
  SQWAADRUN_TIERS,
  type SqwaadrunTierId,
} from '@/lib/billing/plans';

interface MissionBuilderProps {
  open: boolean;
  onClose: () => void;
  tierId: SqwaadrunTierId | null;
  onComplete?: (result: MissionResult) => void;
}

interface MissionResult {
  mission_id?: string;
  type?: string;
  status?: string;
  results_count?: number;
  error?: string | null;
  kpis?: Record<string, unknown>;
  quota?: { used: number; limit: number; remaining: number };
}

type MissionType = 'recon' | 'survey' | 'harvest' | 'patrol' | 'intercept' | 'sweep' | 'batch_ops';

const ALL_MISSION_TYPES: {
  id: MissionType;
  label: string;
  description: string;
}[] = [
  { id: 'recon', label: 'RECON', description: 'Single-page scrape with optional cleaning' },
  { id: 'survey', label: 'SURVEY', description: 'Sitemap discovery + analysis' },
  { id: 'intercept', label: 'INTERCEPT', description: 'REST / GraphQL endpoint with auth' },
  { id: 'harvest', label: 'HARVEST', description: 'Targeted extraction with schema' },
  { id: 'patrol', label: 'PATROL', description: 'Monitor for changes + alerts' },
  { id: 'sweep', label: 'SWEEP', description: 'Full BFS crawl with depth limits' },
  { id: 'batch_ops', label: 'BATCH OPS', description: 'Bulk URL processing' },
];

export function MissionBuilder({ open, onClose, tierId, onComplete }: MissionBuilderProps) {
  const [missionType, setMissionType] = useState<MissionType>('recon');
  const [intent, setIntent] = useState('');
  const [targetsText, setTargetsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tier = tierId ? SQWAADRUN_TIERS[tierId] : null;
  const allowed = tier?.allowed_mission_types || [];

  useEffect(() => {
    if (!open) {
      // Reset state on close
      setTimeout(() => {
        setResult(null);
        setError(null);
        setIntent('');
        setTargetsText('');
      }, 300);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    setResult(null);

    const targets = targetsText
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && /^https?:\/\//.test(t));

    if (targets.length === 0) {
      setError('At least one valid https:// URL is required');
      return;
    }

    if (!intent.trim()) {
      setError('Describe the intent — what do you want the Sqwaad to do?');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/sqwaadrun/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission: {
            type: missionType,
            targets,
            config: { intent },
          },
        }),
      });

      const data = (await res.json()) as MissionResult & { error?: string };

      if (!res.ok) {
        setError(data.error || `Dispatch failed (${res.status})`);
      } else {
        setResult(data);
        onComplete?.(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2"
        style={{
          background: 'linear-gradient(165deg, #0B1220, #050810)',
          borderColor: 'rgba(245,166,35,0.5)',
          borderRadius: '3px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(245,166,35,0.15)',
          fontFamily: "'Outfit', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(245,166,35,0.3)' }}
        >
          <div>
            <div
              className="text-[9px] font-mono tracking-[0.3em]"
              style={{ color: '#F5A623' }}
            >
              DISPATCH
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              New Mission
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center opacity-60 hover:opacity-100 text-white"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Mission type */}
          <div>
            <label
              className="block text-[9px] font-mono tracking-[0.25em] uppercase mb-2"
              style={{ color: '#22D3EE' }}
            >
              Mission Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_MISSION_TYPES.map((m) => {
                const isAllowed = allowed.includes(m.id);
                const isSelected = missionType === m.id;
                return (
                  <button
                    key={m.id}
                    disabled={!isAllowed}
                    onClick={() => setMissionType(m.id)}
                    className="text-left p-3 border transition disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: isSelected
                        ? '#F5A623'
                        : isAllowed
                        ? 'rgba(34,211,238,0.3)'
                        : 'rgba(255,255,255,0.1)',
                      background: isSelected
                        ? 'rgba(245,166,35,0.1)'
                        : 'rgba(255,255,255,0.02)',
                      borderRadius: '2px',
                      textDecoration: isAllowed ? 'none' : 'line-through',
                    }}
                  >
                    <div
                      className="text-[10px] font-mono font-bold tracking-wider"
                      style={{ color: isAllowed ? '#F5A623' : 'rgba(255,255,255,0.3)' }}
                    >
                      {m.label}
                    </div>
                    <div className="text-[10px] mt-1 leading-snug" style={{ color: '#94A3B8' }}>
                      {m.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {tier && (
              <div className="text-[9px] font-mono mt-2 opacity-60 text-white">
                {allowed.length}/{ALL_MISSION_TYPES.length} unlocked on {tier.name}
              </div>
            )}
          </div>

          {/* Intent */}
          <div>
            <label
              className="block text-[9px] font-mono tracking-[0.25em] uppercase mb-2"
              style={{ color: '#22D3EE' }}
            >
              Intent
            </label>
            <input
              type="text"
              placeholder="e.g. harvest player stats from this recruiting page"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-mono text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(245,166,35,0.3)',
                borderRadius: '2px',
              }}
            />
          </div>

          {/* Targets */}
          <div>
            <label
              className="block text-[9px] font-mono tracking-[0.25em] uppercase mb-2"
              style={{ color: '#22D3EE' }}
            >
              Target URLs (one per line)
            </label>
            <textarea
              placeholder="https://example-recruiting.com/2026/prospect-name"
              value={targetsText}
              onChange={(e) => setTargetsText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 text-xs font-mono text-white outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(245,166,35,0.3)',
                borderRadius: '2px',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-3 border text-[11px] font-mono"
              style={{
                borderColor: 'rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.08)',
                color: '#FCA5A5',
                borderRadius: '2px',
              }}
            >
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="p-4 border"
              style={{
                borderColor: 'rgba(34,211,238,0.5)',
                background: 'rgba(34,211,238,0.05)',
                borderRadius: '2px',
              }}
            >
              <div
                className="text-[9px] font-mono tracking-[0.25em] mb-2"
                style={{ color: '#22D3EE' }}
              >
                MISSION COMPLETE
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="opacity-60 font-mono">ID</div>
                  <div className="font-mono text-white">{result.mission_id || '—'}</div>
                </div>
                <div>
                  <div className="opacity-60 font-mono">STATUS</div>
                  <div
                    className="font-mono"
                    style={{
                      color:
                        result.status === 'completed'
                          ? '#22D3EE'
                          : result.status === 'failed'
                          ? '#EF4444'
                          : '#F5A623',
                    }}
                  >
                    {result.status?.toUpperCase() || '—'}
                  </div>
                </div>
                <div>
                  <div className="opacity-60 font-mono">RESULTS</div>
                  <div className="font-mono text-white">{result.results_count ?? 0}</div>
                </div>
                <div>
                  <div className="opacity-60 font-mono">QUOTA</div>
                  <div className="font-mono text-white">
                    {result.quota ? `${result.quota.used}/${result.quota.limit}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'rgba(245,166,35,0.2)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 text-[11px] font-mono tracking-wider"
            style={{
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#94A3B8',
              borderRadius: '2px',
            }}
          >
            {result ? 'CLOSE' : 'CANCEL'}
          </button>
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 text-[11px] font-mono tracking-wider font-bold disabled:opacity-50"
              style={{
                background: '#F5A623',
                color: '#050810',
                borderRadius: '2px',
              }}
            >
              {submitting ? 'DISPATCHING...' : 'DEPLOY →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
