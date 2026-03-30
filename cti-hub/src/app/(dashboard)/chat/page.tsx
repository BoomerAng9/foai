'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, CornerDownLeft, ArrowDown, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { RolodexVerb } from '@/components/chat/RolodexVerb';
import type { Message, Attachment, Conversation, TierId } from '@/lib/chat/types';
import { TIERS } from '@/lib/chat/types';
import { LucPopup } from '@/components/chat/LucPopup';
import type { LucEstimate } from '@/lib/luc/types';
import { AttachmentMenu } from '@/components/chat/AttachmentMenu';
import type { Skill } from '@/lib/skills/registry';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function ChatWithACHEEVY() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTier, setActiveTier] = useState<TierId>('premium');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [lucEstimate, setLucEstimate] = useState<LucEstimate | null>(null);
  const [lucPendingMsg, setLucPendingMsg] = useState<string | null>(null);
  const [lucPendingAttachments, setLucPendingAttachments] = useState<Attachment[]>([]);
  const [estimateCount, setEstimateCount] = useState(0);
  const [autoAccept, setAutoAccept] = useState(false);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [streamingCost, setStreamingCost] = useState<{ tokens_in: number; tokens_out: number; cost: number } | null>(null);
  const [manageItInput, setManageItInput] = useState('');

  const currentTier = TIERS.find(t => t.id === activeTier) || TIERS[0];

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(d => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations?id=${convId}`);
    const data = await res.json();
    setMessages((data.messages || []).map((m: Message) => ({ ...m })));
  }, []);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Force scroll during active streaming so user stays at the bottom
  const isStreaming = messages.some(m => m.streaming);
  useEffect(() => {
    if (!isStreaming || !scrollRef.current) return;
    const el = scrollRef.current;
    const interval = setInterval(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, 80);
    return () => clearInterval(interval);
  }, [isStreaming]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = [];
    Array.from(files).forEach(file => {
      if (attachments.length + newAttachments.length >= 10) return;
      const att: Attachment = { name: file.name, type: file.type, size: file.size };
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments(prev => prev.map(a => a.name === file.name ? { ...a, url: reader.result as string } : a));
        };
        reader.readAsDataURL(file);
      }
      newAttachments.push(att);
    });
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  function removeAttachment(name: string) {
    setAttachments(prev => prev.filter(a => a.name !== name));
  }

  async function executeSend(msg: string, currentAttachments: Attachment[]) {
    setSending(true);

    const tempUserMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    const streamId = `a-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: streamId,
      role: 'acheevy',
      content: '',
      streaming: true,
      created_at: new Date().toISOString(),
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          conversation_id: activeConvId,
          attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, size: a.size })),
          skill_context: activeSkill?.systemContext || undefined,
        }),
      });

      const newConvId = res.headers.get('X-Conversation-Id');
      if (!activeConvId && newConvId) {
        setActiveConvId(newConvId);
        setConversations(prev => [
          { id: newConvId, title: msg.slice(0, 50), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      const contentType = res.headers.get('Content-Type') || '';

      if (!res.ok || !res.body || !contentType.includes('text/event-stream')) {
        // Non-stream response (error JSON or missing body)
        let errorMsg = 'Connection error.';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: errorMsg, streaming: false } : m
        ));
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
            if (data.done) {
              setStreamingCost(null);
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, streaming: false, metadata: data.usage } : m
              ));
              if (data.usage) {
                setSessionTokens(prev => prev + (data.usage.tokens_in || 0) + (data.usage.tokens_out || 0));
                setSessionCost(prev => prev + (data.usage.cost || 0));
              }
            } else if (data.cost_update) {
              setStreamingCost(data.cost_update);
            } else if (data.content) {
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: m.content + data.content } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection error. Try again.';
      setStreamingCost(null);
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: errorMsg, streaming: false } : m
      ));
    } finally {
      setSending(false);
      setStreamingCost(null);
      inputRef.current?.focus();
    }
  }

  async function handleSend(text?: string, skipEstimate?: boolean) {
    const msg = text || input.trim();
    if (!msg || sending) return;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Skip LUC estimate for starter buttons, auto-accept mode, or when explicitly skipped
    const shouldEstimate = !skipEstimate && !autoAccept && messages.length > 0;

    if (shouldEstimate) {
      try {
        const estRes = await fetch('/api/luc/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            tier: activeTier,
            attachments: currentAttachments.map(a => ({ name: a.name, type: a.type })),
          }),
        });
        const estData = await estRes.json();

        if (estData.estimate) {
          setEstimateCount(prev => prev + 1);
          setLucEstimate(estData.estimate);
          setLucPendingMsg(msg);
          setLucPendingAttachments(currentAttachments);
          return;
        }
      } catch {}
    }

    await executeSend(msg, currentAttachments);
  }

  function handleLucAccept() {
    const msg = lucPendingMsg;
    const atts = lucPendingAttachments;
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
    if (msg) executeSend(msg, atts);
  }

  function handleLucAdjust() {
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
  }

  function handleLucStop() {
    setLucEstimate(null);
    setLucPendingMsg(null);
    setLucPendingAttachments([]);
  }

  function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  async function handleScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      track.stop();
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      setAttachments(prev => [...prev, {
        name: `screenshot-${Date.now()}.png`,
        type: 'image/png',
        size: blob.size,
        url: dataUrl,
      }]);
    } catch {}
  }

  function handleSkillSelect(skill: Skill) {
    if (!skill.id) {
      setActiveSkill(null);
      return;
    }
    setActiveSkill(skill);
    // Pre-fill with example prompt if input is empty
    if (!input.trim()) {
      setInput(skill.example);
      inputRef.current?.focus();
    }
  }

  function handleDeepResearch(mode: 'search' | 'crawl' | 'extract') {
    const prefixes: Record<string, string> = {
      search: '[Deep Research: Search] ',
      crawl: '[Deep Research: Crawl] ',
      extract: '[Deep Research: Extract] ',
    };
    setInput(prev => prefixes[mode] + prev);
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-3 sm:-m-4 md:-m-6">
      {/* Chat sidebar - slide-in on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-40 md:relative md:z-auto
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'}
      `}>
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          sessionTokens={sessionTokens}
          sessionCost={sessionCost}
          onSelectConversation={setActiveConvId}
          onNewConversation={() => { startNewConversation(); setSidebarOpen(false); }}
        />
      </div>

      <div className="flex-1 flex flex-col relative bg-bg min-w-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 btn-bracket text-[10px]"
        >
          {sidebarOpen ? 'HIDE' : 'THREADS'}
        </button>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center px-4 sm:px-6 md:px-8 py-6 md:py-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/acheevy-chat-hero.png"
                alt="ACHEEVY"
                className="w-32 h-32 sm:w-44 sm:h-44 object-contain mb-4 animate-materialize"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(232,160,32,0.2))' }}
              />
              <h1 className="text-xl sm:text-2xl font-light tracking-tight mb-1">
                Chat w/ <span className="font-bold">ACHEEVY</span>
              </h1>
              <p className="text-fg-secondary text-sm text-center mb-6">
                What will we <RolodexVerb /> today?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {/* LEFT — Autonomous path */}
                <div className="border border-border bg-bg-surface p-6 flex flex-col gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-manage-it.png" alt="" className="w-10 h-10 object-contain" />
                  <div>
                    <span className="label-mono text-accent">Let ACHEEVY Manage It</span>
                  </div>
                  <p className="text-xs text-fg-secondary leading-relaxed">
                    For quick, autonomous deployments. Provide a prompt and let ACHEEVY handle the orchestration. (2-5 minutes)
                  </p>
                  <textarea
                    value={manageItInput}
                    onChange={(e) => setManageItInput(e.target.value)}
                    placeholder="Describe what you want to deploy..."
                    rows={3}
                    className="input-field min-h-[80px] max-h-[120px] resize-none py-3 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (manageItInput.trim()) {
                        handleSend(manageItInput.trim(), true);
                        setManageItInput('');
                      }
                    }}
                    disabled={!manageItInput.trim() || sending}
                    className="btn-solid self-start cursor-pointer"
                  >
                    Prompt It
                  </button>
                </div>

                {/* RIGHT — Interactive path */}
                <div className="border border-border bg-bg-surface p-6 flex flex-col gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon-guide-me.png" alt="" className="w-10 h-16 object-contain object-left" />
                  <div>
                    <span className="label-mono text-accent">Let ACHEEVY Guide Me</span>
                  </div>
                  <p className="text-xs text-fg-secondary leading-relaxed">
                    For interactive deployments. Work with ACHEEVY through a Q&amp;A session to define and deploy your solution. (4-10 minutes)
                  </p>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleSend('[Charter Wizard] Help me define my deployment step by step', true)}
                    disabled={sending}
                    className="btn-solid self-start cursor-pointer"
                  >
                    Let&apos;s Begin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-6 space-y-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>
          )}
        </div>

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent text-bg flex items-center justify-center shadow-lg hover:bg-accent-hover transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        <div className="border-t border-border bg-bg-surface p-2 sm:p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 pl-2.5 pr-1 py-1 bg-bg-elevated border border-border group">
                    {att.type.startsWith('image/') && att.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.url} alt={att.name} className="w-6 h-6 object-cover" />
                    ) : att.type.startsWith('image/') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-fg-tertiary" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-fg-tertiary" />
                    )}
                    <span className="font-mono text-[10px] text-fg-secondary truncate max-w-[100px]">{att.name}</span>
                    <span className="font-mono text-[9px] text-fg-ghost">{formatFileSize(att.size)}</span>
                    <button onClick={() => removeAttachment(att.name)} className="p-0.5 hover:bg-signal-error hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 sm:gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <AttachmentMenu
                onFileSelect={() => fileInputRef.current?.click()}
                onScreenshot={handleScreenshot}
                onDeepResearch={handleDeepResearch}
                onSkillSelect={handleSkillSelect}
                activeSkillId={activeSkill?.id || null}
                activeTier={activeTier}
                onTierChange={setActiveTier}
                isSubscriber={true}
              />

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message ACHEEVY..."
                  rows={1}
                  className="input-field min-h-[44px] max-h-[160px] resize-none py-3 pr-12"
                  style={{ height: 'auto' }}
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-1 text-fg-ghost">
                  <CornerDownLeft className="w-3 h-3" />
                  <span className="font-mono text-[9px]">ENTER</span>
                </div>
              </div>
              <button
                onClick={() => handleSend(undefined, false)}
                disabled={!input.trim() || sending}
                className="btn-solid h-[44px] w-[44px] px-0 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 font-mono text-[9px]">
                <span className="led" style={{ background: currentTier.color }} />
                <span className="font-semibold uppercase tracking-wider">{currentTier.name}</span>
                <span className="text-fg-ghost">|</span>
                <span className="text-fg-ghost">LUC active</span>
                {streamingCost && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <span className="text-signal-info">
                      ▸ ${streamingCost.cost < 0.0001 ? streamingCost.cost.toExponential(1) : streamingCost.cost.toFixed(4)} | {(streamingCost.tokens_in + streamingCost.tokens_out).toLocaleString()} tokens
                    </span>
                  </>
                )}
                {activeSkill && (
                  <>
                    <span className="text-fg-ghost">|</span>
                    <span className="text-signal-info font-semibold">{activeSkill.alias}</span>
                  </>
                )}
              </div>
              <p className="font-mono text-[9px] text-fg-ghost">
                The Deploy Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {lucEstimate && (
        <LucPopup
          estimate={lucEstimate}
          estimateCount={estimateCount}
          onAccept={handleLucAccept}
          onAdjust={handleLucAdjust}
          onStop={handleLucStop}
          onAutoAcceptChange={setAutoAccept}
          autoAcceptEnabled={autoAccept}
        />
      )}
    </div>
  );
}
