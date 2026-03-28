export interface NormalizedIntent {
  objective: string;
  constraints: string[];
  inputs: string[];
  outputs: string[];
  risks: string[];
  approvals_needed: string[];
}

function extractQuotedInputs(intent: string) {
  const matches = intent.match(/"([^"]+)"|'([^']+)'/g) ?? [];
  return matches.map((value) => value.replace(/^['"]|['"]$/g, ''));
}

function inferOutputs(intent: string) {
  const lowered = intent.toLowerCase();
  const outputs = new Set<string>();

  if (/(chat|prompt|copy|assistant|message)/.test(lowered)) outputs.add('Single chat surface for ACHEEVY');
  if (/(deploy|launch|ship|handoff)/.test(lowered)) outputs.add('Launch-ready deployment plan');
  if (/(integrat|api|mcp|gui)/.test(lowered)) outputs.add('Integrated GUI, MCP, and API surface');
  if (/(settings|account|billing|workspace)/.test(lowered)) outputs.add('Simple user-facing account settings');
  if (/(agent|runtime|command center|circuit box)/.test(lowered)) outputs.add('Owner-only operational controls');
  if (outputs.size === 0) outputs.add('Structured response with actionable next steps');

  return [...outputs];
}

function inferRisks(intent: string) {
  const lowered = intent.toLowerCase();
  const risks = new Set<string>();

  if (/(launch|deploy|ship)/.test(lowered)) risks.add('Deployment readiness must be validated before release.');
  if (/(auth|account|workspace)/.test(lowered)) risks.add('Account provisioning and workspace access must remain consistent.');
  if (/(agent|runtime|command center|circuit box)/.test(lowered)) risks.add('Owner-only controls must stay hidden from standard users.');
  if (/(payment|billing|stripe)/.test(lowered)) risks.add('Billing actions require explicit confirmation before going live.');

  return [...risks];
}

function inferApprovals(intent: string) {
  const lowered = intent.toLowerCase();
  const approvals = new Set<string>();

  if (/(launch|deploy|ship)/.test(lowered)) approvals.add('Owner approval for production launch.');
  if (/(billing|payment|stripe)/.test(lowered)) approvals.add('Owner approval for billing configuration and live charges.');
  if (/(agent|runtime|command center|circuit box)/.test(lowered)) approvals.add('Owner approval for command-center visibility and operational access.');
  if (approvals.size === 0) approvals.add('Owner review before publishing major user-facing workflow changes.');

  return [...approvals];
}

function normalizeLocally(intent: string): NormalizedIntent {
  return {
    objective: intent.trim(),
    constraints: [
      'Keep the user-facing experience simple and accessible.',
      'Hide owner-only operational controls from standard users.',
    ],
    inputs: extractQuotedInputs(intent),
    outputs: inferOutputs(intent),
    risks: inferRisks(intent),
    approvals_needed: inferApprovals(intent),
  };
}

export const ntntn = {
  normalize: async (intent: string): Promise<NormalizedIntent> => {
    return normalizeLocally(intent);
  }
};
