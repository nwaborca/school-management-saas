'use client';

import React from 'react';
import { Award, Compass, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';

interface FallbackHeroProps {
  schoolName?: string;
  motto?: string;
}

export function FallbackHeroGraphic({ schoolName = 'Apex Model College', motto = 'Discipline & Excellence' }: FallbackHeroProps) {
  return (
    <div className="relative w-full h-[420px] flex items-center justify-center p-6 select-none overflow-hidden">
      {/* Center floating crest shield */}
      <div className="relative z-10 w-48 h-48 rounded-2xl bg-gradient-to-br from-rose-900 via-rose-950 to-gray-900 shadow-2xl border border-amber-500/30 flex flex-col items-center justify-center text-gray-50 p-4 backdrop-blur-md transform transition hover:scale-105">
        <div className="p-3 bg-amber-500/10 rounded-xl mb-2 border border-amber-500/20">
          <GraduationCap className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-bold text-center text-sm tracking-wide leading-tight line-clamp-1 text-gray-50">{schoolName}</h3>
        <p className="text-[10px] text-amber-400/90 text-center uppercase tracking-widest mt-1">Foundational Crest</p>
      </div>

      {/* Floating orbital badges */}
      <div className="absolute top-8 right-12 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 text-gray-100 text-xs shadow-lg backdrop-blur-md">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>NDPA 2023 Shield</span>
      </div>

      <div className="absolute bottom-10 left-10 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 text-amber-300 text-xs shadow-lg backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>WAEC / NECO Standards</span>
      </div>

      <div className="absolute bottom-6 right-16 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700 text-gray-200 text-xs shadow-lg backdrop-blur-md">
        <Compass className="w-4 h-4 text-rose-400" />
        <span>Arms A–F Structure</span>
      </div>
    </div>
  );
}

interface FallbackTrophyProps {
  title?: string;
  category?: string;
  points?: number;
}

export function FallbackTrophyGraphic({
  title = 'Grand Academic Laureate Trophy',
  category = 'academics',
  points = 500,
}: FallbackTrophyProps) {
  return (
    <div className="relative w-full h-[320px] flex flex-col items-center justify-center p-6 select-none bg-gray-900/90 rounded-2xl border border-gray-700 shadow-xl">
      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/30 mb-4 border border-amber-300/40">
        <Award className="w-12 h-12 text-gray-950" />
      </div>
      <h4 className="font-bold text-gray-50 text-base text-center">{title}</h4>
      <p className="text-xs text-amber-400 uppercase tracking-widest mt-1 font-semibold">{category} Excellence</p>
      <div className="mt-3 px-3.5 py-1 bg-gray-800 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold">
        +{points} Academic Honors Pts
      </div>
    </div>
  );
}
