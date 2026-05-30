'use client';

import { useEffect, useState } from 'react';

type Props = {
  compact?: boolean;
  breakdown?: {
    paymentHistoryScore?: number;
    defaultScore?: number;
    historyScore?: number;
    score100?: number;
  };
};

const MODEL_BUCKETS = [
  { label: 'Payment history', weight: 50, key: 'paymentHistoryScore' as const },
  { label: 'Amount defaulted on', weight: 30, key: 'defaultScore' as const },
  { label: 'Length of credit history', weight: 20, key: 'historyScore' as const },
];

const RISK_BANDS = [
  { range: '80–100', level: 'Low risk', note: 'Strong tenant' },
  { range: '65–79', level: 'Moderate', note: 'Acceptable with monitoring' },
  { range: '50–64', level: 'High risk', note: 'Higher late-payment probability' },
  { range: 'Below 50', level: 'Very high risk', note: 'Significant repayment concern' },
];

export default function RentalCreditModelCard({ compact = false, breakdown }: Props) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimate(true), 120);
    return () => clearTimeout(id);
  }, []);

  const score100 =
    breakdown?.score100 ??
    (breakdown
      ? Math.round(
          ((breakdown.paymentHistoryScore ?? 0) +
            (breakdown.defaultScore ?? 0) +
            (breakdown.historyScore ?? 0)) *
            10,
        ) / 10
      : 81);

  const buckets = MODEL_BUCKETS.map((b) => ({
    ...b,
    points: breakdown?.[b.key] ?? Math.round(b.weight * 0.8),
  }));

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-5' : 'p-7'}`}>
      <h3 className="text-lg font-semibold text-slate-900">CRENIT scoring model</h3>
      <p className="mt-1 text-sm text-slate-600">
        Score out of 100 from payment history (50%), amount defaulted (30%), and rental history length (20%).
      </p>
      <div className="mt-4 space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-slate-800">{bucket.label}</p>
              <p className="text-slate-600">
                {bucket.points}/{bucket.weight}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-red transition-all duration-700 ease-out"
                style={{
                  width: animate ? `${Math.min(100, Math.round((bucket.points / bucket.weight) * 100))}%` : '0%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#111827] px-4 py-3 text-white">
        <p className="text-sm uppercase tracking-widest text-slate-300">CRENIT score</p>
        <p className="text-2xl font-semibold">{score100}/100</p>
      </div>
      {!compact ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Risk bands</p>
          <ul className="mt-2 space-y-1">
            {RISK_BANDS.map((band) => (
              <li key={band.range}>
                <span className="font-medium">{band.range}</span> — {band.level}: {band.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
