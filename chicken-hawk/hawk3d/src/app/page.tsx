'use client';

import { Suspense, useState } from 'react';
import { Hawk3DScene } from '@/components/scene/Hawk3DScene';
import { HUDOverlay } from '@/components/hud/HUDOverlay';
import { AgentPanel } from '@/components/panels/AgentPanel';
import { ActivityFeed } from '@/components/panels/ActivityFeed';
import { TopBar } from '@/components/hud/TopBar';
import { SetupWizard } from '@/components/wizard/SetupWizard';
import { useHawkStore } from '@/store/hawkStore';

export default function Home() {
  const { isSetupComplete, selectedAgent } = useHawkStore();
  const [showActivityFeed, setShowActivityFeed] = useState(true);

  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-hawk-surface">
      {/* Top navigation bar */}
      <TopBar onToggleActivity={() => setShowActivityFeed(!showActivityFeed)} />

      {/* 3D Scene */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-hawk-gold text-xl hawk-pulse">Loading Hawk3D...</div>
          </div>
        }
      >
        <Hawk3DScene />
      </Suspense>

      {/* HUD Overlay */}
      <HUDOverlay />

      {/* Agent Detail Panel */}
      {selectedAgent && <AgentPanel />}

      {/* Activity Feed */}
      {showActivityFeed && <ActivityFeed />}
    </main>
  );
}
