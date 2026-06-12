'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';

/** Legacy route — verification opens inline on the dashboard. */
export default function LandlordOnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/landlord/overview?verify=1');
  }, [router]);
  return (
    <div className="p-6">
      <LandlordWorkspaceLoading />
    </div>
  );
}
