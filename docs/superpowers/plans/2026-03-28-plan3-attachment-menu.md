# Plan 3: Attachment Menu + Tier Selector

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic Paperclip file input with a `+` popover menu containing all attachment sources (files, screenshot, Drive, GitHub, Import/Migrate, Skills, Deep Research) and the execution tier selector. The Paperclip button becomes the `+` button.

**Architecture:** A single `AttachmentMenu` popover component with grouped menu items. Deep Research opens a submenu. Tier selector is a category at the bottom. Google Drive, GitHub, Import/Migrate, and Skills show "Coming soon" labels for now (Plan 4 wires the real integrations). File upload and screenshot are functional.

**Tech Stack:** Next.js 15, React 19, TypeScript, lucide-react icons

---

## File Structure

```
cti-hub/src/
├── components/
│   └── chat/
│       ├── AttachmentMenu.tsx     # The + popover with all groups
│       └── DeepResearchMenu.tsx   # Deep Research submenu
```

---

### Task 1: Create AttachmentMenu component

**Files:**
- Create: `cti-hub/src/components/chat/AttachmentMenu.tsx`

- [ ] **Step 1: Create the component**

```typescript
// cti-hub/src/components/chat/AttachmentMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Paperclip, Camera, HardDrive, Github, Import, BookOpen, Search, ChevronRight, Check,
} from 'lucide-react';
import type { TierId } from '@/lib/chat/types';
import { TIERS } from '@/lib/chat/types';
import { DeepResearchMenu } from './DeepResearchMenu';

interface AttachmentMenuProps {
  onFileSelect: () => void;
  onScreenshot: () => void;
  onDeepResearch: (mode: 'search' | 'crawl' | 'extract') => void;
  activeTier: TierId;
  onTierChange: (tier: TierId) => void;
  isSubscriber: boolean;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  hasSubmenu?: boolean;
  comingSoon?: boolean;
  dividerAfter?: boolean;
}

export function AttachmentMenu({
  onFileSelect,
  onScreenshot,
  onDeepResearch,
  activeTier,
  onTierChange,
  isSubscriber,
}: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowResearch(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleAction(action: () => void) {
    action();
    setOpen(false);
    setShowResearch(false);
  }

  const menuItems: MenuItem[] = [
    {
      icon: <Paperclip className="w-4 h-4 text-fg-tertiary" />,
      label: 'Add files or photos',
      onClick: () => handleAction(onFileSelect),
    },
    {
      icon: <Camera className="w-4 h-4 text-fg-tertiary" />,
      label: 'Take a screenshot',
      onClick: () => handleAction(onScreenshot),
      dividerAfter: true,
    },
    {
      icon: <HardDrive className="w-4 h-4 text-fg-tertiary" />,
      label: 'Google Drive',
      hasSubmenu: true,
      comingSoon: true,
    },
    {
      icon: <Import className="w-4 h-4 text-fg-tertiary" />,
      label: 'Import / Migrate',
      hasSubmenu: true,
      comingSoon: true,
    },
    {
      icon: <Github className="w-4 h-4 text-fg-tertiary" />,
      label: 'GitHub',
      hasSubmenu: true,
      comingSoon: true,
      dividerAfter: true,
    },
    {
      icon: <BookOpen className="w-4 h-4 text-fg-tertiary" />,
      label: 'Skills',
      hasSubmenu: true,
      comingSoon: true,
    },
    {
      icon: <Search className="w-4 h-4 text-signal-info" />,
      label: 'Deep Research',
      hasSubmenu: true,
      onClick: () => setShowResearch(!showResearch),
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setShowResearch(false); }}
        className="btn-solid h-[44px] w-[44px] px-0 shrink-0 flex items-center justify-center text-lg font-light"
        title="Add content"
      >
        +
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 flex gap-2 z-50">
          {/* Main menu */}
          <div className="w-[260px] bg-bg-surface border border-border shadow-lg py-1.5">
            {menuItems.map((item, i) => (
              <div key={i}>
                <button
                  onClick={item.onClick}
                  disabled={item.comingSoon}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                    item.comingSoon
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-bg-elevated'
                  } ${item.label === 'Deep Research' && showResearch ? 'bg-bg-elevated' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  {item.hasSubmenu && (
                    <ChevronRight className="w-3 h-3 text-fg-ghost" />
                  )}
                </button>
                {item.dividerAfter && <div className="h-px bg-border mx-0 my-1" />}
              </div>
            ))}

            {/* Divider before tier */}
            <div className="h-px bg-border mx-0 my-1" />

            {/* Execution Tier */}
            <div className="px-4 py-1.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
                Execution Tier
              </span>
            </div>
            {TIERS.map(tier => (
              <button
                key={tier.id}
                onClick={() => { if (isSubscriber) onTierChange(tier.id); }}
                disabled={!isSubscriber}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  !isSubscriber ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-elevated'
                } ${activeTier === tier.id ? 'bg-bg-elevated' : ''}`}
              >
                <span className="w-2 h-2" style={{ background: tier.color }} />
                <span className={`text-[13px] flex-1 ${activeTier === tier.id ? 'font-semibold' : ''}`}>
                  {tier.name}
                </span>
                {activeTier === tier.id && (
                  <Check className="w-3.5 h-3.5 text-signal-live" />
                )}
              </button>
            ))}
          </div>

          {/* Deep Research submenu */}
          {showResearch && (
            <DeepResearchMenu
              onSelect={(mode) => {
                onDeepResearch(mode);
                setOpen(false);
                setShowResearch(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/AttachmentMenu.tsx
git commit -m "feat: AttachmentMenu — + popover with sources, tier selector"
```

---

### Task 2: Create DeepResearchMenu component

**Files:**
- Create: `cti-hub/src/components/chat/DeepResearchMenu.tsx`

- [ ] **Step 1: Create the component**

```typescript
// cti-hub/src/components/chat/DeepResearchMenu.tsx
'use client';

interface DeepResearchMenuProps {
  onSelect: (mode: 'search' | 'crawl' | 'extract') => void;
}

const OPTIONS = [
  { id: 'search' as const, name: 'Search', desc: 'Find sources and answers' },
  { id: 'crawl' as const, name: 'Crawl', desc: 'Extract content from a site' },
  { id: 'extract' as const, name: 'Extract', desc: 'Pull structured data from a page' },
];

export function DeepResearchMenu({ onSelect }: DeepResearchMenuProps) {
  return (
    <div className="w-[220px] bg-bg-surface border border-border shadow-lg py-1.5 self-start">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Deep Research
        </span>
      </div>
      {OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors"
        >
          <div className="text-[13px] font-medium">{opt.name}</div>
          <div className="text-[11px] text-fg-tertiary mt-0.5">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/components/chat/DeepResearchMenu.tsx
git commit -m "feat: DeepResearchMenu — search, crawl, extract submenu"
```

---

### Task 3: Wire AttachmentMenu into chat page

**Files:**
- Modify: `cti-hub/src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Add imports**

Add at top:
```typescript
import { AttachmentMenu } from '@/components/chat/AttachmentMenu';
```

- [ ] **Step 2: Add screenshot handler**

Add this function inside the component:
```typescript
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
```

- [ ] **Step 3: Add deep research handler**

```typescript
function handleDeepResearch(mode: 'search' | 'crawl' | 'extract') {
  const prefixes: Record<string, string> = {
    search: '[Deep Research: Search] ',
    crawl: '[Deep Research: Crawl] ',
    extract: '[Deep Research: Extract] ',
  };
  setInput(prev => prefixes[mode] + prev);
  inputRef.current?.focus();
}
```

- [ ] **Step 4: Replace the Paperclip button with AttachmentMenu**

Find the section with the hidden file input and the Paperclip button. Replace the `<button onClick={() => fileInputRef.current?.click()} ...>` with:

```tsx
<AttachmentMenu
  onFileSelect={() => fileInputRef.current?.click()}
  onScreenshot={handleScreenshot}
  onDeepResearch={handleDeepResearch}
  activeTier={activeTier}
  onTierChange={setActiveTier}
  isSubscriber={true}
/>
```

Keep the hidden `<input ref={fileInputRef} ...>` — it's still needed for file selection.

- [ ] **Step 5: Verify build**
- [ ] **Step 6: Commit**

```bash
git add cti-hub/src/app/\(dashboard\)/chat/page.tsx
git commit -m "feat: wire AttachmentMenu into chat — + button with all sources"
```

---

### Task 4: Final build and push

- [ ] **Step 1: Full build** — `cd cti-hub && npx next build 2>&1 | tail -15`
- [ ] **Step 2: Push** — `git push`
