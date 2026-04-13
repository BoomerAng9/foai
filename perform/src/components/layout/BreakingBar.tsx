'use client';

import { useState, useEffect, useRef } from 'react';

interface NewsItem {
  id: number;
  headline: string;
  source_name: string;
  source_url: string;
  sport: string;
  teams_mentioned: string[];
  category: string;
}

const SPORT_BADGE: Record<string, { bg: string; label: string }> = {
  nfl: { bg: '#013369', label: 'NFL' },
  nba: { bg: '#1D428A', label: 'NBA' },
  mlb: { bg: '#002D72', label: 'MLB' },
};

export function BreakingBar() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAll() {
      const items: NewsItem[] = [];
      try {
        const res = await fetch('/api/nfl/news?limit=20');
        if (res.ok) {
          const d = await res.json();
          items.push(...(d.news || []).map((n: Record<string, unknown>) => ({ ...n, sport: 'nfl' })));
        }
      } catch { /* silent */ }
      // Sort newest first
      items.sort((a, b) => (b.id || 0) - (a.id || 0));
      setNews(items);
    }
    fetchAll();
    const interval = setInterval(fetchAll, 90000);
    return () => clearInterval(interval);
  }, []);

  // Scroll animation via CSS
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || news.length === 0) return;
    const totalW = el.scrollWidth / 2;
    el.style.setProperty('--ticker-width', `${totalW}px`);
  }, [news]);

  if (news.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.97) 10%)',
        borderTop: '1px solid rgba(212,168,83,0.25)',
      }}
    >
      <div className="flex items-center h-9">
        {/* LIVE badge */}
        <div className="flex-shrink-0 px-3 h-full flex items-center gap-1.5" style={{ background: '#D4A853' }}>
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[9px] font-black tracking-[0.2em] text-black uppercase">LIVE</span>
        </div>

        {/* Scrolling headlines */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex items-center gap-8 whitespace-nowrap animate-ticker"
            style={{
              animation: `ticker ${Math.max(40, news.length * 4)}s linear infinite`,
            }}
          >
            {[...news, ...news].map((item, idx) => (
              <a
                key={`${item.id}-${idx}`}
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span
                  className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: SPORT_BADGE[item.sport]?.bg || '#333', color: '#fff' }}
                >
                  {SPORT_BADGE[item.sport]?.label || item.sport?.toUpperCase()}
                </span>
                {item.teams_mentioned?.length > 0 && (
                  <span className="text-amber-400 font-bold text-[10px] flex-shrink-0">
                    {item.teams_mentioned.slice(0, 2).join(' ')}
                  </span>
                )}
                <span className="text-white/60 text-[10px]">
                  {item.headline.length > 90 ? item.headline.slice(0, 87) + '...' : item.headline}
                </span>
                <span className="text-white/20 text-[8px] flex-shrink-0">{item.source_name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
