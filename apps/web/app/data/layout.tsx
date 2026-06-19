import type { ReactNode } from 'react';
import PublicMiFooter from '../components/marketing/PublicMiFooter';
import { fetchPublicMarketDashboard } from '../../src/lib/public-market-intelligence';

export default async function DataLayout({ children }: { children: ReactNode }) {
  const dashboard = await fetchPublicMarketDashboard();

  return (
    <div className="min-h-[80vh] bg-[#F5F5F5]">
      {children}
      <PublicMiFooter pipelineUpdatedAt={dashboard?.pipeline_updated_at} />
    </div>
  );
}
