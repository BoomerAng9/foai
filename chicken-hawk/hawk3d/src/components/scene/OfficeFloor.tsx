'use client';

import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';

export function OfficeFloor() {
  const floorRef = useRef<Mesh>(null);

  return (
    <group>
      {/* Main floor plane */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#0d0d1a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Grid overlay */}
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a3e"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#C8A84E"
        fadeDistance={40}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}
