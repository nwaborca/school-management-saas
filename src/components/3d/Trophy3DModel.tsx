'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface Trophy3DModelProps {
  badgeType?: 'gold_trophy' | 'stem_orb' | 'star_medal' | 'leadership_crown';
}

export function Trophy3DModel({ badgeType = 'gold_trophy' }: Trophy3DModelProps) {
  const trophyGroupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (trophyGroupRef.current) {
      trophyGroupRef.current.rotation.y += delta * 0.7;
    }
    if (starRef.current) {
      starRef.current.rotation.z += delta * 1.2;
    }
  });

  if (badgeType === 'stem_orb') {
    return (
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
        <group ref={trophyGroupRef}>
          {/* STEM Energy Core */}
          <mesh>
            <sphereGeometry args={[1.1, 32, 32]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#0891b2"
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.8}
              wireframe={false}
            />
          </mesh>
          {/* Orbital Atomic Rings */}
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <torusGeometry args={[1.6, 0.05, 16, 64]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" metalness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, 0, 0]}>
            <torusGeometry args={[1.6, 0.05, 16, 64]} />
            <meshStandardMaterial color="#818cf8" emissive="#4f46e5" metalness={0.9} />
          </mesh>
          {/* Pedestal */}
          <mesh position={[0, -1.8, 0]}>
            <cylinderGeometry args={[1.2, 1.4, 0.4, 32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </Float>
    );
  }

  if (badgeType === 'star_medal') {
    return (
      <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
        <group ref={trophyGroupRef}>
          {/* Ribbon */}
          <mesh position={[0, 1.3, -0.05]}>
            <boxGeometry args={[0.7, 1.0, 0.05]} />
            <meshStandardMaterial color="#ef4444" roughness={0.4} />
          </mesh>
          {/* Golden Medallion */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[1.0, 1.0, 0.15, 32]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#d97706"
              emissiveIntensity={0.3}
              metalness={0.95}
              roughness={0.15}
            />
          </mesh>
          {/* Medallion Star Emblem */}
          <mesh ref={starRef} position={[0, 0.3, 0.12]}>
            <octahedronGeometry args={[0.5]} />
            <meshStandardMaterial color="#ffffff" emissive="#fde047" emissiveIntensity={0.6} />
          </mesh>
          {/* Pedestal Base */}
          <mesh position={[0, -1.5, 0]}>
            <boxGeometry args={[1.8, 0.4, 1.8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      </Float>
    );
  }

  // Default: Grand Gold Trophy Cup
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.7}>
      <group ref={trophyGroupRef} position={[0, -0.2, 0]}>
        {/* Cup Bowl */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[1.1, 0.55, 1.3, 32, 1, true]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#b45309"
            emissiveIntensity={0.4}
            metalness={0.92}
            roughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Cup Bottom Sphere Dome */}
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#b45309"
            emissiveIntensity={0.4}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Trophy Handles (Left and Right) */}
        <mesh position={[-1.15, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.45, 0.08, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[1.15, 0.6, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.45, 0.08, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Stem */}
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.18, 0.25, 0.7, 24]} />
          <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.15} />
        </mesh>

        {/* Floating Star inside Cup */}
        <mesh ref={starRef} position={[0, 0.9, 0]}>
          <octahedronGeometry args={[0.35]} />
          <meshStandardMaterial color="#fff" emissive="#fbbf24" emissiveIntensity={0.9} />
        </mesh>

        {/* Marble / Obsidian Pedestal Base */}
        <mesh position={[0, -1.0, 0]}>
          <boxGeometry args={[1.5, 0.5, 1.5]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Gold Inscription Plaque on Base */}
        <mesh position={[0, -1.0, 0.76]}>
          <boxGeometry args={[1.1, 0.25, 0.02]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>
    </Float>
  );
}
