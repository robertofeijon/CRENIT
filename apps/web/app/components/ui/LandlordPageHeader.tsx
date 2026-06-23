import type { ReactNode } from 'react';
import DashboardPageHeader from './DashboardPageHeader';

export default function LandlordPageHeader(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
  display?: boolean;
}) {
  return <DashboardPageHeader {...props} />;
}
