'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { HeroSchoolGlobe } from './HeroSchoolGlobe';
import { FallbackHeroGraphic } from './FallbackGraphic';
import { isWebGLAvailable } from './webgl-detector';
import { Sparkles, Eye } from 'lucide-react';

interface Hero3DCanvasProps {
  schoolName?: string;
  motto?: string;
}

export function Hero3DCanvas({ schoolName, motto }: Hero3DCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (!isClient || hasWebGL === null) {
    return (
      <div className="w-full h-[460px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!hasWebGL) {
    return <FallbackHeroGraphic schoolName={schoolName} motto={motto} />;
  }

  return (
    <div className="relative w-full h-[460px] select-none rounded-2xl overflow-hidden group">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 10, 5]} intensity={1.8} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={1.2} color="#f59e0b" />
        <pointLight position={[5, -5, 5]} intensity={0.9} color="#881337" />

        <Suspense fallback={null}>
          <HeroSchoolGlobe primaryColor="#881337" accentColor="#d97706" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.6}
            minPolarAngle={Math.PI / 2.8}
            rotateSpeed={0.6}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>

      {/* Floating Interactive Badge */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-amber-500/30 text-amber-300 text-xs shadow-lg backdrop-blur-md opacity-90 transition group-hover:opacity-100">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:6s]" />
        <span>Interactive 3D Knowledge Core • Hover or Drag</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900/90 border border-amber-500/30 text-amber-300 text-[11px] backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>WebGL Active</span>
      </div>
    </div>
  );
}
