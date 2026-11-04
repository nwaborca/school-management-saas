'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface HeroSchoolGlobeProps {
  primaryColor?: string;
  accentColor?: string;
}

export function HeroSchoolGlobe({
  primaryColor = '#881337', // Deep Academic Wine / Burgundy
  accentColor = '#D97706',  // Warm Bronze / Amber
}: HeroSchoolGlobeProps) {
  const outerRingRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    // Smooth idle spin
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y += delta * 0.35;
      outerRingRef.current.rotation.x += delta * 0.12;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y -= delta * 0.5;
      innerRingRef.current.rotation.z += delta * 0.2;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.25;
    }
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.4;
    }

    // Interactive mouse hover inertia response
    targetRotation.current.x = state.pointer.y * 0.35;
    targetRotation.current.y = state.pointer.x * 0.5;

    if (state.scene) {
      state.scene.rotation.x = THREE.MathUtils.lerp(state.scene.rotation.x, targetRotation.current.x, 0.05);
      state.scene.rotation.y = THREE.MathUtils.lerp(state.scene.rotation.y, targetRotation.current.y, 0.05);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central Floating Academic Core Sphere */}
      <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.35, 2]} />
          <MeshDistortMaterial
            color={primaryColor}
            emissive="#4c0519"
            emissiveIntensity={0.9}
            roughness={0.2}
            metalness={0.8}
            distort={0.15}
            speed={1.5}
            wireframe={false}
          />
        </mesh>

        {/* Inner Warm Amber geometric cage */}
        <mesh scale={[1.45, 1.45, 1.45]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={accentColor}
            wireframe={true}
            transparent
            opacity={0.5}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </Float>

      {/* Orbiting Equatorial Bronze Ring 1 */}
      <group ref={outerRingRef}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.3, 0.035, 16, 100]} />
          <meshStandardMaterial
            color="#D97706"
            emissive="#92400e"
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>

        {/* Amber satellite bead */}
        <mesh position={[2.3, 0, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Orbiting Burgundy Astrolabe Ring 2 */}
      <group ref={innerRingRef}>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 6]}>
          <torusGeometry args={[2.0, 0.03, 16, 100]} />
          <meshStandardMaterial
            color="#9f1239"
            emissive="#881337"
            emissiveIntensity={0.6}
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>

        {/* Second orbiting beacon (Gold) */}
        <mesh position={[-2.0, 0, 0]}>
          <octahedronGeometry args={[0.14]} />
          <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Orbiting Academy Elements Group */}
      <group ref={orbitGroupRef}>
        {/* Floating Book / Academy Tablet */}
        <mesh position={[0, 1.8, 1.5]} rotation={[0.4, 0.2, 0.1]}>
          <boxGeometry args={[0.35, 0.45, 0.08]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Floating Diploma / Scroll Mockup */}
        <mesh position={[-1.7, -1.2, 0.8]} rotation={[0.2, 0.8, -0.4]}>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          <meshStandardMaterial color="#f9fafb" metalness={0.2} roughness={0.4} />
        </mesh>

        {/* Floating Star of Academic Excellence */}
        <mesh position={[1.6, -1.0, -1.2]}>
          <tetrahedronGeometry args={[0.2]} />
          <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Subtle starlight / particle field */}
      <points>
        <sphereGeometry args={[4.5, 32, 32]} />
        <pointsMaterial size={0.025} color="#fed7aa" transparent opacity={0.3} />
      </points>
    </group>
  );
}
