'use client';

import { useState, useEffect } from 'react';

interface Headline {
  text: string;
}

export function BreakingBar() {
  const [headline, setHeadline] = useState<Headline | null>(null);

  useEffect(() => {
    async function fetch_latest() {
      try {
        // Try X API first
        const feedRes = await fetch('/api/feed');
        const feedData = await feedRes.json();
        if (feedData.tweets?.length > 0) {
          setHeadline({ text: feedData.tweets[0].text });
          return;
        }

        // Fallback to scraped news
        const newsRes = await fetch('/api/news');
        const newsData = await newsRes.json();
        if (newsData.articles?.length > 0) {
          setHeadline({ text: newsData.articles[0].title });
          return;
        }
      } catch {}
    }
    fetch_latest();
    const interval = setInterval(fetch_latest, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!headline) return null;

  return (
    <div className="flex items-center gap-3 px-4 h-8" style={{ background: 'rgba(212,168,83,0.08)', borderBottom: '1px solid rgba(212,168,83,0.2)' }}>
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
      <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: '#EF4444' }}>LIVE</span>
      <span className="text-[10px] font-mono text-white/50 truncate flex-1">
        {headline.text.slice(0, 200)}
      </span>
    </div>
  );
}
