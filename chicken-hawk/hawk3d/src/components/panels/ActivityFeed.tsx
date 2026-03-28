'use client';

import { useHawkStore } from '@/store/hawkStore';

const EVENT_COLORS: Record<string, string> = {
  task_start: 'text-hawk-gold',
  task_complete: 'text-green-400',
  room_change: 'text-blue-400',
  skill_learn: 'text-cyan-400',
  pr_review: 'text-purple-400',
  deploy: 'text-orange-400',
  error: 'text-red-400',
  session_clean: 'text-blue-300',
  agent_spawn: 'text-pink-400',
};

const EVENT_ICONS: Record<string, string> = {
  task_start: '>',
  task_complete: '+',
  room_change: '~',
  skill_learn: '*',
  pr_review: '#',
  deploy: '^',
  error: '!',
  session_clean: '~',
  agent_spawn: '+',
};

export function ActivityFeed() {
  const { activities } = useHawkStore();

  return (
    <div className="absolute bottom-4 right-4 z-40 w-80 max-h-64 glass-card overflow-hidden">
      <div className="px-3 py-2 border-b border-hawk-gold/10">
        <h3 className="text-hawk-gold text-xs font-bold tracking-wider">ACTIVITY FEED</h3>
      </div>

      <div className="overflow-y-auto max-h-52 p-2 space-y-1">
        {activities.length === 0 ? (
          <div className="text-hawk-text-muted text-xs text-center py-4">
            Waiting for agent activity...
          </div>
        ) : (
          activities.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 px-2 py-1 rounded hover:bg-hawk-surface-light/30 transition-colors"
            >
              {/* Event icon */}
              <span className={`${EVENT_COLORS[event.type] || 'text-hawk-text-muted'} text-xs font-mono mt-0.5`}>
                {EVENT_ICONS[event.type] || '-'}
              </span>

              <div className="flex-1 min-w-0">
                {/* Agent name + message */}
                <div className="text-xs">
                  <span className="text-hawk-gold font-medium">{event.agentName}</span>
                  <span className="text-hawk-text-muted"> — </span>
                  <span className={EVENT_COLORS[event.type] || 'text-hawk-text'}>
                    {event.message}
                  </span>
                </div>

                {/* Timestamp */}
                <div className="text-[9px] text-hawk-text-muted mt-0.5">
                  {formatTime(event.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
