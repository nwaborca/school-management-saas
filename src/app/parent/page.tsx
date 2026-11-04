'use client';

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
      <span>Redirecting to Student & Parent Portal...</span>
    </div>
  );
}
