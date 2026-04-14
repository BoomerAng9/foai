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

interface SimulationHistoryItem {
  id: string;
  status: 'streaming' | 'complete' | 'error';
  source?: 'managed_agents' | 'messages_fallback';
  narrative?: string;
  projection?: SimulationProjection | null;
  error?: string | null;
  createdAt: string;
  managedAgentSessionId?: string | null;
  tokensUsed: number;
  modificationsCount: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getSourceLabel(source?: SimulationHistoryItem['source'] | null): string | null {
  if (source === 'managed_agents') return 'Managed Agents';
  if (source === 'messages_fallback') return 'Direct Fallback';
  return null;
}

function getHistorySummary(entry: SimulationHistoryItem): string | null {
  if (entry.projection?.wins != null && entry.projection?.losses != null) {
    return `${entry.projection.wins}-${entry.projection.losses} projected record`;
  }

  if (entry.projection?.playoffProbability != null) {
    return `${entry.projection.playoffProbability}% playoff probability`;
  }

  if (entry.projection?.draftStrategy) {
    return entry.projection.draftStrategy;
  }

  if (entry.status === 'error') {
    return 'Simulation failed';
  }

  return null;
}

function truncateText(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
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
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [history, setHistory] = useState<SimulationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const requestedMode = requestBody?.['mode'];
  const displayMode = requestedMode === 'roster' || requestedMode === 'staff' || requestedMode === 'draft'
    ? requestedMode
    : mode;
  const requestSport = typeof requestBody?.['sport'] === 'string' ? requestBody['sport'] : null;

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
    setProviderLabel(null);
    setCurrentSessionId(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const loadHistory = async () => {
      if (!requestSport || !teamAbbr) {
        setHistory([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const historyRes = await fetch(
          `/api/franchise/sessions?sport=${encodeURIComponent(requestSport)}&team=${encodeURIComponent(teamAbbr)}&mode=${encodeURIComponent(displayMode)}&limit=5`,
          { signal: controller.signal }
        );
        if (!historyRes.ok) {
          setHistory([]);
          return;
        }

        const historyData = await historyRes.json().catch(() => ({ sessions: [] }));
        setHistory(Array.isArray(historyData.sessions) ? historyData.sessions : []);
      } catch (historyError) {
        if ((historyError as Error).name !== 'AbortError') {
          setHistory([]);
        }
      } finally {
        setHistoryLoading(false);
      }
    };

    void loadHistory();

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

        const headerSource = res.headers.get('X-Simulation-Source');
        if (headerSource === 'managed_agents') {
          setProviderLabel('Managed Agents');
        } else if (headerSource === 'messages_fallback') {
          setProviderLabel('Direct Model Fallback');
        }

        const headerSessionId = res.headers.get('X-Simulation-Session');
        if (headerSessionId) {
          setCurrentSessionId(headerSessionId);
          void loadHistory();
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError('No response stream');
          setLoading(false);
          void loadHistory();
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
                } else if (event.type === 'meta') {
                  const source = typeof event.metadata?.source === 'string' ? event.metadata.source : null;
                  const sessionId = typeof event.metadata?.session_id === 'string' ? event.metadata.session_id : null;
                  if (sessionId) {
                    setCurrentSessionId(sessionId);
                  }
                  if (source === 'managed_agents') {
                    setProviderLabel('Managed Agents');
                  } else if (source === 'messages_fallback') {
                    setProviderLabel('Direct Model Fallback');
                  }
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
        void loadHistory();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Simulation failed');
        }
        setLoading(false);
        void loadHistory();
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
    displayMode === 'roster' ? 'Season Projection' :
    displayMode === 'staff' ? 'Staff Impact Analysis' :
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
                  {providerLabel && (
                    <p className="text-[10px] text-white/20">{providerLabel}</p>
                  )}
                </div>
                {loading && <Loader2 className="w-4 h-4 text-amber-400/60 animate-spin ml-2" />}
              </div>
              <button
                onClick={handleClose}
                aria-label="Close simulation panel"
                title="Close simulation panel"
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

              {(historyLoading || history.length > 0) && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    Recent Runs
                  </h4>
                  <div className="space-y-2">
                    {historyLoading && history.length === 0 ? (
                      <div
                        className="rounded-lg p-3 text-[11px] text-white/35"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        Loading recent simulations...
                      </div>
                    ) : (
                      history.map((entry) => {
                        const summary = getHistorySummary(entry);
                        const sourceLabel = getSourceLabel(entry.source);
                        const isCurrent = entry.id === currentSessionId;

                        return (
                          <div
                            key={entry.id}
                            className="rounded-lg p-3"
                            style={{
                              background: isCurrent ? `${teamColor}10` : 'rgba(255,255,255,0.02)',
                              border: isCurrent ? `1px solid ${teamColor}25` : '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold tracking-[0.16em] uppercase">
                              <span className="text-white/25">{timeAgo(entry.createdAt)}</span>
                              <span
                                className="px-1.5 py-0.5 rounded"
                                style={{
                                  background:
                                    entry.status === 'complete'
                                      ? 'rgba(34,197,94,0.12)'
                                      : entry.status === 'error'
                                        ? 'rgba(239,68,68,0.12)'
                                        : 'rgba(245,158,11,0.12)',
                                  color:
                                    entry.status === 'complete'
                                      ? '#22C55E'
                                      : entry.status === 'error'
                                        ? '#EF4444'
                                        : '#F59E0B',
                                }}
                              >
                                {entry.status}
                              </span>
                              {sourceLabel && (
                                <span className="text-white/25">{sourceLabel}</span>
                              )}
                              {isCurrent && (
                                <span style={{ color: teamColor }}>Current</span>
                              )}
                            </div>

                            {summary && (
                              <div className="mt-2 text-[11px] font-semibold text-white/75">
                                {truncateText(summary, 70)}
                              </div>
                            )}

                            <div className="mt-1 text-[10px] text-white/35 leading-relaxed">
                              {entry.error
                                ? truncateText(entry.error, 140)
                                : truncateText(entry.narrative || 'No narrative captured yet.', 140)}
                            </div>

                            <div className="mt-2 text-[9px] text-white/20 uppercase tracking-[0.14em]">
                              {entry.modificationsCount} change{entry.modificationsCount === 1 ? '' : 's'}
                              {entry.tokensUsed > 0 ? ` • ${entry.tokensUsed} tokens` : ''}
                              {entry.managedAgentSessionId ? ' • linked agent session' : ''}
                            </div>
                          </div>
                        );
                      })
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
