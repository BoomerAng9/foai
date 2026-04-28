import Link from 'next/link';
import { ArrowLeft, Bolt, Shield, Workflow } from 'lucide-react';
import { FoaiBackground } from '@/components/foai-background';
import { SuperAgentBadge } from '@/components/super-agent-badge';
import { HawkFooter } from '@/components/hawk-footer';

export const metadata = {
  title: 'About Chicken Hawk',
  description: 'Direct, capable, good-humored. Chicken Hawk handles the routine and pauses on the consequential.',
};

export default function AboutPage() {
  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-x-hidden">
      <FoaiBackground />

      <header className="relative z-10 px-6 py-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-foai-muted hover:text-foai-text transition-colors text-sm">
          <ArrowLeft className="size-4" />
          <span>Back to chat</span>
        </Link>
        <SuperAgentBadge href="/about" />
      </header>

      <main className="relative z-10 flex-1 px-6 py-12 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
          <span className="text-foai-text">The kind of help </span>
          <span className="bg-gradient-to-b from-foai-gold via-foai-gold to-white bg-clip-text text-transparent italic glow-gold">
            you'd hire if you could.
          </span>
        </h1>

        <p className="text-lg text-foai-muted leading-relaxed mb-12 max-w-2xl">
          Tell Chicken Hawk what you need. It handles the routine without checking in,
          pauses on the consequential, and leaves a trail you can audit later.
        </p>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <Card icon={<Bolt className="size-5 text-foai-gold" />} title="Senior-level by default">
            No babysitting. Drop a request in plain English and the work gets done — research,
            drafts, dispatches, follow-ups.
          </Card>
          <Card icon={<Workflow className="size-5 text-foai-cyan" />} title="Knows when to pause">
            Money, contracts, anything going public — those wait for your sign-off.
            Routine work doesn't.
          </Card>
          <Card icon={<Shield className="size-5 text-foai-gold" />} title="Receipts, every time">
            Every action signs a tamper-evident receipt. You can prove what happened
            and when, end to end.
          </Card>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <ul className="space-y-3 text-foai-muted leading-relaxed">
            <li>
              <span className="text-foai-text font-medium">Acts on the routine.</span>{' '}
              Standard work dispatches directly — no friction, no queue.
            </li>
            <li>
              <span className="text-foai-text font-medium">Pauses on the consequential.</span>{' '}
              Anything legal, financial, health-related, or destined for public eyes waits for your call.
            </li>
            <li>
              <span className="text-foai-text font-medium">Audits every move.</span>{' '}
              Every dispatch writes a receipt to a tamper-evident chain you can verify any time.
            </li>
            <li>
              <span className="text-foai-text font-medium">Gets sharper over time.</span>{' '}
              Off-hours, it tries variations of the prompts, routes, and skills it uses — keeps the
              ones that work, rolls back the rest.
            </li>
          </ul>
        </section>

        <div className="flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-foai-cyan text-white font-medium text-sm hover:brightness-110 transition shadow-[0_0_24px_rgba(20,136,252,0.35)]"
          >
            Start a conversation
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-foai-border text-foai-text font-medium text-sm hover:bg-foai-surface-2 transition"
          >
            Operator sign-in
          </Link>
        </div>
      </main>

      <HawkFooter />
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-5">
      <div className="flex items-center gap-2 mb-2">{icon}<h3 className="font-semibold">{title}</h3></div>
      <p className="text-sm text-foai-muted leading-relaxed">{children}</p>
    </div>
  );
}
