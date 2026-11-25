'use client';

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';

interface ModuleLockedBannerProps {
  moduleName: string;
  className?: string;
}

export function ModuleLockedBanner({ moduleName, className = '' }: ModuleLockedBannerProps) {
  return (
    <div
      data-testid="module-locked-banner"
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3 ${className}`}
    >
      <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
        <Lock className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{moduleName}</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          {moduleName} is not active on your school&apos;s current plan. Contact Aegis Support to unlock this module.
        </p>
      </div>
    </div>
  );
}
