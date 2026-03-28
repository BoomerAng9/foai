import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents
 * Returns the current agent roster.
 * In production, this would read from the gateway.
 * In demo mode, returns the default Lil_Hawks fleet.
 */
export async function GET() {
  return NextResponse.json({
    agents: DEFAULT_ROSTER,
    count: DEFAULT_ROSTER.length,
    maxParallel: 6,
  });
}

/**
 * POST /api/agents
 * Add a new agent to the fleet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, backend, role, model } = body;

    if (!name || !backend || !role) {
      return NextResponse.json(
        { error: 'name, backend, and role are required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: `lil-${name.toLowerCase().replace(/\s+/g, '-')}-hawk`,
        name: `Lil_${name}_Hawk`,
        displayName: name,
        backend,
        role,
        model: model || 'claude-sonnet-4-6',
        status: 'idle',
        currentRoom: 'desk',
        currentTask: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

const DEFAULT_ROSTER = [
  { id: 'lil-trae-hawk', name: 'Lil_TRAE_Hawk', backend: 'TRAE Agent', role: 'Heavy Coding & Refactors' },
  { id: 'lil-coding-hawk', name: 'Lil_Coding_Hawk', backend: 'OpenCode', role: 'Plan-First Feature Work' },
  { id: 'lil-agent-hawk', name: 'Lil_Agent_Hawk', backend: 'Agent Zero', role: 'OS/Browser/CLI Workflows' },
  { id: 'lil-flow-hawk', name: 'Lil_Flow_Hawk', backend: 'n8n', role: 'SaaS/CRM Automation' },
  { id: 'lil-sand-hawk', name: 'Lil_Sand_Hawk', backend: 'OpenSandbox', role: 'Safe Code Execution' },
  { id: 'lil-memory-hawk', name: 'Lil_Memory_Hawk', backend: 'CoPaw/ReMe', role: 'RAG Memory' },
  { id: 'lil-graph-hawk', name: 'Lil_Graph_Hawk', backend: 'LangGraph', role: 'Stateful Workflows' },
  { id: 'lil-back-hawk', name: 'Lil_Back_Hawk', backend: 'InsForge', role: 'LLM-Native Backends' },
  { id: 'lil-viz-hawk', name: 'Lil_Viz_Hawk', backend: 'SimStudio', role: 'Visual Monitoring' },
  { id: 'lil-deep-hawk', name: 'Lil_Deep_Hawk', backend: 'DeerFlow 2.0', role: 'SuperAgent with Squads' },
];
