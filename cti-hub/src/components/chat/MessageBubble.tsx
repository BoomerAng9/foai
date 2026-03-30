'use client';

import { FileText, Image as ImageIcon, Brain, Bot } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { LucReceipt } from './LucReceipt';
import type { Message } from '@/lib/chat/types';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-fg-tertiary"
          style={{ animation: 'typing-dot 1.4s infinite', animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className="mb-3 border-l-2 border-amber-500/40 pl-3 py-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Brain className="w-3 h-3 text-amber-500" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80">Reasoning</span>
        {streaming && (
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-xs text-fg-tertiary italic leading-relaxed">{text}</p>
    </div>
  );
}

function AgentBadge({ agent }: { agent: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 bg-accent/10 border border-accent/20 text-[10px] font-mono uppercase tracking-wider text-accent">
      <Bot className="w-3 h-3" />
      <span>Routed to {agent}</span>
    </div>
  );
}

function renderContent(content: string) {
  // Split on markdown image pattern ![alt](src)
  const parts = content.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const src = imgMatch[2];
      // Only allow data: and https:/http: URLs to prevent XSS via javascript: or other schemes
      if (!src.startsWith('data:') && !src.startsWith('https://') && !src.startsWith('http://')) {
        return <span key={i}>{part}</span>;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt={imgMatch[1]}
          className="max-w-full max-h-[400px] object-contain my-3 border border-border"
        />
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className="group animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        {msg.role === 'acheevy' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/acheevy-helmet.png" alt="" className="w-5 h-5 object-contain" />
        )}
        <span className="label-mono">
          {msg.role === 'user' ? 'YOU' : 'ACHEEVY'}
        </span>
        {msg.streaming && <TypingIndicator />}
        <div className="flex-1" />
        {!msg.streaming && msg.role === 'acheevy' && <CopyButton text={msg.content} />}
      </div>

      {msg.attachments && msg.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {msg.attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-elevated border border-border text-[10px] font-mono">
              {att.type.startsWith('image/') ? (
                att.url ? (
                  <img src={att.url} alt={att.name} className="w-8 h-8 object-cover" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-fg-tertiary" />
                )
              ) : (
                <FileText className="w-3.5 h-3.5 text-fg-tertiary" />
              )}
              <span className="text-fg-secondary truncate max-w-[120px]">{att.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thinking / Reasoning block */}
      {msg.thinking && msg.role === 'acheevy' && (
        <ThinkingBlock text={msg.thinking} streaming={msg.streaming && !msg.content} />
      )}

      {/* Agent routing badge */}
      {msg.activeAgent && msg.role === 'acheevy' && (
        <AgentBadge agent={msg.activeAgent} />
      )}

      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
        msg.role === 'user' ? 'text-fg' : 'text-fg-secondary'
      }`}>
        {renderContent(msg.content)}
        {msg.streaming && msg.content && (
          <span className="inline-block w-1.5 h-4 bg-fg ml-0.5 align-text-bottom animate-cursor-blink" />
        )}
      </div>

      {msg.metadata && !msg.streaming && msg.role === 'acheevy' && (
        <LucReceipt metadata={msg.metadata} />
      )}
    </div>
  );
}
