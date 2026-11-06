'use client';

import { AnimatedContent } from '@/components/AnimatedContent';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentPage() {
  const router = useRouter();

  useEffect(() => {
    // In simplified 3-role architecture, Parents and Students share the unified portal
    router.replace('/student');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-xs">
      <AnimatedContent distance={100} direction="vertical" duration={0.8} ease="power3.out" blur={0} stagger={0.08} threshold={0.1}>
      <span>Redirecting to Student & Parent Portal...</span>
          </AnimatedContent>
    </div>
  );
}
