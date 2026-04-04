'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LiveFeed } from '@/components/feed/LiveFeed';
import {
  scrollReveal,
  scrollRevealScale,
  scrollRevealBlur,
  staggerContainer,
  staggerItem,
  heroStagger,
  heroItem,
  cardLift,
  fadeIn,
  fadeUp,
} from '@/lib/motion';

/* ─────────────────────────────────────────
   Types
   ───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Helpers
   ───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Scroll Progress Bar
   ───────────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left"
      style={{ scaleX, background: 'var(--pf-gold)', zIndex: 9999 }}
    />
  );
}

/* ─────────────────────────────────────────
   Typewriter headline
   ───────────────────────────────────────── */
function TypewriterHeadline({ text, delay = 600 }: { text: string; delay?: number }) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedCount(i);
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1500);
        }
      }, 45);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, delay]);

  return (
    <h1
      className="font-outfit text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight"
      style={{ color: 'var(--pf-gold)' }}
    >
      {text.slice(0, displayedCount)}
      {showCursor && (
        <span
          className="inline-block w-[3px] h-[0.85em] ml-1 align-middle"
          style={{ background: 'var(--pf-gold)', animation: 'typeCursor 0.7s step-end infinite' }}
        />
      )}
    </h1>
  );
}

/* ─────────────────────────────────────────
   3D Tilt NFT Card
   ───────────────────────────────────────── */
function NFTCard({ player, rank }: { player: TopProspect; rank: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [headshotUrl, setHeadshotUrl] = useState<string>('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  // Fetch headshot from ESPN via our API
  useEffect(() => {
    if (!player.name) return;
    const params = new URLSearchParams({ name: player.name, school: player.school || '' });
    fetch(`/api/players/headshot?${params}`)
      .then(r => r.json())
      .then(d => { if (d.url) setHeadshotUrl(d.url); })
      .catch(() => {});
  }, [player.name, player.school]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  }, [mouseX, mouseY]);

  const initials = player.name.split(' ').map(n => n[0]).join('');

  return (
    <Link href={`/draft/${encodeURIComponent(player.name)}`} className="block shrink-0 w-[220px] group">
      <motion.div
        ref={cardRef}
        className="relative h-[320px] rounded-xl overflow-hidden"
        style={{
          background: getPositionGradient(player.position),
          border: isHovered ? '1px solid rgba(212,168,83,0.6)' : '1px solid var(--pf-gold-border)',
          boxShadow: isHovered
            ? '0 8px 40px rgba(212,168,83,0.2), 0 0 60px rgba(212,168,83,0.08)'
            : '0 8px 32px var(--pf-card-shadow)',
          rotateX,
          rotateY,
          transformPerspective: 800,
          transition: 'border 0.3s, box-shadow 0.3s',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.03 }}
      >
        <div className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'var(--pf-gold)', color: 'var(--pf-bg)', zIndex: 4 }}>
          <span className="font-outfit text-xs font-extrabold">#{rank}</span>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--pf-gold-border-strong)', zIndex: 4 }}>
          <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--pf-gold)' }}>{player.tie_grade || player.grade}</span>
        </div>

        {/* Player headshot image or initials fallback */}
        <div className="absolute inset-0 flex items-center justify-center">
          {headshotUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={headshotUrl}
                alt={player.name}
                className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500"
                style={{ opacity: imgLoaded ? 0.7 : 0, filter: 'contrast(1.1) brightness(0.9)' }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setHeadshotUrl('')}
              />
              {/* Show initials as loading state until image loads */}
              {!imgLoaded && (
                <div className="flex flex-col items-center gap-2">
                  <span className="font-outfit text-6xl font-extrabold text-white/10">{initials}</span>
                  <span className="text-[9px] font-mono text-white/15 tracking-widest">{player.school.toUpperCase()}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="font-outfit text-6xl font-extrabold text-white/10">{initials}</span>
              <span className="text-[9px] font-mono text-white/15 tracking-widest">{player.school.toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.95))', zIndex: 3 }}>
          <p className="font-outfit text-base font-extrabold text-white tracking-wide leading-tight">{player.name}</p>
          <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--pf-gold)' }}>{player.position} · {player.school}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-mono text-white/30">RD {player.projected_round || '?'}</span>
            <span className="text-[9px] font-mono text-white/30">{player.nfl_comparison || ''}</span>
          </div>
        </div>
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
          zIndex: 2,
        }} />
      </motion.div>
    </Link>
  );
}

/* ─────────────────────────────────────────
   Prospect Carousel
   ───────────────────────────────────────── */
function ProspectCarousel({ prospects }: { prospects: TopProspect[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

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
    <div ref={sectionRef} className="relative">
      <button onClick={scrollLeft} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212,168,83,0.9)', color: 'var(--pf-bg)', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <span className="text-lg font-bold">&lt;</span>
      </button>
      <button onClick={scrollRight} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212,168,83,0.9)', color: 'var(--pf-bg)', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
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

/* ─────────────────────────────────────────
   Constants
   ───────────────────────────────────────── */
const HERO_IMAGES = [
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/m15dznixeu390zi4rhrd.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/xrh3o9opmntbktwhqsou.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/adl39bzeibiweztsqojd.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/aa4bkgzpnl9q9n58sqpj.jpg',
  'https://static.www.nfl.com/image/private/t_new_photo_album/t_lazy/f_auto/league/xhx1ruvaqcokdy13l3gg.jpg',
];

const FIRST_ROUND_TEAMS = [
  'LV', 'NYJ', 'ARI', 'TEN', 'NYG', 'CLE', 'CAR', 'NE',
  'NO', 'CHI', 'SF', 'DAL', 'MIA', 'CIN', 'IND', 'JAX',
  'SEA', 'ATL', 'LAC', 'HOU', 'PIT', 'DEN', 'GB', 'MIN',
  'TB', 'LAR', 'BAL', 'DET', 'BUF', 'WAS', 'PHI', 'KC',
];

/* ─────────────────────────────────────────
   Main Page
   ───────────────────────────────────────── */
export default function HomePage() {
  const [prospects, setProspects] = useState<TopProspect[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [draftVideos, setDraftVideos] = useState<{ videoId: string; title: string; thumbnailUrl: string; url: string; channelTitle: string }[]>([]);

  // Scroll-based parallax for hero
  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroTextY = useTransform(scrollY, [0, 600], [0, -30]);

  // Section refs for scroll reveal
  const carouselRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const draftVidRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const carouselInView = useInView(carouselRef, { once: true, margin: '-80px' });
  const feedInView = useInView(feedRef, { once: true, margin: '-80px' });
  const draftVidInView = useInView(draftVidRef, { once: true, margin: '-80px' });
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' });

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(d => setProspects((d.players || []).slice(0, 40)))
      .catch(() => {});

    fetch('/api/youtube?type=draft&limit=6')
      .then(r => r.json())
      .then(d => setDraftVideos((d.videos || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
        <ScrollProgress />
        <Header />

        {/* ── HERO ── */}
        <section className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center overflow-hidden min-h-[90vh] flex flex-col justify-center">
          {/* Ambient gradient background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(270deg, rgba(212,168,83,0.06), rgba(30,10,60,0.12), rgba(212,168,83,0.04), rgba(10,20,40,0.1))',
              backgroundSize: '400% 400%',
              animation: 'ambientShift 8s ease infinite',
              zIndex: 0,
            }}
          />

          {/* Cycling background images with parallax */}
          <motion.div className="absolute inset-0" style={{ y: heroImgY, zIndex: 0 }}>
            <AnimatePresence mode="sync">
              {HERO_IMAGES.map((src, i) => (
                <motion.div
                  key={src}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i === heroIdx ? 1 : 0 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    willChange: 'opacity',
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Dark overlay */}
          <div className="absolute inset-0" style={{ background: 'var(--pf-overlay)', zIndex: 1 }} />

          {/* Radial gold accent */}
          <div className="pointer-events-none absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 20%, var(--pf-gold-glow) 0%, transparent 100%)',
            zIndex: 2,
          }} />

          {/* Hero content with parallax offset */}
          <motion.div
            className="relative"
            style={{ y: heroTextY, zIndex: 3 }}
            initial="hidden"
            animate="visible"
            variants={heroStagger}
          >
            <motion.p
              className="text-xs font-mono tracking-[0.4em] mb-8"
              style={{ color: 'var(--pf-gold-dim)' }}
              variants={heroItem}
            >
              2026 NFL DRAFT &middot; PITTSBURGH &middot; APRIL 23-25
            </motion.p>

            <motion.p
              className="text-sm font-mono tracking-[0.3em] uppercase mb-4"
              style={{ color: '#C0C0C0' }}
              variants={heroItem}
            >
              WITH THE FIRST PICK IN THE 2026 NFL DRAFT
            </motion.p>

            <motion.div variants={heroItem}>
              <TypewriterHeadline text="THE RAIDERS ARE ON THE CLOCK" delay={800} />
            </motion.div>

            <motion.div className="flex justify-center mt-10 mb-8" variants={heroItem}>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ background: 'var(--pf-gold-glow)', border: '1px solid var(--pf-gold-border)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                <span className="text-[10px] font-mono tracking-wider" style={{ color: 'var(--pf-gold)' }}>19 DAYS UNTIL DRAFT NIGHT</span>
              </div>
            </motion.div>

            {/* First Round Order — stagger in */}
            <motion.div
              className="max-w-3xl mx-auto mt-8 mb-10"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <div className="flex flex-wrap justify-center gap-2">
                {FIRST_ROUND_TEAMS.map((team, i) => (
                  <motion.span
                    key={team}
                    variants={staggerItem}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition-colors hover:bg-white/5 cursor-default rounded-sm"
                    style={{
                      color: i === 0 ? 'var(--pf-gold)' : 'rgba(255,255,255,0.25)',
                      fontWeight: i === 0 ? 800 : 400,
                      border: i === 0 ? '1px solid var(--pf-gold-border-strong)' : '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span className="text-white/15">{i + 1}.</span> {team}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            <motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" variants={heroItem}>
              <Link href="/draft" className="px-8 py-3.5 text-sm font-outfit font-bold tracking-wider rounded transition-all hover:brightness-110 hover:shadow-lg hover:shadow-yellow-900/20" style={{ background: 'var(--pf-gold)', color: 'var(--pf-bg)' }}>
                DRAFT BOARD
              </Link>
              <Link href="/studio" className="px-8 py-3.5 text-sm font-mono tracking-wider border rounded transition-colors hover:bg-white/5" style={{ borderColor: 'var(--pf-gold-border-strong)', color: 'var(--pf-gold)' }}>
                THE WAR ROOM
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── SPACER ── */}
        <div style={{ height: '120px' }} />

        {/* ── TOP 40 NFT CARD CAROUSEL ── */}
        <motion.section
          ref={carouselRef}
          className="py-8"
          initial="hidden"
          animate={carouselInView ? 'visible' : 'hidden'}
          variants={scrollReveal}
        >
          <div className="flex items-center justify-between px-6 mb-6">
            <motion.h2
              className="font-outfit text-xl md:text-2xl font-extrabold tracking-wide"
              style={{ color: 'var(--pf-text)' }}
              variants={fadeIn}
            >
              TOP 40 PROSPECTS
            </motion.h2>
            <motion.div variants={fadeIn}>
              <Link href="/draft" className="text-xs font-mono tracking-wider transition-colors hover:brightness-125" style={{ color: 'var(--pf-gold)' }}>FULL BOARD &rarr;</Link>
            </motion.div>
          </div>
          <ProspectCarousel prospects={prospects} />
        </motion.section>

        {/* ── SPACER ── */}
        <div style={{ height: '140px' }} />

        {/* ── LIVE ANALYST FEED ── */}
        <motion.section
          ref={feedRef}
          className="px-6 py-16 md:py-20"
          initial="hidden"
          animate={feedInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
        >
          <motion.div variants={scrollRevealBlur}>
            <LiveFeed />
          </motion.div>
        </motion.section>

        {/* ── DRAFT COVERAGE VIDEOS ── */}
        {draftVideos.length > 0 && (
          <>
            <div style={{ height: '120px' }} />
            <motion.section
              ref={draftVidRef}
              className="px-6 py-16 md:py-20"
              initial="hidden"
              animate={draftVidInView ? 'visible' : 'hidden'}
              variants={scrollReveal}
            >
              <div className="max-w-5xl mx-auto">
                <motion.h2
                  className="font-outfit text-xl md:text-2xl font-extrabold tracking-wide mb-8"
                  style={{ color: 'var(--pf-text)' }}
                  variants={fadeIn}
                >
                  DRAFT COVERAGE
                </motion.h2>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={staggerContainer}
                  initial="hidden"
                  animate={draftVidInView ? 'visible' : 'hidden'}
                >
                  {draftVideos.map((vid) => (
                    <motion.a
                      key={vid.videoId}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={staggerItem}
                      className="group rounded-xl overflow-hidden transition-all hover:ring-1"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--pf-gold-border)',
                      }}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                            <span className="text-white text-lg ml-0.5">&#9654;</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-mono text-white/70 leading-snug line-clamp-2 mb-1">
                          {vid.title}
                        </p>
                        <p className="text-[10px] font-mono text-white/30 tracking-wider">
                          {vid.channelTitle}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          </>
        )}

        {/* ── SPACER ── */}
        <div style={{ height: '120px' }} />

        {/* ── BOTTOM CTA ── */}
        <motion.section
          ref={ctaRef}
          className="px-6 py-20 md:py-28"
          style={{ borderTop: '1px solid var(--pf-divider)' }}
          initial="hidden"
          animate={ctaInView ? 'visible' : 'hidden'}
          variants={scrollRevealScale}
        >
          <motion.div className="max-w-3xl mx-auto text-center" variants={scrollRevealBlur}>
            <h2 className="font-outfit text-xl md:text-3xl font-extrabold tracking-wide mb-3" style={{ color: 'var(--pf-text)' }}>
              Will you be here for all 257 picks across 7 rounds?
            </h2>
            <p className="text-sm font-mono mb-8" style={{ color: 'var(--pf-text-muted)' }}>
              We will. And we&apos;ll be covering every single one.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/draft/mock" className="px-6 py-3 text-xs font-mono font-bold tracking-wider rounded transition-all hover:brightness-110 hover:shadow-lg hover:shadow-yellow-900/20" style={{ background: 'var(--pf-gold)', color: 'var(--pf-bg)' }}>MOCK DRAFT</Link>
              <Link href="/analysts" className="px-6 py-3 text-xs font-mono font-bold tracking-wider border rounded transition-colors hover:bg-white/5" style={{ borderColor: 'var(--pf-gold-border-strong)', color: 'var(--pf-gold)' }}>ANALYSTS</Link>
              <Link href="/flag-football" className="px-6 py-3 text-xs font-mono font-bold tracking-wider border rounded transition-colors hover:bg-white/5" style={{ borderColor: 'var(--pf-gold-border-strong)', color: 'var(--pf-gold)' }}>FLAG FOOTBALL</Link>
            </div>
          </motion.div>
        </motion.section>

        <Footer />
      </div>
    </>
  );
}
