'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — verification opens inline on the dashboard. */
export default function LandlordOnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/landlord/overview?verify=1');
  }, [router]);
  return (
    <p className="text-sm text-slate-500">Opening partner verification…</p>
  );
}
