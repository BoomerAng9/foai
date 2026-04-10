'use client';

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import type { HuddleProfile } from './PostCard';

/* ───────────────────────── helpers ───────────────────────── */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ───────────────────────── component ───────────────────────── */

interface ProfileHeaderProps {
  profile: HuddleProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const color = profile.avatar_color || '#D4A853';

  return (
    <div className="w-full">
      {/* Banner gradient */}
      <div
        className="w-full h-36 sm:h-44"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}15 50%, #0D1117 100%)`,
        }}
      />

      {/* Profile info */}
      <div className="relative px-6 pb-6" style={{ background: '#0D1117' }}>
        {/* Avatar — pulled up over the banner */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold -mt-10 relative z-10"
          style={{
            background: `${color}22`,
            color,
            border: `3px solid #0D1117`,
            boxShadow: `0 0 0 3px ${color}44`,
          }}
        >
          {initials(profile.display_name)}
        </div>

        {/* Name + handle */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <h1 className="font-outfit text-xl font-extrabold text-white tracking-wide">
            {profile.display_name}
          </h1>
          {profile.verified && <BadgeCheck size={18} style={{ color: '#D4A853' }} />}
        </div>
        <p className="text-sm font-mono text-white/35 mt-0.5">@{profile.handle}</p>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-white/60 leading-relaxed mt-3 max-w-xl">
            {profile.bio}
          </p>
        )}

        {/* Show name badge */}
        {profile.show_name && (
          <Link
            href="/podcast/shows"
            className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-colors"
            style={{
              background: `${color}12`,
              color,
              border: `1px solid ${color}30`,
            }}
          >
            {profile.show_name}
          </Link>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm font-mono">
          <span>
            <span className="text-white font-bold">{formatStat(profile.post_count)}</span>
            <span className="text-white/30 ml-1">posts</span>
          </span>
          <span>
            <span className="text-white font-bold">{formatStat(profile.followers)}</span>
            <span className="text-white/30 ml-1">followers</span>
          </span>
          <span>
            <span className="text-white font-bold">{formatStat(profile.following)}</span>
            <span className="text-white/30 ml-1">following</span>
          </span>
        </div>
      </div>
    </div>
  );
}
