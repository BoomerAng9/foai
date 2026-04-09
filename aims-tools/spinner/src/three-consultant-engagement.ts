/**
 * 3-Consultant Engagement
 * =======================
 * Source of truth: cti-hub/src/lib/acheevy/guide-me-engine.ts
 *
 * Three Boomer_Ang-class agents already wired in production:
 *   1. Consult_Ang — fast responder, active listener (Qwen 3.6 Plus free)
 *   2. ACHEEVY    — senior consultant, execution model
 *   3. Note_Ang   — session recorder, audit + pattern detection
 *                   (NVIDIA Nemotron Nano free)
 *
 * Spinner spawns this 3-way panel for larger projects detected by the
 * RFP-BAMARAM intent classifier. The user watches the three-way
 * conversation play out in the PiP window — this is the differentiator
 * that justifies the virtual-organization positioning.
 *
 * CRITICAL: AVVA NOON is NOT involved in the chat or in this panel.
 * AVVA NOON is the Brain of SmelterOS at the platform layer; SmelterOS
 * is its own brick in the ACHIEVEMOR ecosystem. The chat surface +
 * 3-Consultant Engagement live at the customer-company layer where
 * ACHEEVY is the top of the chain. Earlier memory had a wrong "NOTE =
 * NOON Guardian" interpretation — that was corrected 2026-04-08 once
 * Note_Ang was located in the existing guide-me-engine code.
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
      // Note_Ang — the literal note-taker. NOT AVVA NOON. AVVA NOON
      // operates at the SmelterOS platform layer and is never in chat.
      note: 'note_ang',
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
