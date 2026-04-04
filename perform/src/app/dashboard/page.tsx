'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  scrollReveal,
  staggerContainer,
  staggerItem,
  heroStagger,
  heroItem,
} from '@/lib/motion';

const SECTIONS = [
  {
    title: 'DRAFT BOARD',
    description: '50+ prospects graded and ranked by TIE',
    href: '/draft',
    accent: '#D4A853',
    span: 'col-span-1 md:col-span-2',
  },
  {
    title: 'MOCK DRAFT',
    description: 'Full 7-round projections with Bull and Bear cases',
    href: '/draft/mock',
    accent: '#60A5FA',
    span: 'col-span-1',
  },
  {
    title: 'WAR ROOM',
    description: 'Live analyst debates powered by TIE data',
    href: '/studio',
    accent: '#EF4444',
    span: 'col-span-1',
  },
  {
    title: 'FILM ROOM',
    description: 'Deep dive tape breakdowns and scheme analysis',
    href: '/film',
    accent: '#34D399',
    span: 'col-span-1',
  },
  {
    title: 'PLAYER INDEX',
    description: 'Complete prospect database with advanced metrics',
    href: '/draft',
    accent: '#A78BFA',
    span: 'col-span-1',
  },
  {
    title: 'FLAG FOOTBALL',
    description: '2028 Olympics tracking — athletes, combines, rosters',
    href: '/flag-football',
    accent: '#2DD4BF',
    span: 'col-span-1 md:col-span-2',
  },
  {
    title: 'ON THE CLOCK',
    description: 'Real-time draft tracker and pick predictions',
    href: '/draft',
    accent: '#F97316',
    span: 'col-span-1',
  },
  {
    title: 'ANALYSTS',
    description: 'Four autonomous voices delivering daily coverage',
    href: '/analysts',
    accent: '#F97316',
    span: 'col-span-1',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-20 max-w-7xl mx-auto w-full">
        {/* Hero Header */}
        <motion.div
          className="mb-20"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={heroItem}
            className="text-xs font-mono tracking-[0.3em] mb-4"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            COMMAND CENTER
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-outfit text-5xl md:text-7xl font-black tracking-tight"
            style={{ color: '#D4A853' }}
          >
            DASHBOARD
          </motion.h1>
          <motion.div
            variants={heroItem}
            className="mt-4 w-24 h-[2px]"
            style={{ background: 'linear-gradient(90deg, #D4A853, transparent)' }}
          />
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {SECTIONS.map((section) => (
            <motion.div
              key={section.title}
              variants={staggerItem}
              className={section.span}
            >
              <Link href={section.href} className="block h-full">
                <motion.div
                  className="relative h-full rounded-2xl p-7 flex flex-col gap-4 overflow-hidden cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -4,
                    transition: { duration: 0.25, ease: 'easeOut' },
                  }}
                  onHoverStart={(e) => {
                    const el = (e as unknown as { target: HTMLElement }).target.closest(
                      '[class*="rounded-2xl"]'
                    ) as HTMLElement | null;
                    if (el) {
                      el.style.borderColor = section.accent + '60';
                      el.style.boxShadow = `0 8px 32px ${section.accent}15, 0 0 0 1px ${section.accent}30`;
                    }
                  }}
                  onHoverEnd={(e) => {
                    const el = (e as unknown as { target: HTMLElement }).target.closest(
                      '[class*="rounded-2xl"]'
                    ) as HTMLElement | null;
                    if (el) {
                      el.style.borderColor = 'rgba(255,255,255,0.06)';
                      el.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Accent square */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        background: section.accent,
                        boxShadow: `0 0 12px ${section.accent}40`,
                      }}
                    />
                    <h2 className="font-outfit text-lg font-bold tracking-[0.15em] text-white">
                      {section.title}
                    </h2>
                  </div>

                  {/* Description */}
                  <p className="text-sm font-mono text-white/40 leading-relaxed">
                    {section.description}
                  </p>

                  {/* Bottom accent bar */}
                  <div className="mt-auto pt-4">
                    <div
                      className="h-[1px] w-full opacity-20"
                      style={{ background: `linear-gradient(90deg, ${section.accent}, transparent)` }}
                    />
                  </div>

                  {/* Corner glow */}
                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.04] pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${section.accent}, transparent)` }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
