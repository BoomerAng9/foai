'use client';

import { useState, useEffect, useCallback } from 'react';
import { PostCard, type HuddlePost, type HuddleProfile } from './PostCard';

/* ───────────────────────── constants ───────────────────────── */

const TYPES = [
  { key: null, label: 'ALL' },
  { key: 'take', label: 'TAKES' },
  { key: 'scouting', label: 'SCOUTING' },
  { key: 'prediction', label: 'PREDICTIONS' },
  { key: 'reaction', label: 'REACTIONS' },
] as const;

const PAGE_SIZE = 20;

/* ───────────────────────── component ───────────────────────── */

interface HuddleFeedProps {
  /** Pre-filter by analyst ID (for profile pages) */
  analystFilter?: string;
  /** Available analyst profiles for avatar chips */
  profiles?: HuddleProfile[];
}

export function HuddleFeed({ analystFilter, profiles = [] }: HuddleFeedProps) {
  const [posts, setPosts] = useState<HuddlePost[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedAnalyst, setSelectedAnalyst] = useState<string | null>(analystFilter || null);

  /* ── Profile map for PostCard enrichment ── */
  const profileMap = new Map(profiles.map((p) => [p.analyst_id, p]));

  /* ── Fetch ── */
  const fetchPosts = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const analyst = analystFilter || selectedAnalyst;
        if (analyst) params.set('analyst', analyst);
        if (typeFilter) params.set('type', typeFilter);
        params.set('limit', String(PAGE_SIZE));
        const currentOffset = reset ? 0 : offset;
        params.set('offset', String(currentOffset));

        const res = await fetch(`/api/huddle/posts?${params}`);
        const data = await res.json();
        const fetched: HuddlePost[] = data.posts || [];

        if (reset) {
          setPosts(fetched);
          setOffset(PAGE_SIZE);
        } else {
          setPosts((prev) => [...prev, ...fetched]);
          setOffset((prev) => prev + PAGE_SIZE);
        }
        setTotal(data.total || 0);
      } catch {
        if (reset) setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [analystFilter, selectedAnalyst, typeFilter, offset],
  );

  /* Reset on filter change */
  useEffect(() => {
    setOffset(0);
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, selectedAnalyst, analystFilter]);

  const hasMore = posts.length < total;

  return (
    <div className="w-full">
      {/* ── Type filter tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {TYPES.map((t) => {
          const active = typeFilter === t.key;
          return (
            <button
              key={t.label}
              onClick={() => setTypeFilter(t.key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider transition-all"
              style={{
                background: active ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.04)',
                color: active ? '#D4A853' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${active ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Analyst filter chips (only when not pre-filtered) ── */}
      {!analystFilter && profiles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedAnalyst(null)}
            className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all"
            style={{
              background: !selectedAnalyst ? 'rgba(212,168,83,0.12)' : 'rgba(255,255,255,0.03)',
              color: !selectedAnalyst ? '#D4A853' : 'rgba(255,255,255,0.35)',
              border: `1px solid ${!selectedAnalyst ? 'rgba(212,168,83,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            ALL ANALYSTS
          </button>
          {profiles.map((p) => {
            const active = selectedAnalyst === p.analyst_id;
            return (
              <button
                key={p.analyst_id}
                onClick={() => setSelectedAnalyst(active ? null : p.analyst_id)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all"
                style={{
                  background: active ? `${p.avatar_color}18` : 'rgba(255,255,255,0.03)',
                  color: active ? p.avatar_color : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${active ? `${p.avatar_color}40` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: p.avatar_color }}
                />
                {p.display_name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Post list ── */}
      <div className="flex flex-col gap-3">
        {loading && posts.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg animate-pulse"
                style={{
                  background: '#111827',
                  border: '1px solid #1F2937',
                  height: 140,
                }}
              />
            ))
          : posts.map((post) => (
              <PostCard key={post.id} post={post} profile={profileMap.get(post.analyst_id)} />
            ))}

        {!loading && posts.length === 0 && (
          <div
            className="text-center py-16 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <p className="text-white/25 font-mono text-sm tracking-wider">
              The Huddle is quiet... for now.
            </p>
          </div>
        )}
      </div>

      {/* ── Load more ── */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchPosts(false)}
            className="px-6 py-2 rounded-full text-xs font-mono font-bold tracking-wider transition-all"
            style={{
              background: 'rgba(212,168,83,0.1)',
              color: '#D4A853',
              border: '1px solid rgba(212,168,83,0.25)',
            }}
          >
            LOAD MORE
          </button>
        </div>
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center mt-4">
          <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
        </div>
      )}
    </div>
  );
}
