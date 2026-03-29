'use client';

import { Plus } from 'lucide-react';
import type { Conversation } from '@/lib/chat/types';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConvId: string | null;
  sessionTokens: number;
  sessionCost: number;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ChatSidebar({
  conversations,
  activeConvId,
  sessionTokens,
  sessionCost,
  onSelectConversation,
  onNewConversation,
}: ChatSidebarProps) {
  return (
    <div className="w-52 bg-bg-surface border-r border-border flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <button onClick={onNewConversation} className="btn-solid w-full gap-2 h-9 text-[10px]">
          <Plus className="w-3 h-3" /> NEW THREAD
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full text-left px-4 py-2.5 font-mono text-[11px] transition-all truncate border-l-2 ${
              activeConvId === conv.id
                ? 'border-fg bg-bg-elevated text-fg font-semibold'
                : 'border-transparent text-fg-secondary hover:text-fg hover:bg-bg-elevated'
            }`}
          >
            {conv.title}
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="label-mono text-center py-12 px-4">No threads yet</p>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <p className="label-mono mb-2">Session</p>
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-fg-tertiary">Tokens</span>
            <span className="text-fg">{sessionTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-fg-tertiary">Cost</span>
            <span className="text-fg">${sessionCost.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
