/**
 * Picker_Ang (Capability Router)
 * Routes needs by capability first, provider second.
 */

import { agentFleet } from './agent_fleet';

export interface CapabilityMetadata {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'branch';
  provider: string;
  cost_index: number; // 1-10
  latency_index: number; // 1-10
  quality_index: number; // 1-10
  tags: string[];
}

export const CAPABILITY_REGISTRY: CapabilityMetadata[] = [
  {
    id: 'mercury-2',
    name: 'Mercury-2 (Fast Reasoning)',
    type: 'llm',
    provider: 'OpenRouter',
    cost_index: 2,
    latency_index: 1,
    quality_index: 7,
    tags: ['fast', 'huddle', 'intent']
  },
  {
    id: 'deep-research',
    name: 'DeerFlow Research',
    type: 'branch',
    provider: 'Native',
    cost_index: 8,
    latency_index: 9,
    quality_index: 10,
    tags: ['research', 'slow', 'comprehensive']
  },
  {
    id: 'launch-readiness',
    name: 'Launch Readiness Analyst',
    type: 'branch',
    provider: 'Boomer_Ang Analyst',
    cost_index: 4,
    latency_index: 3,
    quality_index: 9,
    tags: ['launch', 'analysis', 'risk']
  },
  {
    id: 'build-runtime',
    name: 'Runtime Builder',
    type: 'branch',
    provider: 'Boomer_Ang Builder',
    cost_index: 5,
    latency_index: 4,
    quality_index: 9,
    tags: ['coding', 'build', 'integration', 'agent']
  },
  {
    id: 'general-analysis',
    name: 'General Analysis',
    type: 'llm',
    provider: 'Boomer_Ang Analyst',
    cost_index: 3,
    latency_index: 2,
    quality_index: 8,
    tags: ['analysis', 'planning']
  }
];

export const pickerAng = {
  route: async (capability_needed: string, constraints: string[]): Promise<CapabilityMetadata | null> => {
    // Basic filtering logic
    const matches = CAPABILITY_REGISTRY.filter(c => 
      c.tags.includes(capability_needed) || c.id === capability_needed
    );

    if (matches.length === 0) return null;

    const prefersSpeed = constraints.some((constraint) => constraint.toLowerCase().includes('fast'));
    const prefersQuality = constraints.some((constraint) =>
      constraint.toLowerCase().includes('quality') || constraint.toLowerCase().includes('launch'),
    );

    const scored = matches
      .map((match) => {
        const fleetBoost = agentFleet.list().some((agent) => agent.provider.includes(match.provider) || agent.tags.some((tag) => match.tags.includes(tag)))
          ? 1
          : 0;

        const score =
          (prefersQuality ? match.quality_index * 2 : match.quality_index) -
          (prefersSpeed ? match.latency_index : 0) -
          Math.round(match.cost_index / 2) +
          fleetBoost;

        return { match, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0]?.match ?? null;
  }
};
