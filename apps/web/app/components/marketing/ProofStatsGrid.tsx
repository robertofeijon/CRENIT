'use client';

import { BarChart3, Shield, Sparkles } from 'lucide-react';
import NumberCounter from '../../../src/components/NumberCounter';

const proofPoints = [
  { value: '100%', label: 'Transaction-sourced rent data', icon: Shield },
  { value: '5+', label: 'Min. records per suburb in reports', icon: BarChart3 },
  { value: '0', label: 'PII in market intelligence exports', icon: Sparkles },
];

export default function ProofStatsGrid() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {proofPoints.map((point) => {
        const Icon = point.icon;
        return (
          <div key={point.label} className="marketing-bento-card group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDEDEC] text-[#C0392B] transition group-hover:bg-[#C0392B] group-hover:text-white dark:bg-[var(--rc-accent-surface)]">
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="marketing-stat-value mt-4 text-[#C0392B]">
              <NumberCounter value={point.value} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-[var(--rc-text-secondary)]">{point.label}</p>
          </div>
        );
      })}
    </div>
  );
}
