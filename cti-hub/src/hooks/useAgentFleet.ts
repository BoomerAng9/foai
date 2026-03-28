'use client';

import { useEffect, useState } from 'react';

export interface FleetAgentCard {
  id: string;
  name: string;
  role: string;
  provider: string;
  status: string;
  description: string;
  health: number;
  tasksHandled: number;
  workloadStatus: 'active' | 'standby';
}

export interface FleetStep {
  step: number;
  agentId: string;
  role: string;
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
  recommendedSequence: FleetStep[];
  agents: FleetAgentCard[];
}

const FALLBACK_SNAPSHOT: AgentFleetSnapshot = {
  organizationId: 'offline-org',
  activeAgents: 0,
  readyAgents: 0,
  launchReadiness: 0,
  blockers: ['Agent fleet is unavailable.'],
  recommendedSequence: [],
  agents: [],
};

export function useAgentFleet(organizationId?: string, intent?: string) {
  const [snapshot, setSnapshot] = useState<AgentFleetSnapshot>(FALLBACK_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFleet() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (organizationId) params.set('orgId', organizationId);
        if (intent) params.set('intent', intent);

        const response = await fetch(`/api/agents?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch agent fleet');
        }

        const data = (await response.json()) as { snapshot: AgentFleetSnapshot };
        if (isMounted) {
          setSnapshot(data.snapshot);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unknown fleet error');
          setSnapshot(FALLBACK_SNAPSHOT);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFleet();
    const interval = window.setInterval(loadFleet, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [organizationId, intent]);

  return { snapshot, loading, error };
}