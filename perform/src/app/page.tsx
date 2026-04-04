'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TIEBadge } from '@/components/tie/TIEBadge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  1. HERO                                                           */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">
      {/* Subtle radial glow behind logo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(212,168,83,0.10) 0%, transparent 100%)',
        }}
      />

      {/* Per|Form Lion Logo */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8">
        <Image
          src="/brand/perform-logo-dark.png"
          alt="Per|Form — Gold roaring lion"
          fill
          className="object-contain drop-shadow-2xl"
          priority
        />
      </div>

      {/* Tagline */}
      <h1
        className="font-outfit text-4xl md:text-5xl font-extrabold tracking-[0.18em] uppercase"
        style={{ color: '#D4A853' }}
      >
        AT YOUR BEST
      </h1>

      {/* CTAs */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/draft"
          className="px-8 py-3.5 rounded-md text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110"
          style={{ background: '#D4A853', color: '#0A0A0F' }}
        >
          EXPLORE THE DRAFT BOARD
        </Link>
        <a
          href="https://buymeacoffee.com/foai"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3.5 rounded-md text-sm font-mono tracking-wider border transition-colors hover:bg-white/5"
          style={{ borderColor: '#D4A853', color: '#D4A853' }}
        >
          BUY ME A COFFEE
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  2. LIVE TICKER PLACEHOLDER                                        */
/* ------------------------------------------------------------------ */
function LiveTicker() {
  return (
    <div
      className="w-full px-6 py-3 font-mono text-xs tracking-wide overflow-hidden"
      style={{
        background: '#0D0D12',
        borderLeft: '4px solid #D4A853',
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      <span style={{ color: '#D4A853', fontWeight: 700 }}>BREAKING NEWS</span>
      <span className="mx-3 opacity-30">|</span>
      <span>Live feed loading...</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3. THE DRAFT                                                      */
/* ------------------------------------------------------------------ */
function TheDraft() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
          <Image
            src="/brand/helmet-evolution.webp"
            alt="Helmet evolution — past meets future"
            fill
            className="object-cover"
          />
        </div>

        {/* Text */}
        <div>
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            NFL DRAFT 2026
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-2"
            style={{ color: '#D4A853' }}
          >
            2026 NFL DRAFT
          </h2>
          <h3
            className="font-outfit text-xl font-bold tracking-wider mb-6"
            style={{ color: '#C0C0C0' }}
          >
            PITTSBURGH
          </h3>
          <p className="text-sm text-white/50 font-mono leading-relaxed mb-8">
            50+ prospects graded and ranked by TIE. Every player scored on
            Performance, Attributes, and Intangibles. Full 7-round projections.
            Bull and Bear cases for every first-rounder. Daily updates through
            draft night.
          </p>
          <Link
            href="/draft"
            className="inline-block px-8 py-3 rounded-md text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110"
            style={{ background: '#D4A853', color: '#0A0A0F' }}
          >
            VIEW DRAFT BOARD
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  4. PLAYER CARDS & NFTs                                            */
/* ------------------------------------------------------------------ */
const GALLERY_ITEMS = [
  { src: '/cards/risher-card-1.png', alt: 'Zion Risher — Comets #7' },
  { src: '/cards/risher-card-2.png', alt: 'Zion Risher — Hillside' },
  { src: '/cards/syracuse-card.webp', alt: 'Syracuse DL Card' },
  { src: '/nft/draftpro.jpg', alt: 'DraftPro.crypto NFT' },
  { src: '/nft/draftme.jpg', alt: 'DraftMe.NFT' },
  { src: '/nft/curryville.jpg', alt: 'Curryville.NFT' },
  { src: '/nft/buzzunil.jpg', alt: 'BuzzUNIL.blockchain' },
];

function PlayerCardsGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -320 : 320;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="py-24 overflow-hidden">
      <div className="px-6 max-w-6xl mx-auto mb-10 flex items-end justify-between">
        <div>
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            COLLECTIBLES
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider"
            style={{ color: '#D4A853' }}
          >
            PLAYER CARDS &amp; DIGITAL COLLECTIBLES
          </h2>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(212,168,83,0.3)' }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} color="#D4A853" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(212,168,83,0.3)' }}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} color="#D4A853" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {GALLERY_ITEMS.map((item) => (
          <div
            key={item.src}
            className="relative flex-none w-64 h-80 md:w-72 md:h-96 rounded-xl overflow-hidden snap-start border"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  5. FLAG FOOTBALL                                                  */
/* ------------------------------------------------------------------ */
function FlagFootball() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div className="order-2 md:order-1">
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            2028 OLYMPICS
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-6"
            style={{ color: '#D4A853' }}
          >
            FLAG FOOTBALL GOES GLOBAL
          </h2>
          <p className="text-sm text-white/50 font-mono leading-relaxed mb-8">
            Flag football makes its Olympic debut at the 2028 Los Angeles Games
            — the first time the sport will be featured on the world&apos;s biggest
            stage. Per|Form is tracking every athlete, every combine, every
            roster decision. From NFL flag leagues to international competition,
            we grade and rank the players building this historic moment.
          </p>
          <Link
            href="/flag-football"
            className="inline-block px-8 py-3 rounded-md text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110"
            style={{ background: '#D4A853', color: '#0A0A0F' }}
          >
            FLAG FOOTBALL HUB
          </Link>
        </div>

        {/* Image */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden order-1 md:order-2">
          <Image
            src="/flag-football/hero.png"
            alt="Flag football — Olympic bound"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  6. ABOUT TIE                                                      */
/* ------------------------------------------------------------------ */
function AboutTIE() {
  return (
    <section className="px-6 py-24 max-w-4xl mx-auto text-center">
      <p
        className="text-xs font-mono tracking-[0.3em] mb-3"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        GRADING SYSTEM
      </p>
      <h2
        className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-4"
        style={{ color: '#D4A853' }}
      >
        POWERED BY TIE
      </h2>
      <h3
        className="font-outfit text-lg font-bold tracking-wider mb-8"
        style={{ color: '#C0C0C0' }}
      >
        TALENT &amp; INNOVATION ENGINE
      </h3>
      <p className="text-sm text-white/50 font-mono leading-relaxed max-w-2xl mx-auto mb-14">
        Every player graded on three pillars: Performance (40%), Attributes
        (30%), Intangibles (30%). TIE scores drive our draft board, player
        cards, and analyst coverage. The formula is proprietary. The results
        speak for themselves.
      </p>

      {/* Sample badges */}
      <div className="flex items-center justify-center gap-10 md:gap-16">
        {[
          { score: 95, grade: 'A+', color: '#22C55E' },
          { score: 78, grade: 'B+', color: '#D4A853' },
          { score: 61, grade: 'C', color: '#F97316' },
        ].map((b) => (
          <div key={b.grade} className="flex flex-col items-center gap-3">
            <TIEBadge
              score={b.score}
              grade={b.grade}
              badgeColor={b.color}
              size="lg"
            />
            <span className="text-xs font-mono text-white/40">{b.grade}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  7. NIL & THE TRANSFER PORTAL                                      */
/* ------------------------------------------------------------------ */
function NILSection() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Book cover */}
        <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
          <Image
            src="/brand/nil-book.jpg"
            alt="Mastering the N.I.L. — by ACHIEVEMOR"
            fill
            className="object-cover"
          />
        </div>

        {/* Text */}
        <div>
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            NIL &amp; TRANSFER PORTAL
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-2"
            style={{ color: '#D4A853' }}
          >
            MASTERING THE N.I.L.
          </h2>
          <h3
            className="font-outfit text-base font-bold tracking-wider mb-6"
            style={{ color: '#C0C0C0' }}
          >
            An Essential Guide for Student-Athletes and Parents — by ACHIEVEMOR
          </h3>
          <p className="text-sm text-white/50 font-mono leading-relaxed mb-8">
            The NIL landscape changes daily. New deals, new collectives, new
            rules. Per|Form tracks the business side of college athletics —
            transfer portal movement, NIL valuations, and the decisions that
            shape careers before the draft even starts.
          </p>
          <Link
            href="/nil"
            className="inline-block px-8 py-3 rounded-md text-sm font-mono tracking-wider border transition-colors hover:bg-white/5"
            style={{ borderColor: '#D4A853', color: '#D4A853' }}
          >
            LEARN MORE
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  8. READ & REACT                                                   */
/* ------------------------------------------------------------------ */
function ReadAndReact() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div className="order-2 md:order-1">
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ANALYST COVERAGE
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-6"
            style={{ color: '#D4A853' }}
          >
            READ &amp; REACT
          </h2>
          <p className="text-sm text-white/50 font-mono leading-relaxed mb-4">
            Daily analysis. Weekly deep dives. Autonomous coverage from our AI
            analyst team.
          </p>
          <p className="text-sm text-white/40 font-mono leading-relaxed">
            Four distinct voices. Bull vs Bear debates. Film breakdowns. Hot
            takes. All powered by TIE data, all delivered on a schedule that
            never sleeps.
          </p>
        </div>

        {/* Image */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden order-1 md:order-2">
          <Image
            src="/brand/read-react.webp"
            alt="Read & React — 3D text with LSU player"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  9. THE PER|FORM PLATFORM                                          */
/* ------------------------------------------------------------------ */
function PlatformSection() {
  return (
    <section className="px-6 py-24 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Image */}
        <div className="relative w-full aspect-square max-w-md mx-auto rounded-xl overflow-hidden">
          <Image
            src="/brand/perform-contract-3d.webp"
            alt="Per|Form contracts — 3D stamp art"
            fill
            className="object-contain"
          />
        </div>

        {/* Text */}
        <div>
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            BEYOND THE FIELD
          </p>
          <h2
            className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wider mb-6"
            style={{ color: '#D4A853' }}
          >
            THE PER|FORM PLATFORM
          </h2>
          <p className="text-sm text-white/50 font-mono leading-relaxed">
            Per|Form isn&apos;t just about sports performance — it&apos;s about
            the contracts, agreements, and decisions that shape careers. NIL
            deals. Transfer commitments. Draft declarations. We track the
            paperwork too.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                              */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />
      <main className="flex-1">
        <Hero />
        <LiveTicker />
        <TheDraft />
        <PlayerCardsGallery />
        <FlagFootball />
        <AboutTIE />
        <NILSection />
        <ReadAndReact />
        <PlatformSection />
      </main>
      <Footer />
    </div>
  );
}
