'use client';

import NumberCounter from '../../../src/components/NumberCounter';

const proofPoints = [
  { value: '100%', label: 'Transaction-sourced rent data' },
  { value: '5+', label: 'Min. records per suburb in reports' },
  { value: '0', label: 'PII in market intelligence exports' },
];

export default function ProofStatsGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {proofPoints.map((point) => (
        <div key={point.label} className="marketing-bento-card">
          <div className="marketing-stat-value text-[#C0392B]">
            <NumberCounter value={point.value} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{point.label}</p>
        </div>
      ))}
    </div>
  );
}
