'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — use /tenant/home */
export default function LegacyTenantDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tenant/home');
  }, [router]);
  return <p className="p-8 text-sm text-slate-500">Redirecting to tenant home…</p>;
}
