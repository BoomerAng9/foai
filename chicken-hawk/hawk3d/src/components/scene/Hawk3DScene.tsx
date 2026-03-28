'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { OfficeFloor } from './OfficeFloor';
import { Room3D } from './Room3D';
import { HawkAgent3D } from './HawkAgent3D';
import { VPSTopology } from './VPSTopology';
import { JanitorSweep } from './JanitorSweep';
import { GatewayHub } from './GatewayHub';
import { useHawkStore } from '@/store/hawkStore';
import { ROOM_POSITIONS, ROOM_LABELS } from '@/lib/constants';
import { startSimulation } from '@/lib/agentSimulator';

export function Hawk3DScene() {
  const { agents, viewMode, isJanitorActive } = useHawkStore();

  useEffect(() => {
    startSimulation();
  }, []);

  return (
    <div className="absolute inset-0">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <PerspectiveCamera makeDefault position={[20, 18, 20]} fov={50} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[15, 20, 10]}
          intensity={0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#C8A84E" />
        <hemisphereLight
          color="#1A1A2E"
          groundColor="#0a0a15"
          intensity={0.4}
        />

        {/* Stars background */}
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

        {/* Fog */}
        <fog attach="fog" args={['#0a0a15', 30, 80]} />

        <Suspense fallback={null}>
          {/* Floor */}
          <OfficeFloor />

          {/* Rooms */}
          {Object.entries(ROOM_POSITIONS).map(([roomId, position]) => (
            <Room3D
              key={roomId}
              roomId={roomId}
              position={position}
              label={ROOM_LABELS[roomId] || roomId}
            />
          ))}

          {/* Agent avatars */}
          {agents.map((agent, index) => (
            <HawkAgent3D key={agent.id} agent={agent} index={index} />
          ))}

          {/* Gateway hub (elevated) */}
          <GatewayHub />

          {/* VPS Topology (when in topology view) */}
          {viewMode === 'topology' && <VPSTopology />}

          {/* Janitor sweep animation */}
          {isJanitorActive && <JanitorSweep />}
        </Suspense>
      </Canvas>
    </div>
  );
}
