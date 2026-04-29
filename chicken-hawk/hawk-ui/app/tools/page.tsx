import Link from 'next/link';
import { FlaskConical, Shield, Cpu, Bird, Calendar, FileSearch } from 'lucide-react';

interface PanelMeta {
  href: string;
  title: string;
  blurb: string;
  status: 'live' | 'soon' | 'readonly';
  icon: React.ReactNode;
}

const panels: PanelMeta[] = [
  {
    href: '/tools/tuning-loop',
    title: 'Tuning Loop',
    blurb: 'Self-improvement engine — prompt tuning, Lil_Hawk specialization, A/B routing experiments.',
    status: 'soon',
    icon: <FlaskConical className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/nemoclaw',
    title: 'Policy Gate',
    blurb: 'Verdict tester. Allow / escalate / deny by risk-tag — without dispatching.',
    status: 'live',
    icon: <Shield className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/hermes',
    title: 'Agent Runtime',
    blurb: 'Channel status, skill registry, MCP servers — the execution shell behind every dispatch.',
    status: 'live',
    icon: <Cpu className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/lil-hawks',
    title: 'Lil_Hawk Roster',
    blurb: 'Eleven specialist agents under Chicken Hawk. Spawn, inspect, retire (Wave 2).',
    status: 'live',
    icon: <Bird className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/cron',
    title: 'Scheduled Jobs',
    blurb: 'Cron-style recurring tasks owned by Chicken Hawk.',
    status: 'readonly',
    icon: <Calendar className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/audit',
    title: 'Audit Chain',
    blurb: 'SHA256 tamper-evident receipt chain. Every dispatch leaves a receipt.',
    status: 'live',
    icon: <FileSearch className="size-5 text-foai-gold" />,
  },
];

export default function ToolsOverview() {
  return (
    <>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Tool Chest</h1>
        <p className="text-foai-muted mt-2">
          Where you steer Chicken Hawk. Six panels — policy gating, runtime, agents, schedules, audit.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {panels.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-5 hover:border-foai-gold/50 hover:bg-foai-surface transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              {p.icon}
              <StatusPill status={p.status} />
            </div>
            <h3 className="font-semibold mb-1 group-hover:text-foai-gold transition-colors">{p.title}</h3>
            <p className="text-sm text-foai-muted leading-relaxed">{p.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function StatusPill({ status }: { status: PanelMeta['status'] }) {
  const map: Record<PanelMeta['status'], { label: string; cls: string }> = {
    live: { label: 'Live', cls: 'bg-foai-cyan/15 text-foai-cyan' },
    soon: { label: 'Coming soon', cls: 'bg-foai-gold/15 text-foai-gold' },
    readonly: { label: 'Read-only', cls: 'bg-foai-gold/15 text-foai-gold' },
  };
  const { label, cls } = map[status];
  return <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
