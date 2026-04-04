'use client';

import { useState, useEffect } from 'react';

interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
}

export function BreakingBar() {
  const [latest, setLatest] = useState<Tweet | null>(null);

  useEffect(() => {
    async function fetch_latest() {
      try {
        const res = await fetch('/api/feed');
        const data = await res.json();
        if (data.tweets?.length > 0) {
          setLatest(data.tweets[0]);
        }
      } catch {}
    }
    fetch_latest();
    const interval = setInterval(fetch_latest, 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  if (!latest) return null;

  return (
    <div className="flex items-center gap-3 px-4 h-8" style={{ background: 'rgba(212,168,83,0.08)', borderBottom: '1px solid rgba(212,168,83,0.2)' }}>
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
      <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: '#EF4444' }}>LIVE</span>
      <span className="text-[10px] font-mono text-white/50 truncate flex-1">
        <span className="font-bold" style={{ color: '#D4A853' }}>@{latest.authorUsername}</span>
        {' '}{latest.text.slice(0, 200)}
      </span>
    </div>
  );
}
