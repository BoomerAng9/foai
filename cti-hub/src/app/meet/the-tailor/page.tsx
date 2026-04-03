'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Users, Shield, Zap } from 'lucide-react';

/**
 * The Tailor's V.I.B.E. Shop
 *
 * The origin story for every Boomer_Ang. ACHEEVY visits The Tailor,
 * sits with him, designs a new agent from synthetic persona data.
 *
 * The Tailor has a smoke-cloud head — connection to the Book of Vibe.
 * V.I.B.E. is written on the door. SIVIS logo on the facade.
 * "Home of Boomer_Angs" — where agents are forged.
 */

const AGENTS = [
  { name: 'Scout_Ang', role: 'Research & Intel', portrait: '/agents/scout-ang.png', status: 'Active', specialty: 'Web scraping, market analysis, competitive intelligence' },
  { name: 'Content_Ang', role: 'Content & Copy', portrait: '/agents/content-ang.png', status: 'Active', specialty: 'SEO, blog posts, landing pages, social media, email' },
  { name: 'Biz_Ang', role: 'Business Strategy', portrait: '/agents/biz-ang.png', status: 'Active', specialty: 'Pipeline analytics, lead gen, client retention, campaigns' },
  { name: 'Ops_Ang', role: 'Operations Chief', portrait: '/agents/ops-ang.png', status: 'Active', specialty: 'Fleet monitoring, incident detection, uptime, historical recall' },
  { name: 'Edu_Ang', role: 'Education & Training', portrait: '/agents/edu-ang.png', status: 'Active', specialty: 'Enrollment, affiliate management, revenue attribution' },
  { name: 'CFO_Ang', role: 'Finance & Budget', portrait: '/agents/cfo-ang.png', status: 'Active', specialty: 'Cost tracking, budget management, financial modeling' },
  { name: 'Iller_Ang', role: 'Head of Broad|Cast Studio', portrait: '/agents/iller-ang.png', status: 'Active', specialty: 'Cinematography, video production, creative direction, design' },
  { name: 'Code_Ang', role: 'Engineering', portrait: '/agents/code-ang.png', status: 'Active', specialty: 'Full-stack development, API design, deployment pipelines' },
  { name: 'Picker_Ang', role: 'Task Router', portrait: '/agents/picker-ang.png', status: 'Active', specialty: 'Intent classification, agent dispatch, routing optimization' },
  { name: 'BuildSmith', role: 'Infrastructure', portrait: '/agents/buildsmith.png', status: 'Active', specialty: 'Docker, cloud infrastructure, CI/CD, system architecture' },
];

const LORE = [
  { question: 'Who is The Tailor?', answer: 'The Tailor is a Boomer_Ang — but unlike the others, his head is a smoke cloud. This connects him to the Book of Vibe, the origin text of the ACHEEVY ecosystem. He doesn\'t speak much. He builds.' },
  { question: 'What is V.I.B.E.?', answer: 'V.I.B.E. is written on the door of The Tailor\'s shop. It is the philosophy behind every agent\'s creation — each Boomer_Ang is built with intention, precision, and purpose. The Book of Vibe defines the principles.' },
  { question: 'How are Boomer_Angs created?', answer: 'ACHEEVY visits The Tailor\'s shop. They sit together and design the new agent using synthetic persona data — the same methodology used to create marketing personas for companies. NotebookLM creates the deep data source that defines each agent\'s expertise, personality, and behavior.' },
  { question: 'What is SIVIS?', answer: 'SIVIS is the workforce brand mark — three visored figures standing together. It represents the collective strength of the Boomer_Ang workforce. The SIVIS emblem hangs on The Tailor\'s facade.' },
  { question: 'Why do some agents have helmets?', answer: 'Agents with smoke-cloud heads wear helmets to contain their form. Those showing their earthly body have human features. The helmet is not a mask — it\'s a vessel.' },
];

export default function TheTailorPage() {
  const [expandedLore, setExpandedLore] = useState<number | null>(null);

  return (
    <div className="min-h-screen text-white" style={{ background: '#0A0A0F' }}>
      {/* Hero — The Shop Facade */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Radial glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center max-w-3xl">
          {/* SIVIS Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sivis-logo.png"
            alt="SIVIS"
            className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6 object-contain"
            style={{ filter: 'drop-shadow(0 8px 40px rgba(232,160,32,0.3))' }}
          />

          {/* V.I.B.E. */}
          <p className="font-mono text-[14px] sm:text-[18px] tracking-[0.5em] mb-2" style={{ color: '#E8A020' }}>
            V.I.B.E.
          </p>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
            The Tailor&apos;s Shop
          </h1>

          <p className="text-white/40 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
            Where every Boomer_Ang is forged. ACHEEVY sits with The Tailor,
            designs the persona, and a new agent enters the workforce.
          </p>

          <Link href="/meet/house-of-ang" className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold tracking-wider" style={{ background: '#E8A020', color: '#000' }}>
            ENTER THE HOUSE OF ANG <Zap className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {/* The Forge — "Home of Boomer_Angs" */}
      <section className="py-16 px-4 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: '#E8A020' }}>The Forge</p>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
              Home of <span className="font-bold" style={{ color: '#E8A020' }}>Boomer_Angs</span>
            </h2>
            <p className="text-white/40 text-sm mt-3 max-w-lg mx-auto">
              Each agent is built using synthetic persona data — deep expertise profiles
              crafted with the same methodology used for enterprise marketing personas.
            </p>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {AGENTS.map(agent => (
              <div key={agent.name} className="group relative overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {/* Portrait */}
                <div className="aspect-square relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agent.portrait}
                    alt={agent.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />
                  {/* Status dot */}
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="font-mono text-[11px] font-bold tracking-wider text-white">{agent.name}</p>
                  <p className="text-[9px] text-white/40 mt-0.5">{agent.role}</p>
                  <p className="text-[8px] text-white/25 mt-1 leading-relaxed hidden group-hover:block">{agent.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Creation Ritual */}
      <section className="py-16 px-4 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Sparkles className="w-6 h-6 mx-auto mb-3" style={{ color: '#E8A020' }} />
            <h2 className="text-2xl font-light tracking-tight">
              The Creation <span className="font-bold">Ritual</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.2)' }}>
                <span className="text-lg">1</span>
              </div>
              <h3 className="font-bold text-sm mb-2">ACHEEVY Arrives</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                ACHEEVY enters The Tailor&apos;s shop through the V.I.B.E. door.
                The SIVIS emblem glows on the facade. He describes the need — what role
                is missing from the workforce.
              </p>
            </div>
            <div className="p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.2)' }}>
                <span className="text-lg">2</span>
              </div>
              <h3 className="font-bold text-sm mb-2">The Tailor Designs</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                The Tailor — smoke-cloud head, silent craftsman — takes the brief.
                Using synthetic persona data from NotebookLM, he constructs
                the agent&apos;s expertise, personality, voice, and behavior model.
              </p>
            </div>
            <div className="p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(232,160,32,0.1)', border: '1px solid rgba(232,160,32,0.2)' }}>
                <span className="text-lg">3</span>
              </div>
              <h3 className="font-bold text-sm mb-2">A New Ang Emerges</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                The new Boomer_Ang steps out — fitted with their ANG visor,
                their boomerang, and their drone. They receive their badge,
                join the workforce, and report to ACHEEVY.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lore — The Book of Vibe */}
      <section className="py-16 px-4 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-6 h-6 mx-auto mb-3" style={{ color: '#E8A020' }} />
            <h2 className="text-2xl font-light tracking-tight">
              The Book of <span className="font-bold" style={{ color: '#E8A020' }}>Vibe</span>
            </h2>
            <p className="text-white/40 text-sm mt-2">The origin text of the ACHEEVY ecosystem</p>
          </div>

          <div className="space-y-2">
            {LORE.map((item, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setExpandedLore(expandedLore === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-mono text-[11px] font-bold tracking-wider">{item.question}</span>
                  <span className="text-white/30 text-xs">{expandedLore === i ? '−' : '+'}</span>
                </button>
                {expandedLore === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-white/50 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIVIS Workforce Mark */}
      <section className="py-20 px-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sivis-logo.png"
          alt="SIVIS"
          className="w-24 h-24 mx-auto mb-4 object-contain opacity-40"
        />
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-white/20">
          SIVIS &middot; The Workforce Mark &middot; FOAI
        </p>
        <p className="font-mono text-[8px] text-white/10 mt-2">
          The Tailor&apos;s V.I.B.E. Shop &middot; Where Boomer_Angs are forged
        </p>
      </section>

      {/* Back nav */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/meet/house-of-ang" className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft className="w-3 h-3" /> House of ANG
        </Link>
      </div>
    </div>
  );
}
