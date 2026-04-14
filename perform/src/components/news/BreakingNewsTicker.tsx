'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Sport } from '@/lib/franchise/types';
import { SPORT_FEED_CONFIG } from '@/lib/sports/news-feed';

interface NewsItem {
  id: number;
  sport: Sport;
  headline: string;
  source_name: string;
  source_url: string;
  category: string;
  teams_mentioned: string[];
}

interface Props {
  sports?: string[];     // ['nfl', 'nba', 'mlb'] — which leagues to show
  team?: string;         // filter to specific team
  limit?: number;
  refreshInterval?: number; // ms between refreshes
}

export function BreakingNewsTicker({ sports = ['nfl', 'nba', 'mlb'], team, limit = 30, refreshInterval = 60000 }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function fetchNews() {
      for (const sport of sports) {
        if (!SPORT_FEED_CONFIG[sport as Sport]) return;
      }

      try {
        const params = new URLSearchParams({
          sports: sports.join(','),
          perSport: String(Math.max(1, Math.ceil(limit / sports.length))),
          limit: String(limit),
        });
        if (team) params.set('team', team);
        const res = await fetch(`/api/sports/news?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setNews((data.news || []).slice(0, limit));
      } catch { /* silent */ }
    }

    fetchNews();
    const interval = setInterval(fetchNews, refreshInterval);
    return () => clearInterval(interval);
  }, [sports, team, limit, refreshInterval]);

  if (news.length === 0) return null;

  // Double the items for seamless loop
  const doubled = [...news, ...news];
  const totalWidth = doubled.length * 400; // approx px per item

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.97) 15%)',
        borderTop: '1px solid rgba(212,168,83,0.3)',
      }}
    >
      <div className="flex items-center h-9">
        {/* Badge */}
        <div
          className="flex-shrink-0 px-3 h-full flex items-center gap-1.5"
          style={{ background: '#D4A853' }}
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[9px] font-black tracking-[0.2em] text-black uppercase">
            BREAKING
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex items-center gap-6 whitespace-nowrap"
            animate={{ x: [0, -(totalWidth / 2)] }}
            transition={{ duration: Math.max(30, news.length * 3), repeat: Infinity, ease: 'linear' }}
          >
            {doubled.map((item, idx) => (
              <a
                key={`${item.id}-${idx}`}
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {/* Sport badge */}
                  <span
                    className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: SPORT_FEED_CONFIG[item.sport]?.badgeColor || '#333',
                      color: '#fff',
                    }}
                  >
                    {SPORT_FEED_CONFIG[item.sport]?.label || item.sport.toUpperCase()}
                  </span>

                {/* Teams */}
                {item.teams_mentioned?.length > 0 && (
                  <span className="text-amber-400 font-bold text-[11px]">
                    {item.teams_mentioned.join(' ')}
                  </span>
                )}

                {/* Headline */}
                <span className="text-white/70 text-[11px]">
                  {item.headline.length > 80 ? item.headline.slice(0, 77) + '...' : item.headline}
                </span>

                {/* Source */}
                <span className="text-white/20 text-[9px]">
                  {item.source_name}
                </span>

                {/* Separator */}
                <span className="text-white/10">|</span>
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
