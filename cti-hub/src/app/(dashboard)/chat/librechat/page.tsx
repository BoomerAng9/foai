'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  CornerDownLeft,
  Copy,
  Check,
  Sparkles,
  ArrowDown,
  Paperclip,
  ChevronDown,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  role: 'user' | 'acheevy';
  content: string;
  attachments?: Attachment[];
  metadata?: { tokens_in?: number; tokens_out?: number; cost?: number; memories_recalled?: number; model?: string };
  created_at: string;
  streaming?: boolean;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string; // data URL for preview
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  price_in: number;  // per 1M tokens input
  price_out: number; // per 1M tokens output
  context: string;
  tag?: string;
}

const MODELS: ModelOption[] = [
  { id: 'deepseek/deepseek-v3.2',       name: 'DeepSeek V3.2',      provider: 'DeepSeek',    price_in: 0.27,  price_out: 0.42,  context: '128K', tag: 'DEFAULT' },
  { id: 'openai/gpt-4.1',               name: 'GPT-4.1',            provider: 'OpenAI',      price_in: 2.00,  price_out: 8.00,  context: '1M' },
  { id: 'openai/gpt-4.1-mini',          name: 'GPT-4.1 Mini',       provider: 'OpenAI',      price_in: 0.40,  price_out: 1.60,  context: '1M',   tag: 'FAST' },
  { id: 'openai/gpt-4.1-nano',          name: 'GPT-4.1 Nano',       provider: 'OpenAI',      price_in: 0.10,  price_out: 0.40,  context: '1M',   tag: 'CHEAP' },
  { id: 'anthropic/claude-sonnet-4',     name: 'Claude Sonnet 4',    provider: 'Anthropic',   price_in: 3.00,  price_out: 15.00, context: '200K' },
  { id: 'anthropic/claude-haiku-3.5',    name: 'Claude Haiku 3.5',   provider: 'Anthropic',   price_in: 0.80,  price_out: 4.00,  context: '200K', tag: 'FAST' },
  { id: 'google/gemini-2.5-pro',        name: 'Gemini 2.5 Pro',     provider: 'Google',      price_in: 1.25,  price_out: 10.00, context: '1M' },
  { id: 'google/gemini-2.5-flash',      name: 'Gemini 2.5 Flash',   provider: 'Google',      price_in: 0.15,  price_out: 0.60,  context: '1M',   tag: 'FAST' },
  { id: 'meta-llama/llama-4-maverick',   name: 'Llama 4 Maverick',   provider: 'Meta',        price_in: 0.20,  price_out: 0.60,  context: '1M',   tag: 'OPEN' },
  { id: 'qwen/qwen3-235b-a22b',         name: 'Qwen3 235B',         provider: 'Qwen',        price_in: 0.20,  price_out: 0.60,  context: '128K', tag: 'OPEN' },
  { id: 'x-ai/grok-3-mini',             name: 'Grok 3 Mini',        provider: 'xAI',         price_in: 0.30,  price_out: 0.50,  context: '128K' },
];

const STARTERS = [
  'Research my competitors and build a brief',
  'Draft a project plan for my next launch',
  'Analyze this data and find insights',
  'Help me write a proposal for a client',
];

const ROLODEX_VERBS = ['Deploy', 'Manage', 'Ship', 'Build', 'Launch', 'Create', 'Deliver', 'Automate'];

function RolodexVerb() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % ROLODEX_VERBS.length);
        setAnimating(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative overflow-hidden h-[1.2em] align-bottom" style={{ minWidth: '180px' }}>
      <span
        className="inline-block font-bold transition-all duration-300 ease-in-out"
        style={{
          transform: animating ? 'translateY(-100%)' : 'translateY(0)',
          opacity: animating ? 0 : 1,
        }}
      >
        {ROLODEX_VERBS[index]}
      </span>
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-fg-tertiary"
          style={{
            animation: 'typing-dot 1.4s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function ModelPicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODELS.find(m => m.id === selected) || MODELS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-8 bg-bg-surface border border-border hover:border-fg-ghost transition-colors font-mono text-[10px] text-fg-secondary"
      >
        <span className="led led-live" />
        <span className="font-semibold text-fg">{current.name}</span>
        <span className="text-fg-ghost">·</span>
        <span className="text-fg-ghost">${current.price_in}/{current.price_out}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 w-[420px] bg-bg-surface border border-border shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_56px] gap-2 px-3 py-2 border-b border-border text-[9px] font-mono text-fg-ghost uppercase tracking-wider">
            <span>Model</span>
            <span className="text-right">In $/1M</span>
            <span className="text-right">Out $/1M</span>
            <span className="text-right">Context</span>
          </div>

          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => { onSelect(model.id); setOpen(false); }}
              className={`w-full grid grid-cols-[1fr_80px_80px_56px] gap-2 px-3 py-2.5 text-left transition-colors hover:bg-bg-elevated ${
                model.id === selected ? 'bg-bg-elevated border-l-2 border-fg' : 'border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-fg truncate">{model.name}</span>
                <span className="font-mono text-[9px] text-fg-ghost">{model.provider}</span>
                {model.tag && (
                  <span className={`font-mono text-[8px] px-1.5 py-0.5 tracking-wider font-bold ${
                    model.tag === 'DEFAULT' ? 'bg-signal-live text-white' :
                    model.tag === 'FAST' ? 'bg-signal-info text-white' :
                    model.tag === 'CHEAP' ? 'bg-signal-warn text-white' :
                    model.tag === 'OPEN' ? 'bg-fg-tertiary text-white' :
                    'bg-bg-elevated text-fg-secondary'
                  }`}>{model.tag}</span>
                )}
              </div>
              <span className="font-mono text-[10px] text-fg-secondary text-right">${model.price_in.toFixed(2)}</span>
              <span className="font-mono text-[10px] text-fg-secondary text-right">${model.price_out.toFixed(2)}</span>
              <span className="font-mono text-[10px] text-fg-ghost text-right">{model.context}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bg-elevated"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-signal-live" /> : <Copy className="w-3 h-3 text-fg-tertiary" />}
    </button>
  );
}

export default function ChatWithACHEEVY() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations
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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Scroll detection
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
    };
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
      if (attachments.length + newAttachments.length >= 5) return; // max 5
      const att: Attachment = { name: file.name, type: file.type, size: file.size };
      // Generate preview for images
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
    e.target.value = ''; // reset input
  }

  function removeAttachment(name: string) {
    setAttachments(prev => prev.filter(a => a.name !== name));
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || sending) return;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setSending(true);

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const tempUserMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Add streaming placeholder
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
          model: selectedModel,
          attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, size: a.size })),
        }),
      });
      const data = await res.json();

      if (!activeConvId && data.conversation_id) {
        setActiveConvId(data.conversation_id);
        setConversations(prev => [
          { id: data.conversation_id, title: msg.slice(0, 50), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      const reply = data.reply || data.error || 'No response.';

      // Simulate streaming by revealing characters
      let revealed = '';
      const chars = reply.split('');
      for (let i = 0; i < chars.length; i++) {
        revealed += chars[i];
        const current = revealed;
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: current } : m
        ));
        // Fast reveal — 8ms per char, batch 3 at a time
        if (i % 3 === 0) await new Promise(r => setTimeout(r, 8));
      }

      // Finalize message
      const modelName = MODELS.find(m => m.id === selectedModel)?.name || selectedModel;
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, streaming: false, metadata: { ...data.usage, model: modelName } } : m
      ));

      if (data.usage) {
        setSessionTokens(prev => prev + (data.usage.tokens_in || 0) + (data.usage.tokens_out || 0));
        setSessionCost(prev => prev + (data.usage.cost || 0));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: 'Connection error. Try again.', streaming: false }
          : m
      ));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
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

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {/* Conversation Sidebar */}
      {sidebarOpen && (
        <div className="w-52 bg-bg-surface border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <button onClick={startNewConversation} className="btn-solid w-full gap-2 h-9 text-[10px]">
              <Plus className="w-3 h-3" /> NEW THREAD
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
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

          {/* Session Stats */}
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
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative bg-bg">
        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 btn-bracket text-[10px]"
        >
          {sidebarOpen ? 'HIDE' : 'THREADS'}
        </button>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Empty State — Centered, impressive */
            <div className="flex flex-col items-center justify-center h-full px-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/acheevy-plug.png"
                alt="ACHEEVY"
                className="w-48 h-48 object-contain mb-6 animate-materialize"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.15))' }}
              />

              <h1 className="text-3xl font-light tracking-tight mb-2">
                Chat w/ <span className="font-bold">ACHEEVY</span>
              </h1>
              <p className="text-fg-secondary text-sm max-w-md text-center mb-10 leading-relaxed">
                What will we <RolodexVerb /> today?
              </p>

              {/* Conversation Starters */}
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {STARTERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-left p-4 border border-border bg-bg-surface hover:border-fg-ghost transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-3.5 h-3.5 text-fg-ghost mt-0.5 shrink-0 group-hover:text-fg-secondary transition-colors" />
                      <span className="text-sm text-fg-secondary group-hover:text-fg transition-colors leading-snug">
                        {s}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`group animate-fade-in ${msg.role === 'user' ? '' : ''}`}
                >
                  {/* Role Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="label-mono">
                      {msg.role === 'user' ? 'YOU' : 'ACHEEVY'}
                    </span>
                    {msg.streaming && <TypingIndicator />}
                    <div className="flex-1" />
                    {!msg.streaming && msg.role === 'acheevy' && <CopyButton text={msg.content} />}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-elevated border border-border text-[10px] font-mono">
                          {att.type.startsWith('image/') ? (
                            att.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
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

                  {/* Content */}
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'text-fg pl-0'
                      : 'text-fg-secondary pl-0'
                  }`}>
                    {msg.content}
                    {msg.streaming && msg.content && (
                      <span className="inline-block w-1.5 h-4 bg-fg ml-0.5 align-text-bottom animate-cursor-blink" />
                    )}
                  </div>

                  {/* Metadata */}
                  {msg.metadata && !msg.streaming && msg.role === 'acheevy' && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border">
                      {msg.metadata.model && (
                        <span className="font-mono text-[10px] text-fg-ghost font-semibold">
                          {msg.metadata.model}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-fg-ghost">
                        {((msg.metadata.tokens_in || 0) + (msg.metadata.tokens_out || 0)).toLocaleString()} tokens
                      </span>
                      <span className="font-mono text-[10px] text-fg-ghost">
                        ${(msg.metadata.cost || 0).toFixed(4)}
                      </span>
                      {(msg.metadata.memories_recalled || 0) > 0 && (
                        <span className="font-mono text-[10px] text-signal-info">
                          {msg.metadata.memories_recalled} memories recalled
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent text-bg flex items-center justify-center shadow-lg hover:bg-accent-hover transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input */}
        <div className="border-t border-border bg-bg-surface p-4">
          <div className="max-w-3xl mx-auto">
            {/* Attachment previews */}
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
                    <button
                      onClick={() => removeAttachment(att.name)}
                      className="p-0.5 hover:bg-signal-error hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Attachment button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-bracket h-[44px] w-[44px] px-0 shrink-0 flex items-center justify-center"
                title="Attach files (max 5)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

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
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="btn-solid h-[44px] w-[44px] px-0 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom bar: model picker + hint */}
            <div className="flex items-center justify-between mt-2">
              <ModelPicker selected={selectedModel} onSelect={setSelectedModel} />
              <p className="font-mono text-[9px] text-fg-ghost">
                Shift+Enter for new line &middot; ACHEEVY remembers across sessions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
