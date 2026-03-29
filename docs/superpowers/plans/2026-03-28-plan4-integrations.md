# Plan 4: Integrations — Skills Registry + Deep Research Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Skills submenu with a registry of prompt templates, connect Deep Research to actual API calls (Brave Search for search mode), and create the file upload API endpoint. Google Drive, GitHub, and Import/Migrate remain "coming soon" placeholders (require OAuth flows that are out of scope for this sprint).

**Architecture:** Skills registry is a static JSON config of prompt templates. Deep Research search mode hits a new `/api/research` endpoint that calls Brave Search. File upload endpoint accepts multipart form data and stores files temporarily for the session.

**Tech Stack:** Next.js 15 App Router, Brave Search API, TypeScript

---

## File Structure

```
cti-hub/src/
├── lib/
│   └── skills/
│       └── registry.ts           # Skills registry — prompt templates
├── components/
│   └── chat/
│       └── SkillsMenu.tsx        # Skills submenu
├── app/
│   └── api/
│       ├── research/
│       │   └── route.ts          # Deep Research search endpoint
│       └── upload/
│           └── route.ts          # File upload endpoint
```

---

### Task 1: Create Skills registry and SkillsMenu

**Files:**
- Create: `cti-hub/src/lib/skills/registry.ts`
- Create: `cti-hub/src/components/chat/SkillsMenu.tsx`

- [ ] **Step 1: Create skills registry**

```typescript
// cti-hub/src/lib/skills/registry.ts

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const SKILLS: Skill[] = [
  {
    id: 'use-case-assessment',
    name: 'Use Case Assessment',
    description: '4-phase consultation to validate your idea',
    prompt: 'I want to run a Use Case Assessment. Start with Phase 1: Share Your Idea. Ask me to describe my business problem, industry, and target audience.',
  },
  {
    id: 'competitive-brief',
    name: 'Competitive Brief',
    description: 'Research competitors and build a positioning report',
    prompt: 'Build me a competitive brief. Research the top 5 competitors in my space, analyze their pricing, features, and positioning, then deliver a structured report.',
  },
  {
    id: 'business-plan',
    name: 'Business Plan',
    description: 'Generate a lean business plan from a prompt',
    prompt: 'Help me create a lean business plan. Walk me through: problem, solution, target market, revenue model, and go-to-market strategy.',
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Deck',
    description: 'Create a pitch deck outline with talking points',
    prompt: 'Create a 10-slide pitch deck outline for my business. Include: problem, solution, market size, business model, traction, team, financials, and ask.',
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: '30-day social media content plan',
    prompt: 'Build me a 30-day content calendar for social media. Ask me about my brand, audience, and goals first, then generate the full calendar with post ideas.',
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    description: 'Analyze a website for SEO improvements',
    prompt: 'Run an SEO audit on my website. I\'ll provide the URL. Analyze: page speed, meta tags, content quality, backlink opportunities, and keyword gaps.',
  },
];
```

- [ ] **Step 2: Create SkillsMenu component**

```typescript
// cti-hub/src/components/chat/SkillsMenu.tsx
'use client';

import { SKILLS } from '@/lib/skills/registry';

interface SkillsMenuProps {
  onSelect: (prompt: string) => void;
}

export function SkillsMenu({ onSelect }: SkillsMenuProps) {
  return (
    <div className="w-[280px] bg-bg-surface border border-border shadow-lg py-1.5 self-start max-h-[360px] overflow-y-auto">
      <div className="px-4 py-1.5 border-b border-border">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Skills
        </span>
      </div>
      {SKILLS.map(skill => (
        <button
          key={skill.id}
          onClick={() => onSelect(skill.prompt)}
          className="w-full text-left px-4 py-2.5 hover:bg-bg-elevated transition-colors"
        >
          <div className="text-[13px] font-medium">{skill.name}</div>
          <div className="text-[11px] text-fg-tertiary mt-0.5">{skill.description}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**
- [ ] **Step 4: Commit**

```bash
git add cti-hub/src/lib/skills/registry.ts cti-hub/src/components/chat/SkillsMenu.tsx
git commit -m "feat: Skills registry + SkillsMenu component"
```

---

### Task 2: Create Deep Research API endpoint

**Files:**
- Create: `cti-hub/src/app/api/research/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// cti-hub/src/app/api/research/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, mode = 'search' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    if (mode === 'search') {
      if (!BRAVE_API_KEY) {
        return NextResponse.json({
          results: [{ title: 'Search unavailable', snippet: 'Search API key not configured. Results will be available once connected.', url: '' }],
        });
      }

      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      });

      if (!res.ok) {
        throw new Error('Search request failed');
      }

      const data = await res.json();
      const results = (data.web?.results || []).map((r: { title: string; description: string; url: string }) => ({
        title: r.title,
        snippet: r.description,
        url: r.url,
      }));

      return NextResponse.json({ results });
    }

    // Crawl and Extract modes — placeholder for now
    return NextResponse.json({
      results: [],
      message: `${mode} mode coming soon. Use search mode for now.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Research failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/app/api/research/route.ts
git commit -m "feat: /api/research — Brave Search for Deep Research"
```

---

### Task 3: Create file upload API endpoint

**Files:**
- Create: `cti-hub/src/app/api/upload/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// cti-hub/src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 files allowed' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'uploads', Date.now().toString());
    await mkdir(uploadDir, { recursive: true });

    const uploaded = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);

      uploaded.push({
        name: file.name,
        type: file.type,
        size: file.size,
        path: filepath,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**
- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/app/api/upload/route.ts
git commit -m "feat: /api/upload — file upload endpoint (max 10 files)"
```

---

### Task 4: Wire Skills into AttachmentMenu

**Files:**
- Modify: `cti-hub/src/components/chat/AttachmentMenu.tsx`

- [ ] **Step 1: Add Skills submenu support**

In `AttachmentMenu.tsx`:

1. Add import: `import { SkillsMenu } from './SkillsMenu';`

2. Add prop: `onSkillSelect: (prompt: string) => void` to the `AttachmentMenuProps` interface.

3. Add state: `const [showSkills, setShowSkills] = useState(false);`

4. Update the Skills menu item — remove `comingSoon: true` and add an onClick:
```typescript
{
  icon: <BookOpen className="w-4 h-4 text-fg-tertiary" />,
  label: 'Skills',
  hasSubmenu: true,
  onClick: () => { setShowSkills(!showSkills); setShowResearch(false); },
},
```

5. In the JSX, after the `{showResearch && <DeepResearchMenu ... />}` block, add:
```tsx
{showSkills && (
  <SkillsMenu
    onSelect={(prompt) => {
      onSkillSelect(prompt);
      setOpen(false);
      setShowSkills(false);
    }}
  />
)}
```

6. Update click-outside to also close skills: add `setShowSkills(false)` next to `setShowResearch(false)`.

7. Update the toggle button onClick to also close skills: `setShowSkills(false)`.

- [ ] **Step 2: Update chat page to pass onSkillSelect**

In `cti-hub/src/app/(dashboard)/chat/page.tsx`, add a handler:
```typescript
function handleSkillSelect(prompt: string) {
  handleSend(prompt);
}
```

And pass it to AttachmentMenu:
```tsx
<AttachmentMenu
  ...existing props...
  onSkillSelect={handleSkillSelect}
/>
```

- [ ] **Step 3: Verify build**
- [ ] **Step 4: Commit**

```bash
git add cti-hub/src/components/chat/AttachmentMenu.tsx cti-hub/src/app/\(dashboard\)/chat/page.tsx
git commit -m "feat: wire Skills submenu into AttachmentMenu"
```

---

### Task 5: Final build and push

- [ ] **Step 1: Full build** — `cd cti-hub && npx next build 2>&1 | tail -15`
- [ ] **Step 2: Push** — `git push`
