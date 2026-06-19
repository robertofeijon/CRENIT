'use client';

import LandlordOverviewDashboard from '../../components/landlord/LandlordOverviewDashboard';
import LandlordReadinessChecklist from '../../components/landlord/LandlordReadinessChecklist';
import LandlordDisputeRiskBanner from '../../components/landlord/LandlordDisputeRiskBanner';

export default function LandlordOverviewPage() {
  return (
    <div className="space-y-6">
      <LandlordReadinessChecklist />
      <LandlordDisputeRiskBanner />
      <LandlordOverviewDashboard />
    </div>
  );
}
