'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FlaskConical, Shield, Cpu, Bird, Calendar, FileSearch, ArrowLeft } from 'lucide-react';

const items = [
  { href: '/tools', label: 'Overview', icon: LayoutDashboard },
  { href: '/tools/tuning-loop', label: 'Tuning Loop', icon: FlaskConical },
  { href: '/tools/nemoclaw', label: 'Policy Gate', icon: Shield },
  { href: '/tools/hermes', label: 'Agent Runtime', icon: Cpu },
  { href: '/tools/lil-hawks', label: 'Lil_Hawks', icon: Bird },
  { href: '/tools/cron', label: 'Scheduled Jobs', icon: Calendar },
  { href: '/tools/audit', label: 'Audit Chain', icon: FileSearch },
];

export function ToolsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              active
                ? 'bg-foai-gold/15 text-foai-gold border-l-2 border-foai-gold pl-[10px]'
                : 'text-foai-text hover:bg-white/5',
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        );
      })}
      <Link
        href="/"
        className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foai-muted hover:text-foai-text transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back to chat</span>
      </Link>
    </nav>
  );
}
