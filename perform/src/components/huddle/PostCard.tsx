'use client';

import Link from 'next/link';
import { Heart, Repeat2, MessageCircle, Pin, BadgeCheck } from 'lucide-react';

/* ───────────────────────── types ───────────────────────── */

export interface HuddlePost {
  id: number;
  analyst_id: string;
  post_type: string;
  content: string;
  tags: string[] | null;
  player_ref: string | null;
  likes: number;
  reposts: number;
  replies: number;
  pinned: boolean;
  created_at: string;
}

export interface HuddleProfile {
  analyst_id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  show_name: string | null;
  avatar_color: string;
  followers: number;
  following: number;
  post_count: number;
  verified: boolean;
}

/* ───────────────────────── helpers ───────────────────────── */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  take:       { label: 'TAKE',       bg: 'rgba(239,68,68,0.15)',  text: '#EF4444' },
  scouting:   { label: 'SCOUTING',   bg: 'rgba(96,165,250,0.15)', text: '#60A5FA' },
  prediction: { label: 'PREDICTION', bg: 'rgba(212,168,83,0.15)', text: '#D4A853' },
  reaction:   { label: 'REACTION',   bg: 'rgba(34,197,94,0.15)',  text: '#22C55E' },
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/* ───────────────────────── component ───────────────────────── */

interface PostCardProps {
  post: HuddlePost;
  profile?: HuddleProfile;
}

export function PostCard({ post, profile }: PostCardProps) {
  const displayName = profile?.display_name || post.analyst_id;
  const handle = profile?.handle || post.analyst_id;
  const color = profile?.avatar_color || '#D4A853';
  const verified = profile?.verified ?? true;
  const typeStyle = TYPE_STYLES[post.post_type] || TYPE_STYLES.take;

  return (
    <div
      className="rounded-lg p-4 transition-all hover:border-white/10"
      style={{
        background: '#111827',
        border: '1px solid #1F2937',
      }}
    >
      {/* Pinned indicator */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 mb-2 text-white/30">
          <Pin size={11} className="rotate-45" />
          <span className="text-[10px] font-mono tracking-wider">PINNED</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/huddle/${post.analyst_id}`} className="shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${color}22`, color, border: `2px solid ${color}44` }}
          >
            {initials(displayName)}
          </div>
        </Link>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Link href={`/huddle/${post.analyst_id}`} className="font-semibold text-sm text-white hover:underline">
              {displayName}
            </Link>
            {verified && <BadgeCheck size={14} style={{ color: '#D4A853' }} />}
            <span className="text-xs text-white/30 font-mono">@{handle}</span>
            <span className="text-white/15 text-xs">·</span>
            <span className="text-xs text-white/30 font-mono">{relativeTime(post.created_at)}</span>
          </div>

          {/* Post type badge */}
          <span
            className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded mb-2"
            style={{ background: typeStyle.bg, color: typeStyle.text }}
          >
            {typeStyle.label}
          </span>

          {/* Content */}
          <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line mb-2">
            {post.content}
          </div>

          {/* Player reference */}
          {post.player_ref && (
            <Link
              href={`/players/${post.player_ref}/forecast`}
              className="inline-block text-xs font-mono px-2 py-0.5 rounded mb-2 transition-colors"
              style={{
                background: 'rgba(212,168,83,0.08)',
                color: '#D4A853',
                border: '1px solid rgba(212,168,83,0.2)',
              }}
            >
              {post.player_ref.replace(/-/g, ' ')}
            </Link>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-5 mt-1">
            <button className="flex items-center gap-1 text-white/25 hover:text-rose-400 transition-colors group">
              <Heart size={14} className="group-hover:fill-rose-400/20" />
              <span className="text-[11px] font-mono">{formatCount(post.likes)}</span>
            </button>
            <button className="flex items-center gap-1 text-white/25 hover:text-emerald-400 transition-colors">
              <Repeat2 size={14} />
              <span className="text-[11px] font-mono">{formatCount(post.reposts)}</span>
            </button>
            <button className="flex items-center gap-1 text-white/25 hover:text-sky-400 transition-colors">
              <MessageCircle size={14} />
              <span className="text-[11px] font-mono">{formatCount(post.replies)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
