'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import ScoreRingMini from '../ui/ScoreRingMini';
import { BRAND_TIER_COLORS, type BrandTier } from '../../../src/lib/tier-branding';

type CreditScoreHeroProps = {
  score: number;
  score100: number;
  brandTier?: { id: BrandTier; label: string; tagline?: string };
  riskTier?: string;
  legacyTier?: string;
  onTimePct?: number;
  streak?: number;
  recalcLoading?: boolean;
  onRecalculate?: () => void;
};

export default function CreditScoreHero({
  score,
  score100,
  brandTier,
  riskTier,
  legacyTier,
  onTimePct,
  streak,
  recalcLoading,
  onRecalculate,
}: CreditScoreHeroProps) {
  const tierLabel = brandTier?.label ?? riskTier?.replace('_', ' ') ?? legacyTier ?? 'BUILDING';
  const tierClass = brandTier ? BRAND_TIER_COLORS[brandTier.id] : 'text-slate-700 bg-slate-100';

  const gaugeSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (onTimePct != null) parts.push(`${onTimePct}% on-time`);
    if (streak != null) parts.push(`${streak} mo streak`);
    return parts.join(' · ');
  }, [onTimePct, streak]);

  return (
    <section className="credit-score-hero shimmer-border">
      <div className="credit-score-hero__mesh" aria-hidden />
      <div className="relative z-[1] grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C0392B]">Rental credit score</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <p className="credit-score-hero__score tabular-nums">{score}</p>
            <div className="pb-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${tierClass}`}>
                {tierLabel}
              </span>
              <p className="mt-2 text-sm text-[var(--rc-text-secondary)]">
                {score100}/100 scale
                {gaugeSubtitle ? ` · ${gaugeSubtitle}` : ''}
              </p>
            </div>
          </div>
          {brandTier?.tagline ? (
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--rc-text-secondary)]">{brandTier.tagline}</p>
          ) : (
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--rc-text-secondary)]">
              Built only from verified rent behaviour on CRENIT — not self-reported surveys.
            </p>
          )}
          {onRecalculate ? (
            <button
              type="button"
              className="tenant-btn-secondary mt-6"
              disabled={recalcLoading}
              onClick={onRecalculate}
            >
              <RefreshCw className={`h-4 w-4 ${recalcLoading ? 'animate-spin' : ''}`} aria-hidden />
              {recalcLoading ? 'Recalculating…' : 'Recalculate score'}
            </button>
          ) : null}
        </div>
        <div className="flex justify-center lg:justify-end">
          <ScoreRingMini score={score} tier={tierLabel} size="lg" />
        </div>
      </div>
    </section>
  );
}
