'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import {
  TrendingUp,
  DollarSign,
  Hash,
  Plus,
  X,
  RefreshCw,
  Shield,
  Users,
  BarChart3,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Partner {
  name: string;
  type: string;
  description: string;
  active: boolean;
  totalRevenue: number;
  totalLeads: number;
  commissionRate: number;
}

interface Campaign {
  id?: string;
  partner_name: string;
  campaign_name: string;
  tracking_url: string;
  status: string;
  clicks: number;
  conversions: number;
  revenue: number;
  created_at?: string;
}

/* ── Static partner data ──────────────────────────────────────────── */

const DEFAULT_PARTNERS: Partner[] = [
  {
    name: 'MindEdge',
    type: 'Education',
    description: 'Online education enrollment partner. Track enrollments, commissions, and campaign performance.',
    active: true,
    totalRevenue: 0,
    totalLeads: 0,
    commissionRate: 15,
  },
  {
    name: 'Above the Standard',
    type: 'Training',
    description: 'Professional development and certification training. Track referrals and revenue.',
    active: true,
    totalRevenue: 0,
    totalLeads: 0,
    commissionRate: 12,
  },
  {
    name: 'Aspire Partners',
    type: 'Growth',
    description: 'Business growth consulting. Track leads, conversions, and partner revenue.',
    active: true,
    totalRevenue: 0,
    totalLeads: 0,
    commissionRate: 10,
  },
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function AffiliatesPage() {
  const { user } = useAuth();
  const ownerAccess = isOwner(user?.email);

  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Fetch data ─────────────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/affiliates');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);

      // Merge campaign stats into partners
      setPartners(prev =>
        prev.map(p => {
          const partnerCampaigns = (data.campaigns || []).filter(
            (c: Campaign) => c.partner_name === p.name,
          );
          return {
            ...p,
            totalRevenue: partnerCampaigns.reduce((s: number, c: Campaign) => s + (c.revenue || 0), 0),
            totalLeads: partnerCampaigns.reduce((s: number, c: Campaign) => s + (c.conversions || 0), 0),
          };
        }),
      );
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    if (!ownerAccess) {
      setLoading(false);
      return;
    }
    fetchData().finally(() => setLoading(false));
  }, [ownerAccess, fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function togglePartner(index: number) {
    setPartners(prev =>
      prev.map((p, i) => (i === index ? { ...p, active: !p.active } : p)),
    );
  }

  function updateCommission(index: number, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setPartners(prev =>
      prev.map((p, i) => (i === index ? { ...p, commissionRate: num } : p)),
    );
  }

  /* ── Summary stats ──────────────────────────────────────────────── */

  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);

  /* ── Guard: owner only ──────────────────────────────────────────── */

  if (!ownerAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-10 h-10 text-fg-ghost mx-auto mb-3" />
          <p className="font-mono text-xs text-fg-tertiary">Owner access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="font-mono text-xs text-fg-tertiary animate-pulse-dot">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              AFFILIATE <span className="font-bold">MANAGEMENT</span>
            </h1>
          </div>
          <p className="label-mono">Partner campaigns, commissions, and revenue tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="btn-bracket text-[9px] flex items-center gap-1.5"
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> REFRESH
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-bg font-mono text-[10px] font-bold tracking-wide hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" /> NEW CAMPAIGN
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border border-signal-error/30 bg-signal-error/5 px-4 py-3">
          <p className="font-mono text-[10px] text-signal-error">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Total Revenue</span>
          </div>
          <p className="text-2xl font-mono font-bold">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Active Campaigns</span>
          </div>
          <p className="text-2xl font-mono font-bold">{activeCampaigns}</p>
        </div>
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Total Conversions</span>
          </div>
          <p className="text-2xl font-mono font-bold">{totalConversions}</p>
        </div>
      </div>

      {/* Partner Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-fg-tertiary" />
          <h2 className="font-mono text-[11px] font-bold tracking-wide uppercase text-fg-secondary">
            Partners ({partners.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {partners.map((partner, i) => (
            <div
              key={partner.name}
              className="border border-border bg-bg-surface p-5 space-y-4 hover:border-accent/40 transition-colors"
            >
              {/* Name + Type */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold">{partner.name}</h3>
                  <span className="font-mono text-[10px] text-accent uppercase tracking-wide">
                    {partner.type} partner
                  </span>
                </div>
                <button
                  onClick={() => togglePartner(i)}
                  className="text-fg-tertiary hover:text-fg transition-colors"
                  title={partner.active ? 'Deactivate' : 'Activate'}
                >
                  {partner.active ? (
                    <ToggleRight className="w-6 h-6 text-signal-live" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-fg-ghost" />
                  )}
                </button>
              </div>

              {/* Description */}
              <p className="font-mono text-[10px] text-fg-secondary leading-relaxed">
                {partner.description}
              </p>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span className={`led ${partner.active ? 'led-live' : 'led-idle'}`} />
                <span className="font-mono text-[10px] uppercase text-fg-secondary">
                  {partner.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <span className="label-mono block mb-1">Revenue</span>
                  <p className="font-mono text-sm font-bold">${partner.totalRevenue.toFixed(2)}</p>
                </div>
                <div>
                  <span className="label-mono block mb-1">
                    {partner.type === 'Education' ? 'Enrollments' : 'Leads'}
                  </span>
                  <p className="font-mono text-sm font-bold">{partner.totalLeads}</p>
                </div>
              </div>

              {/* Commission Rate */}
              <div className="pt-2 border-t border-border">
                <label className="label-mono block mb-1.5">Commission Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={partner.commissionRate}
                  onChange={e => updateCommission(i, e.target.value)}
                  className="w-full h-8 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-fg-tertiary" />
          <h2 className="font-mono text-[11px] font-bold tracking-wide uppercase text-fg-secondary">
            Campaigns ({campaigns.length})
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="border border-border bg-bg-surface text-center py-12">
            <BarChart3 className="w-8 h-8 text-fg-ghost mx-auto mb-3" />
            <p className="font-mono text-xs text-fg-tertiary">
              No campaigns yet. Click &quot;NEW CAMPAIGN&quot; to create your first.
            </p>
          </div>
        ) : (
          <div className="border border-border bg-bg-surface overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_120px_80px_80px_80px_100px_auto] gap-4 px-5 py-3 border-b border-border min-w-[700px]">
              {['Campaign', 'Partner', 'Status', 'Clicks', 'Conv.', 'Revenue', 'Date'].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>

            {/* Data rows */}
            {campaigns.map((campaign, i) => (
              <div
                key={campaign.id || `camp-${i}`}
                className="grid grid-cols-[1fr_120px_80px_80px_80px_100px_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors items-center min-w-[700px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{campaign.campaign_name}</p>
                  <p className="font-mono text-[10px] text-fg-ghost truncate">{campaign.tracking_url}</p>
                </div>
                <span className="font-mono text-xs text-fg-secondary">{campaign.partner_name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`led ${campaign.status === 'active' ? 'led-live' : 'led-idle'}`} />
                  <span className="font-mono text-[10px] uppercase text-fg-secondary">
                    {campaign.status}
                  </span>
                </div>
                <span className="font-mono text-xs">{campaign.clicks}</span>
                <span className="font-mono text-xs">{campaign.conversions}</span>
                <span className="font-mono text-xs font-bold">${(campaign.revenue || 0).toFixed(2)}</span>
                <span className="font-mono text-[10px] text-fg-ghost">
                  {campaign.created_at
                    ? new Date(campaign.created_at).toLocaleDateString()
                    : '--'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          partners={partners}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

/* ── Create Campaign Modal ────────────────────────────────────────── */

function CreateCampaignModal({
  partners,
  onClose,
  onCreated,
}: {
  partners: Partner[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    campaign_name: '',
    partner_name: partners[0]?.name || '',
    tracking_url: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaign_name || !form.partner_name || !form.tracking_url) {
      setFormError('Campaign name, partner, and tracking URL are required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onCreated();
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="border border-border bg-bg-surface w-full max-w-md mx-4 relative">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-mono text-[11px] font-bold tracking-wide uppercase">
            New Campaign
          </h3>
          <button onClick={onClose} className="text-fg-tertiary hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="border border-signal-error/30 bg-signal-error/5 px-3 py-2">
              <p className="font-mono text-[10px] text-signal-error">{formError}</p>
            </div>
          )}

          <div>
            <label className="label-mono mb-1.5 block">Campaign Name</label>
            <input
              type="text"
              value={form.campaign_name}
              onChange={e => update('campaign_name', e.target.value)}
              placeholder="e.g. Q2 Education Push"
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="label-mono mb-1.5 block">Partner</label>
            <select
              value={form.partner_name}
              onChange={e => update('partner_name', e.target.value)}
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            >
              {partners.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-mono mb-1.5 block">Tracking URL</label>
            <input
              type="url"
              value={form.tracking_url}
              onChange={e => update('tracking_url', e.target.value)}
              placeholder="https://..."
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="label-mono mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-9 bg-accent text-bg font-mono text-[10px] font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? 'CREATING...' : 'CREATE CAMPAIGN'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 border border-border font-mono text-[10px] text-fg-secondary hover:bg-bg-elevated transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
