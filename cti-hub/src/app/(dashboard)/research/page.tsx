'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';
import {
  Search,
  Plus,
  Shield,
  Edit3,
  Archive,
  Trash2,
  X,
  ExternalLink,
  Clock,
  Tag,
} from 'lucide-react';

interface ResearchItem {
  id: number;
  user_id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['all', 'player', 'draft', 'api', 'competitor', 'market', 'production', 'general'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  player: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  api: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  competitor: 'bg-red-500/20 text-red-400 border-red-500/30',
  market: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  production: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  general: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-zinc-500',
  active: 'text-emerald-400',
  archived: 'text-zinc-600',
};

const EMPTY_FORM = {
  title: '',
  category: 'general' as string,
  content: '',
  tags: '',
  source_url: '',
  status: 'draft' as string,
};

export default function ResearchPage() {
  const { user } = useAuth();
  const ownerAccess = isOwner(user?.email);

  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/research?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // fetch failed
    }
    setLoading(false);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (!ownerAccess) return;
    fetchItems();
  }, [ownerAccess, fetchItems]);

  // Debounced search
  useEffect(() => {
    if (!ownerAccess) return;
    const timer = setTimeout(() => fetchItems(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      category: form.category,
      content: form.content,
      tags: tagsArray,
      source_url: form.source_url || null,
      status: form.status,
    };

    try {
      if (editingId) {
        await fetch(`/api/research/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchItems();
    } catch {
      // save failed
    }
    setSaving(false);
  }

  async function handleArchive(id: number) {
    await fetch(`/api/research/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    fetchItems();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/research/${id}`, { method: 'DELETE' });
    fetchItems();
  }

  function openEdit(item: ResearchItem) {
    setForm({
      title: item.title,
      category: item.category,
      content: item.content,
      tags: item.tags.join(', '),
      source_url: item.source_url || '',
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  if (!ownerAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Owner access required</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6"
      style={{ background: '#0A0A0A', color: '#E5E5E5' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.25)' }}
          >
            <Search className="w-6 h-6" style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono" style={{ color: '#D4AF37' }}>
              RESEARCH HQ
            </h1>
            <p className="text-xs font-mono" style={{ color: '#6B6B6B' }}>
              Intel storage &bull; {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 h-10 text-xs font-mono font-bold transition-all"
          style={{
            background: '#D4AF37',
            color: '#0A0A0A',
          }}
        >
          <Plus className="w-4 h-4" />
          NEW RESEARCH
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#555' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search research items..."
          className="w-full h-10 pl-10 pr-4 text-sm font-mono focus:outline-none"
          style={{
            background: '#141414',
            border: '1px solid #2A2A2A',
            color: '#E5E5E5',
          }}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all"
            style={{
              background: activeCategory === cat ? '#D4AF37' : '#141414',
              color: activeCategory === cat ? '#0A0A0A' : '#888',
              border: `1px solid ${activeCategory === cat ? '#D4AF37' : '#2A2A2A'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div
          className="mb-6 p-5"
          style={{ background: '#111', border: '1px solid rgba(212, 175, 55, 0.3)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-bold" style={{ color: '#D4AF37' }}>
              {editingId ? 'EDIT RESEARCH' : 'NEW RESEARCH'}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Research title..."
                className="w-full h-9 px-3 text-sm font-mono focus:outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 text-sm font-mono focus:outline-none"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
                >
                  {CATEGORIES.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 text-sm font-mono focus:outline-none"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
                >
                  <option value="draft">DRAFT</option>
                  <option value="active">ACTIVE</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
              Content
            </label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6}
              placeholder="Research notes, data, analysis..."
              className="w-full px-3 py-2 text-sm font-mono focus:outline-none resize-y"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="nfl, scouting, qb..."
                className="w-full h-9 px-3 text-sm font-mono focus:outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: '#888' }}>
                Source URL
              </label>
              <input
                type="url"
                value={form.source_url}
                onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                placeholder="https://..."
                className="w-full h-9 px-3 text-sm font-mono focus:outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E5E5E5' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="px-4 h-9 text-xs font-mono font-bold"
              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888' }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || saving}
              className="px-5 h-9 text-xs font-mono font-bold transition-all disabled:opacity-30"
              style={{ background: '#D4AF37', color: '#0A0A0A' }}
            >
              {saving ? 'SAVING...' : editingId ? 'UPDATE' : 'SAVE'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-xs font-mono" style={{ color: '#555' }}>Loading intel...</div>
        </div>
      )}

      {/* Research Grid */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="w-10 h-10 mb-3" style={{ color: '#333' }} />
          <p className="text-sm font-mono" style={{ color: '#555' }}>No research items found</p>
          <p className="text-xs font-mono mt-1" style={{ color: '#444' }}>
            Click NEW RESEARCH to start building your intel
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map(item => (
            <div
              key={item.id}
              className="group relative transition-all"
              style={{
                background: '#111',
                border: '1px solid #1E1E1E',
              }}
            >
              {/* Card Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold font-mono leading-tight" style={{ color: '#E5E5E5' }}>
                    {item.title}
                  </h3>
                  <span className={`shrink-0 text-[9px] font-mono font-bold uppercase ${STATUS_COLORS[item.status] || 'text-zinc-500'}`}>
                    {item.status}
                  </span>
                </div>

                {/* Category Badge */}
                <span className={`inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general}`}>
                  {item.category}
                </span>
              </div>

              {/* Content Preview */}
              <div className="px-4 py-2">
                <p className="text-xs font-mono leading-relaxed line-clamp-3" style={{ color: '#888' }}>
                  {item.content.slice(0, 150)}{item.content.length > 150 ? '...' : ''}
                </p>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="px-4 py-1 flex flex-wrap gap-1">
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono"
                      style={{ background: '#1A1A1A', color: '#777' }}
                    >
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #1A1A1A' }}>
                <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: '#555' }}>
                  <Clock className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="flex items-center gap-1">
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 transition-colors"
                      style={{ color: '#555' }}
                      title="Open source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 transition-colors hover:text-amber-400"
                    style={{ color: '#555' }}
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {item.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="p-1.5 transition-colors hover:text-orange-400"
                      style={{ color: '#555' }}
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 transition-colors hover:text-red-400"
                    style={{ color: '#555' }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
