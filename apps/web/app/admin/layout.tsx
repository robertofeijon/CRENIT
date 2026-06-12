'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import { adminNavItems } from '../components/admin/adminNav';
import { AdminWorkspaceLoading } from '../components/ui/WorkspaceLoading';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, twoFactorRequired, twoFactorSetupRequired, role, roleReady, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && roleReady && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && roleReady && user && role !== 'ADMIN') {
      router.replace('/auth');
      return;
    }
    if (twoFactorSetupRequired && pathname !== '/admin/security') {
      router.replace('/admin/security');
      return;
    }
    if (twoFactorRequired && pathname !== '/auth/verify-2fa') {
      router.replace('/auth/verify-2fa');
    }
  }, [loading, roleReady, user, role, twoFactorRequired, twoFactorSetupRequired, router, pathname]);

  if (loading || !roleReady || !user || role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-6">
        <div className="w-full max-w-lg">
          <AdminWorkspaceLoading />
        </div>
      </div>
    );
  }

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
