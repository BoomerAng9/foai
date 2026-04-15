'use client';

import { useState, useEffect, useRef } from 'react';
import type { Sport } from '@/lib/franchise/types';
import { DEFAULT_FEED_SPORTS, SPORT_FEED_CONFIG } from '@/lib/sports/news-feed';

interface NewsItem {
  id: number;
  summary?: string | null;
  headline: string;
  source_name: string;
  source_url: string;
  sport: Sport;
  teams_mentioned: string[];
  category?: string | null;
  published_at?: string | null;
  scraped_at?: string | null;
}

interface NewsSegment {
  sport: Sport;
  label: string;
  badgeColor: string;
  segmentMs: number;
  updatedAt?: string | null;
  items: NewsItem[];
}

function timeAgo(value?: string | null): string {
  if (!value) return 'pending';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function BreakingBar() {
  const [segments, setSegments] = useState<NewsSegment[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const params = new URLSearchParams({
          sports: DEFAULT_FEED_SPORTS.join(','),
          perSport: '8',
          limit: '24',
        });
        const res = await fetch(`/api/sports/news?${params.toString()}`);
        if (res.ok) {
          const d = await res.json();
          const nextSegments = (d.segments || []).filter((segment: NewsSegment) => segment.items?.length > 0);
          setSegments(nextSegments);
        }
      } catch { /* silent */ }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 90000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeIndex < segments.length) return;
    setActiveIndex(0);
  }, [activeIndex, segments.length]);

  useEffect(() => {
    if (segments.length <= 1) return;
    const current = segments[activeIndex] || segments[0];
    const timeout = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % segments.length);
    }, current?.segmentMs || 18000);
    return () => clearTimeout(timeout);
  }, [activeIndex, segments]);

  const currentSegment = segments[activeIndex] || segments[0];
  const news = currentSegment?.items || [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || news.length === 0) return;
    const totalW = el.scrollWidth / 2;
    el.style.setProperty('--ticker-width', `${totalW}px`);
  }, [news]);

  if (!currentSegment || news.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.97) 10%)',
        borderTop: '1px solid rgba(212,168,83,0.25)',
      }}
    >
      <div className="flex items-center h-9">
        <div className="flex-shrink-0 px-3 h-full flex items-center gap-2" style={{ background: 'var(--pf-bg)' }}>
          <div className="flex items-center gap-1.5 px-2 h-6 rounded-sm" style={{ background: '#D4A853' }}>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.2em] text-black uppercase">LIVE</span>
          </div>
          <span
            className="text-[8px] font-black tracking-[0.18em] px-2 py-1 rounded-sm text-white"
            style={{ background: currentSegment.badgeColor }}
          >
            {currentSegment.label}
          </span>
          <span className="text-[8px] text-white/35 uppercase tracking-[0.16em]">
            {timeAgo(currentSegment.updatedAt)}
          </span>
          {segments.length > 1 && (
            <div className="flex items-center gap-1">
              {segments.map((segment, idx) => (
                <span
                  key={segment.sport}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: idx === activeIndex ? segment.badgeColor : 'rgba(255,255,255,0.18)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

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
                    style={{ background: SPORT_FEED_CONFIG[item.sport]?.badgeColor || '#333', color: '#fff' }}
                  >
                    {SPORT_FEED_CONFIG[item.sport]?.label || item.sport?.toUpperCase()}
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
