/**
 * 3-Consultant Engagement
 * =======================
 * Per Rish 2026-04-08:
 *   "But if it's a larger project, then they bring in the consulting,
 *    and then they do the three consultant engagement where we have
 *    the note and ACHEEVY, and then the consultant."
 *
 * For larger projects, Spinner spawns a three-way panel:
 *   1. NOTE / AVVA NOON Guardian — validates RTCCF + V.I.B.E.
 *   2. ACHEEVY — customer-facing executive
 *   3. The Consultant — a domain-specialist Boomer_Ang or external
 *
 * The user watches the three-way conversation play out in the PiP
 * window. This is the differentiator that justifies the platform —
 * customers see the virtual organization actually working.
 *
 * NOTE interpretation: best read is that NOTE is the AVVA NOON
 * Guardian half (the validation persona). If NOTE is a separate
 * persona, this module needs an update — flagged in
 * project_spinner_feature.md.
 */

import { randomUUID } from 'node:crypto';
import type { ConsultantPanel, ConsultantMessage } from './types.js';

const _panels = new Map<string, ConsultantPanel>();

export interface SpawnPanelInput {
  jobId: string;
  scope: string;
  /** Suggested consultant agent id, e.g. 'boomer_cto', 'boomer_cmo' */
  consultantAgentId?: string;
}

export function spawnPanel(input: SpawnPanelInput): ConsultantPanel {
  const panel: ConsultantPanel = {
    jobId: input.jobId,
    members: {
      note: 'avva_noon',
      acheevy: 'acheevy',
      consultant: {
        agentId: input.consultantAgentId ?? matchConsultant(input.scope),
        department: '',
        reason: 'Matched by scope keywords',
      },
    },
    status: 'forming',
    transcript: [],
  };
  _panels.set(input.jobId, panel);
  return panel;
}

/**
 * Match a consultant agent to the scope by keyword. Returns a
 * Boomer_Ang id from the seeded roster (per aims-pmo migrations).
 */
function matchConsultant(scope: string): string {
  const lc = scope.toLowerCase();
  if (/(?:code|build|tech|api|deploy|infrastructure)/i.test(lc)) return 'boomer_cto';
  if (/(?:marketing|campaign|content|brand)/i.test(lc)) return 'boomer_cmo';
  if (/(?:cost|price|finance|invoice|budget)/i.test(lc)) return 'boomer_cfo';
  if (/(?:operations|process|workflow|automation)/i.test(lc)) return 'boomer_coo';
  if (/(?:design|ui|ux|graphics|page|layout)/i.test(lc)) return 'boomer_cdo';
  if (/(?:publish|article|paper|blog)/i.test(lc)) return 'boomer_cpo';
  // Default fallback
  return 'boomer_coo';
}

export function getPanel(jobId: string): ConsultantPanel | undefined {
  return _panels.get(jobId);
}

export function appendMessage(jobId: string, message: ConsultantMessage): void {
  const panel = _panels.get(jobId);
  if (!panel) return;
  if (!panel.transcript) panel.transcript = [];
  panel.transcript.push(message);
}

export function setPanelStatus(
  jobId: string,
  status: 'forming' | 'consulting' | 'executing' | 'completed',
): void {
  const panel = _panels.get(jobId);
  if (!panel) return;
  panel.status = status;
}

export function _resetPanelsForTesting(): void {
  _panels.clear();
}
