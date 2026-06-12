'use client';

import { BRAND_TIER_COLORS, type BrandTier } from '../../../src/lib/tier-branding';

type Props = {
  brandTier?: { id: BrandTier; label: string; tagline: string; unlocks: string };
  tierProgress?: { progressPct: number; pointsToNext: number; next?: { label: string } | null };
};

export default function ScoreTierProgress({ brandTier, tierProgress }: Props) {
  if (!brandTier) return null;
  const color = BRAND_TIER_COLORS[brandTier.id] ?? 'text-slate-700 bg-slate-100';
  return (
    <section className="tenant-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Your CRENIT tier</p>
          <p className={`mt-2 inline-flex rounded-full px-4 py-1.5 text-sm font-bold ${color}`}>{brandTier.label}</p>
          <p className="mt-3 text-sm text-slate-600">{brandTier.tagline}</p>
          <p className="mt-1 text-xs text-slate-500">{brandTier.unlocks}</p>
        </div>
        {tierProgress?.next ? (
          <div className="min-w-[200px] flex-1">
            <p className="text-xs font-semibold text-slate-500">
              Progress to {tierProgress.next.label} · {tierProgress.pointsToNext} pts
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#C0392B]" style={{ width: `${tierProgress.progressPct}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">Top tier reached</p>
        )}
      </div>
    </section>
  );
}
