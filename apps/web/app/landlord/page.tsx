'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Canonical home is /landlord/overview */
export default function LandlordIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/landlord/overview');
  }, [router]);

  return (
    <p className="text-sm text-slate-500" aria-live="polite">
      Redirecting to overview…
    </p>
  );
}
