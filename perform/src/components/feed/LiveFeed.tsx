'use client';

import { useEffect, useState, useRef } from 'react';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function LiveFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fetchNews() {
      fetch('/api/news')
        .then(r => r.json())
        .then(d => setItems((d.articles || []).slice(0, 10)))
        .catch(() => {});
    }

    fetchNews();
    const interval = setInterval(fetchNews, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let animFrame: number;
    let pos = 0;
    let paused = false;

    function animate() {
      if (!paused && el) {
        pos += 0.3;
        if (pos >= el.scrollHeight - el.clientHeight) pos = 0;
        el.scrollTop = pos;
      }
      animFrame = requestAnimationFrame(animate);
    }

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    animFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
        <h3 className="font-outfit text-sm font-extrabold tracking-wider text-white/60">LIVE FEED</h3>
      </div>
      <div
        ref={containerRef}
        className="flex flex-col gap-2 overflow-hidden"
        style={{ maxHeight: '420px' }}
      >
        {items.map((item, i) => (
          <a
            key={`${item.url}-${i}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded transition-colors hover:bg-white/[0.04]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderLeft: '3px solid #D4A853',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: '#D4A853' }}>
                {item.source?.toUpperCase() || 'NEWS'}
              </span>
              {item.publishedAt && (
                <span className="text-[10px] font-mono text-white/20">{timeAgo(item.publishedAt)}</span>
              )}
            </div>
            <p className="text-sm font-outfit text-white/70 leading-snug line-clamp-2">{item.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
