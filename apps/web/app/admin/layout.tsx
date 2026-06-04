'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import { adminNavItems } from '../components/admin/adminNav';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { twoFactorRequired, twoFactorSetupRequired, role, roleReady, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && roleReady && role !== 'ADMIN') return;
    if (twoFactorSetupRequired && pathname !== '/admin/security') {
      router.replace('/admin/security');
      return;
    }
    if (twoFactorRequired && pathname !== '/auth/verify-2fa') {
      router.replace('/auth/verify-2fa');
    }
  }, [loading, roleReady, twoFactorRequired, twoFactorSetupRequired, role, router, pathname]);

  return (
    <DashboardShell
      role="admin"
      roleLabel="CRENIT Admin"
      sectionTitle="Operations"
      sectionDescription="Users, compliance, payments, and platform intelligence."
      navItems={adminNavItems}
    >
      {children}
    </DashboardShell>
  );
}
