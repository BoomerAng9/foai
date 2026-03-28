'use client';

import { useRef, useState } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Box, RoundedBox } from '@react-three/drei';
import { useHawkStore } from '@/store/hawkStore';

interface Room3DProps {
  roomId: string;
  position: [number, number, number];
  label: string;
}

const ROOM_ICONS: Record<string, { geometry: 'desk' | 'gym' | 'server' | 'shield' | 'brain' | 'flow' | 'cube' | 'eye' | 'rocket' | 'couch' | 'hub' }> = {
  'desk': { geometry: 'desk' },
  'gym': { geometry: 'gym' },
  'lab': { geometry: 'brain' },
  'deploy-bay': { geometry: 'rocket' },
  'review-room': { geometry: 'shield' },
  'flow-room': { geometry: 'flow' },
  'sandbox': { geometry: 'cube' },
  'memory-vault': { geometry: 'brain' },
  'graph-room': { geometry: 'flow' },
  'deep-ops': { geometry: 'eye' },
  'lounge': { geometry: 'couch' },
  'gateway': { geometry: 'hub' },
};

export function Room3D({ roomId, position, label }: Room3DProps) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const agents = useHawkStore((s) => s.agents);

  const agentsInRoom = agents.filter((a) => a.currentRoom === roomId && a.status !== 'offline');
  const isActive = agentsInRoom.length > 0;

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
      glowRef.current.scale.setScalar(isActive ? pulse : 0.8);
    }
  });

  // Skip rendering gateway room at floor level (it's elevated)
  if (roomId === 'gateway') return null;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Room base platform */}
      <RoundedBox
        args={[5, 0.15, 5]}
        radius={0.3}
        smoothness={4}
        position={[0, 0.075, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isActive ? '#1a2a4e' : '#12122a'}
          roughness={0.6}
          metalness={0.3}
          emissive={isActive ? '#C8A84E' : '#000000'}
          emissiveIntensity={isActive ? 0.05 : 0}
        />
      </RoundedBox>

      {/* Room border glow */}
      <mesh ref={glowRef} position={[0, 0.2, 0]}>
        <ringGeometry args={[2.4, 2.6, 32]} />
        <meshBasicMaterial
          color={isActive ? '#C8A84E' : '#2a2a4e'}
          transparent
          opacity={isActive ? 0.6 : 0.2}
        />
      </mesh>

      {/* Room furniture - desk representation */}
      <RoundedBox
        args={[1.5, 0.6, 0.8]}
        radius={0.05}
        position={[0, 0.5, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#2a2a4e"
          roughness={0.4}
          metalness={0.5}
        />
      </RoundedBox>

      {/* Monitor/screen on desk */}
      <Box args={[0.8, 0.5, 0.05]} position={[0, 1.05, -0.2]} castShadow>
        <meshStandardMaterial
          color={isActive ? '#1a3a5e' : '#1a1a2e'}
          emissive={isActive ? '#4488ff' : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
          roughness={0.1}
          metalness={0.8}
        />
      </Box>

      {/* Room label */}
      <Text
        position={[0, 3.2, 0]}
        fontSize={0.4}
        color={hovered ? '#FFD700' : '#C8A84E'}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOTk6OThhvA.woff"
      >
        {label}
      </Text>

      {/* Agent count badge */}
      {agentsInRoom.length > 0 && (
        <group position={[0, 2.6, 0]}>
          <mesh>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color="#E94560" />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.25}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {agentsInRoom.length.toString()}
          </Text>
        </group>
      )}

      {/* Corner posts */}
      {[[-2.3, 0, -2.3], [2.3, 0, -2.3], [-2.3, 0, 2.3], [2.3, 0, 2.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
          <meshStandardMaterial
            color="#C8A84E"
            metalness={0.8}
            roughness={0.2}
            emissive="#C8A84E"
            emissiveIntensity={isActive ? 0.2 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
