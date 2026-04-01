'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Trophy, BookOpen, Store, Wallet,
  ArrowRight, Users, Zap, Globe, Play,
} from 'lucide-react';

interface PlugCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  agents: string[];
  tag?: string;
  href: string;
}

const SAMPLE_PLUGS: PlugCard[] = [
  {
    id: 'perform',
    title: 'Per|Form 2026',
    subtitle: 'NFL Mock Draft',
    description: 'AI sports analysts debate the top prospects. Boomer_Ang personas publish scouting reports with player cards, all grades through the P.A.I. + AGI formula.',
    icon: <Trophy className="w-6 h-6" />,
    color: '#E8A020',
    gradient: 'from-amber-500/10 to-orange-600/10',
    agents: ['Scout_Ang', 'Content_Ang', 'Iller_Ang'],
    tag: 'SPORTS',
    href: '/plug/perform',
  },
  {
    id: 'teacher',
    title: "Teacher's Digital Twin",
    subtitle: '3 Languages · 225 Students',
    description: 'One teacher, three language classes (English, Arabic, Russian), individual logins, digital twin tutors, parent progress view, autonomous lesson plans and grading.',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#3B82F6',
    gradient: 'from-blue-500/10 to-indigo-600/10',
    agents: ['Tutor_Ang', 'Edu_Ang', 'ACHEEVY'],
    tag: 'EDUCATION',
    href: '/plug/teacher',
  },
  {
    id: 'smb-marketing',
    title: 'Marketing Agency',
    subtitle: 'For Small Business',
    description: 'A bakery, barbershop, or boutique gets a full autonomous marketing department — social, email, local SEO, review management, competitor monitoring.',
    icon: <Store className="w-6 h-6" />,
    color: '#10B981',
    gradient: 'from-emerald-500/10 to-green-600/10',
    agents: ['Content_Ang', 'Scout_Ang', 'Biz_Ang'],
    tag: 'SMB',
    href: '/plug/smb-marketing',
  },
  {
    id: 'finance',
    title: 'Finance Command Center',
    subtitle: 'Personal CFO',
    description: 'Track spending, monitor subscriptions, flag anomalies, and get weekly voice briefings. Your personal CFO that never sleeps.',
    icon: <Wallet className="w-6 h-6" />,
    color: '#8B5CF6',
    gradient: 'from-violet-500/10 to-purple-600/10',
    agents: ['CFO_Ang', 'Ops_Ang', 'ACHEEVY'],
    tag: 'PERSONAL',
    href: '/plug/finance',
  },
];

export function PlugGallery() {
  const [hoveredPlug, setHoveredPlug] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-mono text-[10px] text-[#E8A020] tracking-[0.3em] uppercase mb-2">Sample plugs — live demos</p>
        <h2 className="text-xl sm:text-2xl font-light tracking-tight">
          See what an autonomous workforce <span className="font-bold">actually builds.</span>
        </h2>
        <p className="text-xs text-white/30 mt-2 max-w-lg mx-auto">
          Each plug is a working deployment. Click to explore, interact with agents, and see the output.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAMPLE_PLUGS.map(plug => (
          <Link
            key={plug.id}
            href={plug.href}
            onMouseEnter={() => setHoveredPlug(plug.id)}
            onMouseLeave={() => setHoveredPlug(null)}
            className="group relative block"
          >
            <div className={`relative border border-white/10 p-5 transition-all duration-300 overflow-hidden ${
              hoveredPlug === plug.id ? 'border-white/20 shadow-lg' : ''
            }`}>
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plug.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              {/* Tag */}
              {plug.tag && (
                <span
                  className="absolute top-3 right-3 font-mono text-[7px] px-1.5 py-0.5 font-bold tracking-wider"
                  style={{ backgroundColor: plug.color, color: '#000' }}
                >
                  {plug.tag}
                </span>
              )}

              {/* Content */}
              <div className="relative z-10">
                <div className="mb-3" style={{ color: plug.color }}>
                  {plug.icon}
                </div>

                <h3 className="font-mono text-sm font-bold text-white mb-0.5 group-hover:text-[#E8A020] transition-colors">
                  {plug.title}
                </h3>
                <p className="text-[10px] text-white/40 font-mono mb-3">{plug.subtitle}</p>

                <p className="text-[11px] text-white/40 leading-relaxed mb-4 line-clamp-3">
                  {plug.description}
                </p>

                {/* Agents */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {plug.agents.map(agent => (
                    <span
                      key={agent}
                      className="px-1.5 py-0.5 bg-white/5 text-[8px] text-white/30 font-mono"
                    >
                      {agent}
                    </span>
                  ))}
                </div>

                {/* Try it button */}
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider group-hover:text-[#E8A020] text-white/40 transition-colors">
                  <Play className="w-3 h-3" />
                  TRY IT
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
