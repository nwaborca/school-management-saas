'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Hero3DCanvas = dynamic(
  () => import('@/components/3d/Hero3DCanvas').then((mod) => mod.Hero3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 border-2 border-rose-900 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    ),
  }
);

export default function InteractiveGlobe() {
  return (
    <div className="w-full h-[400px] sm:h-[480px] lg:h-[540px] relative">
      <Hero3DCanvas />
    </div>
  );
}
