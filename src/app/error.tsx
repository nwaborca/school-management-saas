'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Next.js page error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Something went wrong</h2>
          <p className="text-xs text-gray-400 mt-1">
            An unexpected error occurred while loading this page. You can retry or return to safety.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-left text-[11px] font-mono text-gray-400 overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-gray-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-700 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
