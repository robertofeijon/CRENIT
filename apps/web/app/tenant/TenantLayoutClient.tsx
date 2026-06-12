'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import DashboardShell from '../components/layout/DashboardShell';
import { tenantNavItems } from '../components/tenant/tenantNav';
import { TenantWorkspaceLoading } from '../components/ui/WorkspaceLoading';

const isKycApproved = (status: string) => status === 'APPROVED' || status === 'VERIFIED';

export default function TenantLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading, roleReady } = useAuth();
  const [kycStatus, setKycStatus] = useState('NOT_SUBMITTED');
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role === 'LANDLORD') router.replace('/landlord/overview');
  }, [loading, roleReady, user, role, router]);

  useEffect(() => {
    if (pathname === '/tenant') {
      router.replace('/tenant/home');
    }
  }, [pathname, router]);

  const refreshKycStatus = useCallback(() => {
    if (!user || role === 'LANDLORD') return;
    api
      .get('/kyc/status')
      .then((res) => {
        setKycStatus(res.data?.data?.profile?.kyc_status ?? 'NOT_SUBMITTED');
      })
      .catch(() => setKycStatus('NOT_SUBMITTED'))
      .finally(() => setLoadingStatus(false));
  }, [user, role]);

  useEffect(() => {
    if (!user || role === 'LANDLORD') return;
    refreshKycStatus();
  }, [user, role, refreshKycStatus]);

  useEffect(() => {
    if (!user || role === 'LANDLORD' || isKycApproved(kycStatus)) return;
    const interval = setInterval(refreshKycStatus, 12000);
    return () => clearInterval(interval);
  }, [user, role, kycStatus, refreshKycStatus]);

  useEffect(() => {
    if (!loadingStatus && pathname === '/tenant/kyc') return;
    if (!loadingStatus && (kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED')) {
      router.replace('/tenant/kyc');
    }
  }, [kycStatus, loadingStatus, pathname, router]);

  const banner =
    !isKycApproved(kycStatus) && pathname !== '/tenant/kyc' ? (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {kycStatus === 'PENDING' || kycStatus === 'PENDING_REVIEW'
          ? 'Your verification is under review. Payments and downloadable reports stay locked until approval.'
          : kycStatus === 'REJECTED'
            ? 'Verification was rejected — open KYC to see the reason and re-upload documents.'
            : 'Complete identity verification to unlock rent payments and credit reports.'}
      </div>
    ) : null;

  if (pathname === '/tenant/kyc') {
    return <>{children}</>;
  }

  if (loading || !roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-6">
        <div className="w-full max-w-lg">
          <TenantWorkspaceLoading />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (role === 'LANDLORD') {
    return null;
  }

  return (
    <DashboardShell
      role="tenant"
      roleLabel="Tenant workspace"
      sectionTitle="CRENIT"
      sectionDescription="Pay rent, build your score, and download verified payment history."
      navItems={tenantNavItems}
      banner={banner}
    >
      {children}
    </DashboardShell>
  );
}
