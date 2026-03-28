'use client';

import { useRef } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Box, RoundedBox, Line } from '@react-three/drei';
import { useHawkStore } from '@/store/hawkStore';
import { ECOSYSTEM_REPOS } from '@/lib/constants';

export function VPSTopology() {
  const groupRef = useRef<Group>(null);
  const agents = useHawkStore((s) => s.agents);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 10, 0]}>
      {/* VPS-1 Node */}
      <VPSNode
        position={[-8, 0, 0]}
        label="VPS-1: Gateway"
        sublabel="OpenClaw + SimStudio"
        color="#C8A84E"
      />

      {/* VPS-2 Node */}
      <VPSNode
        position={[8, 0, 0]}
        label="VPS-2: Fleet"
        sublabel={`${agents.length} Lil_Hawks Active`}
        color="#E94560"
      />

      {/* Tailscale connection line */}
      <Line
        points={[[-6, 0, 0], [6, 0, 0]]}
        color="#C8A84E"
        lineWidth={2}
        dashed
        dashSize={0.5}
        gapSize={0.3}
      />
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.25}
        color="#8892B0"
        anchorX="center"
      >
        Tailscale Private Network
      </Text>

      {/* Ecosystem repos orbiting */}
      {ECOSYSTEM_REPOS.map((repo, i) => {
        const angle = (i / ECOSYSTEM_REPOS.length) * Math.PI * 2;
        const radius = 12;
        return (
          <EcoRepoNode
            key={repo.name}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 0.5) * 2 - 3,
              Math.sin(angle) * radius,
            ]}
            name={repo.name}
            role={repo.role}
            color={repo.color}
            index={i}
          />
        );
      })}
    </group>
  );
}

function VPSNode({
  position,
  label,
  sublabel,
  color,
}: {
  position: [number, number, number];
  label: string;
  sublabel: string;
  color: string;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={position}>
      <RoundedBox ref={meshRef} args={[3, 2, 1.5]} radius={0.2} castShadow>
        <meshStandardMaterial
          color="#1a1a2e"
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.7}
          roughness={0.3}
        />
      </RoundedBox>

      {/* Status LED */}
      <Sphere args={[0.15, 16, 16]} position={[0, 1.3, 0]}>
        <meshBasicMaterial color="#00FF88" />
      </Sphere>

      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color={color}
        anchorX="center"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {label}
      </Text>

      <Text
        position={[0, -1.5, 0]}
        fontSize={0.18}
        color="#8892B0"
        anchorX="center"
      >
        {sublabel}
      </Text>
    </group>
  );
}

function EcoRepoNode({
  position,
  name,
  role,
  color,
  index,
}: {
  position: [number, number, number];
  name: string;
  role: string;
  color: string;
  index: number;
}) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.3;
    }
  });

  return (
    <group ref={ref} position={position}>
      <Box args={[1.5, 0.8, 0.3]} castShadow>
        <meshStandardMaterial
          color="#16213E"
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.5}
          roughness={0.4}
        />
      </Box>

      <Text
        position={[0, 0.7, 0]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        maxWidth={2}
      >
        {name}
      </Text>

      <Text
        position={[0, -0.65, 0]}
        fontSize={0.1}
        color="#8892B0"
        anchorX="center"
      >
        {role}
      </Text>

      {/* Connection line back to center */}
      <Line
        points={[[0, 0, 0], [-position[0] * 0.6, -position[1] * 0.6, -position[2] * 0.6]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.2}
      />
    </group>
  );
}
