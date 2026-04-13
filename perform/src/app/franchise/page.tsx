'use client';

/**
 * Franchise Simulator Landing Page
 * Hero + sport selector + mode cards + team grid
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Users, Briefcase, FileText, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { TeamSelector } from '@/components/franchise/TeamSelector';
import type { Sport } from '@/lib/franchise/types';

const SPORTS: { key: Sport; label: string; teamCount: number }[] = [
  { key: 'nfl', label: 'NFL', teamCount: 32 },
  { key: 'nba', label: 'NBA', teamCount: 30 },
  { key: 'mlb', label: 'MLB', teamCount: 30 },
];

const MODES = [
  {
    key: 'roster',
    label: 'Roster Room',
    description: 'Build your dream roster. Drag players in and out, simulate seasons.',
    icon: Users,
    href: '/franchise/roster',
    color: '#22C55E',
  },
  {
    key: 'staff',
    label: 'Staff Room',
    description: 'Reshape the front office. Hire coaches, change schemes, simulate impact.',
    icon: Briefcase,
    href: '/franchise/staff',
    color: '#D4A853',
  },
  {
    key: 'draft',
    label: 'Draft Room',
    description: 'Full mock draft with AI-controlled teams. You are the GM.',
    icon: FileText,
    href: '/draft/war-room',
    color: '#8B5CF6',
  },
];

export default function FranchisePage() {
  const [sport, setSport] = useState<Sport>('nfl');
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,83,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-outfit font-black tracking-tight mb-3">
                <span style={{ color: '#D4A853' }}>Per|Form</span>{' '}
                <span className="text-white">Franchise Simulator</span>
              </h1>
              <p className="text-sm sm:text-base text-white/40 max-w-xl leading-relaxed">
                Manage real teams. Reshape rosters and front offices. Simulate
                outcomes with AI reasoning powered by 92 team digital twins.
              </p>
            </motion.div>

            {/* Sport selector */}
            <div className="flex gap-2 mt-8">
              {SPORTS.map((s) => (
                <motion.button
                  key={s.key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSport(s.key);
                    setSelectedTeam(undefined);
                  }}
                  className="px-5 py-2 rounded-lg text-sm font-bold tracking-wider uppercase transition-all"
                  style={{
                    background:
                      sport === s.key
                        ? 'rgba(212,168,83,0.15)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      sport === s.key
                        ? 'rgba(212,168,83,0.4)'
                        : 'rgba(255,255,255,0.06)'
                    }`,
                    color: sport === s.key ? '#D4A853' : 'rgba(255,255,255,0.4)',
                    boxShadow:
                      sport === s.key
                        ? '0 0 20px rgba(212,168,83,0.08)'
                        : 'none',
                  }}
                >
                  {s.label}
                  <span className="text-[10px] ml-1.5 opacity-50">
                    ({s.teamCount})
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Mode cards */}
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODES.map((mode, i) => {
              const Icon = mode.icon;
              const href = selectedTeam
                ? `${mode.href}?sport=${sport}&team=${selectedTeam}`
                : `${mode.href}?sport=${sport}`;
              return (
                <motion.div
                  key={mode.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                >
                  <Link
                    href={href}
                    className="group block p-5 rounded-xl transition-all hover:translate-y-[-2px]"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${mode.color}15` }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: mode.color }}
                        />
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {mode.label}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-white/40 transition-colors" />
                    </div>
                    <p className="text-[11px] text-white/35 leading-relaxed">
                      {mode.description}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Team grid */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold tracking-[0.2em] text-white/30 uppercase">
              Select a Team
            </h2>
            {selectedTeam && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2"
              >
                <Link
                  href={`/franchise/roster?sport=${sport}&team=${selectedTeam}`}
                  className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md transition-all hover:bg-green-500/15"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    color: '#22C55E',
                  }}
                >
                  Open Roster Room
                </Link>
                <Link
                  href={`/franchise/staff?sport=${sport}&team=${selectedTeam}`}
                  className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md transition-all hover:bg-amber-500/15"
                  style={{
                    background: 'rgba(212,168,83,0.08)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    color: '#D4A853',
                  }}
                >
                  Open Staff Room
                </Link>
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={sport}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <TeamSelector
                sport={sport}
                selected={selectedTeam}
                onSelect={setSelectedTeam}
              />
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </>
  );
}
