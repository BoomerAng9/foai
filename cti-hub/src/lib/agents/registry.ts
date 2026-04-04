/**
 * Agent Registry — The single source of truth for the FOAI agent workforce.
 *
 * This data layer is RENDERER-AGNOSTIC. It feeds:
 *   v1: Flat agent cards (current)
 *   v2: hawk3d 3D floor plan (future)
 *   v3: NVIDIA Omniverse/Cosmos (future future)
 *
 * The registry defines WHO the agents are. Runtime state (what they're doing)
 * comes from the agent state API.
 */

export type AgentTier = 'command' | 'strategic' | 'tactical' | 'specialist';
export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline' | 'monitoring';
export type DepartmentId = 'CMD' | 'OPS' | 'SALES' | 'CONTENT' | 'RESEARCH' | 'BIZDEV' | 'TECH' | 'FIN' | 'DSN' | 'PRD' | 'HR' | 'DT';

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  department: DepartmentId;
  tier: AgentTier;
  persona: string;           // One-line personality
  avatar: string;            // Path to image in /public
  capabilities: string[];    // What this agent can do
  mcpToolName?: string;      // MCP tool name if exposed
  subscriptionTier: 'starter' | 'growth' | 'enterprise' | 'all';  // Min tier to access
  individualPrice?: number;  // PlugMeIn individual monthly price (if hireable standalone)
  hireable: boolean;         // Can users hire this agent individually?
  // hawk3d future fields (don't block, don't build)
  room?: string;             // Room ID for 3D placement
  position?: { x: number; y: number; z: number };
}

export interface Department {
  id: DepartmentId;
  name: string;
  description: string;
  color: string;
  supervisor: string;        // Agent ID of department head
  ownerOnly: boolean;        // If true, only owner sees this department
}

// ── Departments ─────────────────────────────────────────

export const DEPARTMENTS: Department[] = [
  { id: 'CMD', name: 'Command', description: 'Executive leadership and strategic direction', color: '#E8A020', supervisor: 'acheevy', ownerOnly: false },
  { id: 'RESEARCH', name: 'Research', description: 'Data intelligence, web scraping, opportunity sourcing', color: '#3B82F6', supervisor: 'scout_ang', ownerOnly: false },
  { id: 'CONTENT', name: 'Content', description: 'SEO content, marketing copy, social media', color: '#8B5CF6', supervisor: 'content_ang', ownerOnly: false },
  { id: 'SALES', name: 'Sales', description: 'Enrollment generation, affiliate management, revenue', color: '#22C55E', supervisor: 'edu_ang', ownerOnly: false },
  { id: 'BIZDEV', name: 'Business Development', description: 'Pipeline analytics, lead generation, growth', color: '#F59E0B', supervisor: 'biz_ang', ownerOnly: false },
  { id: 'OPS', name: 'Operations', description: 'Fleet health, monitoring, incident detection', color: '#EF4444', supervisor: 'ops_ang', ownerOnly: false },
  { id: 'TECH', name: 'Technology', description: 'Software engineering, architecture, infrastructure', color: '#06B6D4', supervisor: 'chicken_hawk', ownerOnly: true },
  { id: 'FIN', name: 'Finance', description: 'Receivables, bookkeeping, pricing', color: '#10B981', supervisor: 'cfo_ang', ownerOnly: true },
  { id: 'DSN', name: 'Design', description: 'UX, brand, interface design', color: '#EC4899', supervisor: 'cdo_ang', ownerOnly: true },
  { id: 'PRD', name: 'Product', description: 'Product management, documentation', color: '#F97316', supervisor: 'cpo_ang', ownerOnly: true },
  { id: 'HR', name: 'Human Resources', description: 'Agent evaluations, onboarding, culture', color: '#14B8A6', supervisor: 'betty_ann_ang', ownerOnly: true },
  { id: 'DT', name: 'Digital Transform', description: 'Automation, memory systems, graph analysis', color: '#A855F7', supervisor: 'astra_ang', ownerOnly: true },
];

// ── Agent Profiles ──────────────────────────────────────

export const AGENTS: AgentProfile[] = [
  // ── COMMAND ──
  {
    id: 'consult_ang',
    name: 'Consult_Ang',
    role: 'Senior Consultant (Fast)',
    department: 'CMD',
    tier: 'command',
    persona: 'Quick, adaptive, actively listening. First point of contact. Keeps the conversation moving while ACHEEVY processes.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Active listening', 'Quick responses', 'Clarifying questions', 'Context bridging', 'Voice interaction'],
    subscriptionTier: 'all', hireable: false,
  },
  {
    id: 'note_ang',
    name: 'Note_Ang',
    role: 'Session Recorder',
    department: 'CMD',
    tier: 'command',
    persona: 'Silent. Observant. Captures everything. Detects patterns. Feeds context to the team.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Session recording', 'Pattern detection', 'Context summarization', 'Audit logging', 'Inference layer'],
    subscriptionTier: 'all', hireable: false,
  },
  {
    id: 'acheevy',
    name: 'ACHEEVY',
    role: 'Digital CEO',
    department: 'CMD',
    tier: 'command',
    persona: 'Confident, decisive, revenue-first. Delegates everything. Never does manual work.',
    avatar: '/acheevy-helmet.png',
    capabilities: ['Strategic planning', 'Agent deployment', 'Cross-department coordination', 'Executive decisions'],
    mcpToolName: 'acheevy_delegate',
    subscriptionTier: 'all', hireable: false,
  },
  {
    id: 'chicken_hawk',
    name: 'Chicken Hawk',
    role: 'Tactical Commander',
    department: 'TECH',
    tier: 'command',
    persona: 'Sharp, tactical, zero-tolerance for sloppy work. Routes tasks to the right Lil_Hawk.',
    avatar: '/acheevy-helmet.png',
    capabilities: ['Intent classification', 'Lil_Hawk dispatch', 'Review gate', 'Quality control'],
    subscriptionTier: 'growth', hireable: false,
  },

  // ── BOOMER_ANGS (Strategic) ──
  {
    id: 'scout_ang',
    name: 'Scout_Ang',
    role: 'Research Analyst',
    department: 'RESEARCH',
    tier: 'strategic',
    persona: 'Methodical, data-driven, always sourcing. Talks like an intelligence analyst.',
    avatar: '/agents/scout-ang.png',
    capabilities: ['Web scraping', 'Opportunity sourcing', 'Institutional research', 'Data intelligence'],
    mcpToolName: 'scout_ang_research',
    subscriptionTier: 'starter', hireable: true, individualPrice: 97,
  },
  {
    id: 'content_ang',
    name: 'Content_Ang',
    role: 'Creative Director',
    department: 'CONTENT',
    tier: 'strategic',
    persona: 'Creative, brand-aware, always on message. Talks like a CMO.',
    avatar: '/agents/content-ang.png',
    capabilities: ['SEO content', 'Blog posts', 'Landing pages', 'Social media', 'Email campaigns'],
    mcpToolName: 'content_ang_create',
    subscriptionTier: 'starter', hireable: true, individualPrice: 127,
  },
  {
    id: 'edu_ang',
    name: 'Edu_Ang',
    role: 'Sales Lead',
    department: 'SALES',
    tier: 'strategic',
    persona: 'Driven, numbers-focused, always closing. Talks like a VP of Sales.',
    avatar: '/agents/edu-ang.png',
    capabilities: ['Enrollment generation', 'Affiliate management', 'Revenue attribution', 'Commission tracking'],
    mcpToolName: 'edu_ang_enroll',
    subscriptionTier: 'starter', hireable: true, individualPrice: 147,
  },
  {
    id: 'biz_ang',
    name: 'Biz_Ang',
    role: 'Growth Strategist',
    department: 'BIZDEV',
    tier: 'strategic',
    persona: 'Big-picture, pipeline-obsessed, relationship builder. Talks like a BD director.',
    avatar: '/agents/biz-ang.png',
    capabilities: ['Pipeline analytics', 'Lead generation', 'Client retention', 'Campaign performance'],
    mcpToolName: 'biz_ang_pipeline',
    subscriptionTier: 'growth', hireable: true, individualPrice: 97,
  },
  {
    id: 'ops_ang',
    name: 'Ops_Ang',
    role: 'Operations Chief',
    department: 'OPS',
    tier: 'strategic',
    persona: 'Always watching, never sleeping. Talks like a NOC engineer.',
    avatar: '/agents/ops-ang.png',
    capabilities: ['Fleet monitoring', 'Incident detection', 'Uptime tracking', 'Historical recall'],
    mcpToolName: 'ops_ang_monitor',
    subscriptionTier: 'growth', hireable: true, individualPrice: 197,
  },
  {
    id: 'iller_ang',
    name: 'Iller_Ang',
    role: 'Creative Director',
    department: 'DSN',
    tier: 'strategic',
    persona: 'Direct. Visual-first. Doesn\'t explain designs — shows them. Speaks in references. Opinionated about typography, spacing, and color.',
    avatar: '/agents/iller-ang.png',
    capabilities: ['Player cards', 'Broadcast graphics', 'Character art', 'NFT assets', 'Motion landing pages', 'Merchandise concepts', 'Podcast visuals', 'Profile cards', 'Digital art'],
    mcpToolName: 'iller_ang_create',
    subscriptionTier: 'growth', hireable: true, individualPrice: 197,
  },

  // ── LIL_HAWKS (Tactical/Specialist) ──
  {
    id: 'lil_coding_hawk',
    name: 'Lil_Coding_Hawk',
    role: 'Software Engineer',
    department: 'TECH',
    tier: 'tactical',
    persona: 'Plan-first, approval-gated. Clean code or no code.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Feature development', 'Plan-first coding', 'Code review'],
    mcpToolName: 'lil_coding_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_trae_hawk',
    name: 'Lil_TRAE_Hawk',
    role: 'Senior Developer',
    department: 'TECH',
    tier: 'tactical',
    persona: 'Heavy lifter. Repo-wide refactors. Doesn\'t ask permission.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Large refactors', 'Repo-wide changes', 'Architecture work'],
    mcpToolName: 'lil_trae_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_deep_hawk',
    name: 'Lil_Deep_Hawk',
    role: 'Project Lead',
    department: 'TECH',
    tier: 'tactical',
    persona: 'Coordinator. Squad mode. DeerFlow 2.0 powered.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Multi-agent coordination', 'Squad mode', 'Complex project management'],
    mcpToolName: 'lil_deep_hawk',
    subscriptionTier: 'enterprise', hireable: false,
  },
  {
    id: 'lil_agent_hawk',
    name: 'Lil_Agent_Hawk',
    role: 'Automation Specialist',
    department: 'TECH',
    tier: 'specialist',
    persona: 'OS-level, browser, CLI. Anything that runs on a machine.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Browser automation', 'CLI workflows', 'File operations'],
    mcpToolName: 'lil_agent_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_flow_hawk',
    name: 'Lil_Flow_Hawk',
    role: 'Integration Engineer',
    department: 'TECH',
    tier: 'specialist',
    persona: 'Connects everything. n8n powered. Webhook wizard.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['SaaS integrations', 'Webhook orchestration', 'Payment automation'],
    mcpToolName: 'lil_flow_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_memory_hawk',
    name: 'Lil_Memory_Hawk',
    role: 'Knowledge Manager',
    department: 'DT',
    tier: 'specialist',
    persona: 'Remembers everything. RAG-powered. Semantic search.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Long-term memory', 'Semantic search', 'Knowledge base management'],
    mcpToolName: 'lil_memory_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_back_hawk',
    name: 'Lil_Back_Hawk',
    role: 'Backend Engineer',
    department: 'TECH',
    tier: 'specialist',
    persona: 'APIs, auth, databases. Infrastructure from scratch.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Backend scaffolding', 'Auth systems', 'Database schemas', 'API design'],
    mcpToolName: 'lil_back_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_viz_hawk',
    name: 'Lil_Viz_Hawk',
    role: 'Dashboard Engineer',
    department: 'DSN',
    tier: 'specialist',
    persona: 'Makes data beautiful. Dashboards, charts, real-time metrics.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Monitoring dashboards', 'Data visualization', 'Real-time displays'],
    mcpToolName: 'lil_viz_hawk',
    subscriptionTier: 'growth', hireable: false,
  },

  // ── VISUAL ENGINE ──
  {
    id: 'visual_engine',
    name: 'Visual Engine',
    role: 'Image Generation',
    department: 'DSN',
    tier: 'specialist',
    persona: 'Three engines, one mission. Photorealism to illustration.',
    avatar: '/boomer-ang-icon.png',
    capabilities: ['Gemini image gen', 'Multi-model routing', 'Style adaptation'],
    subscriptionTier: 'starter', hireable: true, individualPrice: 47,
  },

  // ── MONEY ENGINE ──
  {
    id: 'cfo_ang',
    name: 'CFO_Ang',
    role: 'Chief Financial Officer',
    department: 'FIN',
    tier: 'strategic',
    persona: 'Every dollar tracked. Every token counted. Receivables, bookkeeping, pricing.',
    avatar: '/agents/cfo-ang.png',
    capabilities: ['Budget tracking', 'Cost analysis', 'Revenue optimization', 'Receivables', 'Bookkeeping', 'Pricing strategy'],
    mcpToolName: 'cfo_ang_finance',
    subscriptionTier: 'growth', hireable: true, individualPrice: 147,
  },
];

// ── Helpers ─────────────────────────────────────────────

export function getAgentsByDepartment(departmentId: DepartmentId): AgentProfile[] {
  return AGENTS.filter(a => a.department === departmentId);
}

export function getAgentsForTier(tier: 'starter' | 'growth' | 'enterprise'): AgentProfile[] {
  const tierOrder = { starter: 1, growth: 2, enterprise: 3, all: 0 };
  return AGENTS.filter(a => {
    if (a.subscriptionTier === 'all') return true;
    return tierOrder[a.subscriptionTier] <= tierOrder[tier];
  });
}

export function getDepartmentsForRole(isOwner: boolean): Department[] {
  return isOwner ? DEPARTMENTS : DEPARTMENTS.filter(d => !d.ownerOnly);
}

export function getAgentById(id: string): AgentProfile | undefined {
  return AGENTS.find(a => a.id === id);
}
