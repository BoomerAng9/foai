/**
 * Task & Automation multipliers — applied to token consumption.
 * Source: aimanagedsolutions.cloud pricing page.
 *
 * Effective multiplier is a weighted average of the user's actual
 * task mix (computed at billing time by TPS_Ang).
 *
 * NOTE: Full Autonomous Swarm has been bumped to 3.5× from 3.0×
 * per Rish 2026-04-08: "make it FELT in case they are trying to
 * study our product to recreate it. The plan at least secures the
 * purchase for the cloning they will do."
 */

import type { TaskMultiplier } from './types.js';

export const SEED_TASK_MULTIPLIERS: TaskMultiplier[] = [
  {
    taskType: 'code-generation',
    label: 'Code Generation',
    multiplier: 1.0,
    description: 'Standard token consumption — baseline',
  },
  {
    taskType: 'code-review',
    label: 'Code Review',
    multiplier: 1.2,
    description: 'Contextual analysis + suggestions',
  },
  {
    taskType: 'workflow-automation',
    label: 'Workflow Automation',
    multiplier: 1.3,
    description: 'Sequential bot pipelines + triggers',
  },
  {
    taskType: 'security-audit',
    label: 'Security Audit',
    multiplier: 1.45,
    description: 'ORACLE-driven vulnerability scanning',
  },
  {
    taskType: 'architecture-planning',
    label: 'Architecture Planning',
    multiplier: 1.5,
    description: 'Multi-system design + blueprints',
  },
  {
    taskType: 'business-intelligence',
    label: 'Business Intelligence',
    multiplier: 1.6,
    description: 'Data analysis + market reports',
  },
  {
    taskType: 'deployment',
    label: 'Deployment Jobs',
    multiplier: 1.1,
    description: 'CI/CD pipeline orchestration',
  },
  {
    taskType: 'multi-agent',
    label: 'Multi-Agent Orchestration',
    multiplier: 2.0,
    description: 'Parallel agent coordination',
  },
  {
    taskType: 'full-autonomous',
    label: 'Full Autonomous Swarm',
    multiplier: 3.5,
    description: 'Self-healing recursive agent swarm — anti-cloning friction tier',
  },
];
