# Plan 2: LUC Backend + Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the LUC (cost estimation) system end-to-end — backend API for estimate/accept/adjust/stop/receipt, frontend popup and receipt components, and wire them into the chat flow.

**Architecture:** LUC API routes in Next.js App Router handle estimation (always free model), acceptance, and receipt generation. Frontend shows a modal popup before execution with ACCEPT/ADJUST/STOP, and a collapsible receipt on every ACHEEVY response. Charter/Ledger dual-artifact pattern: Charter (user-facing, no model names) vs Ledger (internal audit). Auto-accept toggle after 3rd estimate.

**Tech Stack:** Next.js 15 App Router, TypeScript, Neon Postgres, OpenRouter (free models only for estimation)

---

## File Structure

```
cti-hub/src/
├── lib/
│   └── luc/
│       ├── types.ts            # LUC types: Estimate, Receipt, LineItem, JobStatus
│       ├── estimator.ts        # Core estimation logic (always free model)
│       └── ledger.ts           # Charter/Ledger creation + storage
├── components/
│   └── chat/
│       ├── LucPopup.tsx        # Modal: estimate display, ACCEPT/ADJUST/STOP
│       └── LucReceipt.tsx      # Collapsible receipt on ACHEEVY messages
├── app/
│   └── api/
│       └── luc/
│           ├── estimate/route.ts   # POST: generate cost estimate
│           ├── accept/route.ts     # POST: accept estimate, begin execution
│           └── stop/route.ts       # POST: cancel job
```

---

### Task 1: Create LUC types

**Files:**
- Create: `cti-hub/src/lib/luc/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// cti-hub/src/lib/luc/types.ts

export interface LucLineItem {
  service: string;       // User-friendly name, e.g. "AI analysis & response"
  tokens?: number;       // Estimated tokens (if applicable)
  cost: number;          // Estimated dollar cost
}

export interface LucEstimate {
  id: string;
  tier: string;
  items: LucLineItem[];
  total_tokens: number;
  total_cost: number;
  created_at: string;
}

export interface LucReceipt {
  job_id: string;
  estimate: LucEstimate;
  actual: {
    items: LucLineItem[];
    total_tokens: number;
    total_cost: number;
  };
  variance_pct: number;   // negative = under estimate
  created_at: string;
}

export type LucAction = 'accept' | 'adjust' | 'stop';

export interface LucJobEntry {
  id: string;
  user_id: string;
  conversation_id: string;
  message: string;
  tier: string;
  estimate: LucEstimate;
  status: 'estimated' | 'accepted' | 'running' | 'completed' | 'cancelled';
  receipt?: LucReceipt;
  created_at: string;
}

// Internal-only ledger entry (never sent to frontend)
export interface LedgerEntry {
  job_id: string;
  models_used: Array<{ model_id: string; tokens_in: number; tokens_out: number; cost: number }>;
  api_costs: Array<{ service: string; cost: number }>;
  surcharge: number;
  margin: number;
  total_internal_cost: number;
  total_customer_cost: number;
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/lib/luc/types.ts
git commit -m "feat: LUC types — Estimate, Receipt, LineItem, LedgerEntry"
```

---

### Task 2: Create LUC estimator (free model only)

**Files:**
- Create: `cti-hub/src/lib/luc/estimator.ts`

- [ ] **Step 1: Create the estimator**

```typescript
// cti-hub/src/lib/luc/estimator.ts
import type { LucEstimate, LucLineItem } from './types';

// Free/near-free models used ONLY for estimation — never paid models
const ESTIMATION_MODEL = 'qwen/qwen3.5-flash-02-23'; // $0.065/$0.26 per 1M — near zero

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

interface EstimateInput {
  message: string;
  tier: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

export async function generateEstimate(input: EstimateInput): Promise<LucEstimate> {
  const items: LucLineItem[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  // Base chat cost estimate (varies by tier)
  const tierMultipliers: Record<string, number> = {
    'premium': 1,
    'bucket-list': 3,
    'lfg': 10,
  };
  const multiplier = tierMultipliers[input.tier] || 1;

  // Estimate message complexity using free model
  let estimatedResponseTokens = 500; // default
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'X-OpenRouter-Title': 'The Deploy Platform - LUC',
        },
        body: JSON.stringify({
          model: ESTIMATION_MODEL,
          messages: [
            { role: 'system', content: 'You estimate token counts for AI tasks. Reply with ONLY a number: the estimated output tokens needed to fully respond to this user message. Consider complexity, research needs, and length. Just the number, nothing else.' },
            { role: 'user', content: input.message.slice(0, 500) },
          ],
          temperature: 0,
          max_tokens: 20,
        }),
      });
      const data = await res.json();
      const parsed = parseInt(data.choices?.[0]?.message?.content?.trim() || '500');
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        estimatedResponseTokens = parsed;
      }
    } catch {}
  }

  // Input tokens (message + system prompt + history context)
  const estimatedInputTokens = Math.ceil(input.message.length / 4) + 800; // ~800 for system prompt
  const chatTokens = estimatedInputTokens + estimatedResponseTokens;

  // Tier-based model pricing (approximate, user-friendly)
  const tierPricing: Record<string, { in_rate: number; out_rate: number; label: string }> = {
    'premium': { in_rate: 0.30, out_rate: 1.20, label: 'AI analysis & response' },
    'bucket-list': { in_rate: 1.50, out_rate: 7.50, label: 'AI analysis & response (enhanced)' },
    'lfg': { in_rate: 3.00, out_rate: 15.00, label: 'AI analysis & response (maximum)' },
  };
  const pricing = tierPricing[input.tier] || tierPricing['premium'];
  const chatCost = (estimatedInputTokens / 1_000_000) * pricing.in_rate +
                   (estimatedResponseTokens / 1_000_000) * pricing.out_rate;

  items.push({ service: pricing.label, tokens: chatTokens, cost: chatCost });
  totalTokens += chatTokens;
  totalCost += chatCost;

  // Attachment processing cost
  if (input.hasAttachments) {
    const attachCost = input.attachmentCount * 0.002; // ~$0.002 per file for extraction
    items.push({ service: `File processing (${input.attachmentCount} files)`, cost: attachCost });
    totalCost += attachCost;
  }

  // Memory recall cost (always happens, near-zero)
  const memoryCost = 0.001;
  items.push({ service: 'Memory recall', cost: memoryCost });
  totalCost += memoryCost;

  return {
    id: `luc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tier: input.tier,
    items,
    total_tokens: totalTokens,
    total_cost: Math.round(totalCost * 1_000_000) / 1_000_000,
    created_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/lib/luc/estimator.ts
git commit -m "feat: LUC estimator — free model estimation logic"
```

---

### Task 3: Create LUC API routes

**Files:**
- Create: `cti-hub/src/app/api/luc/estimate/route.ts`
- Create: `cti-hub/src/app/api/luc/accept/route.ts`
- Create: `cti-hub/src/app/api/luc/stop/route.ts`

- [ ] **Step 1: Create estimate route**

```typescript
// cti-hub/src/app/api/luc/estimate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateEstimate } from '@/lib/luc/estimator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, tier = 'premium', attachments = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const estimate = await generateEstimate({
      message,
      tier,
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
    });

    return NextResponse.json({ estimate });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Estimation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create accept route**

```typescript
// cti-hub/src/app/api/luc/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return NextResponse.json({ error: 'estimate_id required' }, { status: 400 });
    }

    // In dev stage: accept immediately, no payment processing
    return NextResponse.json({
      accepted: true,
      estimate_id,
      message: 'Estimate accepted. Execution starting.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Accept failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create stop route**

```typescript
// cti-hub/src/app/api/luc/stop/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return NextResponse.json({ error: 'estimate_id required' }, { status: 400 });
    }

    return NextResponse.json({
      cancelled: true,
      estimate_id,
      message: 'Job cancelled. No charges applied.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Stop failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -10`

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/app/api/luc/
git commit -m "feat: LUC API routes — estimate, accept, stop"
```

---

### Task 4: Create LucPopup component

**Files:**
- Create: `cti-hub/src/components/chat/LucPopup.tsx`

- [ ] **Step 1: Create the popup component**

```typescript
// cti-hub/src/components/chat/LucPopup.tsx
'use client';

import { useState } from 'react';
import type { LucEstimate } from '@/lib/luc/types';

interface LucPopupProps {
  estimate: LucEstimate;
  estimateCount: number;      // How many estimates this session (for auto-accept toggle)
  onAccept: () => void;
  onAdjust: () => void;
  onStop: () => void;
  onAutoAcceptChange: (enabled: boolean) => void;
  autoAcceptEnabled: boolean;
}

export function LucPopup({
  estimate,
  estimateCount,
  onAccept,
  onAdjust,
  onStop,
  onAutoAcceptChange,
  autoAcceptEnabled,
}: LucPopupProps) {
  const tierColors: Record<string, string> = {
    'premium': '#22C55E',
    'bucket-list': '#3B82F6',
    'lfg': '#F59E0B',
  };
  const tierNames: Record<string, string> = {
    'premium': 'PREMIUM',
    'bucket-list': 'BUCKET LIST',
    'lfg': 'LFG',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="w-[400px] bg-bg-surface border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-fg-tertiary">LUC</div>
            <div className="font-mono text-[22px] font-bold mt-0.5">${estimate.total_cost.toFixed(3)}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="led" style={{ background: tierColors[estimate.tier] || '#22C55E' }} />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider">
              {tierNames[estimate.tier] || 'PREMIUM'}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-4">
          <div className="font-mono text-[10px]">
            <div className="grid grid-cols-[1fr_60px] gap-1 text-fg-tertiary font-semibold mb-2 uppercase">
              <span>What&apos;s included</span>
              <span className="text-right">Cost</span>
            </div>
            {estimate.items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px] gap-1 py-1.5 border-b border-border last:border-0">
                <span className="text-fg-secondary">{item.service}</span>
                <span className="text-right text-fg-secondary">${item.cost.toFixed(3)}</span>
              </div>
            ))}
          </div>
          {estimate.total_tokens > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between font-mono text-[10px]">
              <span className="text-fg-tertiary">Estimated tokens</span>
              <span className="text-fg">{estimate.total_tokens.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onAccept} className="btn-solid flex-1 h-10 text-[11px]">ACCEPT</button>
          <button onClick={onAdjust} className="btn-ghost w-20 h-10 text-[11px]">ADJUST</button>
          <button onClick={onStop} className="btn-ghost w-16 h-10 text-[11px] text-fg-tertiary border-fg-ghost">STOP</button>
        </div>

        {/* Auto-accept toggle (appears after 3rd estimate) */}
        {estimateCount >= 3 && (
          <div className="px-4 pb-4">
            <label className="flex items-center gap-2 p-2 bg-bg-elevated cursor-pointer">
              <input
                type="checkbox"
                checked={autoAcceptEnabled}
                onChange={(e) => onAutoAcceptChange(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="font-mono text-[10px] text-fg-tertiary">
                Auto-accept estimates this session
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/LucPopup.tsx
git commit -m "feat: LucPopup — cost estimate modal with accept/adjust/stop"
```

---

### Task 5: Create LucReceipt component

**Files:**
- Create: `cti-hub/src/components/chat/LucReceipt.tsx`

- [ ] **Step 1: Create the receipt component**

```typescript
// cti-hub/src/components/chat/LucReceipt.tsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/LucReceipt.tsx
git commit -m "feat: LucReceipt — collapsible cost breakdown on messages"
```

---

### Task 6: Update MessageBubble to use LucReceipt

**Files:**
- Modify: `cti-hub/src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Replace the inline metadata section with LucReceipt**

In `MessageBubble.tsx`, add the import at the top:
```typescript
import { LucReceipt } from './LucReceipt';
```

Then replace the metadata section (the `{msg.metadata && !msg.streaming && msg.role === 'acheevy' && (` block) with:
```typescript
      {msg.metadata && !msg.streaming && msg.role === 'acheevy' && (
        <LucReceipt metadata={msg.metadata} />
      )}
```

- [ ] **Step 2: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/MessageBubble.tsx
git commit -m "feat: MessageBubble uses LucReceipt for cost display"
```

---

### Task 7: Wire LUC popup into chat page

**Files:**
- Modify: `cti-hub/src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Add LUC imports and state**

Add these imports to the top of the chat page:
```typescript
import { LucPopup } from '@/components/chat/LucPopup';
import type { LucEstimate } from '@/lib/luc/types';
```

Add these state variables inside the component:
```typescript
const [lucEstimate, setLucEstimate] = useState<LucEstimate | null>(null);
const [lucPending, setLucPending] = useState<string | null>(null); // pending message
const [estimateCount, setEstimateCount] = useState(0);
const [autoAccept, setAutoAccept] = useState(false);
```

- [ ] **Step 2: Modify handleSend to go through LUC**

Replace the `handleSend` function. Before sending to `/api/chat`, it should:
1. Call `/api/luc/estimate` first
2. If auto-accept is off, show the LucPopup and wait
3. If auto-accept is on, proceed immediately
4. On ACCEPT: send to `/api/chat` as before
5. On STOP: cancel, remove the streaming placeholder

The new flow:
```typescript
async function handleSend(text?: string) {
  const msg = text || input.trim();
  if (!msg || sending) return;
  const currentAttachments = [...attachments];
  setInput('');
  setAttachments([]);
  if (inputRef.current) inputRef.current.style.height = 'auto';

  // Get LUC estimate
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

      if (!autoAccept) {
        // Show popup and wait for user action
        setLucEstimate(estData.estimate);
        setLucPending(msg);
        return;
      }
    }
  } catch {}

  // If auto-accept or no estimate, proceed directly
  await executeSend(msg, currentAttachments);
}
```

Add a new `executeSend` function that contains the actual send logic (the SSE streaming code currently in `handleSend`).

Add handlers:
```typescript
function handleLucAccept() {
  const msg = lucPending;
  setLucEstimate(null);
  setLucPending(null);
  if (msg) executeSend(msg, []);
}

function handleLucAdjust() {
  // For now, just close and let user re-type
  setLucEstimate(null);
  setLucPending(null);
}

function handleLucStop() {
  setLucEstimate(null);
  setLucPending(null);
}
```

- [ ] **Step 3: Add LucPopup to the JSX**

Before the closing `</div>` of the main container, add:
```tsx
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
```

- [ ] **Step 4: Verify build**

Run: `cd cti-hub && npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/app/\(dashboard\)/chat/page.tsx
git commit -m "feat: wire LUC popup into chat — estimate before every job"
```

---

### Task 8: Final build verification and push

- [ ] **Step 1: Full build**

Run: `cd cti-hub && npx next build 2>&1 | tail -20`

- [ ] **Step 2: Verify all LUC routes**

Run: `cd cti-hub && npx next build 2>&1 | grep luc`

- [ ] **Step 3: Push**

```bash
git push
```
