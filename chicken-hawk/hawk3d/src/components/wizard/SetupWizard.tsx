'use client';

import { useState } from 'react';
import { useHawkStore } from '@/store/hawkStore';

const STEPS = [
  {
    title: 'Welcome to Hawk3D',
    subtitle: 'Your 3D window into the Chicken-Hawk ecosystem',
  },
  {
    title: 'Connect Gateway',
    subtitle: 'Link to your Chicken-Hawk gateway',
  },
  {
    title: 'Select Your Hawks',
    subtitle: 'Choose which Lil_Hawks to visualize',
  },
  {
    title: 'Ready to Fly',
    subtitle: 'Your Hawk3D office is configured',
  },
];

export function SetupWizard() {
  const { setupStep, setSetupStep, completeSetup, agents, gateway, updateGateway } = useHawkStore();
  const [gatewayHost, setGatewayHost] = useState(gateway.host);
  const [gatewayPort, setGatewayPort] = useState(gateway.port.toString());
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(agents.map((a) => a.id)));

  const handleNext = () => {
    if (setupStep === 1) {
      updateGateway({
        host: gatewayHost,
        port: parseInt(gatewayPort, 10) || 3100,
      });
    }
    if (setupStep === STEPS.length - 1) {
      completeSetup();
      return;
    }
    setSetupStep(setupStep + 1);
  };

  const handleBack = () => {
    if (setupStep > 0) setSetupStep(setupStep - 1);
  };

  const toggleAgent = (id: string) => {
    const next = new Set(selectedAgents);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAgents(next);
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-hawk-surface">
      <div className="glass-card w-full max-w-lg p-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === setupStep
                  ? 'bg-hawk-gold w-6'
                  : i < setupStep
                  ? 'bg-hawk-gold/60'
                  : 'bg-hawk-surface-lighter'
              }`}
            />
          ))}
        </div>

        {/* Step header */}
        <h1 className="text-2xl font-bold text-hawk-gold text-center mb-1">
          {STEPS[setupStep].title}
        </h1>
        <p className="text-hawk-text-muted text-sm text-center mb-8">
          {STEPS[setupStep].subtitle}
        </p>

        {/* Step content */}
        <div className="mb-8">
          {setupStep === 0 && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-hawk-gold/10 border-2 border-hawk-gold flex items-center justify-center">
                <span className="text-hawk-gold text-3xl font-bold">H3</span>
              </div>
              <p className="text-hawk-text text-sm leading-relaxed">
                Hawk3D gives you a real-time 3D visualization of your Lil_Hawks fleet.
                Watch your agents code, research, deploy, and learn new skills — all from
                a beautiful office environment.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <FeatureCard title="10 Lil_Hawks" desc="Specialist fleet" />
                <FeatureCard title="12 Rooms" desc="Task-specific zones" />
                <FeatureCard title="Real-time" desc="Live agent status" />
              </div>
            </div>
          )}

          {setupStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-hawk-text-muted text-xs uppercase tracking-wider mb-1 block">Gateway Host</label>
                <input
                  type="text"
                  value={gatewayHost}
                  onChange={(e) => setGatewayHost(e.target.value)}
                  className="w-full bg-hawk-surface border border-hawk-gold/20 rounded-md px-3 py-2 text-hawk-text text-sm focus:border-hawk-gold focus:outline-none"
                  placeholder="localhost or your VPS IP"
                />
              </div>
              <div>
                <label className="text-hawk-text-muted text-xs uppercase tracking-wider mb-1 block">Gateway Port</label>
                <input
                  type="text"
                  value={gatewayPort}
                  onChange={(e) => setGatewayPort(e.target.value)}
                  className="w-full bg-hawk-surface border border-hawk-gold/20 rounded-md px-3 py-2 text-hawk-text text-sm focus:border-hawk-gold focus:outline-none"
                  placeholder="3100"
                />
              </div>
              <p className="text-hawk-text-muted text-xs">
                This connects Hawk3D to your Chicken-Hawk gateway via WebSocket.
                All communication stays local and secure.
              </p>
              <button
                onClick={() => {
                  updateGateway({ connected: true, vps1Status: 'online', vps2Status: 'online', tailscaleConnected: true });
                }}
                className="w-full py-2 bg-hawk-surface-lighter border border-hawk-gold/20 text-hawk-gold text-sm rounded-md hover:bg-hawk-surface-lighter/80 transition-all"
              >
                Test Connection
              </button>
              {gateway.connected && (
                <div className="text-green-400 text-xs text-center">Connected successfully!</div>
              )}
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left ${
                    selectedAgents.has(agent.id)
                      ? 'bg-hawk-gold/10 border border-hawk-gold/30'
                      : 'bg-hawk-surface/60 border border-transparent hover:border-hawk-gold/10'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.displayName.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-hawk-text text-xs font-medium">{agent.name}</div>
                    <div className="text-hawk-text-muted text-[10px]">{agent.role} • {agent.backend}</div>
                  </div>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selectedAgents.has(agent.id)
                      ? 'border-hawk-gold bg-hawk-gold'
                      : 'border-hawk-text-muted'
                  }`}>
                    {selectedAgents.has(agent.id) && <span className="text-hawk-surface text-[10px]">+</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {setupStep === 3 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border-2 border-green-400 flex items-center justify-center">
                <span className="text-green-400 text-2xl">+</span>
              </div>
              <p className="text-hawk-text text-sm">
                Your Hawk3D office is ready! You have <span className="text-hawk-gold font-bold">{selectedAgents.size}</span> agents configured.
              </p>
              <div className="text-hawk-text-muted text-xs space-y-1">
                <p>Gateway: {gatewayHost}:{gatewayPort}</p>
                <p>VPS-1: Gateway | VPS-2: Fleet</p>
                <p>Tailscale: Private Network</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={setupStep === 0}
            className={`px-4 py-2 rounded-md text-sm transition-all ${
              setupStep === 0
                ? 'text-hawk-text-muted/30 cursor-not-allowed'
                : 'text-hawk-text-muted hover:text-hawk-text'
            }`}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-hawk-gold text-hawk-surface font-medium rounded-md text-sm hover:bg-hawk-gold-bright transition-all"
          >
            {setupStep === STEPS.length - 1 ? 'Launch Hawk3D' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-hawk-surface/60 rounded-md p-3 text-center">
      <div className="text-hawk-gold text-sm font-bold">{title}</div>
      <div className="text-hawk-text-muted text-[10px]">{desc}</div>
    </div>
  );
}
