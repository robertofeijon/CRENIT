import type { LucideIcon } from 'lucide-react';
import { CreditCard, FileText, Home, PiggyBank, Settings, TrendingUp } from 'lucide-react';

export type TenantNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
};

export const tenantNavItems: TenantNavItem[] = [
  { label: 'Home', href: '/tenant/home', icon: Home, section: 'Overview' },
  { label: 'Pay rent', href: '/tenant/payments', icon: CreditCard, section: 'Rent' },
  { label: 'Deposit', href: '/tenant/deposit', icon: PiggyBank },
  { label: 'Credit score', href: '/tenant/credit-score', icon: TrendingUp, section: 'Credit' },
  { label: 'Reports', href: '/tenant/reports', icon: FileText },
  { label: 'Settings', href: '/tenant/settings', icon: Settings },
];
