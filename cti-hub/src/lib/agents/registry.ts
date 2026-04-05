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
  { id: 'RESEARCH', name: 'Research', description: 'Data intelligence, web scraping, opportunity sourcing', color: '#3B82F6', supervisor: 'q_ang', ownerOnly: false },
  { id: 'CONTENT', name: 'Content', description: 'SEO content, marketing copy, social media', color: '#8B5CF6', supervisor: 'content_ang', ownerOnly: false },
  { id: 'SALES', name: 'Sales', description: 'Lead generation, pipeline management, revenue', color: '#22C55E', supervisor: 'sales_ang', ownerOnly: false },
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
    avatar: '/agents/content-ang.png', // Distinct from ACHEEVY — uses own visor face
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
    avatar: '/agents/ops-ang.png', // Distinct from ACHEEVY — uses own visor face
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
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Intent classification', 'Lil_Hawk dispatch', 'Review gate', 'Quality control'],
    subscriptionTier: 'growth', hireable: false,
  },

  // ── BOOMER_ANGS (Strategic) ──
  {
    id: 'q_ang',
    name: 'Q_Ang',
    role: 'Intelligence Analyst',
    department: 'RESEARCH',
    tier: 'strategic',
    persona: 'Methodical, data-driven, always sourcing. Talks like an intelligence analyst. Finds what others miss.',
    avatar: '/agents/scout-ang.png',
    capabilities: ['Web intelligence', 'Opportunity sourcing', 'Competitive research', 'Data intelligence'],
    mcpToolName: 'q_ang_research',
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
    id: 'sales_ang',
    name: 'Sales_Ang',
    role: 'VP of Sales',
    department: 'SALES',
    tier: 'strategic',
    persona: 'Driven, numbers-focused, always closing. ABC mentality — Always Be Closing.',
    avatar: '/agents/edu-ang.png',
    capabilities: ['Lead qualification', 'Pipeline management', 'Revenue attribution', 'Commission tracking', 'Affiliate management'],
    mcpToolName: 'sales_ang_close',
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
    role: 'Visual Director',
    department: 'DSN',
    tier: 'strategic',
    persona: 'Direct. Visual-first. Doesn\'t explain designs — shows them. Speaks in references. Opinionated about typography, spacing, and color.',
    avatar: '/agents/iller-ang.png',
    capabilities: ['Player cards', 'Broadcast graphics', 'Character art', 'NFT assets', 'Motion landing pages', 'Merchandise concepts', 'Podcast visuals', 'Profile cards', 'Digital art'],
    mcpToolName: 'iller_ang_create',
    subscriptionTier: 'growth', hireable: true, individualPrice: 197,
  },

  // ── LIL_HAWKS — The Sqwaad (Tactical/Specialist) ──
  {
    id: 'lil_deep_hawk',
    name: 'Lil_Deep_Hawk',
    role: 'Deep Research',
    department: 'RESEARCH',
    tier: 'tactical',
    persona: 'Multi-source web research with citations. Digs deep, cross-references, and delivers verified intelligence.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Multi-source research', 'Cross-referencing', 'Citation tracking', 'Verified intelligence'],
    mcpToolName: 'lil_deep_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_memory_hawk',
    name: 'Lil_Memory_Hawk',
    role: 'Memory Management',
    department: 'DT',
    tier: 'specialist',
    persona: 'Stores, recalls, and compresses long-term agent memory. Keeps the Sqwaad sharp across sessions.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Long-term memory', 'Semantic recall', 'Memory compression', 'Cross-session persistence'],
    mcpToolName: 'lil_memory_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_flow_hawk',
    name: 'Lil_Flow_Hawk',
    role: 'Workflow Automation',
    department: 'OPS',
    tier: 'specialist',
    persona: 'Connects services, triggers actions, manages pipelines. The glue between every moving part.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Service orchestration', 'Pipeline management', 'Webhook triggers', 'Action sequencing'],
    mcpToolName: 'lil_flow_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_viz_hawk',
    name: 'Lil_Viz_Hawk',
    role: 'Data Visualization',
    department: 'DSN',
    tier: 'specialist',
    persona: 'Charts, graphs, dashboards from raw data. Turns numbers into decisions.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Chart generation', 'Dashboard creation', 'Data storytelling', 'Real-time metrics'],
    mcpToolName: 'lil_viz_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_blend_hawk',
    name: 'Lil_Blend_Hawk',
    role: 'Integration Specialist',
    department: 'TECH',
    tier: 'specialist',
    persona: 'Connects external APIs, databases, and third-party services. If it has an endpoint, Blend_Hawk talks to it.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['API integration', 'Database connections', 'Third-party services', 'Endpoint mapping'],
    mcpToolName: 'lil_blend_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_sand_hawk',
    name: 'Lil_Sand_Hawk',
    role: 'Sandbox Execution',
    department: 'TECH',
    tier: 'specialist',
    persona: 'Runs code in isolated containers safely. Test, break, iterate — without risk to production.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Isolated execution', 'Container sandboxing', 'Safe testing', 'Code experimentation'],
    mcpToolName: 'lil_sand_hawk',
    subscriptionTier: 'growth', hireable: false,
  },
  {
    id: 'lil_trae_hawk',
    name: 'Lil_Trae_Hawk',
    role: 'Training & Fine-Tuning',
    department: 'DT',
    tier: 'specialist',
    persona: 'Prepares data and manages model training. From raw datasets to production-ready models.',
    avatar: '/chicken-hawk-sqwaad.png',
    capabilities: ['Data preparation', 'Model fine-tuning', 'Dataset curation', 'Training pipelines'],
    mcpToolName: 'lil_trae_hawk',
    subscriptionTier: 'enterprise', hireable: false,
  },

  // ── VISUAL ENGINE ──
  {
    id: 'visual_engine',
    name: 'Visual Engine',
    role: 'Image Generation',
    department: 'DSN',
    tier: 'specialist',
    persona: 'Three engines, one mission. Photorealism to illustration.',
    avatar: '/boomer-ang-icon.png', // TODO: needs dedicated Visual Engine image
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
