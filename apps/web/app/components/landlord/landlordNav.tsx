import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  FileCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  Receipt,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

export type LandlordNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
};

export const landlordNavItems: LandlordNavItem[] = [
  { label: 'Overview', href: '/landlord/overview', icon: LayoutDashboard, section: 'Portfolio' },
  { label: 'Properties', href: '/landlord/properties', icon: Building2, section: 'Manage' },
  { label: 'Tenants', href: '/landlord/tenants', icon: Users },
  { label: 'Leases', href: '/landlord/leases', icon: FileText },
  { label: 'Deposits', href: '/landlord/deposits', icon: Wallet },
  { label: 'Payments', href: '/landlord/payments', icon: Receipt, section: 'Finance' },
  { label: 'Reports', href: '/landlord/reports', icon: FolderOpen, section: 'Insights' },
  { label: 'Market data', href: '/landlord/market-data', icon: LineChart },
  { label: 'Lease & docs', href: '/landlord/attachments', icon: FileCheck, section: 'Partner' },
  { label: 'Onboarding', href: '/landlord/onboarding', icon: ClipboardList },
  { label: 'Settings', href: '/landlord/settings', icon: Settings },
];
