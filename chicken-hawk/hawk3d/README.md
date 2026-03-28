# Hawk3D - Chicken-Hawk Ecosystem Visualizer

A real-time 3D visualization system for the Chicken-Hawk sovereign AI operations layer. Watch your Lil_Hawks fleet code, research, deploy, and learn skills in a beautiful 3D office environment.

**Inspired by Claw3D** - built specifically for the Chicken-Hawk ecosystem.

## What is Hawk3D?

Hawk3D gives you a visual window into your Lil_Hawks fleet. Instead of watching terminal output scroll by, you see your agents move between rooms, work on tasks, and collaborate in real-time.

- **10 Lil_Hawks** with unique roles and visual identities
- **12 themed rooms** (Coding Desks, Skill Gym, Research Lab, Deploy Bay, etc.)
- **Real-time status** - agents move to rooms based on their current task
- **Janitor system** - visual session cleanup with sweeping animation
- **Gateway monitoring** - VPS-1/VPS-2 status and Tailscale connectivity
- **Setup wizard** - step-by-step first-time configuration

## Architecture

```
Hawk3D (Next.js + Three.js)
    │
    ├── 3D Scene (React Three Fiber)
    │   ├── Office Floor + Grid
    │   ├── 12 Room nodes
    │   ├── 10 Agent avatars
    │   ├── Gateway Hub (elevated)
    │   ├── VPS Topology view
    │   └── Janitor sweep
    │
    ├── HUD Layer
    │   ├── Top Bar (view modes, controls)
    │   ├── Fleet Status panel
    │   ├── Governance Chain
    │   └── Infrastructure status
    │
    ├── Panels
    │   ├── Agent Detail (click any agent)
    │   └── Activity Feed (real-time log)
    │
    └── Gateway Client
        ├── REST polling (/api/gateway)
        ├── WebSocket (planned)
        └── Simulation mode (demo)
```

## Tech Stack

- **Next.js 14** (App Router)
- **React Three Fiber** + **Three.js** for 3D
- **@react-three/drei** for 3D helpers
- **Zustand** for state management
- **Tailwind CSS** for UI
- **Framer Motion** for transitions
- **Socket.io** for real-time (planned)

## Quick Start

```bash
cd hawk3d
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the setup wizard.

See [tutorial.md](./tutorial.md) for detailed instructions.

## The Lil_Hawks Fleet

| Agent | Backend | Role | Room |
|-------|---------|------|------|
| Lil_TRAE_Hawk | TRAE Agent | Heavy coding & refactors | Desk / Gym |
| Lil_Coding_Hawk | OpenCode | Plan-first feature work | Desk / Review Room |
| Lil_Agent_Hawk | Agent Zero | OS/Browser/CLI workflows | Desk / Gym |
| Lil_Flow_Hawk | n8n | SaaS/CRM automation | Flow Room |
| Lil_Sand_Hawk | OpenSandbox | Safe code execution | Sandbox Zone |
| Lil_Memory_Hawk | CoPaw/ReMe | RAG memory | Memory Vault |
| Lil_Graph_Hawk | LangGraph | Stateful workflows | Graph Workshop |
| Lil_Back_Hawk | InsForge | LLM-native backends | Deploy Bay |
| Lil_Viz_Hawk | SimStudio | Visual monitoring | Desk |
| Lil_Deep_Hawk | DeerFlow 2.0 | SuperAgent with Squads | Deep Ops Center |

## Room System

Agents move between rooms based on their current task:

- **Coding Desks** - Default workspace for coding tasks
- **Skill Gym** - Where agents go when learning new skills (they spin!)
- **Research Lab** - Deep research and analysis
- **Deploy Bay** - Deployment and infrastructure tasks
- **PR Review Room** - Code review and PR approval
- **Flow Automation** - n8n workflow building
- **Sandbox Zone** - Safe code execution and testing
- **Memory Vault** - RAG indexing and knowledge management
- **Graph Workshop** - Stateful workflow construction
- **Deep Ops Center** - Multi-agent squad coordination
- **Hawk Lounge** - Idle / break area
- **Gateway Hub** - Elevated central connection point

## View Modes

1. **Office** - Default 3D office with rooms and agents
2. **Topology** - VPS-1/VPS-2 network topology with ecosystem repos
3. **Globe** - (Planned) Earth view with zoom-to-office

## Governance Chain

```
User → ACHEEVY → Boomer_Ang → Chicken Hawk → Squad → Lil_Hawks
```

Max 6 parallel hawks. LUC gates mandatory. Voice-first default.

## Ecosystem Integration

Hawk3D visualizes the entire Chicken-Hawk ecosystem:

- Chicken-Hawk (Intelligence Layer)
- AIMS (Platform Core)
- myclaw (Orchestration Hub)
- Agent-ACHEEVY-009 (Agent Framework)
- acheevy-whisper-build (Voice/STT)
- destinations-ai (Location Intelligence)
- the-perform-platform (KPI Analytics)
- LUC (Finance Engine)
- GRAMMAR (NLP Engine)
- acheevy.digital (Public Portal)
- Locale-by-ACHIEVEMOR-2 (Locale Frontend)
- CH-Docs (Documentation)

## Design System

- **Gold**: `#C8A84E` (primary brand)
- **Surface**: `#1A1A2E` (deep blue-black)
- **Accent**: `#E94560` (red highlight)
- **Text**: `#EAEAEA` / `#8892B0` (muted)
- **Font**: JetBrains Mono

## Contributing

PRs welcome! Fork the repo, create a branch, and submit.

## License

Part of the Chicken-Hawk ecosystem. See root LICENSE.
