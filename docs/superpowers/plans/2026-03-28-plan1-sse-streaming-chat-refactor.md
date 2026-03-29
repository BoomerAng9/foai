# Plan 1: SSE Streaming + Chat Component Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake character-by-character streaming with real SSE from OpenRouter, extract the monolithic 687-line chat page into focused components, and establish the shared types that Plans 2-4 depend on.

**Architecture:** The API route (`/api/chat`) will stream SSE chunks from OpenRouter directly to the browser. The frontend reads the stream with `ReadableStream` reader. The chat page is decomposed into: ChatSidebar, ChatMessages, ChatInput, MessageBubble, and shared types.

**Tech Stack:** Next.js 15 App Router, OpenRouter SSE, React 19, TypeScript, IBM Plex Mono design system

---

## File Structure

```
cti-hub/src/
├── lib/
│   └── chat/
│       └── types.ts              # Shared types: Message, Attachment, Conversation, Tier, ModelOption
├── components/
│   └── chat/
│       ├── ChatSidebar.tsx        # Conversation list + session stats
│       ├── ChatMessages.tsx       # Message list + empty state + scroll management
│       ├── ChatInput.tsx          # Input bar + file previews + status line
│       ├── MessageBubble.tsx      # Single message: role label, content, attachments, metadata
│       ├── RolodexVerb.tsx        # Animated verb cycler
│       └── CopyButton.tsx         # Copy-to-clipboard button
├── app/
│   ├── (dashboard)/
│   │   └── chat/
│   │       └── page.tsx           # Thin orchestrator: state + composition of above components
│   └── api/
│       └── chat/
│           └── route.ts           # SSE streaming endpoint
└── lib/
    └── acheevy/
        └── agent.ts               # Add streaming support
```

---

### Task 1: Create shared types

**Files:**
- Create: `cti-hub/src/lib/chat/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// cti-hub/src/lib/chat/types.ts

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface MessageMetadata {
  tokens_in?: number;
  tokens_out?: number;
  cost?: number;
  memories_recalled?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'acheevy';
  content: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  created_at: string;
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export type TierId = 'premium' | 'bucket-list' | 'lfg';

export interface Tier {
  id: TierId;
  name: string;
  color: string;
}

export const TIERS: Tier[] = [
  { id: 'premium', name: 'Premium', color: '#22C55E' },
  { id: 'bucket-list', name: 'Bucket List', color: '#3B82F6' },
  { id: 'lfg', name: 'LFG', color: '#F59E0B' },
];

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  price_in: number;
  price_out: number;
  context: string;
  tag?: string;
}

// OpenRouter model catalog — March 2026 verified pricing ($/1M tokens)
export const MODELS: ModelOption[] = [
  { id: 'minimax/minimax-m2.7',              name: 'MiniMax M2.7',          provider: 'MiniMax',     price_in: 0.30,  price_out: 1.20,  context: '200K',  tag: 'DEFAULT' },
  { id: 'deepseek/deepseek-v3.2',           name: 'DeepSeek V3.2',        provider: 'DeepSeek',    price_in: 0.26,  price_out: 0.38,  context: '164K',  tag: 'CHEAP' },
  { id: 'meta-llama/llama-4-scout',          name: 'Llama 4 Scout',        provider: 'Meta',        price_in: 0.08,  price_out: 0.30,  context: '328K',  tag: 'CHEAP' },
  { id: 'qwen/qwen3.5-flash-02-23',         name: 'Qwen 3.5 Flash',       provider: 'Qwen',        price_in: 0.065, price_out: 0.26,  context: '1M',    tag: 'CHEAP' },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'Google',  price_in: 0.25,  price_out: 1.50,  context: '1M',    tag: 'FAST' },
  { id: 'openai/gpt-5.4-nano',              name: 'GPT-5.4 Nano',         provider: 'OpenAI',      price_in: 0.20,  price_out: 1.25,  context: '400K',  tag: 'FAST' },
  { id: 'anthropic/claude-haiku-4.5',        name: 'Claude Haiku 4.5',     provider: 'Anthropic',   price_in: 1.00,  price_out: 5.00,  context: '200K',  tag: 'FAST' },
  { id: 'openai/gpt-5.4',                   name: 'GPT-5.4',              provider: 'OpenAI',      price_in: 2.50,  price_out: 15.00, context: '1M' },
  { id: 'openai/gpt-5.4-mini',              name: 'GPT-5.4 Mini',         provider: 'OpenAI',      price_in: 0.75,  price_out: 4.50,  context: '400K' },
  { id: 'anthropic/claude-sonnet-4.6',       name: 'Claude Sonnet 4.6',    provider: 'Anthropic',   price_in: 3.00,  price_out: 15.00, context: '1M' },
  { id: 'google/gemini-3.1-pro-preview',     name: 'Gemini 3.1 Pro',       provider: 'Google',      price_in: 2.00,  price_out: 12.00, context: '1M' },
  { id: 'google/gemini-3-flash-preview',     name: 'Gemini 3 Flash',       provider: 'Google',      price_in: 0.50,  price_out: 3.00,  context: '1M' },
  { id: 'x-ai/grok-4.20-beta',              name: 'Grok 4.20',            provider: 'xAI',         price_in: 2.00,  price_out: 6.00,  context: '2M' },
  { id: 'meta-llama/llama-4-maverick',       name: 'Llama 4 Maverick',     provider: 'Meta',        price_in: 0.15,  price_out: 0.60,  context: '1M',    tag: 'OPEN' },
  { id: 'qwen/qwen3.5-397b-a17b',           name: 'Qwen 3.5 397B',        provider: 'Qwen',        price_in: 0.39,  price_out: 2.34,  context: '256K',  tag: 'OPEN' },
  { id: 'openai/o4-mini',                   name: 'o4 Mini',              provider: 'OpenAI',      price_in: 1.10,  price_out: 4.40,  context: '200K',  tag: 'REASON' },
  { id: 'deepseek/deepseek-r1',             name: 'DeepSeek R1',          provider: 'DeepSeek',    price_in: 0.70,  price_out: 2.50,  context: '64K',   tag: 'REASON' },
];
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds (types file has no imports that could break)

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/lib/chat/types.ts
git commit -m "feat: shared chat types — Message, Tier, ModelOption, Attachment"
```

---

### Task 2: Add streaming support to agent.ts

**Files:**
- Modify: `cti-hub/src/lib/acheevy/agent.ts`

- [ ] **Step 1: Add acheevyRespondStream function**

Add this new function after the existing `acheevyRespond` function in `cti-hub/src/lib/acheevy/agent.ts`:

```typescript
export async function acheevyRespondStream(
  userId: string,
  conversationId: string,
  userMessage: string,
  conversationHistory: ConversationMessage[],
  modelOverride?: string,
): Promise<{
  stream: ReadableStream<Uint8Array>;
  model: string;
  memories_recalled: number;
}> {
  // 0. MIM governance gate
  const mim = checkMIMGate(userMessage);
  if (!mim.allowed) {
    const blockedResponse = `${mim.reason}\n\n${mim.redirect || 'Let me know how I can help differently.'}`;
    await addMessage(conversationId, userId, 'user', userMessage);
    await addMessage(conversationId, userId, 'acheevy', blockedResponse, 'ACHEEVY', { mim_blocked: true, policy: mim.policy });
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: blockedResponse, done: false })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '', done: true, usage: { tokens_in: 0, tokens_out: 0, cost: 0 } })}\n\n`));
        controller.close();
      },
    });
    return { stream: body, model: 'mim-gate', memories_recalled: 0 };
  }

  // 1. Recall memory
  let memoryContext = 'No prior memory available.';
  let memoriesRecalled = 0;
  try {
    const memories = await recallAll(userId, userMessage, 5);
    if (memories.length > 0) {
      memoriesRecalled = memories.length;
      memoryContext = memories.map((m, i) => `[Memory ${i + 1}] ${m.content.slice(0, 300)}`).join('\n');
    }
  } catch {}

  // 2. Build prompt
  const systemPrompt = ACHEEVY_SYSTEM_PROMPT
    .replace('{memory_context}', memoryContext)
    .replace('{source_context}', 'None active in this session.');

  const messages: ConversationMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage },
  ];

  // 3. Pick model
  const model = modelOverride || await pickModel('chat');

  if (!OPENROUTER_API_KEY) {
    throw new Error('No LLM API key configured');
  }

  // 4. Store user message
  await addMessage(conversationId, userId, 'user', userMessage);

  // 5. Call OpenRouter with streaming
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'X-OpenRouter-Title': 'The Deploy Platform',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 4000,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(err || 'ACHEEVY stream failed');
  }

  // 6. Transform OpenRouter SSE into our SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullContent = '';
  let tokensIn = 0;
  let tokensOut = 0;

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          // Final: record usage, store message, memorize
          const cost = (tokensIn / 1_000_000) * 0.30 + (tokensOut / 1_000_000) * 1.20;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: '',
            done: true,
            usage: { tokens_in: tokensIn, tokens_out: tokensOut, cost, memories_recalled: memoriesRecalled },
          })}\n\n`));

          // Fire-and-forget: store message + memorize + record usage
          addMessage(conversationId, userId, 'acheevy', fullContent, 'ACHEEVY', {
            model, tokens_in: tokensIn, tokens_out: tokensOut,
          }).catch(() => {});
          memorizeConversationTurn(userId, conversationId, userMessage, fullContent).catch(() => {});
          recordUsage(model, tokensIn, tokensOut);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`));
          }
          // Capture usage from the last chunk if available
          if (parsed.usage) {
            tokensIn = parsed.usage.prompt_tokens || tokensIn;
            tokensOut = parsed.usage.completion_tokens || tokensOut;
          }
        } catch {}
      }
    },
  });

  const stream = res.body.pipeThrough(transformStream);
  return { stream, model, memories_recalled: memoriesRecalled };
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/lib/acheevy/agent.ts
git commit -m "feat: add acheevyRespondStream for real SSE streaming"
```

---

### Task 3: Update API route to stream SSE

**Files:**
- Modify: `cti-hub/src/app/api/chat/route.ts`

- [ ] **Step 1: Rewrite the POST handler to support streaming**

Replace the entire contents of `cti-hub/src/app/api/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { acheevyRespondStream } from '@/lib/acheevy/agent';
import { createConversation, getMessages } from '@/lib/memory/store';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { message, conversation_id, model } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    let convId = conversation_id;
    if (!convId && userId) {
      const conv = await createConversation(userId, message.slice(0, 60));
      convId = conv?.id;
    }

    let history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (convId) {
      const msgs = await getMessages(convId);
      history = (msgs as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role === 'acheevy' ? 'assistant' as const : m.role as 'user' | 'system',
        content: m.content,
      }));
    }

    const result = await acheevyRespondStream(
      userId || 'anonymous',
      convId || 'temp',
      message,
      history,
      model,
    );

    // Return SSE stream with conversation_id in header
    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': convId || '',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/app/api/chat/route.ts
git commit -m "feat: /api/chat returns SSE stream instead of JSON"
```

---

### Task 4: Extract CopyButton and RolodexVerb components

**Files:**
- Create: `cti-hub/src/components/chat/CopyButton.tsx`
- Create: `cti-hub/src/components/chat/RolodexVerb.tsx`

- [ ] **Step 1: Create CopyButton**

```typescript
// cti-hub/src/components/chat/CopyButton.tsx
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text }: { text: string }) {
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
```

- [ ] **Step 2: Create RolodexVerb**

```typescript
// cti-hub/src/components/chat/RolodexVerb.tsx
'use client';

import { useState, useEffect } from 'react';

const VERBS = ['Deploy', 'Manage', 'Ship', 'Build', 'Launch', 'Create', 'Deliver', 'Automate'];

export function RolodexVerb() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % VERBS.length);
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
        {VERBS[index]}
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add cti-hub/src/components/chat/CopyButton.tsx cti-hub/src/components/chat/RolodexVerb.tsx
git commit -m "feat: extract CopyButton and RolodexVerb components"
```

---

### Task 5: Extract MessageBubble component

**Files:**
- Create: `cti-hub/src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Create MessageBubble**

```typescript
// cti-hub/src/components/chat/MessageBubble.tsx
'use client';

import { FileText, Image as ImageIcon } from 'lucide-react';
import { CopyButton } from './CopyButton';
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

export function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className="group animate-fade-in">
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
        msg.role === 'user' ? 'text-fg' : 'text-fg-secondary'
      }`}>
        {msg.content}
        {msg.streaming && msg.content && (
          <span className="inline-block w-1.5 h-4 bg-fg ml-0.5 align-text-bottom animate-cursor-blink" />
        )}
      </div>

      {/* Cost Breakdown (will be replaced by LUC Receipt in Plan 2) */}
      {msg.metadata && !msg.streaming && msg.role === 'acheevy' && (
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border">
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
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/MessageBubble.tsx
git commit -m "feat: extract MessageBubble component with typing indicator"
```

---

### Task 6: Extract ChatSidebar component

**Files:**
- Create: `cti-hub/src/components/chat/ChatSidebar.tsx`

- [ ] **Step 1: Create ChatSidebar**

```typescript
// cti-hub/src/components/chat/ChatSidebar.tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/ChatSidebar.tsx
git commit -m "feat: extract ChatSidebar component"
```

---

### Task 7: Rewrite chat page with SSE streaming and extracted components

**Files:**
- Modify: `cti-hub/src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Replace the entire chat page**

Replace the entire contents of `cti-hub/src/app/(dashboard)/chat/page.tsx` with:

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, CornerDownLeft, ArrowDown, Paperclip, X, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { RolodexVerb } from '@/components/chat/RolodexVerb';
import type { Message, Attachment, Conversation, TierId } from '@/lib/chat/types';
import { TIERS } from '@/lib/chat/types';

const STARTERS = [
  'Research my competitors and build a brief',
  'Draft a project plan for my next launch',
  'Analyze this data and find insights',
  'Help me write a proposal for a client',
];

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

  const currentTier = TIERS.find(t => t.id === activeTier) || TIERS[0];

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

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || sending) return;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setSending(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

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
        }),
      });

      // Get conversation ID from header
      const newConvId = res.headers.get('X-Conversation-Id');
      if (!activeConvId && newConvId) {
        setActiveConvId(newConvId);
        setConversations(prev => [
          { id: newConvId, title: msg.slice(0, 50), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({ error: 'Stream failed' }));
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: errData.error || 'Connection error.', streaming: false } : m
        ));
        return;
      }

      // Read SSE stream
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
              // Final chunk — update metadata
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, streaming: false, metadata: data.usage } : m
              ));
              if (data.usage) {
                setSessionTokens(prev => prev + (data.usage.tokens_in || 0) + (data.usage.tokens_out || 0));
                setSessionCost(prev => prev + (data.usage.cost || 0));
              }
            } else if (data.content) {
              // Content chunk — append
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: m.content + data.content } : m
              ));
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: 'Connection error. Try again.', streaming: false } : m
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

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {sidebarOpen && (
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          sessionTokens={sessionTokens}
          sessionCost={sessionCost}
          onSelectConversation={setActiveConvId}
          onNewConversation={startNewConversation}
        />
      )}

      <div className="flex-1 flex flex-col relative bg-bg">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 btn-bracket text-[10px]"
        >
          {sidebarOpen ? 'HIDE' : 'THREADS'}
        </button>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
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
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {STARTERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-left p-4 border border-border bg-bg-surface hover:border-fg-ghost transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-3.5 h-3.5 text-fg-ghost mt-0.5 shrink-0 group-hover:text-fg-secondary transition-colors" />
                      <span className="text-sm text-fg-secondary group-hover:text-fg transition-colors leading-snug">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
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
                    <button onClick={() => removeAttachment(att.name)} className="p-0.5 hover:bg-signal-error hover:text-white transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
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
                className="btn-solid h-[44px] w-[44px] px-0 shrink-0 flex items-center justify-center"
                title="Attach files (max 10)"
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

            {/* Status bar */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 font-mono text-[9px]">
                <span className="led" style={{ background: currentTier.color }} />
                <span className="font-semibold uppercase tracking-wider">{currentTier.name}</span>
                <span className="text-fg-ghost">|</span>
                <span className="text-fg-ghost">LUC active</span>
              </div>
              <p className="font-mono text-[9px] text-fg-ghost">
                The Deploy Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`
Expected: Build succeeds. Chat route renders at `/chat`.

- [ ] **Step 3: Verify no references to old components remain**

Run: `cd cti-hub && grep -r "ModelPicker\|MODELS\|fake.*stream\|simulate.*stream\|8ms.*char" src/app/ --include="*.tsx" -l`
Expected: No results (old ModelPicker and fake streaming code fully removed from page)

- [ ] **Step 4: Commit**

```bash
git add cti-hub/src/app/\(dashboard\)/chat/page.tsx
git commit -m "feat: rewrite chat page with SSE streaming and extracted components

- Real SSE streaming replaces fake character-by-character reveal
- Extracted: ChatSidebar, MessageBubble, RolodexVerb, CopyButton
- Shared types from lib/chat/types.ts
- Max 10 attachments (was 5)
- Status bar: tier indicator + LUC active + The Deploy Platform
- ModelPicker removed (will be in + menu in Plan 2)"
```

---

### Task 8: Final build verification and push

- [ ] **Step 1: Full build**

Run: `cd cti-hub && npx next build 2>&1 | tail -20`
Expected: Build succeeds with `/chat` route listed

- [ ] **Step 2: Verify route exists**

Run: `cd cti-hub && npx next build 2>&1 | grep chat`
Expected: `├ ○ /chat` in the output

- [ ] **Step 3: Push all commits**

```bash
git push
```
