'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Check, Globe, Image as ImageIcon, Code2, Upload, Mic, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MODELS, type ModelOption } from '@/lib/chat/types';

/* ── Constants ──────────────────────────────────────────── */
const CATEGORIES = [
  'general', 'business', 'creative', 'research',
  'education', 'finance', 'marketing', 'tech',
] as const;
type Category = typeof CATEGORIES[number];

const TOOLS = [
  { id: 'web_search',  label: 'Web Search', icon: Globe },
  { id: 'image_gen',   label: 'Image Gen',  icon: ImageIcon },
  { id: 'code_exec',   label: 'Code Exec',  icon: Code2 },
  { id: 'file_upload',  label: 'File Upload', icon: Upload },
  { id: 'voice',       label: 'Voice',       icon: Mic },
  { id: 'memory',      label: 'Memory',      icon: Brain },
] as const;

const SYSTEM_PROMPT_PLACEHOLDER = `You are a helpful assistant specialized in...

Guidelines:
- Be concise and direct
- Use markdown formatting when appropriate
- Ask clarifying questions before making assumptions

Personality: Professional but approachable.`;

/* ── Helpers ─────────────────────────────────────────────── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function groupModelsByTag(models: ModelOption[]): Record<string, ModelOption[]> {
  const groups: Record<string, ModelOption[]> = {};
  for (const m of models) {
    const tag = m.tag || 'OTHER';
    (groups[tag] ||= []).push(m);
  }
  return groups;
}

/* ── Chat Message ────────────────────────────────────────── */
interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/* ── Test Chat Panel ─────────────────────────────────────── */
function TestChat({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !slug) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const history = [...messages, userMsg];

    try {
      const res = await fetch(`/api/plugs/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: text, history }),
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${res.status} ${res.statusText}` }]);
        setStreaming(false);
        return;
      }

      // Stream SSE response
      const reader = res.body?.getReader();
      if (!reader) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response stream.' }]);
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.token || '';
              if (token) {
                assistantContent += token;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {
              // Plain text chunk
              if (data.trim()) {
                assistantContent += data;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, slug, messages]);

  return (
    <div className="flex flex-col h-full border border-border bg-bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="led bg-signal-live animate-pulse-dot" />
        <span className="font-mono text-[11px] font-semibold tracking-wide text-fg-secondary">TEST CHAT</span>
        {!slug && (
          <span className="font-mono text-[9px] text-signal-warn ml-auto">ENTER A SLUG FIRST</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-[11px] text-fg-ghost text-center leading-relaxed">
              Send a message to test<br />your plug configuration.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-accent text-bg'
                  : 'bg-bg-elevated border border-border text-fg'
              }`}
            >
              {msg.content || (streaming && i === messages.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={disabled ? 'Save plug first...' : 'Test message...'}
            disabled={disabled || streaming}
            className="flex-1 bg-bg border border-border px-3 py-2 font-mono text-[11px] text-fg placeholder:text-fg-ghost focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={disabled || streaming || !input.trim()}
            className="bg-accent text-bg px-3 py-2 font-mono text-[11px] font-semibold disabled:opacity-40 hover:brightness-110 transition-all flex items-center gap-1"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function PlugCreatePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0]?.id ?? '');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [published, setPublished] = useState(false);

  // UI state
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Auto-slug from name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Grouped models for the select
  const modelGroups = useMemo(() => groupModelsByTag(MODELS), []);
  const tagOrder = ['FREE', 'DEFAULT', 'CHEAP', 'FAST', 'OPEN', 'REASON', 'PREMIUM', 'OTHER'];

  const toggleTool = (id: string) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Create ───────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.');
      return;
    }
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/plugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          system_prompt: systemPrompt.trim(),
          model: selectedModel,
          category,
          tools: Array.from(selectedTools),
          settings: {},
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create plug (${res.status})`);
      }

      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plug.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Publish Toggle ───────────────────────────────────── */
  const handlePublishToggle = async () => {
    if (!created || !slug) return;
    setPublishing(true);

    try {
      const res = await fetch(`/api/plugs/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !published }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update publish state.');
      }

      setPublished(!published);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle publish.');
    } finally {
      setPublishing(false);
    }
  };

  /* ── Shared input classes ─────────────────────────────── */
  const inputCls = 'w-full bg-bg border border-border px-3 py-2 font-mono text-xs text-fg placeholder:text-fg-ghost focus:outline-none focus:border-accent transition-colors';
  const labelCls = 'font-mono text-[10px] font-semibold tracking-wider uppercase text-fg-secondary mb-1.5 block';

  return (
    <div className="min-h-full">
      {/* ── Top Bar ────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/plug-bin"
          className="flex items-center gap-1.5 font-mono text-[11px] text-fg-secondary hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          PLUG BIN
        </Link>
        <span className="text-fg-ghost font-mono text-[11px]">/</span>
        <span className="font-mono text-[11px] font-semibold text-accent">CREATE</span>
      </div>

      {/* ── Main Layout: Form + Test Chat ──────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]">

        {/* ── Left: Form (60%) ─────────────────────────── */}
        <div className="lg:w-[60%] space-y-6">

          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Custom Plug"
                className={inputCls}
                disabled={created}
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                type="text"
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="my-custom-plug"
                className={inputCls}
                disabled={created}
              />
              <p className="font-mono text-[9px] text-fg-ghost mt-1">Auto-generated from name. Edit to customize.</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this plug do? 2-3 sentences."
              rows={3}
              className={`${inputCls} resize-none`}
              disabled={created}
            />
          </div>

          {/* Category + Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className={`${inputCls} cursor-pointer`}
                disabled={created}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-bg text-fg">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className={`${inputCls} cursor-pointer`}
                disabled={created}
              >
                {tagOrder.map(tag => {
                  const group = modelGroups[tag];
                  if (!group?.length) return null;
                  return (
                    <optgroup key={tag} label={tag} className="bg-bg text-fg">
                      {group.map(m => (
                        <option key={m.id} value={m.id} className="bg-bg text-fg">
                          {m.name} — {m.provider} ({m.context})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className={labelCls}>System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder={SYSTEM_PROMPT_PLACEHOLDER}
              rows={10}
              className={`${inputCls} font-mono text-[11px] leading-relaxed resize-y min-h-[180px]`}
              disabled={created}
            />
          </div>

          {/* Tools */}
          <div>
            <label className={labelCls}>Tools</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOOLS.map(tool => {
                const active = selectedTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => !created && toggleTool(tool.id)}
                    disabled={created}
                    className={`flex items-center gap-2.5 px-3 py-2.5 border font-mono text-[11px] transition-all ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-bg text-fg-secondary hover:border-fg-ghost hover:text-fg'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <tool.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold tracking-wide">{tool.label}</span>
                    {active && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border border-signal-error/30 bg-signal-error/5 px-4 py-3">
              <p className="font-mono text-[11px] text-signal-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 pb-8">
            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={creating || created || !name.trim() || !slug.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 font-mono text-xs font-bold tracking-wider transition-all ${
                created
                  ? 'bg-signal-live text-bg cursor-default'
                  : 'bg-accent text-bg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {creating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> CREATING...</>
              ) : created ? (
                <><Check className="w-3.5 h-3.5" /> CREATED</>
              ) : (
                'CREATE PLUG'
              )}
            </button>

            {/* Publish Toggle */}
            {created && (
              <button
                onClick={handlePublishToggle}
                disabled={publishing}
                className="flex items-center gap-3 group"
              >
                {/* Toggle track */}
                <div className={`relative w-10 h-5 rounded-full transition-colors ${published ? 'bg-signal-live' : 'bg-bg-elevated border border-border'}`}>
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                      published
                        ? 'left-[22px] bg-bg'
                        : 'left-0.5 bg-fg-ghost'
                    }`}
                  />
                </div>
                <span className={`font-mono text-[11px] font-semibold tracking-wide ${published ? 'text-signal-live' : 'text-fg-secondary'}`}>
                  {publishing ? 'UPDATING...' : published ? 'PUBLIC' : 'PRIVATE'}
                </span>
              </button>
            )}

            {/* Back to Plug Bin */}
            {created && (
              <Link
                href="/plug-bin"
                className="font-mono text-[11px] text-fg-secondary hover:text-accent transition-colors ml-auto"
              >
                &larr; Back to Plug Bin
              </Link>
            )}
          </div>
        </div>

        {/* ── Right: Test Chat (40%) ───────────────────── */}
        <div className="lg:w-[40%] lg:min-h-[500px] h-[400px] lg:h-auto">
          <TestChat slug={slug} disabled={!slug.trim()} />
        </div>
      </div>
    </div>
  );
}
