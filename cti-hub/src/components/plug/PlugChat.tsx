'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

interface PlugChatProps {
  agentName: string;
  agentRole: string;
  agentColor: string;
  systemPrompt: string;
  placeholder?: string;
  welcomeMessage?: string;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

/**
 * Reusable chat component for demo plugs.
 * Connects to /api/chat with a skill_context that sets the agent persona.
 * Works without auth for demo/public plug pages.
 */
export function PlugChat({ agentName, agentRole, agentColor, systemPrompt, placeholder, welcomeMessage }: PlugChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>(
    welcomeMessage ? [{ id: 'welcome', role: 'agent', content: welcomeMessage }] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);

    const userEntry: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content: userMsg };
    setMessages(prev => [...prev, userEntry]);

    const streamId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamId, role: 'agent', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          skill_context: systemPrompt,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: 'Connection issue. Try again.' } : m));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: m.content + data.content } : m));
              endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: 'Connection error. Please try again.' } : m));
    } finally {
      setSending(false);
    }
  }, [input, sending, systemPrompt]);

  return (
    <div className="flex flex-col h-full border border-border bg-bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: agentColor }} />
        <span className="font-mono text-[11px] font-semibold">{agentName}</span>
        <span className="font-mono text-[9px] text-fg-tertiary">{agentRole}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-bg'
                : 'bg-bg-elevated border border-border text-fg'
            }`}>
              {msg.role === 'agent' && !msg.content && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-ghost animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-ghost animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-fg-ghost animate-pulse" style={{ animationDelay: '0.4s' }} />
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={placeholder || `Message ${agentName}...`}
            rows={1}
            className="input-field flex-1 min-h-[40px] max-h-[100px] resize-none py-2.5 pr-8 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-solid h-[40px] w-[40px] px-0 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1 px-1">
          <CornerDownLeft className="w-2.5 h-2.5 text-fg-ghost" />
          <span className="font-mono text-[8px] text-fg-ghost">ENTER</span>
        </div>
      </div>
    </div>
  );
}
