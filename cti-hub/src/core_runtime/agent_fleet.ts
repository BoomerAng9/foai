import type { NormalizedIntent } from './ntntn';
import type { BoomerAngRole } from '../execution_branches/boomer_angs';

export type FleetAgentRole =
  | 'orchestrator'
  | 'governor'
  | 'router'
  | 'researcher'
  | 'analyst'
  | 'coder'
  | 'assembler'
  | 'reviewer'
  | 'packager';

export type FleetAgentStatus = 'idle' | 'ready' | 'running' | 'offline';

export interface FleetAgent {
  id: string;
  name: string;
  role: FleetAgentRole;
  provider: string;
  status: FleetAgentStatus;
  description: string;
  health: number;
  tags: string[];
  tasksHandled: number;
  executionRole?: BoomerAngRole;
}

export interface AgentWorkloadStep {
  step: number;
  agentId: string;
  role: BoomerAngRole;
  capability: string;
  directive: string;
  reason: string;
  expectedOutput: string;
}

export interface AgentFleetSnapshot {
  organizationId: string;
  activeAgents: number;
  readyAgents: number;
  launchReadiness: number;
  blockers: string[];
  recommendedSequence: AgentWorkloadStep[];
  agents: Array<FleetAgent & { workloadStatus: 'active' | 'standby' }>;
}

const FLEET: FleetAgent[] = [
  {
    id: 'acheevy-core',
    name: 'ACHEEVY',
    role: 'orchestrator',
    provider: 'Native Runtime',
    status: 'running',
    description: 'Sequences huddles, checkpoints, and governed handoffs across the workload.',
    health: 99,
    tags: ['orchestration', 'workflow', 'delivery'],
    tasksHandled: 1284,
  },
  {
    id: 'mim-governor',
    name: 'MIM',
    role: 'governor',
    provider: 'Native Runtime',
    status: 'running',
    description: 'Applies policy, memory, and revision discipline to every execution step.',
    health: 100,
    tags: ['governance', 'policy', 'memory'],
    tasksHandled: 1954,
  },
  {
    id: 'picker-ang',
    name: 'Picker_Ang',
    role: 'router',
    provider: 'Native Runtime',
    status: 'ready',
    description: 'Routes each workload by capability, latency, and quality constraints.',
    health: 97,
    tags: ['routing', 'capability', 'selection'],
    tasksHandled: 842,
  },
  {
    id: 'boomer-research',
    name: 'Boomer_Ang Research',
    role: 'researcher',
    provider: 'InsForge AI',
    status: 'ready',
    description: 'Collects facts, comparisons, and evidence for grounded launch decisions.',
    health: 96,
    tags: ['research', 'citations', 'discovery'],
    tasksHandled: 418,
    executionRole: 'researcher',
  },
  {
    id: 'boomer-analyst',
    name: 'Boomer_Ang Analyst',
    role: 'analyst',
    provider: 'InsForge AI',
    status: 'ready',
    description: 'Converts findings into risk views, requirements, and launch guidance.',
    health: 95,
    tags: ['analysis', 'risk', 'launch'],
    tasksHandled: 302,
    executionRole: 'analyst',
  },
  {
    id: 'boomer-coder',
    name: 'Boomer_Ang Builder',
    role: 'coder',
    provider: 'InsForge AI',
    status: 'ready',
    description: 'Implements product, API, and integration work required to ship the runtime.',
    health: 94,
    tags: ['coding', 'integration', 'delivery'],
    tasksHandled: 267,
    executionRole: 'coder',
  },
  {
    id: 'buildsmith',
    name: 'BuildSmith',
    role: 'assembler',
    provider: 'Native Runtime',
    status: 'ready',
    description: 'Assembles outputs into a release manifest with evidence and lineage.',
    health: 98,
    tags: ['assembly', 'manifest', 'release'],
    tasksHandled: 111,
  },
  {
    id: 'review-hone',
    name: 'Review/Hone',
    role: 'reviewer',
    provider: 'Native Runtime',
    status: 'ready',
    description: 'Validates output quality before the runtime hands anything off.',
    health: 97,
    tags: ['review', 'quality', 'gating'],
    tasksHandled: 109,
  },
  {
    id: 'packaging',
    name: 'Packaging',
    role: 'packager',
    provider: 'Native Runtime',
    status: 'ready',
    description: 'Prepares the final retrieval bundle for delivery and launch evidence.',
    health: 99,
    tags: ['packaging', 'bundle', 'handoff'],
    tasksHandled: 105,
  },
];

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function buildStep(
  plan: AgentWorkloadStep[],
  agentId: string,
  role: BoomerAngRole,
  capability: string,
  directive: string,
  reason: string,
  expectedOutput: string,
) {
  plan.push({
    step: plan.length + 1,
    agentId,
    role,
    capability,
    directive,
    reason,
    expectedOutput,
  });
}

export const agentFleet = {
  list() {
    return FLEET;
  },

  getByExecutionRole(role: BoomerAngRole) {
    return FLEET.find((agent) => agent.executionRole === role) ?? null;
  },

  planWorkload(normalized: NormalizedIntent): AgentWorkloadStep[] {
    const plan: AgentWorkloadStep[] = [];
    const objective = normalized.objective.toLowerCase();
    const outputs = normalized.outputs.join(' ').toLowerCase();
    const risks = normalized.risks.join(' ').toLowerCase();
    const approvals = normalized.approvals_needed.join(' ').toLowerCase();
    const combined = [objective, outputs, risks, approvals].join(' ');

    const needsResearch =
      containsAny(combined, ['research', 'analyze', 'investigate', 'compare', 'market', 'launch']) ||
      normalized.inputs.length > 0;
    const needsAnalysis =
      containsAny(combined, ['launch', 'risk', 'policy', 'approve', 'readiness', 'strategy']) ||
      normalized.risks.length > 0 ||
      normalized.approvals_needed.length > 0;
    const needsBuild = containsAny(combined, [
      'build',
      'code',
      'ship',
      'launch',
      'deploy',
      'implement',
      'integrate',
      'dashboard',
      'ui',
      'api',
      'agent',
    ]);

    if (needsResearch) {
      buildStep(
        plan,
        'boomer-research',
        'researcher',
        'deep-research',
        `Research and ground the objective with evidence: ${normalized.objective}`,
        'Gather source-of-truth findings before implementation or launch decisions.',
        'Evidence-backed findings with constraints, dependencies, and source notes.',
      );
    }

    if (needsAnalysis) {
      buildStep(
        plan,
        'boomer-analyst',
        'analyst',
        'launch-readiness',
        `Analyze launch readiness, policy risk, and workload shape for: ${normalized.objective}`,
        'Translate the objective into launch blockers, approvals, and sequencing guidance.',
        'Launch checklist, risk assessment, and approval guidance.',
      );
    }

    if (needsBuild) {
      buildStep(
        plan,
        'boomer-coder',
        'coder',
        'build-runtime',
        `Implement and integrate the deliverables required for: ${normalized.objective}`,
        'Turn the planned workload into code, product, and integration output.',
        'Production-ready implementation artifacts and integration notes.',
      );
    }

    if (!plan.length) {
      buildStep(
        plan,
        'boomer-analyst',
        'analyst',
        'general-analysis',
        `Decompose and stage the next best workload for: ${normalized.objective}`,
        'Provide a default governed decomposition when the objective is underspecified.',
        'Scoped work plan with recommended next execution steps.',
      );
    }

    return plan;
  },

  getLaunchReadiness(normalized: NormalizedIntent, plan: AgentWorkloadStep[]) {
    let score = 58;

    if (normalized.outputs.length > 0) score += 12;
    if (normalized.risks.length > 0) score += 6;
    if (normalized.approvals_needed.length > 0) score += 4;
    if (plan.some((step) => step.role === 'researcher')) score += 6;
    if (plan.some((step) => step.role === 'analyst')) score += 7;
    if (plan.some((step) => step.role === 'coder')) score += 7;

    return Math.min(score, 96);
  },

  getBlockers(normalized: NormalizedIntent, plan: AgentWorkloadStep[]) {
    const blockers: string[] = [];

    if (!plan.some((step) => step.role === 'coder') && containsAny(normalized.objective.toLowerCase(), ['build', 'launch', 'ship', 'deploy'])) {
      blockers.push('No build-capable agent was assigned to an implementation-heavy objective.');
    }

    if (!normalized.outputs.length) {
      blockers.push('Intent has no explicit outputs yet; delivery criteria are still loose.');
    }

    if (!normalized.approvals_needed.length) {
      blockers.push('No human approval gates were identified for launch-sensitive work.');
    }

    return blockers;
  },

  getSnapshot(organizationId: string, normalized?: NormalizedIntent): AgentFleetSnapshot {
    const referenceIntent = normalized ?? {
      objective: 'Launch the governed runtime workload with active agents.',
      constraints: [],
      inputs: [],
      outputs: ['Active agent fleet', 'Launch workload sequence'],
      risks: ['Unknown launch blockers'],
      approvals_needed: ['Final launch sign-off'],
    };

    const recommendedSequence = this.planWorkload(referenceIntent);
    const activeAgentIds = new Set(recommendedSequence.map((step) => step.agentId));
    const agents = FLEET.map((agent) => ({
      ...agent,
      workloadStatus: activeAgentIds.has(agent.id) ? 'active' as const : 'standby' as const,
    }));

    return {
      organizationId,
      activeAgents: agents.filter((agent) => agent.workloadStatus === 'active').length,
      readyAgents: agents.filter((agent) => agent.status === 'ready' || agent.status === 'running').length,
      launchReadiness: this.getLaunchReadiness(referenceIntent, recommendedSequence),
      blockers: this.getBlockers(referenceIntent, recommendedSequence),
      recommendedSequence,
      agents,
    };
  },
};