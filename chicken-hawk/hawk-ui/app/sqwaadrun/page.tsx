import Link from 'next/link';
import { ExternalLink, Search, Globe, Layers, ArrowRight } from 'lucide-react';
import { FoaiBackground } from '@/components/foai-background';
import { MenuNav } from '@/components/menu-nav';
import { HawkFooter } from '@/components/hawk-footer';
import { SqwaadrunGallery } from '@/components/sqwaadrun-gallery';

export const metadata = {
  title: 'Sqwaadrun · Chicken Hawk',
  description:
    'Meet the Sqwaadrun — a 17-hawk web-intelligence fleet. Crawl, parse, extract, verify, schedule. Dispatched by Chicken Hawk when a question needs the open web.',
};

const SQWAADRUN_URL =
  process.env.NEXT_PUBLIC_SQWAADRUN_URL ?? 'https://deploy.foai.cloud/plug/sqwaadrun';

export default function SqwaadrunPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <FoaiBackground />
      <MenuNav />

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 lg:pt-16 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foai-gold-tint border border-foai-gold/30 text-xs font-medium text-foai-gold mb-5">
          <span className="size-1.5 rounded-full bg-foai-gold animate-pulse" />
          17 specialists · live
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foai-text leading-[1.05]">
          Meet the <span className="text-foai-gold italic">Sqwaadrun</span>.
        </h1>
        <p className="mt-5 text-lg text-foai-muted leading-relaxed max-w-2xl">
          Seventeen hawks. One web-intelligence fleet. Each one tuned for a
          specific job — crawl, parse, extract, verify, schedule. When a
          question needs the open web, Chicken Hawk picks the right squad
          and they fly. Click any hawk to see who they are and what they do.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={SQWAADRUN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foai-gold text-white text-sm font-semibold hover:bg-foai-gold-hover shadow-amber-soft hover:shadow-amber-press transition-all"
          >
            Open the Sqwaadrun console <ExternalLink className="size-4" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-foai-border bg-foai-surface text-foai-text text-sm font-semibold hover:border-foai-gold/50 hover:shadow-card transition-all"
          >
            Dispatch from chat <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* GALLERY */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <SqwaadrunGallery />
      </section>

      {/* CAPABILITIES */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-2xl font-semibold text-foai-text mb-6">What the fleet does</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Card icon={<Search className="size-5" />} title="Live web search">
            Real-time queries with full-page extraction — not just snippets.
          </Card>
          <Card icon={<Globe className="size-5" />} title="Browser automation">
            Pages that need clicks, logins, scroll-to-load. Stealth profiles handle bot defenses.
          </Card>
          <Card icon={<Layers className="size-5" />} title="Bulk crawl">
            Whole sections of a site, mapped + extracted, dedup'd by content hash, organized for you.
          </Card>
        </div>
      </section>

      <HawkFooter />
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-foai-border bg-foai-surface p-5 shadow-card-sm">
      <div className="size-9 rounded-lg bg-foai-gold-tint text-foai-gold flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-foai-text mb-1">{title}</h3>
      <p className="text-sm text-foai-muted leading-relaxed">{children}</p>
    </div>
  );
}
