'use client';

import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'KYC Queue', href: '/admin/kyc', icon: '✅' },
  { label: 'Payments', href: '/admin/payments', icon: '💳' },
  { label: 'Escrow & Disputes', href: '/admin/disputes', icon: '⚖️' },
  { label: 'Credit Scores', href: '/admin/credit-scores', icon: '📈' },
  { label: 'Data Intelligence', href: '/admin/data-intelligence', icon: '🗺️' },
  { label: 'Compliance', href: '/admin/audit', icon: '📋' },
  { label: 'System Health', href: '/admin/system-health', icon: '🖥️' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      role="admin"
      roleLabel="Admin portal"
      sectionTitle="Platform admin"
      sectionDescription="Users, KYC, payments, intelligence, and system health."
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
