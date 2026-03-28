import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ACHEEVY-009 — 3D Hero Scene
 * A floating, morphing polyhedron core surrounded by orbiting particles and starfield.
 * Represents the NtNtN creative build engine at rest, ready to activate.
 */

function CoreOrb() {
    const meshRef = useRef<THREE.Mesh>(null!)
    const glowRef = useRef<THREE.Mesh>(null!)

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2
            meshRef.current.rotation.y = t * 0.15
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(1.8 + Math.sin(t * 0.8) * 0.15)
        }
    })

    return (
        <Float speed={1.5} floatIntensity={1.2} rotationIntensity={0.4}>
            <group>
                {/* Inner glow sphere */}
                <mesh ref={glowRef}>
                    <sphereGeometry args={[1.2, 32, 32]} />
                    <meshBasicMaterial
                        color="#d4af37"
                        transparent
                        opacity={0.08}
                    />
                </mesh>

                {/* Core icosahedron */}
                <mesh ref={meshRef}>
                    <icosahedronGeometry args={[1, 1]} />
                    <MeshDistortMaterial
                        color="#d4af37"
                        emissive="#d4881f"
                        emissiveIntensity={0.6}
                        roughness={0.15}
                        metalness={0.9}
                        distort={0.25}
                        speed={1.8}
                    />
                </mesh>

                {/* Wireframe overlay */}
                <mesh>
                    <icosahedronGeometry args={[1.05, 1]} />
                    <meshBasicMaterial
                        color="#D4AF37"
                        wireframe
                        transparent
                        opacity={0.3}
                    />
                </mesh>
            </group>
        </Float>
    )
}

function OrbitRing({ radius, speed, color, count }: { radius: number; speed: number; color: string; count: number }) {
    const groupRef = useRef<THREE.Group>(null!)
    const particles = useMemo(() => {
        return Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2
            return {
                position: [
                    Math.cos(angle) * radius,
                    (Math.random() - 0.5) * 0.3,
                    Math.sin(angle) * radius
                ] as [number, number, number],
                scale: 0.02 + Math.random() * 0.03
            }
        })
    }, [radius, count])

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * speed
            groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * speed * 0.3) * 0.1
        }
    })

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.position}>
                    <sphereGeometry args={[p.scale, 8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} />
                </mesh>
            ))}
        </group>
    )
}

function DataStreams() {
    const groupRef = useRef<THREE.Group>(null!)
    const streams = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => {
            const angle = (i / 6) * Math.PI * 2
            return {
                start: new THREE.Vector3(Math.cos(angle) * 3, 0, Math.sin(angle) * 3),
                color: ['#d4af37', '#d4881f', '#39ff14', '#ff6b35', '#ec4899', '#b7791f'][i]
            }
        })
    }, [])

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
        }
    })

    return (
        <group ref={groupRef}>
            {streams.map((s, i) => (
                <line key={i}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            args={[new Float32Array([0, 0, 0, s.start.x, s.start.y, s.start.z]), 3]}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color={s.color} transparent opacity={0.15} />
                </line>
            ))}
        </group>
    )
}

export function Hero3DScene({ className = '' }: { className?: string }) {
    return (
        <div className={`relative w-full h-full ${className}`}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 60 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.4} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} color="#D4AF37" />
                <pointLight position={[-3, -2, 4]} intensity={0.5} color="#d4881f" />
                <pointLight position={[3, 2, -3]} intensity={0.3} color="#FF6B35" />

                <CoreOrb />

                <OrbitRing radius={2} speed={0.3} color="#d4af37" count={24} />
                <OrbitRing radius={2.8} speed={-0.2} color="#d4881f" count={18} />
                <OrbitRing radius={3.5} speed={0.15} color="#39ff14" count={12} />

                <DataStreams />

                <Stars
                    radius={80}
                    depth={60}
                    count={1500}
                    factor={3}
                    saturation={0.5}
                    fade
                    speed={0.5}
                />
            </Canvas>
        </div>
    )
}

export default Hero3DScene
