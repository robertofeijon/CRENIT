'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TenantWorkspaceLoading } from '../../components/ui/WorkspaceLoading';

/** Legacy route — use /tenant/home */
export default function LegacyTenantDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tenant/home');
  }, [router]);
  return (
    <div className="p-8">
      <TenantWorkspaceLoading />
    </div>
  );
}
