import Link from 'next/link';
import { Code2, Terminal, Workflow, Database, Brain, Network, ServerCog, BarChart3, Box, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { FoaiBackground } from '@/components/foai-background';
import { HawkFooter } from '@/components/hawk-footer';

export const metadata = {
  title: 'Lil_Hawks · Chicken Hawk',
  description: 'Eleven specialist helpers under Chicken Hawk. Each one tuned for one kind of work.',
};

interface Hawk {
  name: string;
  role: string;
  blurb: string;
  icon: React.ReactNode;
}

const flock: Hawk[] = [
  { name: 'Lil_TRAE_Hawk',    role: 'Heavy refactors',     blurb: 'Repo-wide rewrites and big-shape codebase changes.',   icon: <Code2 className="size-5" /> },
  { name: 'Lil_Coding_Hawk',  role: 'Plan-first features', blurb: 'Designs the change first, then writes it.',            icon: <Sparkles className="size-5" /> },
  { name: 'Lil_Agent_Hawk',   role: 'OS / browser / CLI',  blurb: 'Drives a real terminal or browser to get things done.',icon: <Terminal className="size-5" /> },
  { name: 'Lil_Flow_Hawk',    role: 'SaaS automation',     blurb: 'CRM, payments, scheduling — the wiring between tools.',icon: <Workflow className="size-5" /> },
  { name: 'Lil_Sand_Hawk',    role: 'Safe execution',      blurb: 'Runs untrusted code in a sealed sandbox and reports back.', icon: <Box className="size-5" /> },
  { name: 'Lil_Memory_Hawk',  role: 'Long-term memory',    blurb: 'Remembers context across sessions so you don\'t repeat yourself.', icon: <Database className="size-5" /> },
  { name: 'Lil_Graph_Hawk',   role: 'Stateful workflows',  blurb: 'Multi-step processes that branch on real-world conditions.', icon: <Network className="size-5" /> },
  { name: 'Lil_Back_Hawk',    role: 'Backend scaffolding', blurb: 'APIs, auth, database schema — the non-glamorous foundation.', icon: <ServerCog className="size-5" /> },
  { name: 'Lil_Viz_Hawk',     role: 'Monitoring',          blurb: 'Watches what\'s happening and surfaces what matters.',  icon: <BarChart3 className="size-5" /> },
  { name: 'Lil_Blend_Hawk',   role: '3D + visual',         blurb: 'Renders, scenes, product shots, character work.',      icon: <Brain className="size-5" /> },
  { name: 'Lil_Deep_Hawk',    role: 'Squad mode',          blurb: 'Coordinates the rest of the flock when one task needs many hands.', icon: <Zap className="size-5" /> },
];

export default function LilHawksPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <FoaiBackground />

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 lg:pt-16 pb-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foai-text leading-[1.05]">
          The <span className="text-foai-gold italic">Lil_Hawks</span>.
        </h1>
        <p className="mt-5 text-lg text-foai-muted leading-relaxed max-w-2xl">
          Eleven specialists. Each one a senior-level helper tuned for one
          kind of work. Chicken Hawk routes your request to the right hawk so
          you talk to one place and the right specialist gets to work.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flock.map((h) => (
            <article
              key={h.name}
              className="rounded-2xl border border-foai-border bg-foai-surface p-5 shadow-card-sm hover:shadow-card hover:border-foai-gold/40 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-lg bg-foai-gold-tint text-foai-gold flex items-center justify-center">
                  {h.icon}
                </div>
                <div>
                  <div className="font-mono text-sm font-semibold text-foai-text">{h.name}</div>
                  <div className="text-xs text-foai-muted">{h.role}</div>
                </div>
              </div>
              <p className="text-sm text-foai-muted leading-relaxed">{h.blurb}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover shadow-amber-soft hover:shadow-amber-press transition-all"
          >
            Try Chicken Hawk <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <HawkFooter />
    </div>
  );
}
