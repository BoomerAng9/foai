# Skills.md — Agent ACHEEVY-009 Frontend Customization & AI Integration Guide

> **Purpose:** A reference for non-coders (and AI assistants) to translate your creative vision into precise technical instructions. Use this document when prompting Copilot, ChatGPT, or any AI coding assistant to build, animate, or integrate features in Agent ACHEEVY-009 (powered by ii-agent + NtNtN Engine).

---

## Table of Contents

1. [Your Current Tech Stack (What's Already Installed)](#1-your-current-tech-stack)
2. [Glossary — Plain English → Code Term](#2-glossary)
3. [3D Effects — How to Ask for Them](#3-3d-effects)
4. [Framer Motion Animations — Cheat Sheet](#4-framer-motion-animations)
5. [AI Tool Integration — Connecting Your Models](#5-ai-tool-integration)
6. [Prompt Templates — Copy-Paste Instructions for Your AI Assistant](#6-prompt-templates)
7. [Component Map — Where Things Live](#7-component-map)
8. [Common Customization Recipes](#8-common-customization-recipes)
9. [NtNtN Engine Integration](#9-ntntn-engine-integration)
10. [ACHEEVY-009 Brand System](#10-acheevy-009-brand-system)

---

## 1. Your Current Tech Stack

These are **already installed** in the Agent ACHEEVY-009 frontend. You don't need to add them.

| Technology | What It Does | Package Name |
|---|---|---|
| **React 19** | Builds the UI from reusable components | `react` |
| **TypeScript** | JavaScript with type safety (catches errors early) | `typescript` |
| **Tailwind CSS 4** | Utility-first styling (`className="bg-blue-500 p-4 rounded-xl"`) | `tailwindcss` |
| **Framer Motion 12** | Animations — fade, slide, scale, drag, layout transitions | `framer-motion` / `motion` |
| **Three.js** | Full 3D graphics engine for the browser | `three` |
| **React Three Fiber** | React wrapper for Three.js (use 3D like components) | `@react-three/fiber` |
| **Drei** | Ready-made 3D helpers (text, cameras, lighting, shadows) | `@react-three/drei` |
| **Radix UI** | Accessible UI primitives (dialogs, dropdowns, tooltips, etc.) | `@radix-ui/*` |
| **Lottie React** | Plays After Effects/Lottie JSON animations in the browser | `lottie-react` |
| **Lucide Icons** | SVG icon library (500+ icons) | `lucide-react` |
| **React Flow (xyflow)** | Interactive node-based diagrams and flowcharts | `@xyflow/react` |
| **Monaco Editor** | VS Code's code editor, embedded in the browser | `@monaco-editor/react` |
| **Mermaid** | Renders diagrams from text (flowcharts, sequence diagrams) | `mermaid` |
| **Vite** | Lightning-fast dev server and build tool | `vite` |
| **Redux Toolkit** | Global state management | `@reduxjs/toolkit` |
| **Socket.io** | Real-time WebSocket communication with the backend | `socket.io-client` |
| **KaTeX** | Renders math equations beautifully | `katex` / `rehype-katex` |

### Optional Additions (Not Yet Installed)

| Technology | What It Does | Install Command |
|---|---|---|
| **React Three Postprocessing** | Bloom, glow, depth-of-field, chromatic aberration | `pnpm add @react-three/postprocessing` |
| **Spline** | Import 3D scenes designed in Spline (no-code 3D editor) | `pnpm add @splinetool/react-spline` |
| **GSAP** | Professional-grade animation timeline library | `pnpm add gsap` |

---

## 2. Glossary

Use these terms when instructing your AI assistant to build things:

### Layout & Structure

| What You Mean | Technical Term | Example Instruction |
|---|---|---|
| The overall page layout | **Container / Wrapper** | "Wrap the dashboard in a flex container" |
| The top bar with logo & nav | **Header / Navbar / AppBar** | "Add a sticky header with glassmorphism" |
| The left panel with links | **Sidebar / Drawer** | "Create a collapsible sidebar" |
| A reusable widget/block | **Component** | "Make a component for the AI status card" |
| The popup that appears on click | **Modal / Dialog** | "Open a dialog when the user clicks settings" |
| A smaller popup near a button | **Popover / Tooltip** | "Show a tooltip on hover" |
| Cards/tiles arranged in a grid | **Grid Layout / CSS Grid** | "Display agent cards in a 3-column grid" |
| Scrollable horizontal list | **Carousel / Slider** | "Add a carousel for AI model selection" |
| Tabs at the top of a section | **Tabs / Tab Group** | "Create tabs for Chat, Agent, and Research" |

### Styling & Visual Effects

| What You Mean | Technical Term | Example Instruction |
|---|---|---|
| Blurry transparent background | **Glassmorphism / backdrop-blur** | "Apply glassmorphism to the sidebar" |
| Smooth color transition background | **Gradient** | "Use a purple-to-blue gradient background" |
| Moving gradient that shifts | **Animated Gradient / Mesh Gradient** | "Add an animated mesh gradient hero" |
| Glowing edges | **Box Shadow / Glow Effect** | "Add a neon glow border to active cards" |
| Dark mode | **Dark Theme / Theme Toggle** | "Implement dark mode toggle with next-themes" |
| Rounded corners | **Border Radius / rounded-xl** | "Make all cards rounded-2xl" |
| Thin border between sections | **Divider / Separator** | "Add a separator between chat messages" |
| Depth / layering effect | **Z-index / Elevation / Shadow** | "Elevate the floating action button with shadow-2xl" |
| Noise texture overlay | **Grain / Noise Filter** | "Add a subtle grain texture to the background" |
| Parallax (layers move at different speeds) | **Parallax Scrolling** | "Add parallax scrolling to the landing page hero" |

### Animation Terms

| What You Mean | Technical Term | Framer Motion Prop |
|---|---|---|
| Fade in when visible | **Fade In / Enter Animation** | `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` |
| Slide in from the side | **Slide In / Translate** | `initial={{ x: -100 }} animate={{ x: 0 }}` |
| Grow from small to full size | **Scale Up / Zoom In** | `initial={{ scale: 0 }} animate={{ scale: 1 }}` |
| Bounce when appearing | **Spring Animation** | `transition={{ type: "spring", bounce: 0.4 }}` |
| Animate when scrolling into view | **Scroll-triggered / whileInView** | `whileInView={{ opacity: 1 }} viewport={{ once: true }}` |
| Stagger children one by one | **Stagger / Orchestration** | Use `staggerChildren: 0.1` in parent variants |
| Pulse / breathing effect | **Pulse / Keyframe Loop** | `animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity }}` |
| Smooth reorder when list changes | **Layout Animation** | Add `layout` prop to `motion.div` |
| Drag to reposition | **Drag** | `drag dragConstraints={{ top: 0, bottom: 300 }}` |
| Animate between pages | **Page Transition / AnimatePresence** | Wrap routes in `<AnimatePresence>` |
| Loading skeleton | **Shimmer / Skeleton** | Already exists: `shimmer.tsx` |
| Typewriter text | **Text Reveal / Streaming** | Animate each character with stagger |

### 3D-Specific Terms

| What You Mean | Technical Term | How to Ask |
|---|---|---|
| A 3D object floating on the page | **3D Mesh / Scene** | "Add a floating 3D sphere using React Three Fiber" |
| Rotate on mouse movement | **OrbitControls / Mouse Tracking** | "Make the 3D logo rotate as I move my mouse" |
| Shiny metallic look | **PBR Material / MeshStandardMaterial** | "Apply a metallic material with roughness 0.2" |
| Realistic lighting | **Lighting Setup (Ambient + Directional)** | "Add soft ambient light and a key directional light" |
| Glow / bloom around objects | **Post-processing Bloom** | "Add a bloom pass to make edges glow" |
| Text in 3D | **3D Text / Text3D** | "Render the logo as extruded 3D text" |
| Background particles | **Particle System / Points** | "Add a starfield particle background" |
| Morph between shapes | **Morph Targets / Shape Interpolation** | "Morph the sphere into a cube on scroll" |
| Reflective floor | **Reflector / MeshReflectorMaterial** | "Add a glossy reflective floor plane" |

---

## 3. 3D Effects

### Option A: CSS-only 3D (No Extra Libraries)

Good for subtle depth effects that don't need a full 3D engine.

```tsx
// Card that tilts on hover — pure CSS + Framer Motion
import { motion } from 'framer-motion'

export function TiltCard({ children }) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
      whileHover={{
        rotateX: 5,
        rotateY: -5,
        scale: 1.02,
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  )
}
```

**How to ask:** *"Add a 3D tilt hover effect to the agent cards using Framer Motion perspective transforms"*

### Option B: React Three Fiber (Full 3D Scenes)

For actual 3D objects, scenes, and immersive backgrounds.

```tsx
// Floating 3D sphere with glow — needs @react-three/fiber + drei
import { Canvas } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'

export function Hero3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <Float speed={2} floatIntensity={2}>
        <mesh>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial
            color="#8b5cf6"
            distort={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </Float>
    </Canvas>
  )
}
```

**How to ask:** *"Create a 3D hero section with a floating distorted sphere using React Three Fiber and Drei"*

### Option C: Spline (Design in a Visual Editor, Export to React)

1. Design your 3D scene at [spline.design](https://spline.design)
2. Export → React component
3. Drop it in:

```tsx
import Spline from '@splinetool/react-spline'

export function Hero3D() {
  return <Spline scene="https://prod.spline.design/your-scene-id/scene.splinecode" />
}
```

**How to ask:** *"Embed my Spline 3D scene in the landing page hero section"*

---

## 4. Framer Motion Animations

### Already Used In This Project

The project already uses Framer Motion in:
- **Thinking indicator** (`thinking-message.tsx`) — pulsing dots animation
- **UI transitions** — fade-in/out on dialogs, dropdowns, popovers
- **Progress bars** — breathing fill animation
- **Slide templates** — fadeIn animation

### Quick Reference: Common Animations

```tsx
import { motion, AnimatePresence } from 'framer-motion'

// 1. FADE + SLIDE UP (great for page sections)
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  Content here
</motion.div>

// 2. STAGGERED LIST (children appear one by one)
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i} variants={item}>{i}</motion.li>
  ))}
</motion.ul>

// 3. SCROLL-TRIGGERED ANIMATION
<motion.section
  initial={{ opacity: 0, scale: 0.95 }}
  whileInView={{ opacity: 1, scale: 1 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.8 }}
>
  Appears when scrolled into view
</motion.section>

// 4. PAGE TRANSITIONS (wrap your router)
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>

// 5. HOVER + TAP MICRO-INTERACTIONS
<motion.button
  whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(139,92,246,0.5)' }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click Me
</motion.button>

// 6. ANIMATED GRADIENT TEXT
<motion.h1
  className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"
  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
  transition={{ duration: 5, repeat: Infinity }}
  style={{ backgroundSize: '200% 200%' }}
>
  A.I.M.S
</motion.h1>
```

### Easing Cheat Sheet

| Feel | Easing Value | When to Use |
|---|---|---|
| Smooth & natural | `ease: 'easeOut'` | Most UI animations |
| Bouncy & playful | `type: 'spring', bounce: 0.4` | Buttons, cards, notifications |
| Snappy & precise | `type: 'spring', stiffness: 500, damping: 30` | Menus, toggles |
| Dramatic & slow | `duration: 1.2, ease: [0.16, 1, 0.3, 1]` | Hero sections, page loads |
| Elastic overshoot | `type: 'spring', stiffness: 200, damping: 10` | Fun/playful UI elements |

---

## 5. AI Tool Integration

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│                 FRONTEND                     │
│  React + Framer Motion + Tailwind           │
│  Port: 1420                                 │
├─────────────────────────────────────────────┤
│             ↕ WebSocket (Socket.io)          │
├─────────────────────────────────────────────┤
│                 BACKEND                      │
│  Python (FastAPI/Uvicorn)                   │
│  Port: 8000                                 │
│  ├── Agent Controller                       │
│  ├── LLM Router (multi-model)              │
│  ├── MCP Server (tool protocol)            │
│  └── Sub-Agent System                       │
├──────────────┬──────────────────────────────┤
│  TOOL SERVER │  SANDBOX SERVER              │
│  Port: 1236  │  Port: 8100                  │
│  File ops,   │  E2B sandboxes,              │
│  GCS, etc.   │  code execution              │
├──────────────┴──────────────────────────────┤
│  POSTGRES (5432)  │  REDIS (6379)           │
└───────────────────┴─────────────────────────┘
```

### LLM Configuration (`.stack.env`)

The `LLM_CONFIGS` JSON supports **multiple models simultaneously**:

```json
{
  "default": {
    "model": "gpt-5",
    "api_key": "sk-..."
  },
  "anthropic": {
    "model": "claude-sonnet-4-20250514",
    "api_key": "sk-ant-..."
  },
  "gemini": {
    "model": "gemini-3-flash",
    "api_key": "AIza..."
  }
}
```

### MCP (Model Context Protocol)

MCP lets you add custom tools that AI agents can call. The config is in `setting_mcp.json`:

**How to ask:** *"Add a new MCP tool server that connects to my custom API at localhost:3001"*

### Key Integration Points

| What You Want | Where to Look | How to Ask |
|---|---|---|
| Add a new AI model | `src/ii_agent/llm/` | "Add a new LLM provider for [model name]" |
| Custom agent behavior | `src/ii_agent/agents/` | "Create a custom agent that specializes in [task]" |
| New tool for the agent | `src/ii_tool/tools/` | "Add a tool that lets the agent [action]" |
| Browser automation | `src/ii_tool/browser/` | "Add browser tool capability for [task]" |
| MCP integration | `src/ii_tool/mcp/` | "Connect MCP server at [endpoint]" |
| Modify chat UI | `frontend/src/components/agent/` | "Redesign the chat message bubbles with [style]" |
| Add new page/route | `frontend/src/app/` | "Create a new dashboard page at /[route]" |
| Custom API endpoint | `src/ii_agent/server/` | "Add an API endpoint for [feature]" |

---

## 6. Prompt Templates

Copy-paste these when instructing your AI assistant:

### Landing Page with 3D Hero
```
Create a landing page for II-Agent with:
- A 3D animated hero section using React Three Fiber with a floating, 
  slowly rotating icosahedron that has a metallic purple material
- Glassmorphism navbar with backdrop-blur-md
- Framer Motion scroll-triggered fade-up animations for feature cards
- Animated gradient text for the main heading
- Staggered entrance animation for the feature grid
- A particle starfield background behind the 3D scene
- Dark theme with purple/blue accent colors
- Mobile responsive with 3D scene hidden on small screens
```

### Dashboard with Animated Cards
```
Create an AI agent dashboard with:
- Framer Motion layout animations when cards reorder
- Each card has a 3D tilt-on-hover effect using perspective transforms
- Staggered entrance when the page loads
- AnimatePresence for smooth add/remove of agent cards
- A glassmorphism sidebar with slide-in animation
- Real-time status indicators with pulsing dot animations
- Progress bars with the existing breathing-fill animation style
- Skeleton loading states using the existing shimmer component
```

### Chat Interface Enhancement
```
Enhance the II-Agent chat interface with:
- Framer Motion message entrance animations (slide up + fade)
- Typing indicator with the existing pulsing dots style
- Smooth scroll-to-bottom with spring animation
- Message reactions that pop in with a spring bounce
- Code blocks with a subtle appear animation
- AnimatePresence for message deletion transitions
- A floating input bar with glassmorphism and shadow elevation
```

### 3D Background Scene
```
Create an ambient 3D background component with:
- React Three Fiber canvas that fills the viewport behind content
- Slowly rotating wireframe geometry (torus knot or icosahedron)
- Soft ambient particles that float and drift
- Post-processing bloom for a subtle glow effect
- Reduced motion / static fallback for accessibility
- Performance: use drei's <PerformanceMonitor> to auto-reduce quality
- Opacity overlay so text remains readable on top
```

---

## 7. Component Map

Where to find and modify key parts of the II-Agent frontend:

```
frontend/src/
├── app/                        # Routes & pages
├── components/
│   ├── agent/                  # Agent UI (chat, steps, results, browser)
│   │   ├── chat-box.tsx        # Main chat container
│   │   ├── chat-message.tsx    # Individual chat messages
│   │   ├── agent-controller.tsx # Agent control panel
│   │   ├── agent-result.tsx    # Agent output display
│   │   └── browser.tsx         # Embedded browser preview
│   │
│   ├── ai-elements/            # AI-specific UI components
│   │   ├── shimmer.tsx         # Loading skeleton animation
│   │   ├── loader.tsx          # Loading states
│   │   ├── reasoning.tsx       # Chain-of-thought display
│   │   ├── canvas.tsx          # Drawing/visual canvas
│   │   └── toolbar.tsx         # AI element toolbar
│   │
│   ├── ui/                     # Base UI primitives (Radix-based)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   │
│   ├── header.tsx              # Top navigation bar (ACHEEVY-009 branding)
│   ├── sidebar.tsx             # Left sidebar navigation
│   ├── thinking-message.tsx    # Uses AcheevyLoader (compact variant)
│   ├── question-input.tsx      # User prompt input
│   ├── question-suggestions.tsx # M.I.M./NtNtN-aligned preset suggestions
│   ├── public-home-page.tsx    # Public landing page (ACHEEVY-009 + Hero3D)
│   └── markdown.tsx            # Markdown renderer
│
│   ├── acheevy/                # ⬅ ACHEEVY-009 Custom Components
│   │   ├── hero-3d.tsx         # 3D hero scene (R3F morphing orb + particles)
│   │   ├── acheevy-loader.tsx  # NtNtN pipeline loader (compact/full/inline)
│   │   ├── preset-tasks.tsx    # 6 preset task cards with 3D hover effects
│   │   └── ntntn-analyzer.tsx  # Real-time NLP build intent analyzer
│
├── lib/
│   └── ntntn/
│       └── engine.ts           # NtNtN Creative Build Engine (frontend mirror)
│
├── contexts/                   # React contexts (theme, auth, etc.)
├── hooks/                      # Custom React hooks
├── services/                   # API calls & WebSocket setup
├── state/                      # Redux store & slices
└── utils/                      # Helper functions
```

---

## 8. Common Customization Recipes

### Recipe 1: Add a New Animated Page

```
Tell your AI assistant:
"Create a new page at /dashboard with:
1. A route in the app router
2. A motion.div wrapper with page transition animation
3. A grid of cards with staggered entrance
4. Each card uses the TiltCard component with 3D hover effect"
```

### Recipe 2: Enhance an Existing Component

```
Tell your AI assistant:
"In frontend/src/components/agent/chat-message.tsx:
1. Wrap each message in a motion.div
2. Add initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
3. Use AnimatePresence so messages animate out when deleted
4. Add a spring transition with stiffness 300 and damping 25"
```

### Recipe 3: Add a 3D Logo/Mascot

```
Tell your AI assistant:
"1. Install @react-three/fiber and @react-three/drei
2. Create a component at frontend/src/components/hero-3d.tsx
3. Render a Canvas with a Float-wrapped 3D model
4. Load a .glb model from public/models/mascot.glb using useGLTF
5. Add soft lighting and a subtle bloom post-processing effect
6. Place it in the header or landing page hero section"
```

### Recipe 4: Glassmorphism Theme Overhaul

```
Tell your AI assistant:
"Update the II-Agent theme to glassmorphism:
1. Sidebar: bg-white/10 backdrop-blur-xl border-r border-white/20
2. Cards: bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl
3. Header: sticky top-0 bg-black/30 backdrop-blur-lg z-50
4. Chat bubbles: bg-gradient-to-br from-purple-500/20 to-blue-500/20
5. Input bar: bg-white/10 backdrop-blur-sm border border-white/20
6. Use shadow-[0_8px_32px_rgba(0,0,0,0.3)] for elevated elements"
```

### Recipe 5: Animated Background

```
Tell your AI assistant:
"Add an animated gradient background to the main layout:
1. Create a full-screen fixed div behind all content
2. Use a CSS animated gradient: bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]
3. Animate it with background-size: 400% 400% and a slow position shift
4. Add a subtle noise/grain overlay using a repeating SVG pattern
5. Ensure text contrast remains accessible"
```

---

## Quick Reference Card

### When You Want → Say This

| Your Idea | Prompt Phrase |
|---|---|
| Make it look modern/sleek | "Apply glassmorphism with backdrop-blur and border-white/20" |
| Add smooth animations | "Use Framer Motion with spring transitions" |
| 3D floating objects | "Add a React Three Fiber scene with Float from drei" |
| Glowing buttons | "Add a neon glow box-shadow on hover with Framer Motion whileHover" |
| Particles background | "Create a particle system with Three.js Points geometry" |
| Page transitions | "Wrap routes in AnimatePresence with fade/slide transitions" |
| Loading skeleton | "Use the existing shimmer component from ai-elements" |
| Real-time updates | "Use the Socket.io connection in services/ to stream updates" |
| New AI tool | "Add a tool in src/ii_tool/tools/ that the agent can invoke" |
| Connect new LLM | "Add a provider config in LLM_CONFIGS in .stack.env" |

---

*Last updated: Session — Agent ACHEEVY-009 Build*
*Stack: React 19 · TypeScript · Tailwind CSS 4 · Framer Motion 12 · Three.js · React Three Fiber · Drei · Radix UI · Vite 6*
*Engine: NtNtN Creative Build Engine · M.I.M. D.U.M.B. Pipeline*

---

## 9. NtNtN Engine Integration

The NtNtN (Name that Name that Name) Creative Build Engine is integrated into the frontend at `src/lib/ntntn/engine.ts`. It provides:

### Core Functions

| Function | What It Does | Usage |
|---|---|---|
| `detectBuildIntent(text)` | Returns `true` if the user's input is a build request | Gate for showing the analyzer UI |
| `classifyBuildIntent(text)` | Scores input against 10 build categories | Powers the category chips in NtNtNAnalyzer |
| `detectScopeTier(text)` | Determines project scale (component/page/application/platform) | Used in preset tasks and analyzer |

### 10 Build Categories

| Category | Icon | Example Keywords |
|---|---|---|
| Frontend Frameworks | `⚛️` | react, next, vue, svelte, angular |
| Animation & Motion | `🎬` | animate, motion, transition, framer |
| Styling Systems | `🎨` | tailwind, css, styled, theme, glassmorphism |
| 3D & Visual | `🧊` | three, 3d, webgl, spline, shader |
| Scroll & Interaction | `📜` | scroll, parallax, intersection, trigger |
| UI Components | `🧩` | button, card, modal, dropdown, form |
| Layout & Responsive | `📐` | grid, flex, responsive, mobile, container |
| Backend & Fullstack | `⚙️` | api, database, auth, server, prisma |
| CMS & Content | `📝` | cms, blog, content, markdown, sanity |
| Deployment & Infra | `🚀` | deploy, docker, ci/cd, vercel, aws |

### Where It's Used

- **`ntntn-analyzer.tsx`** — Shows live category detection as the user types in the prompt input
- **`preset-tasks.tsx`** — Each preset task has a `category` and `scopeTier` from the engine
- **`home.tsx`** — Wired into the home page below the question input

---

## 10. ACHEEVY-009 Brand System

### Brand Colors (CSS Custom Properties)

Defined in `global.css`:

| Variable | Hex | Usage |
|---|---|---|
| `--color-acheevy-purple` | `#8b5cf6` | Primary brand accent |
| `--color-acheevy-cyan` | `#06b6d4` | Secondary accent |
| `--color-acheevy-emerald` | `#10b981` | Success / active states |
| `--color-acheevy-amber` | `#f59e0b` | Warning / progress |
| `--color-acheevy-pink` | `#ec4899` | Accent highlights |
| `--color-acheevy-indigo` | `#6366f1` | Deep accent |
| `--color-acheevy-surface` | `rgba(139,92,246,0.05)` | Subtle background tint |
| `--color-acheevy-border` | `rgba(139,92,246,0.15)` | Border accent |

### Brand Animations (CSS)

Defined in `animations.css`:

| Animation | What It Does |
|---|---|
| `acheevy-gradient` | Animated gradient background-position shift |
| `acheevy-glow` | Pulsing box-shadow glow effect |
| `acheevy-float` | Gentle floating/bobbing motion |
| `acheevy-scan` | Horizontal scanning line effect |

### Utility Classes

| Class | Effect |
|---|---|
| `.acheevy-gradient-text` | Animated gradient text fill |
| `.acheevy-glow-border` | Pulsing purple glow border |
| `.acheevy-float` | Floating animation |
| `.acheevy-glass` | Light glassmorphism backdrop |
| `.acheevy-glass-strong` | Strong glassmorphism backdrop |

### Branding Locations

| File | What Changed |
|---|---|
| `header.tsx` | Logo text → "ACHEEVY-009" |
| `home.tsx` | Greeting → "What shall we build today?" + NtNtN subtitle |
| `public-home-page.tsx` | Hero → "Meet Agent ACHEEVY-009" + Hero3DScene + NtNtN tagline |
| `thinking-message.tsx` | Now uses `AcheevyLoader` (compact variant) |
| `question-suggestions.tsx` | Preset prompts aligned to M.I.M./NtNtN building themes |
