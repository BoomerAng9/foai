import { create } from 'zustand';

export type AgentStatus = 'idle' | 'working' | 'learning' | 'testing' | 'deploying' | 'reviewing' | 'automating' | 'researching' | 'offline';

export type RoomType = 'desk' | 'gym' | 'lab' | 'deploy-bay' | 'review-room' | 'flow-room' | 'sandbox' | 'memory-vault' | 'graph-room' | 'deep-ops' | 'lounge' | 'gateway';

export interface LilHawk {
  id: string;
  name: string;
  displayName: string;
  backend: string;
  role: string;
  description: string;
  status: AgentStatus;
  currentRoom: RoomType;
  currentTask: string | null;
  model: string;
  color: string;
  tasksCompleted: number;
  tokensUsed: number;
  uptime: number; // seconds
  lastActive: number; // timestamp
}

export interface ActivityEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: 'task_start' | 'task_complete' | 'room_change' | 'skill_learn' | 'pr_review' | 'deploy' | 'error' | 'session_clean' | 'agent_spawn';
  message: string;
  timestamp: number;
  room?: RoomType;
}

export interface GatewayConfig {
  host: string;
  port: number;
  connected: boolean;
  vps1Status: 'online' | 'offline' | 'connecting';
  vps2Status: 'online' | 'offline' | 'connecting';
  tailscaleConnected: boolean;
}

interface HawkStore {
  // Setup
  isSetupComplete: boolean;
  setupStep: number;
  completeSetup: () => void;
  setSetupStep: (step: number) => void;

  // Agents
  agents: LilHawk[];
  selectedAgent: string | null;
  selectAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: AgentStatus, task?: string | null, room?: RoomType) => void;
  addAgent: (agent: LilHawk) => void;
  removeAgent: (id: string) => void;

  // Activity
  activities: ActivityEvent[];
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;

  // Gateway
  gateway: GatewayConfig;
  updateGateway: (config: Partial<GatewayConfig>) => void;

  // View
  viewMode: 'office' | 'topology' | 'globe';
  setViewMode: (mode: 'office' | 'topology' | 'globe') => void;
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;

  // Janitor
  isJanitorActive: boolean;
  triggerJanitor: () => void;
}

const DEFAULT_AGENTS: LilHawk[] = [
  {
    id: 'lil-trae-hawk',
    name: 'Lil_TRAE_Hawk',
    displayName: 'TRAE',
    backend: 'TRAE Agent',
    role: 'Heavy Coding & Refactors',
    description: 'Handles complex coding tasks, large-scale refactors, and architecture redesigns across the ecosystem.',
    status: 'idle',
    currentRoom: 'desk',
    currentTask: null,
    model: 'claude-opus-4-6',
    color: '#FF6B6B',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-coding-hawk',
    name: 'Lil_Coding_Hawk',
    displayName: 'Coder',
    backend: 'OpenCode',
    role: 'Plan-First Feature Work',
    description: 'Methodical feature development with planning phase before execution. Writes clean, tested code.',
    status: 'idle',
    currentRoom: 'desk',
    currentTask: null,
    model: 'claude-sonnet-4-6',
    color: '#4ECDC4',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-agent-hawk',
    name: 'Lil_Agent_Hawk',
    displayName: 'Agent Zero',
    backend: 'Agent Zero',
    role: 'OS/Browser/CLI Workflows',
    description: 'Executes system-level operations: file management, browser automation, CLI workflows, and OS integration.',
    status: 'idle',
    currentRoom: 'desk',
    currentTask: null,
    model: 'gpt-4o',
    color: '#45B7D1',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-flow-hawk',
    name: 'Lil_Flow_Hawk',
    displayName: 'Flow',
    backend: 'n8n',
    role: 'SaaS/CRM Automation',
    description: 'Orchestrates SaaS integrations, CRM workflows, and business process automation through n8n pipelines.',
    status: 'idle',
    currentRoom: 'flow-room',
    currentTask: null,
    model: 'gpt-4o-mini',
    color: '#96CEB4',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-sand-hawk',
    name: 'Lil_Sand_Hawk',
    displayName: 'Sandbox',
    backend: 'OpenSandbox',
    role: 'Safe Code Execution',
    description: 'Runs untrusted code in isolated sandbox environments. Tests, validates, and benchmarks safely.',
    status: 'idle',
    currentRoom: 'sandbox',
    currentTask: null,
    model: 'claude-sonnet-4-6',
    color: '#FFEAA7',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-memory-hawk',
    name: 'Lil_Memory_Hawk',
    displayName: 'Memory',
    backend: 'CoPaw/ReMe',
    role: 'RAG Memory',
    description: 'Manages long-term memory, RAG retrieval, and knowledge persistence across the entire hawk fleet.',
    status: 'idle',
    currentRoom: 'memory-vault',
    currentTask: null,
    model: 'gpt-4o-mini',
    color: '#DDA0DD',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-graph-hawk',
    name: 'Lil_Graph_Hawk',
    displayName: 'Graph',
    backend: 'LangGraph',
    role: 'Stateful Workflows',
    description: 'Builds and manages stateful workflow graphs. Handles complex multi-step processes with branching logic.',
    status: 'idle',
    currentRoom: 'graph-room',
    currentTask: null,
    model: 'claude-opus-4-6',
    color: '#74B9FF',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-back-hawk',
    name: 'Lil_Back_Hawk',
    displayName: 'Backend',
    backend: 'InsForge',
    role: 'LLM-Native Backends',
    description: 'Spins up and manages LLM-native backend services. API design, database schemas, and server infrastructure.',
    status: 'idle',
    currentRoom: 'deploy-bay',
    currentTask: null,
    model: 'claude-sonnet-4-6',
    color: '#A29BFE',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-viz-hawk',
    name: 'Lil_Viz_Hawk',
    displayName: 'Viz',
    backend: 'SimStudio',
    role: 'Visual Monitoring',
    description: 'Provides visual monitoring, dashboards, and real-time observability for the entire fleet.',
    status: 'idle',
    currentRoom: 'desk',
    currentTask: null,
    model: 'gemini-2.0-flash',
    color: '#FD79A8',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
  {
    id: 'lil-deep-hawk',
    name: 'Lil_Deep_Hawk',
    displayName: 'DeepOps',
    backend: 'DeerFlow 2.0',
    role: 'SuperAgent with Squads',
    description: 'The super-agent. Manages sub-squads, deep research pipelines, and complex multi-agent operations.',
    status: 'idle',
    currentRoom: 'deep-ops',
    currentTask: null,
    model: 'claude-opus-4-6',
    color: '#E17055',
    tasksCompleted: 0,
    tokensUsed: 0,
    uptime: 0,
    lastActive: Date.now(),
  },
];

export const useHawkStore = create<HawkStore>((set, get) => ({
  // Setup
  isSetupComplete: false,
  setupStep: 0,
  completeSetup: () => set({ isSetupComplete: true }),
  setSetupStep: (step) => set({ setupStep: step }),

  // Agents
  agents: DEFAULT_AGENTS,
  selectedAgent: null,
  selectAgent: (id) => set({ selectedAgent: id }),
  updateAgentStatus: (id, status, task, room) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              currentTask: task !== undefined ? task : a.currentTask,
              currentRoom: room || a.currentRoom,
              lastActive: Date.now(),
              tasksCompleted: status === 'idle' && a.status === 'working' ? a.tasksCompleted + 1 : a.tasksCompleted,
            }
          : a
      ),
    })),
  addAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent],
    })),
  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      selectedAgent: state.selectedAgent === id ? null : state.selectedAgent,
    })),

  // Activity
  activities: [],
  addActivity: (event) =>
    set((state) => ({
      activities: [
        {
          ...event,
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        },
        ...state.activities,
      ].slice(0, 100),
    })),
  clearActivities: () => set({ activities: [] }),

  // Gateway
  gateway: {
    host: 'localhost',
    port: 3100,
    connected: false,
    vps1Status: 'offline',
    vps2Status: 'offline',
    tailscaleConnected: false,
  },
  updateGateway: (config) =>
    set((state) => ({
      gateway: { ...state.gateway, ...config },
    })),

  // View
  viewMode: 'office',
  setViewMode: (mode) => set({ viewMode: mode }),
  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  // Janitor
  isJanitorActive: false,
  triggerJanitor: () => {
    set({ isJanitorActive: true });
    const store = get();
    store.addActivity({
      agentId: 'system',
      agentName: 'Janitor',
      type: 'session_clean',
      message: 'Cleaning session context... Sweeping the office!',
    });
    // Reset all agents to idle
    set((state) => ({
      agents: state.agents.map((a) => ({
        ...a,
        status: 'idle' as AgentStatus,
        currentTask: null,
        currentRoom: a.currentRoom,
      })),
    }));
    setTimeout(() => {
      set({ isJanitorActive: false });
      get().addActivity({
        agentId: 'system',
        agentName: 'Janitor',
        type: 'session_clean',
        message: 'Office is clean! Fresh context ready.',
      });
    }, 4000);
  },
}));
