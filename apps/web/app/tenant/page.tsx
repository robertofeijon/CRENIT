"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import TenantDashboard from '../dashboard/tenant/page';

export default function TenantPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loadingGate, setLoadingGate] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      api
        .get('/kyc/status')
        .then((response) => {
          const status = response.data?.data?.profile?.kyc_status;
          if (status !== 'APPROVED' && status !== 'VERIFIED') {
            router.replace('/tenant/kyc');
          } else {
            setLoadingGate(false);
          }
        })
        .catch(() => {
          setLoadingGate(false);
        });
    }
  }, [loading, user, router]);

  if (loading || loadingGate) {
    return <div className="min-h-screen bg-slate-50 p-8">Preparing tenant dashboard...</div>;
  }

  return <TenantDashboard />;
}
