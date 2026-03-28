'use client';

import { useRef } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Torus, Sphere } from '@react-three/drei';
import { useHawkStore } from '@/store/hawkStore';

export function GatewayHub() {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const innerRingRef = useRef<Mesh>(null);
  const gateway = useHawkStore((s) => s.gateway);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= 0.008;
      innerRingRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const isOnline = gateway.connected;

  return (
    <group ref={groupRef} position={[0, 6, 0]}>
      {/* Central sphere - gateway core */}
      <Sphere args={[0.5, 32, 32]} castShadow>
        <meshStandardMaterial
          color={isOnline ? '#C8A84E' : '#636E72'}
          emissive={isOnline ? '#C8A84E' : '#333'}
          emissiveIntensity={isOnline ? 0.5 : 0.1}
          metalness={0.9}
          roughness={0.1}
        />
      </Sphere>

      {/* Outer ring */}
      <Torus ref={ringRef} args={[1.2, 0.04, 16, 64]}>
        <meshStandardMaterial
          color="#C8A84E"
          emissive="#C8A84E"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </Torus>

      {/* Inner ring */}
      <Torus ref={innerRingRef} args={[0.85, 0.03, 16, 48]} rotation={[Math.PI / 3, 0, 0]}>
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
      </Torus>

      {/* Label */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.45}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        CHICKEN HAWK GATEWAY
      </Text>

      {/* VPS status indicators */}
      <group position={[-1.8, -0.3, 0]}>
        <Sphere args={[0.12, 16, 16]}>
          <meshBasicMaterial color={gateway.vps1Status === 'online' ? '#00FF88' : '#FF4444'} />
        </Sphere>
        <Text
          position={[0, -0.3, 0]}
          fontSize={0.15}
          color="#EAEAEA"
          anchorX="center"
        >
          VPS-1
        </Text>
      </group>

      <group position={[1.8, -0.3, 0]}>
        <Sphere args={[0.12, 16, 16]}>
          <meshBasicMaterial color={gateway.vps2Status === 'online' ? '#00FF88' : '#FF4444'} />
        </Sphere>
        <Text
          position={[0, -0.3, 0]}
          fontSize={0.15}
          color="#EAEAEA"
          anchorX="center"
        >
          VPS-2
        </Text>
      </group>

      {/* Tailscale connection beam */}
      {gateway.tailscaleConnected && (
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 8]} />
          <meshBasicMaterial color="#C8A84E" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Downward connection beams to rooms */}
      {isOnline && (
        <group>
          {[[-4, -3, -4], [4, -3, -4], [-4, -3, 4], [4, -3, 4], [0, -3, 0]].map((pos, i) => (
            <mesh key={i} position={[pos[0] * 0.3, pos[1], pos[2] * 0.3]}>
              <cylinderGeometry args={[0.01, 0.01, 6, 4]} />
              <meshBasicMaterial
                color="#C8A84E"
                transparent
                opacity={0.15}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
