'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '../Header';

const DASHBOARD_PREFIXES = ['/landlord', '/tenant', '/admin', '/auth'];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isKycOnly = pathname === '/tenant/kyc';

  if (isDashboard && !isKycOnly) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
