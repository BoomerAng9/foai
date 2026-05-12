import Link from 'next/link';
import { FlaskConical, Shield, Cpu, Bird, Calendar, FileSearch, Activity, AlertTriangle, Radio, Megaphone, Rocket, Hammer, FileJson, Network } from 'lucide-react';

interface PanelMeta {
  href: string;
  title: string;
  blurb: string;
  status: 'live' | 'soon' | 'readonly';
  icon: React.ReactNode;
}

const panels: PanelMeta[] = [
  {
    href: '/tools/live-plan',
    title: 'Live Plan',
    blurb: 'SSE feed of every dispatch, escalation, and completion as it happens. Real-time fleet visibility.',
    status: 'live',
    icon: <Activity className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/lil-hawks',
    title: 'Lil_Hawks',
    blurb: 'Eleven customer-facing specialists + the Sqwaadrun ops fleet roster. Click to dispatch.',
    status: 'live',
    icon: <Bird className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/lanes',
    title: 'Lanes',
    blurb: 'Lane A / B / C-5 control — trigger runs, inspect cache, watch drift, baseline progress.',
    status: 'live',
    icon: <Radio className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/press',
    title: 'Print_Press',
    blurb: 'Daemon, schedules, delivery receipts, configured platforms, caller-token index.',
    status: 'live',
    icon: <Megaphone className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/builder',
    title: 'Builder',
    blurb: 'Describe a site. The squad scaffolds it into a workspace. Ship from /tools/deploy.',
    status: 'live',
    icon: <Hammer className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/deploy',
    title: 'Deploy',
    blurb: 'One-click ship — hawk-ui / gateway / sqwaadrun. Two-step with Telegram confirm.',
    status: 'live',
    icon: <Rocket className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/missions',
    title: 'Missions',
    blurb: 'Mission spec registry. Drift status compares Python runtime vs JSON spec.',
    status: 'live',
    icon: <FileJson className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/sqwaadrun',
    title: 'Sqwaadrun',
    blurb: 'Active missions, recent completions, scrape-cache stats. The ops fleet at work.',
    status: 'live',
    icon: <Network className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/risk-events',
    title: 'Risk Events',
    blurb: 'Policy denials, hardening trips, audit anomalies. Filter by severity. Sorted newest-first.',
    status: 'live',
    icon: <AlertTriangle className="size-5 text-foai-gold" />,
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
    href: '/tools/audit',
    title: 'Audit Chain',
    blurb: 'SHA256 tamper-evident receipt chain. Every dispatch leaves a receipt.',
    status: 'live',
    icon: <FileSearch className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/cron',
    title: 'Scheduled Jobs',
    blurb: 'Cron-style recurring tasks owned by Chicken Hawk.',
    status: 'readonly',
    icon: <Calendar className="size-5 text-foai-gold" />,
  },
  {
    href: '/tools/tuning-loop',
    title: 'Tuning Loop',
    blurb: 'Self-improvement engine — prompt tuning, Lil_Hawk specialization, A/B routing experiments.',
    status: 'soon',
    icon: <FlaskConical className="size-5 text-foai-gold" />,
  },
];

export default function ToolsOverview() {
  return (
    <>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Tool Chest</h1>
        <p className="text-foai-muted mt-2">
          Where you steer Chicken Hawk. Live plan, agents, lanes, risk events, policy gating, runtime, audit, schedules.
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
