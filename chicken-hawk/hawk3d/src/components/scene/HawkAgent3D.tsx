'use client';

import { useRef, useState, useMemo } from 'react';
import { Mesh, Group, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Cylinder, Billboard } from '@react-three/drei';
import { useHawkStore } from '@/store/hawkStore';
import { ROOM_POSITIONS, STATUS_COLORS } from '@/lib/constants';
import type { LilHawk } from '@/store/hawkStore';

interface HawkAgent3DProps {
  agent: LilHawk;
  index: number;
}

export function HawkAgent3D({ agent, index }: HawkAgent3DProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectAgent = useHawkStore((s) => s.selectAgent);

  const statusColor = STATUS_COLORS[agent.status] || '#8892B0';

  // Calculate target position based on room + offset for multiple agents
  const targetPosition = useMemo(() => {
    const roomPos = ROOM_POSITIONS[agent.currentRoom] || [0, 0, 0];
    const offset = index * 0.8;
    const angle = (index * Math.PI * 2) / 10;
    return new Vector3(
      roomPos[0] + Math.cos(angle) * 1.5,
      roomPos[1] + 0.8,
      roomPos[2] + Math.sin(angle) * 1.5
    );
  }, [agent.currentRoom, index]);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Smooth movement toward target room
    groupRef.current.position.lerp(targetPosition, 0.02);

    // Bobbing animation when working
    if (agent.status !== 'idle' && agent.status !== 'offline') {
      groupRef.current.position.y =
        targetPosition.y + Math.sin(state.clock.elapsedTime * 2 + index) * 0.15;
    }

    // Rotation animation
    if (bodyRef.current) {
      if (agent.status === 'learning') {
        // Spin when learning (at the gym!)
        bodyRef.current.rotation.y += 0.03;
      } else if (agent.status !== 'idle' && agent.status !== 'offline') {
        bodyRef.current.rotation.y = Math.sin(state.clock.elapsedTime + index) * 0.3;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[targetPosition.x, targetPosition.y, targetPosition.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectAgent(agent.id);
      }}
    >
      {/* Agent body */}
      <group ref={bodyRef}>
        {/* Torso */}
        <Cylinder args={[0.25, 0.3, 0.6, 8]} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial
            color={agent.color}
            roughness={0.4}
            metalness={0.6}
            emissive={agent.color}
            emissiveIntensity={agent.status !== 'idle' ? 0.3 : 0.1}
          />
        </Cylinder>

        {/* Head */}
        <Sphere args={[0.2, 16, 16]} position={[0, 0.5, 0]} castShadow>
          <meshStandardMaterial
            color={agent.color}
            roughness={0.3}
            metalness={0.5}
            emissive={agent.color}
            emissiveIntensity={agent.status !== 'idle' ? 0.4 : 0.1}
          />
        </Sphere>

        {/* Hawk beak / visor */}
        <mesh position={[0, 0.45, 0.18]}>
          <coneGeometry args={[0.08, 0.15, 4]} />
          <meshStandardMaterial
            color="#FFD700"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Status ring around head */}
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.02, 8, 32]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Name label (billboard - always faces camera) */}
      <Billboard position={[0, 1.1, 0]}>
        <Text
          fontSize={0.2}
          color={hovered ? '#FFD700' : '#EAEAEA'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {agent.displayName}
        </Text>

        {/* Status indicator below name */}
        <Text
          position={[0, -0.25, 0]}
          fontSize={0.12}
          color={statusColor}
          anchorX="center"
          anchorY="middle"
        >
          {agent.status.toUpperCase()}
        </Text>
      </Billboard>

      {/* Ground shadow / selection ring */}
      <mesh
        position={[0, -0.55, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.25, 0.4, 16]} />
        <meshBasicMaterial
          color={hovered ? '#FFD700' : statusColor}
          transparent
          opacity={hovered ? 0.6 : 0.3}
        />
      </mesh>

      {/* Task activity particles */}
      {agent.status !== 'idle' && agent.status !== 'offline' && (
        <TaskParticles color={agent.color} />
      )}
    </group>
  );
}

function TaskParticles({ color }: { color: string }) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.02;
      ref.current.children.forEach((child, i) => {
        const mesh = child as Mesh;
        mesh.position.y = Math.sin(state.clock.elapsedTime * 3 + i * 1.5) * 0.3 + 0.8;
      });
    }
  });

  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2) * 0.5,
            0.8,
            Math.sin((i * Math.PI) / 2) * 0.5,
          ]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}
