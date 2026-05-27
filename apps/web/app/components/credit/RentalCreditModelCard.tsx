'use client';

import { useEffect, useState } from 'react';

type Props = {
  compact?: boolean;
};

const DEFAULT_BUCKETS = [
  { label: 'Payment history', weight: 35, points: 30 },
  { label: 'Payment streak', weight: 20, points: 16 },
  { label: 'Tenancy history length', weight: 20, points: 15 },
  { label: 'Income-to-rent ratio', weight: 15, points: 12 },
  { label: 'Deposit management', weight: 10, points: 8 },
];

export default function RentalCreditModelCard({ compact = false }: Props) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimate(true), 120);
    return () => clearTimeout(id);
  }, []);

  const total = DEFAULT_BUCKETS.reduce((sum, b) => sum + b.points, 0);

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-5' : 'p-7'}`}>
      <h3 className="text-lg font-semibold text-slate-900">Rental Credit Scoring Model</h3>
      <p className="mt-1 text-sm text-slate-600">Weighted score out of 100 based on payment behavior and rental consistency.</p>
      <div className="mt-4 space-y-3">
        {DEFAULT_BUCKETS.map((bucket) => (
          <div key={bucket.label} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-slate-800">{bucket.label}</p>
              <p className="text-slate-600">{bucket.points}/{bucket.weight}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-red transition-all duration-700 ease-out"
                style={{ width: animate ? `${Math.round((bucket.points / bucket.weight) * 100)}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#111827] px-4 py-3 text-white">
        <p className="text-sm uppercase tracking-widest text-slate-300">Model score</p>
        <p className="text-2xl font-semibold">{total}/100</p>
      </div>
    </section>
  );
}
