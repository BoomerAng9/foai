'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

export default function AgentConsole() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: 'The Deploy Platform Agent Console ready. I can help with MindEdge enrollments, Open Seat searches, and fleet operations. What would you like to do?',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: data.reply || data.error || 'No response from agent fleet.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: 'Connection error. The agent fleet may be starting up.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              msg.role === 'user' ? 'bg-[#00A3FF] text-white' : 'bg-slate-900 text-white'
            }`}>
              {msg.role === 'user' ? <span className="text-sm font-bold">U</span> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`p-5 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[#00A3FF] text-white'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 inline-block px-2">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
            <div className="bg-slate-100 rounded-2xl p-5 animate-pulse w-48 h-12" />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send a command to the agent fleet..."
            className="flex-1 h-12 px-5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-[#00A3FF] text-white flex items-center justify-center hover:bg-[#0089D9] transition-all disabled:opacity-50 shadow-lg shadow-[#00A3FF33]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
