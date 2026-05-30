'use client';

import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import { adminNavItems } from '../components/admin/adminNav';

export default function AdminLayout({ children }: { children: ReactNode }) {
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
