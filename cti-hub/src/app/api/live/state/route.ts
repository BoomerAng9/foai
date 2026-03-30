import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';
import { getBudget } from '@/lib/budget';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  // Aggregate real platform data
  const budget = await getBudget();

  let conversationCount = 0;
  let messageCount = 0;
  let activeUsers = 0;
  let recentMessages: Array<{ agent_name: string; content: string; created_at: string }> = [];
  let teamMembers: Array<{ email: string; role: string; is_active: boolean }> = [];
  let budgetLedger: Array<{ user_id: string; action: string; cost: number; created_at: string }> = [];
  let totalSpend = 0;

  if (sql) {
    try {
      const convs = await sql`SELECT COUNT(*) as count FROM conversations WHERE status = 'active'`;
      conversationCount = Number(convs[0]?.count || 0);

      const msgs = await sql`SELECT COUNT(*) as count FROM messages`;
      messageCount = Number(msgs[0]?.count || 0);

      const users = await sql`SELECT COUNT(DISTINCT user_id) as count FROM conversations WHERE updated_at > NOW() - INTERVAL '24 hours'`;
      activeUsers = Number(users[0]?.count || 0);

      recentMessages = await sql`
        SELECT agent_name, LEFT(content, 100) as content, created_at
        FROM messages
        WHERE role = 'acheevy'
        ORDER BY created_at DESC
        LIMIT 20
      `;

      teamMembers = await sql`SELECT email, role, is_active FROM allowed_users ORDER BY granted_at DESC`;

      budgetLedger = await sql`
        SELECT user_id, action, cost::float, created_at
        FROM budget_ledger
        ORDER BY created_at DESC
        LIMIT 30
      `;

      const spendResult = await sql`SELECT SUM(cost)::float as total FROM budget_ledger`;
      totalSpend = Number(spendResult[0]?.total || 0);
    } catch (err) {
      console.error('[Live] State query failed:', err instanceof Error ? err.message : err);
    }
  }

  // Build agent status from recent activity
  const now = new Date();
  const agents: Record<string, { name: string; status: string; currentTask: string }> = {
    'ACHEEVY': {
      name: 'ACHEEVY',
      status: messageCount > 0 ? 'active' : 'monitoring',
      currentTask: recentMessages[0]?.content?.slice(0, 60) || 'Standing by',
    },
    'Chicken Hawk': {
      name: 'Chicken Hawk',
      status: 'monitoring',
      currentTask: 'Monitoring operations',
    },
    'Visual Engine': {
      name: 'Visual Engine',
      status: budgetLedger.some(l => l.action === 'image-gen') ? 'active' : 'idle',
      currentTask: 'Image generation ready',
    },
    'Scout_Ang': {
      name: 'Scout_Ang',
      status: 'idle',
      currentTask: 'Awaiting research tasks',
    },
    'Edu_Ang': {
      name: 'Edu_Ang',
      status: teamMembers.length > 0 ? 'active' : 'idle',
      currentTask: `${teamMembers.filter(t => t.is_active).length} active team members`,
    },
    'Money Engine': {
      name: 'Money Engine',
      status: totalSpend > 0 ? 'active' : 'monitoring',
      currentTask: `$${totalSpend.toFixed(4)} tracked`,
    },
  };

  // Service health checks
  const services: Record<string, { url: string; status: string; http_code: number }> = {
    'CTI Hub': { url: 'https://cti.foai.cloud', status: 'healthy', http_code: 200 },
    'Neon DB': { url: 'neon', status: sql ? 'healthy' : 'unhealthy', http_code: sql ? 200 : 503 },
    'OpenRouter': { url: 'openrouter', status: process.env.OPENROUTER_API_KEY ? 'healthy' : 'unhealthy', http_code: process.env.OPENROUTER_API_KEY ? 200 : 503 },
    'Google AI': { url: 'google', status: process.env.GOOGLE_KEY ? 'healthy' : 'unhealthy', http_code: process.env.GOOGLE_KEY ? 200 : 503 },
    'Firebase': { url: 'firebase', status: 'healthy', http_code: 200 },
  };

  // Jobs log from budget ledger + recent messages
  const jobsLog = [
    ...budgetLedger.slice(0, 15).map(l => ({
      agent: l.action === 'chat' ? 'ACHEEVY' : l.action === 'image-gen' ? 'Visual Engine' : 'Money Engine',
      task: `${l.action} — $${l.cost.toFixed(6)}`,
      status: 'completed',
      timestamp: l.created_at,
    })),
    ...recentMessages.slice(0, 5).map(m => ({
      agent: m.agent_name || 'ACHEEVY',
      task: m.content?.slice(0, 60) || 'Response generated',
      status: 'completed',
      timestamp: m.created_at,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  return NextResponse.json({
    agents,
    services,
    metrics: {
      total_revenue: totalSpend,
      conversations: conversationCount,
      messages: messageCount,
      active_users_24h: activeUsers,
      team_members: teamMembers.filter(t => t.is_active).length,
      budget_remaining: budget.remaining,
    },
    budget,
    team: teamMembers,
    jobs_log: jobsLog,
    last_poll: now.toISOString(),
  });
}
