'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import { adminNavItems } from '../components/admin/adminNav';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { twoFactorRequired, role, roleReady, loading } = useAuth();

  useEffect(() => {
    if (!loading && roleReady && twoFactorRequired && role === 'ADMIN') {
      router.replace('/auth/verify-2fa');
    }
  }, [loading, roleReady, twoFactorRequired, role, router]);

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
