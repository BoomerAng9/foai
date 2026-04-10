'use client';

import { use, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { ProfileHeader } from '@/components/huddle/ProfileHeader';
import { HuddleFeed } from '@/components/huddle/HuddleFeed';
import type { HuddleProfile } from '@/components/huddle/PostCard';

/* ───────────────────────── page ───────────────────────── */

export default function AnalystHuddlePage({ params }: { params: Promise<{ analyst: string }> }) {
  const { analyst } = use(params);

  const [profile, setProfile] = useState<HuddleProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/huddle/profiles?analyst=${encodeURIComponent(analyst)}`);
        const data = await res.json();
        setProfile(data.profile || null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [analyst]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* ── Ribbon ── */}
      <div
        className="flex items-center px-6 py-2"
        style={{
          background: 'rgba(212,168,83,0.04)',
          borderBottom: '1px solid rgba(212,168,83,0.1)',
        }}
      >
        <BackHomeNav />
        <span className="text-[10px] font-mono text-white/30 tracking-widest">
          THE HUDDLE / {analyst.replace(/-/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* ── Profile header ── */}
      {loading ? (
        <div className="w-full h-64 animate-pulse" style={{ background: '#111827' }} />
      ) : profile ? (
        <ProfileHeader profile={profile} />
      ) : (
        <div className="px-6 py-12 text-center">
          <h2 className="font-outfit text-2xl font-bold text-white/60">
            {analyst.replace(/-/g, ' ')}
          </h2>
          <p className="text-sm text-white/25 font-mono mt-2">Profile not found in the Huddle.</p>
        </div>
      )}

      {/* ── Feed ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <HuddleFeed analystFilter={analyst} profiles={profile ? [profile] : []} />
      </main>

      <Footer />
    </div>
  );
}
