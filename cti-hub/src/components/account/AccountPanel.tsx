'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  X, Settings, CreditCard, Share2, ChevronUp, MessageSquare,
  LogOut, Crown, Zap, Send,
} from 'lucide-react';

const TIER_DISPLAY: Record<string, { name: string; color: string; icon: typeof Crown }> = {
  free: { name: 'Free', color: '#6B7280', icon: Zap },
  starter: { name: 'Starter', color: '#3B82F6', icon: Zap },
  growth: { name: 'Growth', color: '#22C55E', icon: Crown },
  enterprise: { name: 'Enterprise', color: '#E8A020', icon: Crown },
  owner: { name: 'Owner', color: '#E8A020', icon: Crown },
};

export function AccountPanel() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [chatSending, setChatSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  const tier = profile?.tier || 'free';
  const tierInfo = TIER_DISPLAY[tier] || TIER_DISPLAY.free;
  const initial = user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
  const photoUrl = user.photoURL;

  async function handleChatSend() {
    if (!chatInput.trim() || chatSending) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

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
              if (data.content && !data.done) fullResponse += data.content;
            } catch {}
          }
        }
        setChatMessages(prev => [...prev, { role: 'acheevy', text: fullResponse || 'No response.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'acheevy', text: 'Connection error.' }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'acheevy', text: 'Failed to connect.' }]);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50">
      {/* Profile bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-full border-2 border-accent shadow-lg shadow-accent/20 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform bg-bg-surface"
          title="Account"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-mono text-sm font-bold text-accent">{initial}</span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="w-80 max-h-[80vh] bg-bg-surface border border-border shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center overflow-hidden bg-bg-elevated shrink-0">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-sm font-bold">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.displayName || user.email}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: tierInfo.color }} />
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: tierInfo.color }}>
                  {tierInfo.name}
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-fg-ghost hover:text-fg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-3 space-y-1 border-b border-border">
            <a href="/settings" className="flex items-center gap-3 px-3 py-2 text-xs font-mono text-fg-secondary hover:bg-bg-elevated transition-colors">
              <Settings className="w-3.5 h-3.5" /> Account Settings
            </a>
            <a href="/pricing" className="flex items-center gap-3 px-3 py-2 text-xs font-mono text-fg-secondary hover:bg-bg-elevated transition-colors">
              <CreditCard className="w-3.5 h-3.5" /> Upgrade Plan
            </a>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-fg-secondary hover:bg-bg-elevated transition-colors text-left">
              <Share2 className="w-3.5 h-3.5" /> Share Invite Link
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono text-signal-error hover:bg-bg-elevated transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          {/* Mini ACHEEVY Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              <span className="font-mono text-[10px] font-bold tracking-wider text-accent">CHAT W/ ACHEEVY</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-48">
              {chatMessages.length === 0 && (
                <p className="text-[10px] text-fg-ghost text-center py-4">Ask ACHEEVY anything from here.</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-fg text-right' : 'text-fg-secondary'}`}>
                  {msg.role === 'acheevy' && <span className="font-mono text-[9px] text-accent font-bold">ACHEEVY: </span>}
                  {msg.text.slice(0, 300)}
                  {msg.text.length > 300 && '...'}
                </div>
              ))}
              {chatSending && (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-accent rounded-full" style={{ animation: 'typing-dot 1.4s infinite', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder="Quick message..."
                  className="flex-1 h-8 px-3 bg-bg border border-border text-xs focus:outline-none focus:border-fg-ghost"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatSending}
                  className="w-8 h-8 bg-accent flex items-center justify-center disabled:opacity-30"
                >
                  <Send className="w-3 h-3 text-bg" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <span className="font-mono text-[8px] text-fg-ghost">The Deploy Platform</span>
            <button onClick={() => setOpen(false)}>
              <ChevronUp className="w-3 h-3 text-fg-ghost" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
