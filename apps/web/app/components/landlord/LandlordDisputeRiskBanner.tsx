'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import api from '../../../src/lib/api';

type Risk = {
  open_count: number;
  resolved_12m: number;
  tenant_favoured_rate_pct: number;
  risk_level: 'low' | 'medium' | 'high';
};

export default function LandlordDisputeRiskBanner() {
  const [risk, setRisk] = useState<Risk | null>(null);

  useEffect(() => {
    api
      .get('/deposits/landlord/dispute-risk')
      .then((res) => setRisk(res.data.data))
      .catch(() => setRisk(null));
  }, []);

  if (!risk || risk.risk_level === 'low') return null;

  const tone =
    risk.risk_level === 'high'
      ? 'border-red-200 bg-red-50 text-red-950'
      : 'border-amber-200 bg-amber-50 text-amber-950';

  return (
    <section className={`landlord-panel flex flex-wrap items-start justify-between gap-3 ${tone}`}>
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-semibold">
            {risk.risk_level === 'high' ? 'Elevated dispute risk' : 'Dispute activity watch'}
          </p>
          <p className="mt-1 text-sm opacity-90">
            {risk.open_count} open dispute{risk.open_count === 1 ? '' : 's'}
            {risk.resolved_12m > 0 ? ` · ${risk.tenant_favoured_rate_pct}% tenant-favoured in the last 12 months` : ''}.
            Respond promptly and keep evidence on file.
          </p>
        </div>
      </div>
      <Link href="/landlord/disputes" className="landlord-btn-secondary shrink-0 bg-white/80">
        Review disputes
      </Link>
    </section>
  );
}
