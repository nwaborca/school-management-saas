'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Trophy3DModel } from './Trophy3DModel';
import { FallbackTrophyGraphic } from './FallbackGraphic';
import { isWebGLAvailable } from './webgl-detector';
import { RotateCw, Award, Sparkles } from 'lucide-react';

interface Trophy3DCanvasProps {
  badgeType?: 'gold_trophy' | 'stem_orb' | 'star_medal' | 'leadership_crown';
  title?: string;
  category?: string;
  points?: number;
}

export function Trophy3DCanvas({
  badgeType = 'gold_trophy',
  title = 'Grand Academic Laureate Trophy',
  category = 'academics',
  points = 500,
}: Trophy3DCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (!isClient || hasWebGL === null) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center bg-gray-900/60 rounded-2xl border border-gray-700">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!hasWebGL) {
    return <FallbackTrophyGraphic title={title} category={category} points={points} />;
  }

  return (
    <div className="relative w-full h-[320px] rounded-2xl bg-gray-900/80 border border-gray-700 overflow-hidden shadow-xl select-none group">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={2.2} color="#ffffff" />
        <pointLight position={[-5, -5, -3]} intensity={1.0} color="#fbbf24" />
        <pointLight position={[3, 2, 4]} intensity={1.2} color="#f59e0b" />

        <Suspense fallback={null}>
          <Trophy3DModel badgeType={badgeType} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 3.2}
            rotateSpeed={0.7}
          />
        </Suspense>
      </Canvas>

      {/* Overlay Badge Header */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-950/80 border border-amber-500/30 text-amber-300 text-xs backdrop-blur-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold uppercase tracking-wider text-[10px]">{category} Award</span>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-gray-950/80 border border-gray-700 text-gray-300 text-[10px] backdrop-blur-md">
        <RotateCw className="w-3 h-3 text-amber-400 animate-spin [animation-duration:8s]" />
        <span>360° Rotatable</span>
      </div>

      {/* Bottom Title Bar */}
      <div className="absolute bottom-3 inset-x-3 z-10 p-2.5 rounded-xl bg-gray-900/90 border border-gray-700 backdrop-blur-md flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-50 line-clamp-1">{title}</h4>
          <p className="text-[11px] text-amber-400/90">Class of 2026 Honors Distinction</p>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-gray-800 text-amber-300 font-bold text-xs border border-amber-500/30">
          +{points} pts
        </div>
      </div>
    </div>
  );
}
