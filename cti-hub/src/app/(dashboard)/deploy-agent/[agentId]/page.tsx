'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AGENTS, DEPARTMENTS, type AgentProfile } from '@/lib/agents/registry';
import { ArrowLeft, Zap, Shield } from 'lucide-react';

function getDeptColor(deptId: string): string {
  return DEPARTMENTS.find(d => d.id === deptId)?.color ?? '#E8A020';
}

function getDeptName(deptId: string): string {
  return DEPARTMENTS.find(d => d.id === deptId)?.name ?? deptId;
}

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = AGENTS.find(a => a.id === agentId);

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="font-mono text-2xl font-bold text-white mb-4">Agent not found</h1>
        <p className="text-[#888] mb-8">No agent with ID &ldquo;{agentId}&rdquo; exists in the roster.</p>
        <Link href="/deploy-agent" className="font-mono text-xs font-bold tracking-wider text-[#E8A020] hover:underline">
          &larr; Back to roster
        </Link>
      </div>
    );
  }

  const deptColor = getDeptColor(agent.department);
  const tierLabel = agent.tier === 'strategic' ? 'Strategic Tier' :
                    agent.tier === 'command' ? 'Command' :
                    agent.tier === 'tactical' ? 'Tactical' : 'Specialist';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
      {/* Back nav */}
      <Link
        href="/deploy-agent"
        className="inline-flex items-center gap-2 font-mono text-xs text-[#888] hover:text-[#E8A020] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Deploy Your Workforce
      </Link>

      {/* Header */}
      <header className="flex items-start gap-6">
        <div className="w-28 h-28 rounded-xl overflow-hidden border border-[#222] bg-[#0A0A0A] shrink-0">
          <Image
            src={agent.avatar}
            alt={agent.name}
            width={112}
            height={112}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-3xl font-black text-white tracking-tight">{agent.name}</h1>
            {agent.tier === 'command' && <Shield className="w-5 h-5 text-[#E8A020]" />}
          </div>
          <p className="font-mono text-sm font-bold" style={{ color: deptColor }}>{agent.role}</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">{tierLabel}</span>
            <span className="text-[#333]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">{getDeptName(agent.department)}</span>
          </div>
        </div>
      </header>

      {/* Persona */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#555] mb-3">Persona</h2>
        <p className="text-[#ccc] leading-relaxed">{agent.persona}</p>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#555] mb-3">Capabilities</h2>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map(cap => (
            <span
              key={cap}
              className="font-mono text-xs px-3 py-1.5 bg-[#111] border border-[#222] text-[#999]"
            >
              {cap}
            </span>
          ))}
        </div>
      </section>

      {/* Hire CTA */}
      {agent.hireable && agent.individualPrice !== undefined && (
        <section className="border border-[#222] bg-[#111] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-mono text-lg font-bold text-white">Hire {agent.name}</h2>
              <p className="text-sm text-[#888] mt-1">
                <span className="font-mono font-bold text-[#E8A020]">${agent.individualPrice}/mo</span>
                {' '}· billed with your plan
              </p>
            </div>
            <Link
              href={`/billing?hire=${agent.id}&plan=bucket_list`}
              className="inline-flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-wider bg-[#E8A020] text-[#0A0A0A] px-6 py-3 hover:bg-[#F0B030] transition-colors"
            >
              <Zap className="w-4 h-4" />
              DEPLOY {agent.name.split('_')[0].toUpperCase()}
            </Link>
          </div>
        </section>
      )}

      {/* Chat CTA */}
      <section className="text-center py-6">
        <p className="text-sm text-[#888] mb-4">
          Want to see what {agent.name} can do before hiring? Ask ACHEEVY.
        </p>
        <Link
          href="/chat"
          className="font-mono text-xs font-bold tracking-wider border border-[#333] text-[#999] px-6 py-2.5 hover:border-[#E8A020] hover:text-white transition-colors"
        >
          Chat w/ ACHEEVY
        </Link>
      </section>
    </div>
  );
}
