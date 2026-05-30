import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Database,
  LayoutDashboard,
  LineChart,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react';

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Renders a section label above this item in the sidebar */
  section?: string;
};

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'Operations' },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'KYC Queue', href: '/admin/kyc', icon: BadgeCheck },
  { label: 'Partner Approvals', href: '/admin/partner-approvals', icon: UserCheck },
  { label: 'Service Requests', href: '/admin/service-requests', icon: ClipboardList },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard, section: 'Finance' },
  { label: 'Escrow & Disputes', href: '/admin/disputes', icon: Scale },
  { label: 'Credit Scores', href: '/admin/credit-scores', icon: LineChart },
  { label: 'Data Intelligence', href: '/admin/data-intelligence', icon: Database, section: 'Data & compliance' },
  { label: 'Compliance (GDPR)', href: '/admin/compliance', icon: Shield },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText },
  { label: 'KYC Compliance', href: '/admin/kyc/compliance', icon: ShieldCheck },
  { label: 'System Health', href: '/admin/system-health', icon: Activity },
];
