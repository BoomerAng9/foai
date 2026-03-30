'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Code2, Send, LayoutGrid, List, Rows3 } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────── */
type PlugStatus = 'BUILDING' | 'ACTIVE' | 'PAUSED' | 'RETIRED';
type ViewMode = 'shelf' | 'arsenal' | 'list';

interface Plug {
  id: string;
  name: string;
  status: PlugStatus;
  health: number;
  shelf: string;
}

/* ── Demo data ──────────────────────────────────────────── */
const DEMO_PLUGS: Plug[] = [
  { id: '1', name: 'CareerLaunch_Ang', status: 'ACTIVE',   health: 92, shelf: 'Production' },
  { id: '2', name: 'SMB_Storefront',   status: 'ACTIVE',   health: 87, shelf: 'Production' },
  { id: '3', name: 'ContentPipeline_v2', status: 'BUILDING', health: 45, shelf: 'Staging' },
  { id: '4', name: 'DataVault_Pro',    status: 'PAUSED',   health: 62, shelf: 'Staging' },
  { id: '5', name: 'LegacyWidget',     status: 'RETIRED',  health: 0,  shelf: 'Archive' },
];

/* ── Status config ──────────────────────────────────────── */
const STATUS_CONFIG: Record<PlugStatus, { dot: string; label: string; glow: string }> = {
  BUILDING: { dot: 'bg-accent animate-pulse-dot',       label: 'text-accent',       glow: 'shadow-[0_0_12px_rgba(0,0,0,0.15)]' },
  ACTIVE:   { dot: 'bg-signal-live',                     label: 'text-signal-live',  glow: 'shadow-[0_0_12px_rgba(34,197,94,0.2)]' },
  PAUSED:   { dot: 'bg-signal-warn',                     label: 'text-signal-warn',  glow: '' },
  RETIRED:  { dot: 'bg-fg-ghost opacity-50',             label: 'text-fg-ghost',     glow: '' },
};

/* ── Health Arc SVG ─────────────────────────────────────── */
function HealthArc({ value, size = 32 }: { value: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = Math.PI * r; // half-circle
  const offset = circ - (circ * Math.max(0, Math.min(value, 100))) / 100;
  const color = value >= 70 ? 'var(--signal-live)' : value >= 40 ? 'var(--signal-warn)' : 'var(--signal-error)';

  return (
    <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`} className="block">
      <path
        d={`M 2 ${size / 2 + 2} A ${r} ${r} 0 0 1 ${size - 2} ${size / 2 + 2}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="square"
      />
      <path
        d={`M 2 ${size / 2 + 2} A ${r} ${r} 0 0 1 ${size - 2} ${size / 2 + 2}`}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="square"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" fill="currentColor"
        className="font-mono text-[8px] fill-current text-fg-secondary" dominantBaseline="middle">
        {value}
      </text>
    </svg>
  );
}

/* ── Plug Icon SVG (line-art plug/connector) ────────────── */
function PlugIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} strokeWidth="1.2" stroke="currentColor">
      <rect x="8" y="4" width="16" height="10" rx="0" />
      <line x1="12" y1="1" x2="12" y2="4" />
      <line x1="20" y1="1" x2="20" y2="4" />
      <line x1="16" y1="14" x2="16" y2="20" />
      <rect x="10" y="20" width="12" height="4" rx="0" />
      <line x1="14" y1="24" x2="14" y2="28" />
      <line x1="18" y1="24" x2="18" y2="28" />
    </svg>
  );
}

/* ── Glass Card ─────────────────────────────────────────── */
function PlugCard({ plug, compact = false }: { plug: Plug; compact?: boolean }) {
  const cfg = STATUS_CONFIG[plug.status];
  const retired = plug.status === 'RETIRED';

  return (
    <div
      className={`
        group relative flex flex-col gap-3 p-4
        border border-white/[0.08] backdrop-blur-[12px]
        transition-all duration-200 hover:border-white/[0.15]
        ${cfg.glow}
        ${retired ? 'opacity-50' : ''}
        ${compact ? 'flex-row items-center' : ''}
      `}
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Icon */}
      <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center text-fg-tertiary group-hover:text-fg-secondary transition-colors`}>
        <PlugIcon className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
      </div>

      {/* Info */}
      <div className={`flex-1 min-w-0 ${compact ? '' : 'space-y-2'}`}>
        <p className={`font-mono font-semibold truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>{plug.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`led ${cfg.dot}`} />
          <span className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${cfg.label}`}>{plug.status}</span>
        </div>
      </div>

      {/* Health */}
      <div className="flex items-center">
        <HealthArc value={plug.health} size={compact ? 28 : 32} />
      </div>

      {/* Quick actions */}
      <div className={`flex items-center gap-1 ${compact ? '' : 'pt-1 border-t border-white/[0.05]'}`}>
        <button className="btn-bracket text-[9px]" title="View"><Eye className="w-3 h-3" /></button>
        <button className="btn-bracket text-[9px]" title="Embed"><Code2 className="w-3 h-3" /></button>
        <button className="btn-bracket text-[9px]" title="Publish"><Send className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Glass cube on grid */}
      <div className="relative w-24 h-24 mb-8">
        <div
          className="absolute inset-0 border border-white/[0.1] backdrop-blur-[12px]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            transform: 'rotateX(15deg) rotateY(-15deg)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <PlugIcon className="w-12 h-12 text-fg-ghost" />
        </div>
      </div>

      <h2 className="font-mono text-sm font-bold tracking-wide mb-2">PLUG ME IN</h2>
      <p className="font-mono text-[11px] text-fg-tertiary max-w-xs leading-relaxed mb-6">
        Your Plug Bin is empty. Deploy your first aiPLUG to get started.
      </p>
      <Link href="/chat" className="btn-solid gap-2">
        <PlugIcon className="w-4 h-4" /> Deploy First Plug
      </Link>
    </div>
  );
}

/* ── Shelf Row ──────────────────────────────────────────── */
function ShelfRow({ label, plugs }: { label: string; plugs: Plug[] }) {
  return (
    <section className="space-y-3">
      {/* Shelf label */}
      <div className="flex items-center gap-2">
        <span className="led bg-accent" />
        <h3 className="label-mono text-fg-secondary">{label}</h3>
        <span className="font-mono text-[9px] text-fg-ghost">{plugs.length}</span>
      </div>

      {/* Illuminated shelf */}
      <div
        className="relative overflow-x-auto pb-4"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 12px rgba(255,255,255,0.02)',
        }}
      >
        {/* Top-light glow line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }} />

        <div className="flex gap-4 pt-4 px-1 min-w-0">
          {plugs.map(plug => (
            <div key={plug.id} className="w-52 shrink-0">
              <PlugCard plug={plug} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── View Mode Toggle ───────────────────────────────────── */
function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const modes: { key: ViewMode; label: string; icon: typeof Rows3 }[] = [
    { key: 'shelf',   label: 'Shelf',   icon: Rows3 },
    { key: 'arsenal', label: 'Arsenal', icon: LayoutGrid },
    { key: 'list',    label: 'List',    icon: List },
  ];

  return (
    <div className="flex border border-border">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            mode === m.key
              ? 'bg-accent text-bg'
              : 'text-fg-tertiary hover:text-fg hover:bg-bg-elevated'
          }`}
        >
          <m.icon className="w-3 h-3" />
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── List Row ───────────────────────────────────────────── */
function PlugListRow({ plug }: { plug: Plug }) {
  const cfg = STATUS_CONFIG[plug.status];
  const retired = plug.status === 'RETIRED';

  return (
    <div className={`grid grid-cols-[1fr_100px_60px_auto] gap-4 items-center px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${retired ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <PlugIcon className="w-4 h-4 text-fg-tertiary shrink-0" />
        <span className="font-mono text-[11px] font-semibold truncate">{plug.name}</span>
        <span className="font-mono text-[9px] text-fg-ghost hidden sm:inline">{plug.shelf}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`led ${cfg.dot}`} />
        <span className={`font-mono text-[9px] font-semibold uppercase ${cfg.label}`}>{plug.status}</span>
      </div>
      <div className="flex justify-center">
        <HealthArc value={plug.health} size={28} />
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-bracket text-[9px]" title="View"><Eye className="w-3 h-3" /></button>
        <button className="btn-bracket text-[9px]" title="Embed"><Code2 className="w-3 h-3" /></button>
        <button className="btn-bracket text-[9px]" title="Publish"><Send className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function PlugBinPage() {
  const [view, setView] = useState<ViewMode>('shelf');
  const plugs = DEMO_PLUGS;
  const isEmpty = plugs.length === 0;

  // Group by shelf for shelf view
  const shelves = plugs.reduce<Record<string, Plug[]>>((acc, p) => {
    (acc[p.shelf] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div
      className="min-h-full relative"
      style={{
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '60px 60px',
      }}
    >
      <div className="space-y-8 relative z-10">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlugIcon className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              Plug <span className="font-bold">Bin</span>
            </h1>
            <span className="font-mono text-[10px] font-semibold px-2 py-0.5 bg-bg-elevated border border-border text-fg-tertiary">
              {plugs.length}
            </span>
          </div>
          {!isEmpty && <ViewToggle mode={view} onChange={setView} />}
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        {isEmpty ? (
          <EmptyState />
        ) : view === 'shelf' ? (
          /* Shelf View */
          <div className="space-y-8">
            {Object.entries(shelves).map(([label, shelfPlugs]) => (
              <ShelfRow key={label} label={label} plugs={shelfPlugs} />
            ))}
          </div>
        ) : view === 'arsenal' ? (
          /* Arsenal View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plugs.map(plug => (
              <PlugCard key={plug.id} plug={plug} />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.01)' }}>
            {/* Header row */}
            <div className="grid grid-cols-[1fr_100px_60px_auto] gap-4 px-4 py-2 border-b border-white/[0.06]">
              {['Plug', 'Status', 'Health', 'Actions'].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>
            {plugs.map(plug => (
              <PlugListRow key={plug.id} plug={plug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
