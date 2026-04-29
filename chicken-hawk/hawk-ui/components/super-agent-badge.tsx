// Light-theme chip — clean white background, slate text, amber accent dot.
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function SuperAgentBadge({
  href = '/about',
  label = 'Now in beta',
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide bg-white border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 hover:shadow-card transition-all"
    >
      <span className="size-1.5 rounded-full bg-foai-gold" />
      <span>{label}</span>
      <ArrowUpRight className="size-3 text-foai-gold opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
    </Link>
  );
}
