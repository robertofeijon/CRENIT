'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '../Header';
import MarketingFooter from '../marketing/MarketingFooter';

const DASHBOARD_PREFIXES = ['/landlord', '/tenant', '/admin', '/auth'];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isKycOnly = pathname === '/tenant/kyc';
  const isStandaloneMarketing = pathname === '/' || pathname.startsWith('/verify');

  if ((isDashboard && !isKycOnly) || isStandaloneMarketing) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-[60vh] bg-white">{children}</main>
      <MarketingFooter />
    </>
  );
}
