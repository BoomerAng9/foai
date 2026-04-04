'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LiveFeed } from '@/components/feed/LiveFeed';

interface TopProspect {
  id: number;
  name: string;
  position: string;
  school: string;
  overall_rank: number;
  tie_grade: string;
  tie_tier: string;
  grade: string;
  nfl_comparison: string;
  projected_round: number;
  strengths: string;
}

function getPositionGradient(pos: string): string {
  const p = pos?.toUpperCase() || '';
  if (p === 'QB') return 'linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 50%, #0f0f2a 100%)';
  if (p === 'RB') return 'linear-gradient(135deg, #2a1a1a 0%, #3e1b1b 50%, #1a0f0f 100%)';
  if (p === 'WR' || p === 'TE') return 'linear-gradient(135deg, #1a2a1a 0%, #1b3e2d 50%, #0f1a0f 100%)';
  if (p.includes('OL') || p === 'OT' || p === 'OG' || p === 'C') return 'linear-gradient(135deg, #2a2a1a 0%, #3e3e1b 50%, #1a1a0f 100%)';
  if (p.includes('DL') || p === 'DT' || p === 'DE' || p === 'EDGE') return 'linear-gradient(135deg, #1a1a2a 0%, #1b2d3e 50%, #0f0f1a 100%)';
  if (p === 'LB' || p === 'ILB' || p === 'OLB') return 'linear-gradient(135deg, #2a1a2a 0%, #3e1b3e 50%, #1a0f1a 100%)';
  if (p === 'CB' || p === 'S' || p === 'FS' || p === 'SS') return 'linear-gradient(135deg, #1a2a2a 0%, #1b3e3e 50%, #0f1a1a 100%)';
  return 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #0f0f0f 100%)';
}

function NFTCard({ player, rank }: { player: TopProspect; rank: number }) {
  const [imgError, setImgError] = useState(false);
  // Use a real headshot from ESPN/NFL image CDN
  const imgSrc = `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(player.name)}&type=player&limit=1`;

  return (
    <Link href={`/draft/${encodeURIComponent(player.name)}`} className="block shrink-0 w-[220px] group">
      <div className="relative h-[320px] rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl" style={{
        background: getPositionGradient(player.position),
        border: '1px solid rgba(212,168,83,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: '#D4A853', color: '#0A0A0F' }}>
          <span className="font-outfit text-xs font-extrabold">#{rank}</span>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(212,168,83,0.3)' }}>
          <span className="font-mono text-[10px] font-bold" style={{ color: '#D4A853' }}>{player.tie_grade || player.grade}</span>
        </div>
        {/* Player initial + school color block */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="font-outfit text-6xl font-extrabold text-white/10">
              {player.name.split(' ').map(n => n[0]).join('')}
            </span>
            <span className="text-[9px] font-mono text-white/15 tracking-widest">{player.school.toUpperCase()}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.95))' }}>
          <p className="font-outfit text-base font-extrabold text-white tracking-wide leading-tight">{player.name}</p>
          <p className="text-[11px] font-mono mt-1" style={{ color: '#D4A853' }}>{player.position} · {player.school}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-mono text-white/30">RD {player.projected_round || '?'}</span>
            <span className="text-[9px] font-mono text-white/30">{player.nfl_comparison || ''}</span>
          </div>
        </div>
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        }} />
      </div>
    </Link>
  );
}

function ProspectCarousel({ prospects }: { prospects: TopProspect[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || prospects.length === 0) return;
    let pos = 0;
    let animFrame: number;
    function animate() {
      if (!pausedRef.current) {
        pos += 0.5;
        if (el && pos >= el.scrollWidth / 2) pos = 0;
        if (el) el.scrollLeft = pos;
      }
      animFrame = requestAnimationFrame(animate);
    }
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [prospects]);

  function scrollLeft() {
    if (scrollRef.current) {
      pausedRef.current = true;
      scrollRef.current.scrollBy({ left: -480, behavior: 'smooth' });
      setTimeout(() => { pausedRef.current = false; }, 3000);
    }
  }

  function scrollRight() {
    if (scrollRef.current) {
      pausedRef.current = true;
      scrollRef.current.scrollBy({ left: 480, behavior: 'smooth' });
      setTimeout(() => { pausedRef.current = false; }, 3000);
    }
  }

  if (prospects.length === 0) return null;
  const items = [...prospects, ...prospects];

  return (
    <div className="relative">
      {/* Left arrow */}
      <button onClick={scrollLeft} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212,168,83,0.9)', color: '#0A0A0F', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <span className="text-lg font-bold">&lt;</span>
      </button>
      {/* Right arrow */}
      <button onClick={scrollRight} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212,168,83,0.9)', color: '#0A0A0F', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <span className="text-lg font-bold">&gt;</span>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto py-4 px-14 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {items.map((p, i) => (
          <NFTCard key={`${p.id}-${i}`} player={p} rank={(i % prospects.length) + 1} />
        ))}
      </div>
    </div>
  );
}

const HERO_IMAGES = [
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/m15dznixeu390zi4rhrd.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/xrh3o9opmntbktwhqsou.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/adl39bzeibiweztsqojd.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/aa4bkgzpnl9q9n58sqpj.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/xhx1ruvaqcokdy13l3gg.jpg',
];

export default function HomePage() {
  const [prospects, setProspects] = useState<TopProspect[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(d => setProspects((d.players || []).slice(0, 40)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* ── HERO — ON THE CLOCK ── */}
      <section className="relative px-6 pt-16 pb-12 text-center overflow-hidden">
        {/* Cycling background images */}
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: i === heroIdx ? 1 : 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 0,
            }}
          />
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0" style={{ background: 'rgba(10,10,15,0.75)', zIndex: 1 }} />
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 20%, rgba(212,168,83,0.08) 0%, transparent 100%)',
          zIndex: 2,
        }} />
        {/* Hero content — above background layers */}
        <div className="relative" style={{ zIndex: 3 }}>
          <p className="text-xs font-mono tracking-[0.4em] mb-6" style={{ color: 'rgba(212,168,83,0.5)' }}>
            2026 NFL DRAFT · PITTSBURGH · APRIL 23-25
          </p>
          <p className="text-sm font-mono tracking-[0.3em] uppercase mb-3" style={{ color: '#C0C0C0' }}>
            WITH THE FIRST PICK IN THE 2026 NFL DRAFT
          </p>
          <h1 className="font-outfit text-4xl md:text-6xl font-extrabold tracking-tight mb-2" style={{ color: '#D4A853' }}>
            THE RAIDERS ARE ON THE CLOCK
          </h1>
          <div className="flex justify-center mt-8 mb-6">
            <div className="inline-flex items-center gap-1 px-4 py-2 rounded-full" style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              <span className="text-[10px] font-mono tracking-wider" style={{ color: '#D4A853' }}>19 DAYS UNTIL DRAFT NIGHT</span>
            </div>
          </div>

          {/* First Round Order */}
          <div className="max-w-3xl mx-auto mt-6 mb-8">
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'LV', 'NYJ', 'ARI', 'TEN', 'NYG', 'CLE', 'CAR', 'NE',
                'NO', 'CHI', 'SF', 'DAL', 'MIA', 'CIN', 'IND', 'JAX',
                'SEA', 'ATL', 'LAC', 'HOU', 'PIT', 'DEN', 'GB', 'MIN',
                'TB', 'LAR', 'BAL', 'DET', 'BUF', 'WAS', 'PHI', 'KC',
              ].map((team, i) => (
                <span key={team} className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition-colors hover:bg-white/5 cursor-default" style={{
                  color: i === 0 ? '#D4A853' : 'rgba(255,255,255,0.25)',
                  fontWeight: i === 0 ? 800 : 400,
                  border: i === 0 ? '1px solid rgba(212,168,83,0.4)' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span className="text-white/15">{i + 1}.</span> {team}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/draft" className="px-8 py-3.5 text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110" style={{ background: '#D4A853', color: '#0A0A0F' }}>
              DRAFT BOARD
            </Link>
            <Link href="/studio" className="px-8 py-3.5 text-sm font-mono tracking-wider border transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(212,168,83,0.4)', color: '#D4A853' }}>
              THE WAR ROOM
            </Link>
          </div>
        </div>
      </section>

      {/* ── TOP 40 NFT CARD CAROUSEL ── */}
      <section className="py-8">
        <div className="flex items-center justify-between px-6 mb-4">
          <h2 className="font-outfit text-xl font-extrabold text-white tracking-wide">TOP 40 PROSPECTS</h2>
          <Link href="/draft" className="text-xs font-mono tracking-wider" style={{ color: '#D4A853' }}>FULL BOARD →</Link>
        </div>
        <ProspectCarousel prospects={prospects} />
      </section>

      {/* ── LIVE ANALYST FEED ── */}
      <section className="px-6 py-12">
        <LiveFeed />
      </section>

      {/* ── BOTTOM NAV ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-outfit text-xl md:text-2xl font-extrabold text-white tracking-wide mb-2">Will you be here for all 257 picks across 7 rounds?</h2>
          <p className="text-sm font-mono text-white/40 mb-6">We will. And we&apos;ll be covering every single one.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/draft/mock" className="px-6 py-3 text-xs font-mono font-bold tracking-wider transition-all hover:brightness-110" style={{ background: '#D4A853', color: '#0A0A0F' }}>MOCK DRAFT</Link>
            <Link href="/analysts" className="px-6 py-3 text-xs font-mono font-bold tracking-wider border transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(212,168,83,0.4)', color: '#D4A853' }}>ANALYSTS</Link>
            <Link href="/flag-football" className="px-6 py-3 text-xs font-mono font-bold tracking-wider border transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(212,168,83,0.4)', color: '#D4A853' }}>FLAG FOOTBALL</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
