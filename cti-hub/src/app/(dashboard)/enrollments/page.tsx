'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import {
  TrendingUp,
  Link2,
  DollarSign,
  Hash,
  Plus,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Shield,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

interface AffiliateLink {
  id?: string;
  category: string;
  base_url: string;
  sku: string;
  course_name: string;
  created_at?: string;
  status?: string;
}

interface Enrollment {
  id?: string;
  sku: string;
  course: string;
  revenue: number;
  source_utm: string;
  created_at?: string;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EnrollmentsPage() {
  const { user } = useAuth();
  const ownerAccess = isOwner(user?.email);

  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Fetch data ─────────────────────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/enrollments');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // The upstream may return { links: [...], enrollments: [...] } or just an array
      if (Array.isArray(data)) {
        setLinks(data);
      } else {
        setLinks(data.links || []);
        setEnrollments(data.enrollments || []);
      }
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

  /* ── Revenue summary ────────────────────────────────────────────── */

  const totalRevenue = enrollments.reduce((s, e) => s + (e.revenue || 0), 0);
  const totalEnrollments = enrollments.length;
  const avgPerEnrollment = totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0;

  /* ── Copy helper ────────────────────────────────────────────────── */

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

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

  /* ── Loading state ──────────────────────────────────────────────── */

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
            <TrendingUp className="w-5 h-5 text-fg-tertiary" />
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              MindEdge <span className="font-bold">Enrollments</span>
            </h1>
          </div>
          <p className="label-mono">Affiliate links, conversions, and revenue</p>
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
            <Plus className="w-3 h-3" /> NEW LINK
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border border-signal-error/30 bg-signal-error/5 px-4 py-3">
          <p className="font-mono text-[10px] text-signal-error">{error}</p>
        </div>
      )}

      {/* Revenue Summary Cards */}
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
            <Hash className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Total Enrollments</span>
          </div>
          <p className="text-2xl font-mono font-bold">{totalEnrollments}</p>
        </div>
        <div className="border border-border bg-bg-surface px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-fg-tertiary" />
            <span className="label-mono">Avg / Enrollment</span>
          </div>
          <p className="text-2xl font-mono font-bold">${avgPerEnrollment.toFixed(2)}</p>
        </div>
      </div>

      {/* Affiliate Links Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-fg-tertiary" />
          <h2 className="font-mono text-[11px] font-bold tracking-wide uppercase text-fg-secondary">
            Affiliate Links ({links.length})
          </h2>
        </div>

        {links.length === 0 ? (
          <div className="border border-border bg-bg-surface text-center py-12">
            <Link2 className="w-8 h-8 text-fg-ghost mx-auto mb-3" />
            <p className="font-mono text-xs text-fg-tertiary">
              No affiliate links yet. Click &quot;NEW LINK&quot; to create your first.
            </p>
          </div>
        ) : (
          <div className="border border-border bg-bg-surface overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_100px_80px_auto] gap-4 px-5 py-3 border-b border-border min-w-[600px]">
              {['Course', 'URL', 'SKU', 'Status', ''].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>

            {/* Data rows */}
            {links.map((link, i) => (
              <div
                key={link.id || `link-${i}`}
                className="grid grid-cols-[1fr_1fr_100px_80px_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors items-center min-w-[600px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{link.course_name}</p>
                  <p className="font-mono text-[10px] text-fg-ghost">{link.category}</p>
                </div>
                <div className="min-w-0 flex items-center gap-1.5">
                  <p className="font-mono text-xs text-fg-secondary truncate">{link.base_url}</p>
                  <button
                    onClick={() => copyUrl(link.base_url)}
                    className="text-fg-tertiary hover:text-fg shrink-0"
                  >
                    {copiedUrl === link.base_url ? (
                      <Check className="w-3 h-3 text-signal-live" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <span className="font-mono text-xs">{link.sku}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`led ${link.status === 'inactive' ? 'led-idle' : 'led-live'}`} />
                  <span className="font-mono text-[10px] uppercase text-fg-secondary">
                    {link.status || 'active'}
                  </span>
                </div>
                <a
                  href={link.base_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-bracket text-[9px]"
                >
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrollment Records Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-fg-tertiary" />
          <h2 className="font-mono text-[11px] font-bold tracking-wide uppercase text-fg-secondary">
            Enrollment Records ({enrollments.length})
          </h2>
        </div>

        {enrollments.length === 0 ? (
          <div className="border border-border bg-bg-surface text-center py-12">
            <DollarSign className="w-8 h-8 text-fg-ghost mx-auto mb-3" />
            <p className="font-mono text-xs text-fg-tertiary">
              No enrollments yet. Conversions will appear here when tracked.
            </p>
          </div>
        ) : (
          <div className="border border-border bg-bg-surface overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_100px_100px_1fr_auto] gap-4 px-5 py-3 border-b border-border min-w-[600px]">
              {['Course', 'SKU', 'Revenue', 'Source', 'Date'].map(h => (
                <span key={h} className="label-mono">{h}</span>
              ))}
            </div>

            {/* Data rows */}
            {enrollments.map((enrollment, i) => (
              <div
                key={enrollment.id || `enroll-${i}`}
                className="grid grid-cols-[1fr_100px_100px_1fr_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors items-center min-w-[600px]"
              >
                <p className="text-sm font-medium truncate">{enrollment.course}</p>
                <span className="font-mono text-xs">{enrollment.sku}</span>
                <span className="font-mono text-xs font-bold">
                  ${(enrollment.revenue || 0).toFixed(2)}
                </span>
                <span className="font-mono text-[10px] text-fg-secondary truncate">
                  {enrollment.source_utm || '--'}
                </span>
                <span className="font-mono text-[10px] text-fg-ghost">
                  {enrollment.created_at
                    ? new Date(enrollment.created_at).toLocaleDateString()
                    : '--'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <CreateLinkModal
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

/* ── Create Link Modal ─────────────────────────────────────────────── */

function CreateLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    category: 'mindedge',
    base_url: '',
    sku: '',
    course_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.base_url || !form.sku || !form.course_name) {
      setError('All fields are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/enrollments/links', {
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
      setError(String(err));
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
            Create Affiliate Link
          </h3>
          <button onClick={onClose} className="text-fg-tertiary hover:text-fg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="border border-signal-error/30 bg-signal-error/5 px-3 py-2">
              <p className="font-mono text-[10px] text-signal-error">{error}</p>
            </div>
          )}

          <div>
            <label className="label-mono mb-1.5 block">Course Name</label>
            <input
              type="text"
              value={form.course_name}
              onChange={e => update('course_name', e.target.value)}
              placeholder="e.g. Business Communication Essentials"
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="label-mono mb-1.5 block">Base URL</label>
            <input
              type="url"
              value={form.base_url}
              onChange={e => update('base_url', e.target.value)}
              placeholder="https://www.mindedge.com/..."
              className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono mb-1.5 block">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => update('sku', e.target.value)}
                placeholder="e.g. ME-BUS-101"
                className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="label-mono mb-1.5 block">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => update('category', e.target.value)}
                placeholder="mindedge"
                className="w-full h-9 px-3 bg-bg border border-border font-mono text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-9 bg-accent text-bg font-mono text-[10px] font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? 'CREATING...' : 'CREATE LINK'}
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
