'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MessageMetadata } from '@/lib/chat/types';

interface LucReceiptProps {
  metadata: MessageMetadata;
}

export function LucReceipt({ metadata }: LucReceiptProps) {
  const [expanded, setExpanded] = useState(false);
  const totalTokens = (metadata.tokens_in || 0) + (metadata.tokens_out || 0);
  const cost = metadata.cost || 0;

  return (
    <div className="border border-border bg-bg-surface mt-2 max-w-[400px]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg-elevated hover:bg-border transition-colors"
      >
        <span className="font-mono text-[9px] font-bold text-fg-tertiary uppercase tracking-wider">
          Cost Breakdown
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-fg">${cost.toFixed(4)}</span>
          {(metadata.memories_recalled || 0) > 0 && (
            <span className="font-mono text-[9px] text-signal-info">
              {metadata.memories_recalled} memories
            </span>
          )}
          <ChevronDown className={`w-3 h-3 text-fg-ghost transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 font-mono text-[10px]">
          <div className="grid grid-cols-[1fr_60px_50px] gap-1 py-1 border-b border-border">
            <span className="text-fg-secondary">AI analysis & response</span>
            <span className="text-right text-fg-ghost">{totalTokens.toLocaleString()}</span>
            <span className="text-right text-fg-secondary">${cost.toFixed(4)}</span>
          </div>
          {(metadata.memories_recalled || 0) > 0 && (
            <div className="grid grid-cols-[1fr_60px_50px] gap-1 py-1">
              <span className="text-fg-secondary">Memory recall</span>
              <span className="text-right text-fg-ghost">{metadata.memories_recalled}</span>
              <span className="text-right text-fg-secondary">$0.001</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
