import { useHawkStore, AgentStatus, RoomType } from '@/store/hawkStore';

const TASK_TEMPLATES = [
  { task: 'Refactoring AIMS authentication module', status: 'working' as AgentStatus, room: 'desk' as RoomType, agent: 'lil-trae-hawk' },
  { task: 'Planning new LUC dashboard feature', status: 'working' as AgentStatus, room: 'desk' as RoomType, agent: 'lil-coding-hawk' },
  { task: 'Running CLI deployment script', status: 'deploying' as AgentStatus, room: 'deploy-bay' as RoomType, agent: 'lil-agent-hawk' },
  { task: 'Configuring CRM automation pipeline', status: 'automating' as AgentStatus, room: 'flow-room' as RoomType, agent: 'lil-flow-hawk' },
  { task: 'Testing sandbox code execution', status: 'testing' as AgentStatus, room: 'sandbox' as RoomType, agent: 'lil-sand-hawk' },
  { task: 'Indexing ecosystem knowledge base', status: 'working' as AgentStatus, room: 'memory-vault' as RoomType, agent: 'lil-memory-hawk' },
  { task: 'Building stateful onboarding workflow', status: 'working' as AgentStatus, room: 'graph-room' as RoomType, agent: 'lil-graph-hawk' },
  { task: 'Spinning up UEF Gateway service', status: 'deploying' as AgentStatus, room: 'deploy-bay' as RoomType, agent: 'lil-back-hawk' },
  { task: 'Generating performance dashboard', status: 'working' as AgentStatus, room: 'desk' as RoomType, agent: 'lil-viz-hawk' },
  { task: 'Coordinating deep research squad', status: 'researching' as AgentStatus, room: 'deep-ops' as RoomType, agent: 'lil-deep-hawk' },
  { task: 'Learning new Whisper integration skill', status: 'learning' as AgentStatus, room: 'gym' as RoomType, agent: 'lil-trae-hawk' },
  { task: 'Reviewing PR #42 on AIMS repo', status: 'reviewing' as AgentStatus, room: 'review-room' as RoomType, agent: 'lil-coding-hawk' },
  { task: 'Researching competitor SEO strategies', status: 'researching' as AgentStatus, room: 'lab' as RoomType, agent: 'lil-deep-hawk' },
  { task: 'Training MCP protocol handling', status: 'learning' as AgentStatus, room: 'gym' as RoomType, agent: 'lil-agent-hawk' },
  { task: 'Automating Notion sync workflow', status: 'automating' as AgentStatus, room: 'flow-room' as RoomType, agent: 'lil-flow-hawk' },
];

let simulationInterval: ReturnType<typeof setInterval> | null = null;

export function startSimulation() {
  if (simulationInterval) return;

  const store = useHawkStore.getState();

  // Initial gateway connection
  store.updateGateway({
    connected: true,
    vps1Status: 'online',
    vps2Status: 'online',
    tailscaleConnected: true,
  });

  store.addActivity({
    agentId: 'system',
    agentName: 'Gateway',
    type: 'task_start',
    message: 'Gateway connected. VPS-1 and VPS-2 online via Tailscale.',
  });

  // Spawn initial agents
  store.agents.forEach((agent) => {
    store.addActivity({
      agentId: agent.id,
      agentName: agent.displayName,
      type: 'agent_spawn',
      message: `${agent.displayName} (${agent.backend}) spawned and ready.`,
    });
  });

  simulationInterval = setInterval(() => {
    const currentStore = useHawkStore.getState();
    const agents = currentStore.agents;

    // Randomly assign tasks or complete them
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    if (randomAgent.status === 'idle') {
      // Find a suitable task for this agent
      const suitableTasks = TASK_TEMPLATES.filter((t) => t.agent === randomAgent.id);
      const task = suitableTasks[Math.floor(Math.random() * suitableTasks.length)];

      if (task) {
        currentStore.updateAgentStatus(randomAgent.id, task.status, task.task, task.room);
        currentStore.addActivity({
          agentId: randomAgent.id,
          agentName: randomAgent.displayName,
          type: 'task_start',
          message: task.task,
          room: task.room,
        });
      }
    } else if (randomAgent.status !== 'offline') {
      // 30% chance to complete current task
      if (Math.random() > 0.7) {
        currentStore.addActivity({
          agentId: randomAgent.id,
          agentName: randomAgent.displayName,
          type: 'task_complete',
          message: `Completed: ${randomAgent.currentTask}`,
        });
        currentStore.updateAgentStatus(randomAgent.id, 'idle', null, randomAgent.currentRoom);
      }
    }
  }, 3000 + Math.random() * 4000);
}

export function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}
