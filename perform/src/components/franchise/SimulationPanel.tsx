'use client';

/**
 * SimulationPanel — Slides up from bottom to show AI simulation results.
 * Displays win/loss projection, playoff probability, key matchups,
 * draft position, and AI narrative explanation.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Target, Trophy, FileText, Loader2 } from 'lucide-react';
import type { SimulationProjection, SimulationStreamEvent } from '@/lib/franchise/simulation';

interface SimulationPanelProps {
  open: boolean;
  onClose: () => void;
  teamAbbr?: string;
  teamColor?: string;
  mode: 'roster' | 'staff' | 'draft';
  /** SSE endpoint URL to connect to */
  streamUrl?: string;
  /** POST body for the simulation request */
  requestBody?: Record<string, unknown>;
}

export function SimulationPanel({
  open,
  onClose,
  teamAbbr,
  teamColor = '#D4A853',
  mode,
  streamUrl,
  requestBody,
}: SimulationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [projection, setProjection] = useState<SimulationProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Auto-scroll narrative as it streams in
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamText]);

  // Start simulation when panel opens
  useEffect(() => {
    if (!open || !streamUrl || !requestBody) return;

    setLoading(true);
    setStreamText('');
    setProjection(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(streamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          setError(errData.error || `Simulation failed (${res.status})`);
          setLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError('No response stream');
          setLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: SimulationStreamEvent = JSON.parse(line.slice(6));
                if (event.type === 'text') {
                  setStreamText((prev) => prev + event.content);
                } else if (event.type === 'projection' && event.data) {
                  setProjection(event.data);
                } else if (event.type === 'complete') {
                  if (event.data) setProjection(event.data);
                  setLoading(false);
                } else if (event.type === 'error') {
                  setError(event.content);
                  setLoading(false);
                }
              } catch {
                // Skip malformed lines
              }
            }
          }
        }

        setLoading(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Simulation failed');
        }
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [open, streamUrl, requestBody]);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const modeLabel =
    mode === 'roster' ? 'Season Projection' :
    mode === 'staff' ? 'Staff Impact Analysis' :
    'Draft Strategy';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{ maxHeight: '75vh' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 -top-[100vh] pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={handleClose}
          />

          {/* Panel */}
          <div
            className="relative rounded-t-2xl overflow-hidden"
            style={{
              background: 'rgba(12,12,18,0.98)',
              borderTop: `2px solid ${teamColor}40`,
              backdropFilter: 'blur(20px)',
              maxHeight: '75vh',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                {teamAbbr && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                    style={{ background: `${teamColor}20`, color: teamColor, border: `1px solid ${teamColor}30` }}
                  >
                    {teamAbbr}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-outfit font-bold text-white">{modeLabel}</h3>
                  <p className="text-[10px] text-white/30">
                    {loading ? 'Analyzing...' : error ? 'Error' : 'Complete'}
                  </p>
                </div>
                {loading && <Loader2 className="w-4 h-4 text-amber-400/60 animate-spin ml-2" />}
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Error state */}
            {error && (
              <div className="px-6 pb-4">
                <div
                  className="rounded-lg p-4 text-sm text-red-400/80"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  {error}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 100px)' }}>
              {/* Projection cards */}
              {projection && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {projection.wins != null && projection.losses != null && (
                    <StatCard
                      icon={<Trophy className="w-4 h-4" />}
                      label="Projected Record"
                      value={`${projection.wins}-${projection.losses}`}
                      color={projection.wins > projection.losses ? '#22C55E' : '#EF4444'}
                    />
                  )}
                  {projection.playoffProbability != null && (
                    <StatCard
                      icon={<Target className="w-4 h-4" />}
                      label="Playoff Probability"
                      value={`${projection.playoffProbability}%`}
                      color={projection.playoffProbability >= 50 ? '#22C55E' : projection.playoffProbability >= 25 ? '#F59E0B' : '#EF4444'}
                    />
                  )}
                  {projection.draftPosition != null && (
                    <StatCard
                      icon={<TrendingDown className="w-4 h-4" />}
                      label="Draft Position"
                      value={`#${projection.draftPosition}`}
                      color="#8B5CF6"
                    />
                  )}
                  {projection.draftStrategy && (
                    <StatCard
                      icon={<FileText className="w-4 h-4" />}
                      label="Draft Strategy"
                      value={projection.draftStrategy.length > 30 ? projection.draftStrategy.slice(0, 30) + '...' : projection.draftStrategy}
                      color={teamColor}
                      small
                    />
                  )}
                </div>
              )}

              {/* Key matchups */}
              {projection?.keyMatchups && projection.keyMatchups.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    Key Matchups
                  </h4>
                  <div className="space-y-1.5">
                    {projection.keyMatchups.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span
                          className="text-[10px] font-black px-1.5 py-0.5 rounded"
                          style={{
                            background: m.result === 'W' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: m.result === 'W' ? '#22C55E' : '#EF4444',
                          }}
                        >
                          {m.result}
                        </span>
                        <span className="text-xs text-white/70 font-semibold">{m.opponent}</span>
                        <span className="text-[10px] text-white/30 ml-auto">{m.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheme changes (staff mode) */}
              {projection?.schemeChanges && projection.schemeChanges.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    Scheme Changes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {projection.schemeChanges.map((change, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 rounded-md"
                        style={{ background: `${teamColor}15`, color: teamColor, border: `1px solid ${teamColor}25` }}
                      >
                        {change}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Streaming narrative */}
              {(streamText || loading) && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Analysis
                  </h4>
                  <div
                    ref={textRef}
                    className="rounded-lg p-4 text-xs text-white/60 leading-relaxed whitespace-pre-wrap overflow-y-auto"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      maxHeight: '300px',
                    }}
                  >
                    {streamText || (loading ? 'Generating analysis...' : '')}
                    {loading && (
                      <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: teamColor }} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-center mb-1" style={{ color: `${color}80` }}>
        {icon}
      </div>
      <div
        className={`font-black ${small ? 'text-[10px]' : 'text-lg'}`}
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[9px] text-white/30 uppercase mt-0.5">{label}</div>
    </div>
  );
}
