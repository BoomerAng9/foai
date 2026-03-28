import { useHawkStore } from '@/store/hawkStore';

let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Connects to the Chicken-Hawk gateway and starts polling for agent status.
 * In production, this would use WebSocket for real-time updates.
 * Falls back to REST polling if WebSocket is unavailable.
 */
export async function connectGateway() {
  const store = useHawkStore.getState();
  const { host, port } = store.gateway;

  try {
    // Try initial connection
    const response = await fetch(`/api/gateway?host=${host}&port=${port}`);
    const data = await response.json();

    if (data.connected) {
      store.updateGateway({
        connected: true,
        vps1Status: data.vps1 === 'online' ? 'online' : 'offline',
        vps2Status: data.vps2 === 'online' ? 'online' : 'offline',
        tailscale: data.tailscale,
      });

      store.addActivity({
        agentId: 'system',
        agentName: 'Gateway',
        type: 'task_complete',
        message: `Connected to gateway at ${host}:${port}`,
      });

      // Start polling
      startPolling();
    } else {
      // Simulation mode
      store.updateGateway({ connected: false });
      store.addActivity({
        agentId: 'system',
        agentName: 'Gateway',
        type: 'task_start',
        message: 'Running in simulation mode (gateway unreachable)',
      });
    }
  } catch (error) {
    store.updateGateway({ connected: false });
    store.addActivity({
      agentId: 'system',
      agentName: 'Gateway',
      type: 'error',
      message: 'Failed to connect to gateway. Running simulation.',
    });
  }
}

function startPolling() {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    const store = useHawkStore.getState();
    const { host, port } = store.gateway;

    try {
      const response = await fetch(`/api/gateway?host=${host}&port=${port}`);
      const data = await response.json();

      if (data.connected && data.agents) {
        // Sync agent statuses from gateway
        data.agents.forEach((remoteAgent: { id: string; status: string; task?: string; room?: string }) => {
          const localAgent = store.agents.find((a) => a.id === remoteAgent.id);
          if (localAgent && localAgent.status !== remoteAgent.status) {
            store.updateAgentStatus(
              remoteAgent.id,
              remoteAgent.status as any,
              remoteAgent.task || null,
              (remoteAgent.room as any) || localAgent.currentRoom
            );
          }
        });
      }
    } catch {
      // Silent fail on poll - don't spam errors
    }
  }, 5000);
}

export function disconnectGateway() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  const store = useHawkStore.getState();
  store.updateGateway({
    connected: false,
    vps1Status: 'offline',
    vps2Status: 'offline',
    tailscaleConnected: false,
  });
}

/**
 * Send a task to a specific Lil_Hawk via the gateway.
 */
export async function sendTaskToAgent(agentId: string, task: string) {
  const store = useHawkStore.getState();
  const { host, port } = store.gateway;

  try {
    const response = await fetch('/api/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        port,
        action: 'assign_task',
        agentId,
        payload: { task },
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: 'Failed to send task' };
  }
}
