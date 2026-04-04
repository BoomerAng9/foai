'use client';

import { useState, useEffect, useRef } from 'react';

interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorVerified: boolean;
  createdAt: string;
}

export function NewsTicker() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch('/api/feed');
        const data = await res.json();
        setTweets(data.tweets || []);
        setUpdatedAt(data.updatedAt || '');
      } catch {}
    }
    fetchFeed();
    // Refresh every 2 minutes
    const interval = setInterval(fetchFeed, 120000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || tweets.length === 0) return;

    let animFrame: number;
    let pos = 0;
    const speed = 0.5; // px per frame

    function animate() {
      pos += speed;
      if (el && pos >= el.scrollWidth / 2) pos = 0;
      if (el) el.scrollLeft = pos;
      animFrame = requestAnimationFrame(animate);
    }
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [tweets]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (tweets.length === 0) {
    return (
      <div className="h-10 flex items-center px-4" style={{ background: '#111116', borderTop: '2px solid #D4A853' }}>
        <span className="text-[10px] font-mono font-bold tracking-wider mr-3" style={{ color: '#D4A853' }}>BREAKING</span>
        <span className="text-[10px] font-mono text-white/30">Live feed loading...</span>
      </div>
    );
  }

  // Double the items for seamless looping
  const items = [...tweets, ...tweets];

  return (
    <div className="h-10 flex items-center overflow-hidden" style={{ background: '#111116', borderTop: '2px solid #D4A853' }}>
      <div className="shrink-0 px-4 flex items-center gap-2 h-full" style={{ background: '#D4A853' }}>
        <span className="text-[10px] font-mono font-extrabold tracking-widest" style={{ color: '#0A0A0F' }}>BREAKING</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-flex items-center gap-8 px-4">
          {items.map((tweet, i) => (
            <span key={`${tweet.id}-${i}`} className="inline-flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold" style={{ color: '#D4A853' }}>
                @{tweet.authorUsername}
              </span>
              <span className="text-[10px] font-mono text-white/60">
                {tweet.text.slice(0, 120)}{tweet.text.length > 120 ? '...' : ''}
              </span>
              <span className="text-[8px] font-mono text-white/20">
                {timeAgo(tweet.createdAt)}
              </span>
              <span className="text-white/10 mx-2">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
