import type { ReactNode } from 'react';
import DashboardPageHeader from './DashboardPageHeader';

export default function AdminPageHeader(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
}) {
  return <DashboardPageHeader {...props} display />;
}
