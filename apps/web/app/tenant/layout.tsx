'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import DashboardShell from '../components/layout/DashboardShell';

const isKycApproved = (status: string) => status === 'APPROVED' || status === 'VERIFIED';

const navItems = [
  { label: 'Home', href: '/tenant/home', icon: '🏠' },
  { label: 'Pay Rent', href: '/tenant/payments', icon: '💳' },
  { label: 'Deposit', href: '/tenant/deposit', icon: '🏦' },
  { label: 'My Credit Score', href: '/tenant/credit-score', icon: '📊' },
  { label: 'My Report', href: '/tenant/reports', icon: '📄' },
  { label: 'Settings', href: '/tenant/settings', icon: '⚙️' },
];

export default function TenantLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState('NOT_SUBMITTED');
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get('/kyc/status')
      .then((res) => {
        if (active) setKycStatus(res.data?.data?.profile?.kyc_status ?? 'NOT_SUBMITTED');
      })
      .catch(() => {
        if (active) setKycStatus('NOT_SUBMITTED');
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadingStatus && kycStatus === 'NOT_SUBMITTED' && pathname !== '/tenant/kyc') {
      router.replace('/tenant/kyc');
    }
  }, [kycStatus, loadingStatus, pathname, router]);

  const banner =
    !isKycApproved(kycStatus) && pathname !== '/tenant/kyc' ? (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {kycStatus === 'PENDING'
          ? 'Your verification is under review. Payment and report actions are disabled until approval.'
          : kycStatus === 'REJECTED'
            ? 'Verification was rejected. Please resubmit documents via Settings.'
            : 'Complete KYC to unlock payments and credit features.'}
      </div>
    ) : null;

  if (pathname === '/tenant/kyc') {
    return <>{children}</>;
  }

  return (
    <DashboardShell
      role="tenant"
      roleLabel="Tenant workspace"
      sectionTitle="RentCredit"
      sectionDescription="Rent, credit score, deposits, and verified payment history."
      navItems={navItems}
      banner={banner}
    >
      {children}
    </DashboardShell>
  );
}
