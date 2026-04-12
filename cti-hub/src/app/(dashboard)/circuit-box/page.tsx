'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot, GitBranch, Plug, Volume2, Rocket, Shield, Key, Webhook,
  Palette, Tag, FileText, HardDrive, AlertTriangle, ChevronRight,
  Power, Activity, User, CreditCard, Languages, ToggleLeft, ToggleRight,
  Search, Radio,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/* ── types ─────────────────────────────────────────────── */

interface PanelSection {
  id: string;
  label: string;
  icon: React.ElementType;
  visibility: 'always' | 'paid' | 'admin';
  entries: PanelEntry[];
}

interface PanelEntry {
  id: string;
  label: string;
  description: string;
  status?: 'online' | 'offline' | 'degraded' | 'configured' | 'unconfigured';
  href?: string;
  action?: string;
}

/* ── panel data ────────────────────────────────────────── */

const PANELS: PanelSection[] = [
  {
    id: 'agents',
    label: 'AI Agents',
    icon: Bot,
    visibility: 'always',
    entries: [
      { id: 'acheevy', label: 'ACHEEVY', description: 'Digital CEO — strategy, execution, dispatch', status: 'online' },
      { id: 'chicken_hawk', label: 'Chicken Hawk', description: 'Tactical Operator (2IC)', status: 'online' },
      { id: 'consult_ang', label: 'Consult_Ang', description: 'Fast Responder — clarification, triage', status: 'online' },
      { id: 'note_ang', label: 'Note_Ang', description: 'Session Recorder — intent tracking, audit', status: 'online' },
      { id: 'tps_report_ang', label: 'TPS_Report_Ang', description: 'Pricing Overseer — fees, tokens, LUC', status: 'online' },
      { id: 'betty_anne_ang', label: 'Betty-Anne_Ang', description: 'HR PMO — Org Fit Index, evaluations', status: 'online' },
      { id: 'iller_ang', label: 'Iller_Ang', description: 'Creative Director — design, assets', status: 'online' },
    ],
  },
  {
    id: 'profile',
    label: 'Account / Profile',
    icon: User,
    visibility: 'always',
    entries: [
      { id: 'display_name', label: 'Display Name', description: 'Your preferred name', href: '/profile' },
      { id: 'email', label: 'Email', description: 'Login email address' },
      { id: 'avatar', label: 'Avatar', description: 'Profile picture', href: '/profile' },
    ],
  },
  {
    id: 'billing',
    label: 'Plan + Billing',
    icon: CreditCard,
    visibility: 'always',
    entries: [
      { id: 'current_plan', label: 'Current Plan', description: 'View and change your subscription', href: '/pricing' },
      { id: 'usage', label: 'Usage', description: 'Token consumption and cost breakdown' },
      { id: 'invoices', label: 'Invoices', description: 'Past invoices and receipts' },
    ],
  },
  {
    id: 'keys',
    label: 'BYOK Keys',
    icon: Key,
    visibility: 'always',
    entries: [
      { id: 'elevenlabs', label: 'ElevenLabs', description: 'Voice synthesis API key', status: 'unconfigured' },
      { id: 'deepgram', label: 'Deepgram', description: 'Speech-to-text API key', status: 'unconfigured' },
      { id: 'openai', label: 'OpenAI', description: 'GPT / Whisper fallback key', status: 'unconfigured' },
      { id: 'custom', label: 'Custom Provider', description: 'Add your own API key', status: 'unconfigured' },
    ],
  },
  {
    id: 'grammar',
    label: 'Grammar Filter',
    icon: Languages,
    visibility: 'always',
    entries: [
      { id: 'grammar_toggle', label: 'Grammar Active', description: 'Prompt efficiency filter — ON by default', status: 'online', action: 'toggle' },
      { id: 'grammar_mode', label: 'Filter Mode', description: 'Smart Translate: normalize intent before execution' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice / STT / TTS',
    icon: Volume2,
    visibility: 'always',
    entries: [
      { id: 'voice_engine', label: 'Voice Engine', description: 'Active TTS provider for read-aloud', status: 'online' },
      { id: 'stt_engine', label: 'STT Engine', description: 'Active speech-to-text provider', status: 'online' },
      { id: 'voice_mode', label: 'Voice Mode', description: 'Preloaded, custom spec, or cloned', status: 'configured' },
    ],
  },
  {
    id: 'integrations',
    label: 'External Integrations',
    icon: Plug,
    visibility: 'always',
    entries: [
      { id: 'stripe', label: 'Stripe', description: 'Payment processing', status: 'configured' },
      { id: 'github', label: 'GitHub', description: 'Repository sync', status: 'configured' },
      { id: 'neon', label: 'Neon Postgres', description: 'Database', status: 'online' },
      { id: 'firebase', label: 'Firebase Auth', description: 'Authentication', status: 'online' },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: Radio,
    visibility: 'always',
    entries: [
      { id: 'telegram', label: 'Telegram', description: 'Bot integration', status: 'unconfigured', href: '/settings/channels' },
      { id: 'whatsapp', label: 'WhatsApp Business', description: 'Messaging', status: 'unconfigured', href: '/settings/channels' },
      { id: 'discord', label: 'Discord', description: 'Server integration', status: 'unconfigured', href: '/settings/channels' },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhook Manager',
    icon: Webhook,
    visibility: 'always',
    entries: [
      { id: 'webhook_list', label: 'Active Webhooks', description: 'List and manage webhook endpoints' },
      { id: 'webhook_add', label: 'Add Webhook', description: 'Register a new endpoint' },
    ],
  },
  {
    id: 'deploy',
    label: 'Deploy + Infra',
    icon: Rocket,
    visibility: 'admin',
    entries: [
      { id: 'docker', label: 'Docker', description: 'Container status', status: 'online' },
      { id: 'cloudflare', label: 'Cloudflare', description: 'DNS + Workers', status: 'online' },
      { id: 'gcp', label: 'GCP', description: 'Cloud Run + Storage', status: 'online' },
    ],
  },
  {
    id: 'theme',
    label: 'UI Theme',
    icon: Palette,
    visibility: 'always',
    entries: [
      { id: 'color_scheme', label: 'Color Scheme', description: 'Dark mode (default), future light mode' },
      { id: 'layout', label: 'Panel Layout', description: 'Arrange and resize panels' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Posture',
    icon: Shield,
    visibility: 'admin',
    entries: [
      { id: 'cmmc', label: 'CMMC L1', description: 'Self-attestation status' },
      { id: 'fedramp', label: 'FedRAMP Ready', description: 'Readiness phase' },
    ],
  },
  {
    id: 'whitelabel',
    label: 'Whitelabel Branding',
    icon: Tag,
    visibility: 'paid',
    entries: [
      { id: 'brand_logo', label: 'Logo', description: 'Custom logo for whitelabel deploys' },
      { id: 'brand_colors', label: 'Colors', description: 'Primary, secondary, accent' },
      { id: 'brand_copy', label: 'Copy', description: 'Custom text and labels' },
    ],
  },
  {
    id: 'features',
    label: 'Feature Flags',
    icon: ToggleLeft,
    visibility: 'admin',
    entries: [
      { id: 'experimental', label: 'Experimental', description: 'Hidden and in-progress features' },
    ],
  },
  {
    id: 'audit',
    label: 'Audit Log Export',
    icon: FileText,
    visibility: 'admin',
    entries: [
      { id: 'charter', label: 'Charter Log', description: 'AVVA NOON Charter downloads' },
      { id: 'ledger', label: 'Ledger', description: 'Transaction and action ledger export' },
    ],
  },
  {
    id: 'plugs',
    label: 'Plug Library',
    icon: Plug,
    visibility: 'always',
    entries: [
      { id: 'installed', label: 'Installed aiPLUGs', description: 'Your active plugins', href: '/plug-bin' },
      { id: 'marketplace', label: 'Marketplace', description: 'Browse and install', href: '/marketplace' },
    ],
  },
  {
    id: 'storage',
    label: 'Storage Vault',
    icon: HardDrive,
    visibility: 'always',
    entries: [
      { id: 'files', label: 'Files', description: 'GCS + CMEK encrypted storage', href: '/assets' },
      { id: 'capacity', label: 'Capacity', description: 'Usage and limits' },
    ],
  },
];

/* ── status badge ──────────────────────────────────────── */

function StatusDot({ status }: { status?: string }) {
  const color = {
    online: 'bg-green-500',
    configured: 'bg-green-500',
    degraded: 'bg-amber-500',
    offline: 'bg-red-500',
    unconfigured: 'bg-fg-ghost',
  }[status || 'unconfigured'] || 'bg-fg-ghost';

  return <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}

/* ── page ──────────────────────────────────────────────── */

export default function CircuitBoxPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'operator';
  const isPaid = profile?.tier && profile.tier !== 'free';
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveStatuses, setLiveStatuses] = useState<Record<string, { status: string; latency?: number }>>({});
  const [systemHealth, setSystemHealth] = useState<'optimal' | 'degraded' | 'critical'>('optimal');
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [togglesLoaded, setTogglesLoaded] = useState(false);
  const [byokKeys, setByokKeys] = useState<{ provider: string; masked: string; updatedAt: string }[]>([]);
  const [byokInput, setByokInput] = useState<Record<string, string>>({});
  const [byokSaving, setByokSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/system-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const map: Record<string, { status: string; latency?: number }> = {};
        for (const s of data.statuses) {
          map[s.id] = { status: s.status, latency: s.latency };
        }
        setLiveStatuses(map);
        setSystemHealth(data.systemHealth);
      })
      .catch(() => {});
    fetch('/api/circuit-box/toggle').then(r => r.ok ? r.json() : null).then(data => { if (data?.toggles) setToggles(data.toggles); }).catch(() => {}).finally(() => setTogglesLoaded(true));
    fetch('/api/circuit-box/byok').then(r => r.ok ? r.json() : null).then(data => { if (data?.keys) setByokKeys(data.keys); }).catch(() => {});
  }, []);

  async function handleToggle(c: string) { if (!togglesLoaded) return; const n = !(toggles[c] ?? true); setToggles(p => ({...p,[c]:n})); await fetch('/api/circuit-box/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component:c,enabled:n})}).catch(() => {setToggles(p => ({...p,[c]:!n}))}); }
  async function handleByokSave(p: string) { const k=byokInput[p]?.trim(); if(!k||k.length<8) return; setByokSaving(p); try { const r=await fetch('/api/circuit-box/byok',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:p,key:k})}); const d=await r.json(); if(d.ok){setByokKeys(v=>[...v.filter(x=>x.provider!==p),{provider:p,masked:d.masked,updatedAt:new Date().toISOString()}]);setByokInput(v=>({...v,[p]:''}));}} catch{} setByokSaving(null); }
  async function handleByokDelete(p: string) { await fetch(`/api/circuit-box/byok?provider=${p}`,{method:'DELETE'}).catch(()=>{}); setByokKeys(v=>v.filter(x=>x.provider!==p)); }

  const visiblePanels = PANELS.filter(p => {
    if (p.visibility === 'admin' && !isAdmin) return false;
    if (p.visibility === 'paid' && !isPaid) return false;
    return true;
  });

  const filtered = searchQuery
    ? visiblePanels.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.entries.some(e => e.label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : visiblePanels;

  // Resolve live status for an entry — live data overrides static defaults
  function resolveStatus(entryId: string, fallback?: string): string | undefined {
    if (['elevenlabs','deepgram','openai','custom'].includes(entryId) && byokKeys.find(k => k.provider === entryId)) return 'configured';
    if (togglesLoaded && toggles[entryId] === false) return 'offline';
    return liveStatuses[entryId]?.status || fallback;
  }

  const activePanel = filtered.find(p => p.id === selectedPanel);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="font-mono text-sm font-bold tracking-wider uppercase">Circuit Box</h1>
          <span className="font-mono text-[10px] text-fg-ghost">System Management</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-ghost" />
            <input
              type="text"
              placeholder="Search panels..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1 text-[11px] font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none w-48"
            />
          </div>
          <span className={`font-mono text-[10px] uppercase tracking-wider ${
            systemHealth === 'optimal' ? 'text-green-500' :
            systemHealth === 'degraded' ? 'text-amber-500' : 'text-red-500'
          }`}>
            System {systemHealth === 'optimal' ? 'Optimal' : systemHealth === 'degraded' ? 'Degraded' : 'Critical'}
          </span>
        </div>
      </div>

      {/* Grid + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 auto-rows-min content-start">
          {filtered.map(panel => {
            const Icon = panel.icon;
            const online = panel.entries.filter(e => {
              const s = resolveStatus(e.id, e.status);
              return s === 'online' || s === 'configured';
            }).length;
            const total = panel.entries.filter(e => e.status || liveStatuses[e.id]).length;
            const isActive = selectedPanel === panel.id;

            return (
              <button
                key={panel.id}
                onClick={() => setSelectedPanel(isActive ? null : panel.id)}
                className={`text-left p-3 border transition-colors ${
                  isActive
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-bg-surface hover:border-fg-ghost'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-fg-tertiary'}`} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg">{panel.label}</span>
                  {panel.visibility === 'admin' && (
                    <Shield className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="space-y-1">
                  {panel.entries.slice(0, 3).map(e => (
                    <div key={e.id} className="flex items-center gap-1.5">
                      <StatusDot status={resolveStatus(e.id, e.status)} />
                      <span className="font-mono text-[9px] text-fg-secondary truncate">{e.label}</span>
                    </div>
                  ))}
                  {panel.entries.length > 3 && (
                    <span className="font-mono text-[9px] text-fg-ghost">+{panel.entries.length - 3} more</span>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-fg-ghost" />
                    <span className="font-mono text-[9px] text-fg-ghost">{online}/{total} active</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right detail panel */}
        {activePanel && (
          <div className="w-80 border-l border-border bg-bg-surface overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <activePanel.icon className="w-4 h-4 text-accent" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider">{activePanel.label}</h2>
              </div>
              <p className="text-[10px] text-fg-ghost">{activePanel.entries.length} components</p>
            </div>
            <div className="divide-y divide-border">
              {activePanel.entries.map(entry => {
                const liveStatus = resolveStatus(entry.id, entry.status);
                const latency = liveStatuses[entry.id]?.latency;
                return (
                <div key={entry.id} className="p-3 hover:bg-bg-elevated transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={liveStatus} />
                    <span className="font-mono text-[10px] font-bold text-fg">{entry.label}</span>
                    {liveStatus && (
                      <span className={`ml-auto font-mono text-[9px] uppercase ${
                        liveStatus === 'online' || liveStatus === 'configured' ? 'text-green-500' :
                        liveStatus === 'degraded' ? 'text-amber-500' :
                        liveStatus === 'offline' ? 'text-red-500' : 'text-fg-ghost'
                      }`}>
                        {liveStatus}{latency ? ` · ${latency}ms` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-fg-secondary mb-2">{entry.description}</p>
                  <div className="flex items-center gap-2">
                    {entry.href && (
                      <Link
                        href={entry.href}
                        className="font-mono text-[9px] text-accent hover:underline flex items-center gap-1"
                      >
                        Configure <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                    {entry.action === 'toggle' && (
                      <button className="font-mono text-[9px] text-accent flex items-center gap-1">
                        <ToggleRight className="w-3.5 h-3.5" /> Toggle
                      </button>
                    )}
                    {liveStatus === 'online' && (
                      <button className="font-mono text-[9px] text-fg-ghost hover:text-signal-error flex items-center gap-1 ml-auto">
                        <Power className="w-3 h-3" /> Disable
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom alert bar */}
      <div className="border-t border-border bg-bg-elevated px-4 py-2 flex items-center gap-4 text-[10px] font-mono">
        <span className="text-fg-ghost">[INFO]</span>
        <span className="text-fg-secondary">Circuit Box loaded — all systems nominal</span>
        <span className="ml-auto text-fg-ghost">{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
