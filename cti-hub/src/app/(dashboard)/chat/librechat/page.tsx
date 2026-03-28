'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, Plus, MessageSquare, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'acheevy';
  content: string;
  agent_name?: string;
  metadata?: { tokens_in?: number; tokens_out?: number; cost?: number; memories_recalled?: number };
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatWithACHEEVY() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);

  // Load conversations
  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(d => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  // Load messages when conversation changes
  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations?id=${convId}`);
    const data = await res.json();
    setMessages((data.messages || []).map((m: Message & { created_at: string }) => ({
      ...m,
      created_at: m.created_at,
    })));
  }, []);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: activeConvId }),
      });
      const data = await res.json();

      if (!activeConvId && data.conversation_id) {
        setActiveConvId(data.conversation_id);
        setConversations(prev => [
          { id: data.conversation_id, title: text.slice(0, 60), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      const acheevyMsg: Message = {
        id: `acheevy-${Date.now()}`,
        role: 'acheevy',
        content: data.reply || data.error || 'No response.',
        agent_name: 'ACHEEVY',
        metadata: data.usage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, acheevyMsg]);

      if (data.usage) {
        setSessionTokens(prev => prev + (data.usage.tokens_in || 0) + (data.usage.tokens_out || 0));
        setSessionCost(prev => prev + (data.usage.cost || 0));
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'acheevy',
        content: 'Connection error. Please try again.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }

  function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation Sidebar */}
      <div className="w-56 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-100">
          <button onClick={startNewConversation}
            className="w-full h-9 rounded-lg bg-[#00A3FF] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#0089D9] transition-all">
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left p-2.5 rounded-lg text-xs transition-all truncate ${
                activeConvId === conv.id ? 'bg-[#00A3FF]/10 text-[#00A3FF] font-bold' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <MessageSquare className="w-3 h-3 inline mr-1.5" />
              {conv.title}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center py-8">No conversations yet</p>
          )}
        </div>

        {/* Session Usage */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Coins className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Session</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500">
            {sessionTokens.toLocaleString()} tokens &middot; ${sessionCost.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-slate-200 mb-4" />
              <h2 className="text-lg font-bold text-slate-300 mb-1">Chat w/ ACHEEVY</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                ACHEEVY remembers your conversations across sessions.
                Ask anything — research, build, create, analyze.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.role === 'user' ? 'bg-[#00A3FF] text-white' : 'bg-slate-900 text-white'
              }`}>
                {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#00A3FF] text-white'
                    : 'bg-slate-50 border border-slate-100 text-slate-800'
                }`}>
                  {msg.content}
                </div>
                {msg.metadata && msg.role === 'acheevy' && (
                  <div className="flex items-center gap-3 mt-1 px-2">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {(msg.metadata.tokens_in || 0) + (msg.metadata.tokens_out || 0)} tokens
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      ${(msg.metadata.cost || 0).toFixed(4)}
                    </span>
                    {(msg.metadata.memories_recalled || 0) > 0 && (
                      <span className="text-[9px] text-[#A855F7] font-mono">
                        {msg.metadata.memories_recalled} memories
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 animate-pulse w-48 h-10" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Chat w/ ACHEEVY..."
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF]" />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-xl bg-[#00A3FF] text-white flex items-center justify-center hover:bg-[#0089D9] transition-all disabled:opacity-30 shadow-lg shadow-[#00A3FF]/20">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
