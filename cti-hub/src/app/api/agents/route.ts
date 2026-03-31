import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { AGENTS, DEPARTMENTS, getAgentsForTier, getDepartmentsForRole } from '@/lib/agents/registry';
import { getBudget } from '@/lib/budget';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const isOwner = auth.role === 'owner';
  const userTier = isOwner ? 'enterprise' : 'starter'; // TODO: get from profile

  const departments = getDepartmentsForRole(isOwner);
  const agents = isOwner ? AGENTS : getAgentsForTier(userTier as 'starter' | 'growth' | 'enterprise');

  // Get live state from DB
  let recentActivity: Array<{ agent: string; action: string; target: string; message: string; timestamp: string }> = [];
  let activeTasks: Array<{ agent: string; task: string; status: string; started_at: string }> = [];

  if (sql) {
    try {
      // Recent agent-to-agent messages (from budget_ledger as proxy for now)
      const ledger = await sql`
        SELECT user_id, action, cost::float, created_at
        FROM budget_ledger
        ORDER BY created_at DESC
        LIMIT 20
      `;
      recentActivity = ledger.map(l => ({
        agent: l.action === 'chat' ? 'ACHEEVY' : l.action === 'image-gen' ? 'Visual Engine' : 'CFO_Ang',
        action: l.action,
        target: 'User',
        message: `${l.action} — $${Number(l.cost).toFixed(6)}`,
        timestamp: l.created_at,
      }));

      // Recent messages as task proxy
      const msgs = await sql`
        SELECT agent_name, LEFT(content, 80) as content, created_at
        FROM messages
        WHERE role = 'acheevy'
        ORDER BY created_at DESC
        LIMIT 10
      `;
      activeTasks = msgs.map(m => ({
        agent: m.agent_name || 'ACHEEVY',
        task: m.content || 'Processing',
        status: 'completed',
        started_at: m.created_at,
      }));
    } catch (err) {
      console.error('[Agents] State query failed:', err instanceof Error ? err.message : err);
    }
  }

  const budget = await getBudget();

  // Build agent states (simulated from real data)
  const agentStates = agents.map(agent => ({
    ...agent,
    status: getAgentStatus(agent.id, recentActivity),
    currentTask: getAgentTask(agent.id, activeTasks),
    lastActive: getLastActive(agent.id, recentActivity),
  }));

  return NextResponse.json({
    departments,
    agents: agentStates,
    activity: recentActivity,
    tasks: activeTasks,
    budget: {
      remaining: budget.remaining,
      starting: budget.starting,
      exhausted: budget.exhausted,
    },
    meta: {
      isOwner,
      tier: userTier,
      totalAgents: AGENTS.length,
      visibleAgents: agents.length,
    },
  });
}

function getAgentStatus(agentId: string, activity: Array<{ agent: string; timestamp: string }>): string {
  // ACHEEVY and CFO_Ang are always monitoring
  if (agentId === 'acheevy' || agentId === 'cfo_ang') return 'monitoring';

  // Check if agent had recent activity (last 5 min)
  const recent = activity.find(a =>
    a.agent.toLowerCase().replace(/[_\s]/g, '') === agentId.toLowerCase().replace(/[_\s]/g, '')
  );
  if (recent) {
    const age = Date.now() - new Date(recent.timestamp).getTime();
    if (age < 5 * 60 * 1000) return 'active';
    if (age < 30 * 60 * 1000) return 'idle';
  }
  return 'idle';
}

function getAgentTask(agentId: string, tasks: Array<{ agent: string; task: string }>): string {
  const task = tasks.find(t =>
    t.agent.toLowerCase().replace(/[_\s]/g, '') === agentId.toLowerCase().replace(/[_\s]/g, '')
  );
  return task?.task || 'Standing by';
}

function getLastActive(agentId: string, activity: Array<{ agent: string; timestamp: string }>): string | null {
  const recent = activity.find(a =>
    a.agent.toLowerCase().replace(/[_\s]/g, '') === agentId.toLowerCase().replace(/[_\s]/g, '')
  );
  return recent?.timestamp || null;
}
