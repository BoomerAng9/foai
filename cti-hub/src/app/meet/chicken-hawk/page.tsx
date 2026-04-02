'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Crosshair,
  Hammer,
  GitFork,
  Code2,
  Palette,
  Search,
  Brain,
  Workflow,
  BarChart3,
  Plug,
  Box,
  GraduationCap,
  Zap,
  ChevronRight,
  Shield,
} from 'lucide-react';

const accent = '#E8A020';

interface LilHawk {
  name: string;
  codename?: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  highlighted?: boolean;
}

const lilHawks: LilHawk[] = [
  {
    name: 'Lil_Deep_Hawk',
    role: 'Deep Research',
    description:
      'Multi-source web research with citations. Digs deep, cross-references, and delivers verified intelligence.',
    icon: <Search className="w-6 h-6" />,
  },
  {
    name: 'Lil_Memory_Hawk',
    role: 'Memory Management',
    description:
      'Stores, recalls, and compresses long-term agent memory. Keeps the Sqwaad sharp across sessions.',
    icon: <Brain className="w-6 h-6" />,
  },
  {
    name: 'Lil_Flow_Hawk',
    role: 'Workflow Automation',
    description:
      'Connects services, triggers actions, manages pipelines. The glue between every moving part.',
    icon: <Workflow className="w-6 h-6" />,
  },
  {
    name: 'Lil_Viz_Hawk',
    role: 'Data Visualization',
    description:
      'Charts, graphs, dashboards from raw data. Turns numbers into decisions.',
    icon: <BarChart3 className="w-6 h-6" />,
  },
  {
    name: 'Lil_Blend_Hawk',
    role: 'Integration Specialist',
    description:
      'Connects external APIs, databases, and third-party services. If it has an endpoint, Blend_Hawk talks to it.',
    icon: <Plug className="w-6 h-6" />,
  },
  {
    name: 'Lil_Sand_Hawk',
    role: 'Sandbox Execution',
    description:
      'Runs code in isolated containers safely. Test, break, iterate -- without risk to production.',
    icon: <Box className="w-6 h-6" />,
  },
  {
    name: 'Lil_Trae_Hawk',
    role: 'Training & Fine-Tuning',
    description:
      'Prepares data and manages model training. From raw datasets to production-ready models.',
    icon: <GraduationCap className="w-6 h-6" />,
  },
];

export default function ChickenHawkPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <Link
          href="/about"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to About
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-10"
          style={{ background: accent }}
        />
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase mb-8 border"
            style={{
              color: accent,
              borderColor: `${accent}33`,
              background: `${accent}0D`,
            }}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Tactical Execution Layer
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-2">
            Chicken Hawk
          </h1>
          <p
            className="text-2xl md:text-3xl font-light mb-8"
            style={{ color: accent }}
          >
            &amp; the Lil_Hawks
          </p>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Chicken Hawk is the Tactical Commander -- the bridge between
            ACHEEVY&apos;s strategic plans and actual execution. The Lil_Hawks are
            specialized micro-agents that swarm tasks. Together they&apos;re called{' '}
            <span className="font-semibold text-white">&quot;the Sqwaad.&quot;</span>{' '}
            When ACHEEVY says &quot;build it,&quot; Chicken Hawk dispatches the Sqwaad.
          </p>
          {/* Hero Image */}
          <div className="mt-10 relative rounded-xl overflow-hidden border border-white/10 max-w-3xl mx-auto">
            <Image
              src="/chicken-hawks-hero.png"
              alt="Chicken Hawk and the Lil_Hawks"
              width={800}
              height={500}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Chicken Hawk Commander Card */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div
          className="relative rounded-2xl p-8 md:p-10 border overflow-hidden"
          style={{
            borderColor: `${accent}33`,
            background: `linear-gradient(135deg, ${accent}0A 0%, transparent 60%)`,
          }}
        >
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-15"
            style={{ background: accent }}
          />
          <div className="relative flex flex-col md:flex-row gap-8 items-start">
            <div
              className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `${accent}1A` }}
            >
              <Shield className="w-10 h-10" style={{ color: accent }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold">Chicken Hawk</h2>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: `${accent}1A`, color: accent }}
                >
                  COMMANDER
                </span>
              </div>
              <p className="text-white/40 text-sm mb-4">Tactical Commander</p>
              <p className="text-white/70 leading-relaxed mb-6">
                Breaks down ACHEEVY&apos;s strategic plans into discrete, executable
                tasks. Assigns them to the right Lil_Hawk. Monitors progress in
                real-time. Handles failures, retries, and re-routing. The single
                point of coordination for every operation the Sqwaad runs.
              </p>
              <div
                className="inline-block px-4 py-2 rounded-lg text-sm italic border"
                style={{
                  borderColor: `${accent}22`,
                  background: `${accent}08`,
                  color: accent,
                }}
              >
                &quot;Doesn&apos;t talk about what needs to happen. Makes it happen.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Access */}
      <section className="px-6 pb-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold tracking-tight mb-1">How to Access the Chicken Hawks</h2>
        <p className="text-sm text-white/40 mb-6">Chicken Hawk and the Sqwaad work behind the scenes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: accent }} />
              <h3 className="font-bold text-sm">Automatic Dispatch</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              When you ask ACHEEVY to build, deploy, or execute anything, Chicken Hawk automatically coordinates the Lil_Hawks. You don&apos;t dispatch them directly — the tactical layer handles routing, parallelism, and failure recovery.
            </p>
          </div>
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-4 h-4" style={{ color: accent }} />
              <h3 className="font-bold text-sm">Watch Them Work</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              As the Sqwaad executes, you see progress updates in real time. Each Lil_Hawk reports status through Chicken Hawk. The work streams back to you as it completes — no waiting for the whole job to finish.
            </p>
          </div>
        </div>
      </section>

      {/* The Sqwaad Grid */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            The Sqwaad{' '}
            <span className="text-white/30 font-light">-- Lil_Hawks</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Specialized micro-agents. Each one built for a single mission. Deployed
            as a coordinated unit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lilHawks.map((hawk) => (
            <div
              key={hawk.name}
              className={`group relative rounded-xl border p-6 transition-all duration-300 hover:border-opacity-60 ${
                hawk.highlighted
                  ? 'md:col-span-1 lg:col-span-1'
                  : ''
              }`}
              style={{
                borderColor: hawk.highlighted ? `${accent}40` : 'rgba(255,255,255,0.06)',
                background: hawk.highlighted
                  ? `linear-gradient(160deg, ${accent}0D 0%, transparent 40%)`
                  : 'rgba(255,255,255,0.02)',
              }}
            >
              {hawk.highlighted && (
                <div
                  className="absolute top-3 right-3 w-2 h-2 rounded-full"
                  style={{ background: accent }}
                />
              )}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{
                  background: hawk.highlighted ? `${accent}1A` : 'rgba(255,255,255,0.05)',
                  color: hawk.highlighted ? accent : 'rgba(255,255,255,0.5)',
                }}
              >
                {hawk.icon}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="font-bold text-lg"
                  style={{ color: hawk.highlighted ? accent : 'white' }}
                >
                  {hawk.name}
                </h3>
              </div>
              {hawk.codename && (
                <p className="text-xs text-white/25 font-mono mb-1">
                  {hawk.codename}
                </p>
              )}
              <p className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">
                {hawk.role}
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                {hawk.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How Sqwaad Works */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div
          className="rounded-2xl border p-8 md:p-10"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3">
            <Zap className="w-6 h-6" style={{ color: accent }} />
            How the Sqwaad Works
          </h2>
          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Task Intake',
                desc: 'A task comes in from ACHEEVY with strategic context and objectives.',
              },
              {
                step: '02',
                title: 'Agent Scoring',
                desc: 'Chicken Hawk evaluates which Lil_Hawks are best suited for each part of the task. Agents are scored against requirements.',
              },
              {
                step: '03',
                title: 'Dispatch',
                desc: 'Chicken Hawk dispatches the selected Lil_Hawks. They spin up and begin working in parallel -- that\'s the swarm.',
              },
              {
                step: '04',
                title: 'Execution & Monitoring',
                desc: 'Lil_Hawks execute their assignments. Chicken Hawk monitors progress, handles failures, and re-routes if needed.',
              },
              {
                step: '05',
                title: 'Delivery',
                desc: 'Results flow back through Chicken Hawk to ACHEEVY. The user sees the completed work, not the orchestration.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: `${accent}15`, color: accent }}
                >
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    {item.title}
                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <p className="text-sm text-white/30">
          Chicken Hawk &amp; the Sqwaad{' '}
          <span className="mx-2 text-white/10">|</span> The Deploy Platform{' '}
          <span className="mx-2 text-white/10">|</span>{' '}
          <span style={{ color: `${accent}88` }}>FOAI.cloud</span>
        </p>
      </footer>
    </div>
  );
}
