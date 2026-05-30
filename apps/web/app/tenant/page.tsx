'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TenantPage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && roleReady && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && roleReady && user) {
      router.replace('/tenant/home');
    }
  }, [loading, roleReady, user, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-slate-500">Loading tenant workspace…</p>
    </div>
  );
}
