'use client';

import { useRef } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Sphere, Text, Billboard } from '@react-three/drei';

export function JanitorSweep() {
  const groupRef = useRef<Group>(null);
  const broomRef = useRef<Mesh>(null);
  const angle = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Move janitor in a circle around the office
    angle.current += 0.015;
    const radius = 12;
    groupRef.current.position.x = Math.cos(angle.current) * radius;
    groupRef.current.position.z = Math.sin(angle.current) * radius;
    groupRef.current.position.y = 0.5;
    groupRef.current.rotation.y = -angle.current + Math.PI / 2;

    // Broom sweeping animation
    if (broomRef.current) {
      broomRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Janitor body */}
      <Cylinder args={[0.2, 0.25, 0.5, 8]} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#4a90d9" roughness={0.5} />
      </Cylinder>

      {/* Head */}
      <Sphere args={[0.15, 16, 16]} position={[0, 0.65, 0]}>
        <meshStandardMaterial color="#4a90d9" roughness={0.3} />
      </Sphere>

      {/* Broom */}
      <group ref={broomRef} position={[0.3, 0.3, 0]}>
        <Cylinder args={[0.02, 0.02, 0.8, 4]} rotation={[0, 0, 0.5]}>
          <meshStandardMaterial color="#8B7635" />
        </Cylinder>
        <mesh position={[0.3, -0.2, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.15]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      </group>

      {/* Sparkle trail */}
      {[...Array(5)].map((_, i) => (
        <SparkleParticle key={i} offset={i * 0.5} />
      ))}

      {/* Label */}
      <Billboard position={[0, 1.2, 0]}>
        <Text
          fontSize={0.2}
          color="#4a90d9"
          anchorX="center"
        >
          CLEANING...
        </Text>
      </Billboard>
    </group>
  );
}

function SparkleParticle({ offset }: { offset: number }) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = (state.clock.elapsedTime * 2 + offset) % 2;
      ref.current.position.set(
        Math.sin(t * Math.PI) * 0.5 - 0.5,
        t * 0.5,
        Math.cos(t * Math.PI) * 0.3
      );
      ref.current.scale.setScalar(Math.max(0, 1 - t * 0.5));
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
    </mesh>
  );
}
