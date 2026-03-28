# Hawk3D Setup Tutorial

Get your 3D Lil_Hawks office running in 5-10 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A modern browser (Chrome, Firefox, Edge)
- (Optional) Chicken-Hawk gateway running on VPS-1

## Step 1: Clone and Install

```bash
# If you haven't cloned the Chicken-Hawk repo yet:
git clone https://github.com/BoomerAng9/Chicken-Hawk.git
cd Chicken-Hawk/hawk3d

# Install dependencies
npm install
```

## Step 2: Configure Environment

```bash
# Copy the example env file
cp .env.example .env.local

# Edit with your gateway details (optional - works in demo mode without)
nano .env.local
```

Key settings:
- `NEXT_PUBLIC_GATEWAY_HOST` - Your gateway IP (default: localhost)
- `NEXT_PUBLIC_GATEWAY_PORT` - Gateway port (default: 3100)

## Step 3: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 4: Setup Wizard

On first launch, the setup wizard will guide you:

1. **Welcome** - Overview of Hawk3D features
2. **Connect Gateway** - Enter your VPS gateway address
   - If you don't have a gateway running, click "Test Connection" anyway
   - Hawk3D runs in simulation mode with demo agent activity
3. **Select Hawks** - Choose which Lil_Hawks to show
4. **Launch** - Enter the 3D office!

## Step 5: Explore the Office

- **Mouse wheel** to zoom in/out
- **Left click + drag** to orbit
- **Right click + drag** to pan
- **Click an agent** to see their details

### What You'll See

- 10 Lil_Hawks moving between rooms based on tasks
- Agents spinning in the Gym when learning skills
- Activity feed showing real-time events
- Gateway status at the top bar

### Controls

- **Office / Topology / Globe** - Switch view modes
- **Clean Session** - Triggers the janitor to sweep the office
- **Activity** - Toggle the event feed

## Connecting to a Live Gateway

If you have Chicken-Hawk running on your VPS:

1. Make sure VPS-1 gateway is running and accessible
2. Ensure Tailscale tunnel is active between VPS-1 and VPS-2
3. Update the gateway host/port in the wizard or `.env.local`
4. Hawk3D will poll the gateway every 5 seconds for agent status updates

## Simulation Mode

If no gateway is available, Hawk3D runs in simulation mode:
- Agents randomly start and complete tasks
- Room changes are animated in real-time
- All features work (just with simulated data)

This is great for demos, development, or just exploring the interface.

## Customization

### Adding Custom Agents

Edit `src/store/hawkStore.ts` to add more agents to `DEFAULT_AGENTS`.

### Changing Room Layout

Edit `src/lib/constants.ts` to modify `ROOM_POSITIONS` and `ROOM_LABELS`.

### Theming

Colors are in `tailwind.config.ts` under `hawk.*` and in `src/app/globals.css`.

## Troubleshooting

**Black screen?** Make sure your browser supports WebGL. Try Chrome.

**Agents not moving?** The simulator starts automatically. Check the Activity Feed for events.

**Can't connect to gateway?** Hawk3D works in simulation mode. Check your VPS IP and port.

**Performance issues?** Try reducing the star count in `Hawk3DScene.tsx` or disabling post-processing.

## Building for Production

```bash
npm run build
npm start
```

Deploy to Vercel, Cloudflare, or your own VPS.
