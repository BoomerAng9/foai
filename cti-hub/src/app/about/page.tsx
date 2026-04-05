'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Zap, Brain, Shield, Users, Rocket } from 'lucide-react';
import { staggerContainer, staggerItem, scrollReveal } from '@/lib/motion';

const agents = [
  { name: 'ACHEEVY', role: 'Digital CEO', desc: 'You describe the problem. ACHEEVY scopes the project, assigns agents, and delivers the finished product. No forms. No sprint planning. Just results.' },
  { name: 'Chicken Hawk', role: 'Operations Manager', desc: 'Takes ACHEEVY\'s plan and breaks it into tasks. Assigns agents, tracks progress, catches problems before they become yours.' },
  { name: 'Scout_Ang', role: 'Research & Intel', desc: 'Finds leads, scrapes the web, pulls market data, and digs up opportunities across every source available.' },
  { name: 'Content_Ang', role: 'Content & Copy', desc: 'Writes proposals, marketing copy, presentations, and docs — polished, on-brand, and ready to send.' },
  { name: 'ILLA', role: 'Creative Director', desc: 'Designs interfaces, brand systems, motion graphics, and visual identity. PMO-PRISM methodology — dark mode first.' },
  { name: 'Code_Ang', role: 'Engineering', desc: 'Writes code, builds APIs, deploys services, and debugs issues. Full-stack engineering without the hiring process.' },
  { name: 'Biz_Ang', role: 'Business Strategy', desc: 'Revenue analysis, client proposals, partnership outreach, and financial modeling. Your BD team in a single agent.' },
  { name: 'LUC', role: 'Cost Analyst', desc: 'Every token counted, every dollar tracked. LUC manages budgets, quotes costs, and ensures financial transparency.' },
  { name: 'Lil_Hawks', role: 'Task Runners', desc: 'Fast, focused micro-agents. Spin up, do the job, report back, and disappear. The interns who actually deliver.' },
];

const capabilities = [
  { icon: Brain, title: 'Smart Translate', desc: 'Say what you mean in plain English. The platform converts it into precise instructions — no jargon required.' },
  { icon: Zap, title: 'Voice-First AI', desc: 'Talk to your business. Voice commands drive everything from research to deployment.' },
  { icon: Shield, title: 'Full Governance', desc: 'Every action auditable, every cost tracked, every decision logged with a complete paper trail.' },
  { icon: Users, title: 'Autonomous Workforce', desc: 'A 10-person org with zero employees. Research, content, sales, ops, engineering — running 24/7.' },
  { icon: Rocket, title: 'Real-Time Delivery', desc: 'Watch progress live on the Operations Floor. Every pipeline stage, every agent, updated in real time.' },
  { icon: Terminal, title: 'MCP Gateway', desc: 'Connect from Cursor, VS Code, Claude Code, or any MCP-compatible tool. One URL, instant access.' },
];

export default function AboutPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        '--bg': '#0A0D10', '--bg-surface': '#12161B', '--bg-elevated': '#1A1F27',
        '--fg': '#E4E8ED', '--fg-secondary': '#94A3B8', '--fg-tertiary': '#4B5C72', '--fg-ghost': '#64748B',
        '--accent': '#C9A227', '--accent-hover': '#D4B033',
        '--border': '#1F2733', '--border-strong': '#2D3748',
      } as React.CSSProperties}
    >
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-surface">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-bg" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-fg">The Deploy Platform</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="btn-bracket">Features</Link>
          <Link href="/about" className="btn-bracket">About</Link>
          <Link href="/chat" className="btn-solid h-9 text-[10px]">
            GET STARTED <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-bg py-20 md:py-32 px-4 md:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden" animate="show" variants={staggerContainer}
        >
          <motion.p variants={staggerItem} className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-6">
            About The Deploy Platform
          </motion.p>
          <motion.h1 variants={staggerItem} className="font-outfit text-4xl md:text-6xl font-black tracking-tight text-fg mb-4">
            Scale your business.{' '}
            <span className="text-accent">Skip the hiring.</span>
          </motion.h1>
          <motion.p variants={staggerItem} className="text-fg-secondary text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            The Deploy Platform gives you an AI workforce that builds, ships, and operates — so you can grow without the headcount.
          </motion.p>
        </motion.div>
      </section>

      {/* Who We Are */}
      <motion.section
        className="bg-bg-surface py-16 md:py-24 px-4 md:px-8"
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={scrollReveal}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-accent mb-3">What You Get</p>
            <h2 className="font-outfit text-2xl md:text-3xl font-bold text-fg mb-4">
              ai<span className="text-accent">PLUG</span>s — Finished Products
            </h2>
          </div>
          <div className="space-y-4 text-fg-secondary text-[15px] leading-relaxed">
            <p>An aiPLUG is the finished product you walk away with. A live website, an API, a sales dashboard, a data pipeline — whatever you need, described in plain English and delivered through a 10-stage pipeline.</p>
            <p>No Figma mockups to approve. No sprint meetings. When it ships, you get the BAMARAM: your confirmation that the job is done and live.</p>
          </div>
        </div>
      </motion.section>

      {/* Two Paths */}
      <motion.section
        className="bg-bg py-16 md:py-24 px-4 md:px-8"
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={scrollReveal}
      >
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-accent mb-3">Two ways to build</p>
          <h2 className="font-outfit text-2xl md:text-3xl font-bold text-fg mb-10">Hands-off or hands-on. Your call.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Manage It', time: '2-5 min', desc: 'Describe what you want. ACHEEVY scopes, builds, and delivers autonomously. You approve only when it matters.', items: ['Fully autonomous delivery', 'Smart checkpoints', 'Full paper trail'] },
              { title: 'Guide Me', time: '4-10 min', desc: 'Not sure what you need? ACHEEVY walks you through discovery, validates your idea, and builds a clear plan.', items: ['Guided discovery', 'Risk analysis built in', 'Fewer surprises'] },
            ].map((path) => (
              <div key={path.title} className="bg-bg-surface border border-border rounded-sm p-6 md:p-8 hover:border-accent/40 transition-colors">
                <h3 className="font-outfit text-lg font-bold text-fg mb-1">
                  Let ACHEEVY <span className="text-accent">{path.title}</span>
                </h3>
                <p className="font-mono text-[10px] tracking-wider text-fg-tertiary mb-4">{path.time}</p>
                <p className="text-fg-secondary text-sm leading-relaxed mb-5">{path.desc}</p>
                <ul className="space-y-2">
                  {path.items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-fg-secondary text-[13px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Capabilities */}
      <section className="bg-bg-surface py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={scrollReveal}>
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-accent mb-3">Capabilities</p>
            <h2 className="font-outfit text-2xl md:text-3xl font-bold text-fg mb-10">Everything under the hood</h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}
          >
            {capabilities.map((cap) => (
              <motion.div
                key={cap.title} variants={staggerItem}
                className="bg-bg border border-border rounded-sm p-6 hover:border-accent/30 transition-colors group"
              >
                <cap.icon className="w-6 h-6 text-fg-tertiary mb-4 group-hover:text-accent transition-colors" />
                <h3 className="font-outfit text-[15px] font-bold text-fg mb-1.5">{cap.title}</h3>
                <p className="text-fg-secondary text-[13px] leading-relaxed">{cap.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The Workforce */}
      <section className="bg-bg py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={scrollReveal}>
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-accent mb-3">Your AI Workforce</p>
            <h2 className="font-outfit text-2xl md:text-3xl font-bold text-fg mb-3">The Agent Hierarchy</h2>
            <p className="text-fg-secondary text-sm max-w-lg leading-relaxed mb-10">
              ACHEEVY leads. The Boomer_Angs execute at the strategic level. Chicken Hawk manages operations. Lil_Hawks handle the details. You never manage them directly.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={staggerContainer}
          >
            {agents.map((agent) => (
              <motion.div
                key={agent.name} variants={staggerItem}
                className="bg-bg-surface border border-border rounded-sm p-5 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="font-mono text-xs font-semibold tracking-wide text-fg">{agent.name}</span>
                </div>
                <p className="font-mono text-[10px] tracking-wider uppercase text-accent mb-2.5">{agent.role}</p>
                <p className="text-fg-secondary text-[13px] leading-relaxed">{agent.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Meet the teams links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {[
              { href: '/meet/house-of-ang', label: 'The House of ANG', desc: 'Meet the 12 Boomer_Angs — executive AI agents across every department.' },
              { href: '/meet/chicken-hawk', label: 'Chicken Hawk & the Sqwaad', desc: 'The tactical execution layer. 11 specialized Lil_Hawks that get it done.' },
            ].map((link) => (
              <Link
                key={link.href} href={link.href}
                className="bg-bg-surface border border-border rounded-sm p-5 hover:border-accent/40 transition-colors group"
              >
                <span className="font-mono text-sm font-bold text-accent">{link.label}</span>
                <p className="text-fg-secondary text-xs mt-2 leading-relaxed">{link.desc}</p>
                <span className="font-mono text-[10px] text-accent flex items-center gap-1.5 mt-3 group-hover:translate-x-1 transition-transform">
                  EXPLORE <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bg-surface py-20 md:py-28 px-4 md:px-8 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scrollReveal}>
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-accent mb-4">Ready to scale without hiring?</p>
          <h2 className="font-outfit text-3xl md:text-4xl font-black text-fg mb-4">Your AI workforce is waiting.</h2>
          <p className="text-fg-secondary mb-10">Stop interviewing. Stop onboarding. Start shipping.</p>
          <Link
            href="/chat"
            className="btn-solid h-12 px-9 text-sm inline-flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-between px-4 md:px-8 border-t border-border bg-bg">
        <span className="font-mono text-[10px] text-fg-tertiary tracking-wider uppercase">The Deploy Platform &middot; ACHIEVEMOR</span>
        <span className="font-mono text-[10px] text-fg-tertiary">&copy; 2026</span>
      </footer>
    </div>
  );
}
