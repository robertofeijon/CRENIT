'use client';

import dynamic from 'next/dynamic';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';

const panelLoading = () => (
  <div className="admin-panel">
    <SkeletonBlocks rows={4} />
  </div>
);

export const LazyB2bApiPlayground = dynamic(() => import('./B2bApiPlayground'), { loading: panelLoading });
export const LazyB2bIntegratorExports = dynamic(() => import('./B2bIntegratorExports'), { loading: panelLoading });
export const LazyB2bWebhookAdmin = dynamic(() => import('./B2bWebhookAdmin'), { loading: panelLoading });
export const LazySaleCompsPilotPanel = dynamic(() => import('./SaleCompsPilotPanel'), { loading: panelLoading });
export const LazyLicensableWatchPanel = dynamic(() => import('./LicensableWatchPanel'), { loading: panelLoading });
export const LazyGeocodeQaPanel = dynamic(() => import('./GeocodeQaPanel'), { loading: panelLoading });
