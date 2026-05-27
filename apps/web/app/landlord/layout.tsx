'use client';

import type { ReactNode } from 'react';
import DashboardShell from '../components/layout/DashboardShell';

const navItems = [
  { label: 'Overview', href: '/landlord/overview', icon: '📈' },
  { label: 'Payments', href: '/landlord/payments', icon: '💳' },
  { label: 'Tenants', href: '/landlord/tenants', icon: '👥' },
  { label: 'Leases', href: '/landlord/leases', icon: '📜' },
  { label: 'Deposits', href: '/landlord/deposits', icon: '🏦' },
  { label: 'Properties', href: '/landlord/properties', icon: '🏠' },
  { label: 'Reports', href: '/landlord/reports', icon: '📄' },
  { label: 'Market Data', href: '/landlord/market-data', icon: '📊' },
  { label: 'Onboarding', href: '/landlord/onboarding', icon: '🧾' },
  { label: 'Settings', href: '/landlord/settings', icon: '⚙️' },
];

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      role="landlord"
      roleLabel="Landlord workspace"
      sectionTitle="Portfolio"
      sectionDescription="Manage tenants, payments, deposits, and market insights."
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
