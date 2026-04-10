'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import {
  Database, Download, Search, Filter, ChevronDown, ChevronUp,
  Activity, Users, BarChart3, Layers, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Play,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────── */
interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  position_rank: number;
  grade: number | null;
  tie_grade: string;
  projected_round: number | null;
  nfl_comparison: string;
  trend: string;
  key_stats: string;
  strengths: string;
  weaknesses: string;
  scouting_summary: string;
}

interface DataStats {
  total_players: number;
  graded_count: number;
  avg_grade: number;
  position_groups: number;
  data_sources_count: number;
  data_sources: string[];
  completeness_percentage: number;
  position_breakdown: Record<string, number>;
  round_breakdown: Record<string, number>;
  last_updated: string | null;
}

interface ValidationData {
  totalPlayers: number;
  totalIssues: number;
  summary: Record<string, number>;
}

/* ── Constants ──────────────────────────────────────── */
const POSITION_COLORS: Record<string, string> = {
  QB: '#E74C3C', RB: '#2ECC71', WR: '#3498DB', TE: '#E67E22',
  OL: '#9B59B6', OT: '#9B59B6', OG: '#9B59B6', C: '#9B59B6', IOL: '#9B59B6',
  EDGE: '#E74C3C', DE: '#E74C3C',
  DL: '#E91E63', DT: '#E91E63', NT: '#E91E63', IDL: '#E91E63',
  LB: '#00BCD4', ILB: '#00BCD4', OLB: '#00BCD4',
  CB: '#FF9800', S: '#8BC34A', FS: '#8BC34A', SS: '#8BC34A',
};

const SORT_OPTIONS = [
  { value: 'overall_rank:asc', label: 'Rank (Best)' },
  { value: 'grade:desc', label: 'Grade (High)' },
  { value: 'grade:asc', label: 'Grade (Low)' },
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'school:asc', label: 'School (A-Z)' },
  { value: 'projected_round:asc', label: 'Round (Early)' },
];

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const GRADE_RANGES = [
  { label: '90+ (Elite)', min: 90, max: 100 },
  { label: '80-89 (First Round)', min: 80, max: 89 },
  { label: '70-79 (Day 2)', min: 70, max: 79 },
  { label: '60-69 (Mid)', min: 60, max: 69 },
  { label: 'Under 60', min: 0, max: 59 },
];

const CONFERENCES = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'AAC', 'Mountain West', 'C-USA', 'MAC', 'Sun Belt', 'Independent'];

const DATA_SOURCE_DETAILS = [
  { name: 'Brave Search API', desc: 'Real-time web search for prospect news, combine results, and scouting reports', status: 'active', icon: '🔍' },
  { name: 'ESPN Player Data', desc: 'Official college stats, game logs, and biometric data', status: 'active', icon: '📊' },
  { name: 'YouTube Film Analysis', desc: 'Game film breakdowns, highlight reels, and technique analysis', status: 'active', icon: '🎬' },
  { name: 'Pipeline Scraped Articles', desc: 'Aggregated draft analysis from 50+ scouting outlets', status: 'active', icon: '📰' },
  { name: 'Manual Scout Reports', desc: 'In-house analyst evaluations and per|form TIE grading', status: 'active', icon: '📋' },
  { name: 'Combine/Pro Day Results', desc: 'Athletic testing data: 40-yard, vertical, bench, broad jump, agility', status: 'active', icon: '🏃' },
];

/* ── Helpers ──────────────────────────────────────── */
function GradeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-[11px]" style={{ color: 'var(--pf-text-muted)' }}>--</span>;
  const num = Number(value);
  if (isNaN(num)) return <span className="font-mono text-[11px]" style={{ color: 'var(--pf-text-muted)' }}>--</span>;
  const info = getGradeForScore(num);
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded"
      style={{ background: `${info.badgeColor}18`, color: info.badgeColor, border: `1px solid ${info.badgeColor}30` }}
    >
      {num.toFixed(1)}
      <span className="text-[9px] opacity-60">{info.grade}</span>
    </span>
  );
}

function PositionTag({ pos }: { pos: string }) {
  const color = POSITION_COLORS[pos?.toUpperCase()] || '#D4A853';
  return (
    <span
      className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {pos}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />;
  return <Minus className="w-3.5 h-3.5" style={{ color: 'var(--pf-text-muted)' }} />;
}

function RoundBadge({ round }: { round: number | null }) {
  if (round == null) return <span className="font-mono text-[11px]" style={{ color: 'var(--pf-text-muted)' }}>--</span>;
  const colors: Record<number, string> = {
    1: '#D4A853', 2: '#60A5FA', 3: '#34D399', 4: '#A78BFA',
    5: '#FBBF24', 6: '#A1A1AA', 7: '#71717A',
  };
  const c = colors[round] || '#71717A';
  return (
    <span className="font-mono text-[11px] font-bold" style={{ color: c }}>
      RD{round}
    </span>
  );
}

/* ── Main Page ────────────────────────────────────── */
export default function DataCenterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [gradeRange, setGradeRange] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('');
  const [sortBy, setSortBy] = useState('overall_rank:asc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSection, setActiveSection] = useState<'database' | 'sources' | 'quality'>('database');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<{
    articlesScraped: number;
    articlesStored: number;
    updatesExtracted: number;
    updatesApplied: number;
  } | null>(null);
  const [pipelineError, setPipelineError] = useState('');

  /* ── Data fetching ──────────────────────────────── */
  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/players?limit=500&sort=${sortBy}`).then(r => r.json()),
      fetch('/api/data/stats').then(r => r.json()),
      fetch('/api/data/validate').then(r => r.json()),
    ])
      .then(([playerData, statsData, validData]) => {
        setPlayers(playerData.players || []);
        if (!statsData.error) setStats(statsData);
        if (!validData.error) setValidation(validData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sortBy]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Filtering + Sorting ────────────────────────── */
  const filtered = useMemo(() => {
    let result = [...players];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        p => p.name?.toLowerCase().includes(q) ||
             p.school?.toLowerCase().includes(q) ||
             p.position?.toLowerCase().includes(q),
      );
    }

    if (posFilter) {
      result = result.filter(p => p.position?.toUpperCase() === posFilter);
    }

    if (roundFilter) {
      result = result.filter(p => p.projected_round === Number(roundFilter));
    }

    if (gradeRange) {
      const range = GRADE_RANGES.find(r => r.label === gradeRange);
      if (range) {
        result = result.filter(p => {
          const g = Number(p.grade);
          return !isNaN(g) && g >= range.min && g <= range.max;
        });
      }
    }

    if (conferenceFilter) {
      result = result.filter(p => p.school?.toLowerCase().includes(conferenceFilter.toLowerCase()));
    }

    return result;
  }, [players, search, posFilter, roundFilter, gradeRange, conferenceFilter]);

  /* ── Unique positions from data ─────────────────── */
  const positions = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => { if (p.position) set.add(p.position.toUpperCase()); });
    return Array.from(set).sort();
  }, [players]);

  /* ── Export handler ─────────────────────────────── */
  const handleExport = () => {
    window.open('/api/data/export', '_blank');
  };

  /* ── Pipeline handler ──────────────────────────── */
  const handleRunPipeline = async () => {
    setPipelineRunning(true);
    setPipelineResult(null);
    setPipelineError('');
    try {
      const res = await fetch('/api/pipeline/trigger', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setPipelineError(data.error || 'Pipeline failed');
      } else {
        setPipelineResult(data);
        // Refresh the data view after pipeline completes
        fetchAll();
      }
    } catch {
      setPipelineError('Network error running pipeline');
    } finally {
      setPipelineRunning(false);
    }
  };

  /* ── Data health % ─────────────────────────────── */
  const dataHealth = stats?.completeness_percentage ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-[1600px] mx-auto w-full">
        {/* ── Hero Header ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6" style={{ color: 'var(--pf-gold)' }} />
            <h1 className="font-outfit text-2xl md:text-3xl font-extrabold tracking-[0.12em]" style={{ color: 'var(--pf-text)' }}>
              PER<span style={{ color: 'var(--pf-gold)', opacity: 0.4 }}>|</span>FORM DATA CENTER
            </h1>
          </div>
          <p className="font-mono text-xs tracking-wider" style={{ color: 'var(--pf-text-muted)' }}>
            Our proprietary player intelligence database
          </p>
        </motion.div>

        {/* ── Stats Bar ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {[
            { label: 'Total Players', value: stats?.total_players ?? '--', icon: Users, color: '#D4A853' },
            { label: 'Total Graded', value: stats?.graded_count ?? '--', icon: BarChart3, color: '#60A5FA' },
            { label: 'Position Groups', value: stats?.position_groups ?? '--', icon: Layers, color: '#34D399' },
            { label: 'Data Sources', value: stats?.data_sources_count ?? '--', icon: Activity, color: '#A78BFA' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4"
              style={{
                background: 'var(--pf-bg-secondary)',
                border: '1px solid var(--pf-divider)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: 'var(--pf-text-muted)' }}>
                  {stat.label}
                </span>
              </div>
              <span className="font-mono text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Section Tabs ────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--pf-divider)' }}>
          {[
            { key: 'database' as const, label: 'PLAYER DATABASE', icon: Database },
            { key: 'sources' as const, label: 'DATA SOURCES', icon: ExternalLink },
            { key: 'quality' as const, label: 'DATA QUALITY', icon: Activity },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className="flex items-center gap-2 px-4 py-3 font-mono text-[11px] tracking-wider transition-colors whitespace-nowrap"
              style={{
                color: activeSection === tab.key ? 'var(--pf-gold)' : 'var(--pf-text-muted)',
                borderBottom: activeSection === tab.key ? '2px solid var(--pf-gold)' : '2px solid transparent',
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
         *  SECTION: PLAYER DATABASE
         * ════════════════════════════════════════════════ */}
        {activeSection === 'database' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* ── Toolbar ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--pf-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, school, position..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg font-mono text-xs outline-none transition-colors"
                  style={{
                    background: 'var(--pf-bg-secondary)',
                    border: '1px solid var(--pf-divider)',
                    color: 'var(--pf-text)',
                  }}
                />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] tracking-wider transition-colors"
                style={{
                  background: showFilters ? 'rgba(212,168,83,0.1)' : 'var(--pf-bg-secondary)',
                  border: showFilters ? '1px solid var(--pf-gold-border)' : '1px solid var(--pf-divider)',
                  color: showFilters ? 'var(--pf-gold)' : 'var(--pf-text-muted)',
                }}
              >
                <Filter className="w-3.5 h-3.5" />
                FILTERS
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2.5 rounded-lg font-mono text-[11px] outline-none cursor-pointer"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                  color: 'var(--pf-text-muted)',
                }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Export */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-colors"
                style={{
                  background: 'rgba(212,168,83,0.12)',
                  border: '1px solid var(--pf-gold-border)',
                  color: 'var(--pf-gold)',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                EXPORT CSV
              </button>

              {/* Run Pipeline */}
              <button
                onClick={handleRunPipeline}
                disabled={pipelineRunning}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: pipelineRunning ? 'rgba(96,165,250,0.08)' : 'rgba(96,165,250,0.12)',
                  border: '1px solid rgba(96,165,250,0.25)',
                  color: '#60A5FA',
                }}
              >
                {pipelineRunning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {pipelineRunning ? 'RUNNING...' : 'RUN PIPELINE'}
              </button>

              {/* Data Health */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[11px]"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: dataHealth >= 80 ? '#22C55E' : dataHealth >= 50 ? '#FBBF24' : '#EF4444',
                  }}
                />
                <span style={{ color: 'var(--pf-text-muted)' }}>HEALTH</span>
                <span className="font-bold" style={{
                  color: dataHealth >= 80 ? '#22C55E' : dataHealth >= 50 ? '#FBBF24' : '#EF4444',
                }}>
                  {dataHealth}%
                </span>
              </div>
            </div>

            {/* ── Pipeline Result / Error ────────────── */}
            {pipelineResult && (
              <div
                className="mb-4 px-4 py-3 rounded-lg font-mono text-xs flex items-center gap-4 flex-wrap"
                style={{
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  color: '#22C55E',
                }}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Pipeline complete:</span>
                <span className="font-bold">{pipelineResult.articlesScraped} articles scraped</span>
                <span>{pipelineResult.articlesStored} stored</span>
                <span>{pipelineResult.updatesExtracted} updates extracted</span>
                <span className="font-bold">{pipelineResult.updatesApplied} players updated</span>
                <button
                  onClick={() => setPipelineResult(null)}
                  className="ml-auto text-[10px] opacity-60 hover:opacity-100"
                >
                  DISMISS
                </button>
              </div>
            )}
            {pipelineError && (
              <div
                className="mb-4 px-4 py-3 rounded-lg font-mono text-xs flex items-center gap-3"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#EF4444',
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Pipeline error: {pipelineError}</span>
                <button
                  onClick={() => setPipelineError('')}
                  className="ml-auto text-[10px] opacity-60 hover:opacity-100"
                >
                  DISMISS
                </button>
              </div>
            )}

            {/* ── Filter Panel ─────────────────────────── */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg"
                    style={{
                      background: 'var(--pf-bg-secondary)',
                      border: '1px solid var(--pf-divider)',
                    }}
                  >
                    {/* Position */}
                    <div>
                      <label className="block font-mono text-[9px] tracking-wider mb-1.5" style={{ color: 'var(--pf-text-muted)' }}>POSITION</label>
                      <select
                        value={posFilter}
                        onChange={e => setPosFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded font-mono text-[11px] outline-none"
                        style={{ background: 'var(--pf-bg)', border: '1px solid var(--pf-divider)', color: 'var(--pf-text)' }}
                      >
                        <option value="">All Positions</option>
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    {/* Projected Round */}
                    <div>
                      <label className="block font-mono text-[9px] tracking-wider mb-1.5" style={{ color: 'var(--pf-text-muted)' }}>PROJECTED ROUND</label>
                      <select
                        value={roundFilter}
                        onChange={e => setRoundFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded font-mono text-[11px] outline-none"
                        style={{ background: 'var(--pf-bg)', border: '1px solid var(--pf-divider)', color: 'var(--pf-text)' }}
                      >
                        <option value="">All Rounds</option>
                        {ROUND_OPTIONS.map(r => <option key={r} value={r}>Round {r}</option>)}
                      </select>
                    </div>

                    {/* Grade Range */}
                    <div>
                      <label className="block font-mono text-[9px] tracking-wider mb-1.5" style={{ color: 'var(--pf-text-muted)' }}>GRADE RANGE</label>
                      <select
                        value={gradeRange}
                        onChange={e => setGradeRange(e.target.value)}
                        className="w-full px-3 py-2 rounded font-mono text-[11px] outline-none"
                        style={{ background: 'var(--pf-bg)', border: '1px solid var(--pf-divider)', color: 'var(--pf-text)' }}
                      >
                        <option value="">All Grades</option>
                        {GRADE_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
                      </select>
                    </div>

                    {/* Conference (school search) */}
                    <div>
                      <label className="block font-mono text-[9px] tracking-wider mb-1.5" style={{ color: 'var(--pf-text-muted)' }}>SCHOOL / CONFERENCE</label>
                      <select
                        value={conferenceFilter}
                        onChange={e => setConferenceFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded font-mono text-[11px] outline-none"
                        style={{ background: 'var(--pf-bg)', border: '1px solid var(--pf-divider)', color: 'var(--pf-text)' }}
                      >
                        <option value="">All Schools</option>
                        {CONFERENCES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Results Count ─────────────────────────── */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--pf-text-muted)' }}>
                {filtered.length} PLAYERS {search || posFilter || roundFilter || gradeRange || conferenceFilter ? '(FILTERED)' : ''}
              </span>
              <button onClick={fetchAll} className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-colors" style={{ color: 'var(--pf-text-muted)' }}>
                <RefreshCw className="w-3 h-3" />
                REFRESH
              </button>
            </div>

            {/* ── Player Table ─────────────────────────── */}
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--pf-bg-secondary)',
                border: '1px solid var(--pf-divider)',
              }}
            >
              {/* Table Header */}
              <div
                className="grid gap-2 px-4 py-3 font-mono text-[9px] tracking-[0.15em] uppercase"
                style={{
                  gridTemplateColumns: '50px 1fr 70px 1fr 80px 60px 1fr 40px',
                  color: 'var(--pf-text-muted)',
                  borderBottom: '1px solid var(--pf-divider)',
                  background: 'rgba(212,168,83,0.03)',
                }}
              >
                <span>RANK</span>
                <span>PLAYER</span>
                <span>POS</span>
                <span>SCHOOL</span>
                <span>GRADE</span>
                <span>ROUND</span>
                <span>NFL COMP</span>
                <span className="text-center">TND</span>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid var(--pf-divider)', borderTopColor: 'var(--pf-gold)' }} />
                </div>
              )}

              {/* Empty state */}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-20">
                  <Database className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--pf-text-subtle)' }} />
                  <p className="font-mono text-xs" style={{ color: 'var(--pf-text-muted)' }}>
                    No players found matching your criteria
                  </p>
                </div>
              )}

              {/* Player Rows */}
              {!loading && filtered.map((player) => (
                <div key={player.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === player.id ? null : player.id)}
                    className="w-full grid gap-2 px-4 py-3 items-center text-left transition-colors"
                    style={{
                      gridTemplateColumns: '50px 1fr 70px 1fr 80px 60px 1fr 40px',
                      borderBottom: '1px solid var(--pf-divider)',
                      background: expandedId === player.id ? 'rgba(212,168,83,0.04)' : 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,168,83,0.04)'; }}
                    onMouseLeave={e => {
                      if (expandedId !== player.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--pf-gold)' }}>
                      {player.overall_rank ? `#${player.overall_rank}` : '--'}
                    </span>
                    <span className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--pf-text)' }}>
                      {player.name}
                    </span>
                    <PositionTag pos={player.position} />
                    <span className="font-mono text-[11px] truncate" style={{ color: 'var(--pf-text-muted)' }}>
                      {player.school}
                    </span>
                    <GradeBadge value={player.grade} />
                    <RoundBadge round={player.projected_round} />
                    <span className="font-mono text-[11px] truncate" style={{ color: 'var(--pf-text-muted)' }}>
                      {player.nfl_comparison || '--'}
                    </span>
                    <div className="flex justify-center">
                      <TrendIcon trend={player.trend} />
                    </div>
                  </button>

                  {/* ── Expanded Detail ────────────────── */}
                  <AnimatePresence>
                    {expandedId === player.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        style={{ borderBottom: '1px solid var(--pf-gold-border)' }}
                      >
                        <div
                          className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6"
                          style={{ background: 'rgba(212,168,83,0.02)' }}
                        >
                          {/* Key Stats */}
                          <div>
                            <h4 className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--pf-gold)' }}>
                              KEY STATS
                            </h4>
                            <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
                              {player.key_stats || 'No stats available'}
                            </p>
                          </div>

                          {/* Strengths + Weaknesses */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: '#22C55E' }}>
                                STRENGTHS
                              </h4>
                              <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
                                {player.strengths || 'Not evaluated'}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: '#EF4444' }}>
                                WEAKNESSES
                              </h4>
                              <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
                                {player.weaknesses || 'Not evaluated'}
                              </p>
                            </div>
                          </div>

                          {/* Scouting Summary */}
                          <div>
                            <h4 className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--pf-gold)' }}>
                              SCOUTING SUMMARY
                            </h4>
                            <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
                              {player.scouting_summary || 'No scouting report available'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════
         *  SECTION: DATA SOURCES
         * ════════════════════════════════════════════════ */}
        {activeSection === 'sources' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DATA_SOURCE_DETAILS.map((source) => (
                <div
                  key={source.name}
                  className="rounded-lg p-5"
                  style={{
                    background: 'var(--pf-bg-secondary)',
                    border: '1px solid var(--pf-divider)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{source.icon}</span>
                      <h3 className="font-mono text-sm font-bold" style={{ color: 'var(--pf-text)' }}>
                        {source.name}
                      </h3>
                    </div>
                    <span
                      className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider uppercase px-2 py-1 rounded"
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        color: '#22C55E',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
                      {source.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--pf-text-muted)' }}>
                    {source.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Position Breakdown */}
            {stats?.position_breakdown && (
              <div className="mt-8">
                <h3 className="font-mono text-[10px] tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--pf-gold)' }}>
                  POSITION DISTRIBUTION
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                  {Object.entries(stats.position_breakdown).map(([pos, count]) => (
                    <div
                      key={pos}
                      className="rounded-lg p-3 text-center"
                      style={{
                        background: 'var(--pf-bg-secondary)',
                        border: '1px solid var(--pf-divider)',
                      }}
                    >
                      <PositionTag pos={pos} />
                      <div className="font-mono text-lg font-bold mt-2" style={{ color: 'var(--pf-text)' }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Round Breakdown */}
            {stats?.round_breakdown && (
              <div className="mt-8">
                <h3 className="font-mono text-[10px] tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--pf-gold)' }}>
                  DRAFT ROUND DISTRIBUTION
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {Object.entries(stats.round_breakdown).map(([round, count]) => (
                    <div
                      key={round}
                      className="rounded-lg p-3 text-center"
                      style={{
                        background: 'var(--pf-bg-secondary)',
                        border: '1px solid var(--pf-divider)',
                      }}
                    >
                      <span className="font-mono text-[10px]" style={{ color: 'var(--pf-text-muted)' }}>{round}</span>
                      <div className="font-mono text-lg font-bold mt-1" style={{ color: 'var(--pf-gold)' }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════
         *  SECTION: DATA QUALITY
         * ════════════════════════════════════════════════ */}
        {activeSection === 'quality' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Issues Count */}
              <div
                className="rounded-lg p-5"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" style={{ color: '#FBBF24' }} />
                  <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--pf-text-muted)' }}>TOTAL ISSUES</span>
                </div>
                <span className="font-mono text-3xl font-bold" style={{ color: '#FBBF24' }}>
                  {validation?.totalIssues ?? '--'}
                </span>
              </div>

              {/* Completeness */}
              <div
                className="rounded-lg p-5"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
                  <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--pf-text-muted)' }}>COMPLETENESS</span>
                </div>
                <span className="font-mono text-3xl font-bold" style={{
                  color: dataHealth >= 80 ? '#22C55E' : dataHealth >= 50 ? '#FBBF24' : '#EF4444',
                }}>
                  {dataHealth}%
                </span>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--pf-divider)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${dataHealth}%`,
                      background: dataHealth >= 80 ? '#22C55E' : dataHealth >= 50 ? '#FBBF24' : '#EF4444',
                    }}
                  />
                </div>
              </div>

              {/* Average Grade */}
              <div
                className="rounded-lg p-5"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4" style={{ color: 'var(--pf-gold)' }} />
                  <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--pf-text-muted)' }}>AVG GRADE</span>
                </div>
                <span className="font-mono text-3xl font-bold" style={{ color: 'var(--pf-gold)' }}>
                  {stats?.avg_grade ? stats.avg_grade.toFixed(1) : '--'}
                </span>
              </div>
            </div>

            {/* Issue Breakdown */}
            {validation?.summary && Object.keys(validation.summary).length > 0 && (
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: 'var(--pf-bg-secondary)',
                  border: '1px solid var(--pf-divider)',
                }}
              >
                <div
                  className="px-5 py-3 font-mono text-[10px] tracking-[0.15em] uppercase"
                  style={{ color: 'var(--pf-gold)', borderBottom: '1px solid var(--pf-divider)', background: 'rgba(212,168,83,0.03)' }}
                >
                  ISSUE BREAKDOWN
                </div>
                {Object.entries(validation.summary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([issue, count]) => (
                    <div
                      key={issue}
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderBottom: '1px solid var(--pf-divider)' }}
                    >
                      <span className="font-mono text-[11px]" style={{ color: 'var(--pf-text-muted)' }}>
                        {issue.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-xs font-bold" style={{ color: '#FBBF24' }}>
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* No issues state */}
            {validation && validation.totalIssues === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#22C55E' }} />
                <p className="font-mono text-sm" style={{ color: '#22C55E' }}>All player data passes quality checks</p>
              </div>
            )}

            {/* Last updated */}
            {stats?.last_updated && (
              <div className="mt-6 text-right">
                <span className="font-mono text-[10px]" style={{ color: 'var(--pf-text-subtle)' }}>
                  Last updated: {new Date(stats.last_updated).toLocaleString()}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
